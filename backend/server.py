from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from Crypto.Cipher import DES
import base64
import requests
import os
import traceback
import re

app = Flask(__name__)
CORS(app)

SAAVN   = "https://www.jiosaavn.com/api.php"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept':     'application/json, text/plain, */*',
    'Referer':    'https://www.jiosaavn.com/',
}

# ── JioSaavn DES decryption ───────────────────────────────────────────
# JioSaavn encrypts media URLs with DES ECB using this known key
DES_KEY = b'38346591'

def decrypt_url(encrypted: str) -> str:
    """Decrypt JioSaavn's encrypted_media_url using DES ECB."""
    # The encrypted string is base64 encoded
    # JioSaavn uses a custom base64 alphabet — replace chars first
    enc = encrypted.replace('_', '/').replace('-', '+').replace(' ', '+')

    # Pad to multiple of 4
    enc += '=' * (4 - len(enc) % 4)

    raw = base64.b64decode(enc)
    cipher = DES.new(DES_KEY, DES.MODE_ECB)
    decrypted = cipher.decrypt(raw)

    # Remove PKCS5 padding
    pad = decrypted[-1]
    if isinstance(pad, int) and 1 <= pad <= 8:
        decrypted = decrypted[:-pad]

    url = decrypted.decode('utf-8', errors='ignore').strip()

    # Upgrade to 320kbps
    url = url.replace('_96.mp4',  '_320.mp4')
    url = url.replace('_160.mp4', '_320.mp4')
    url = url.replace('_48.mp4',  '_320.mp4')
    url = url.replace('_96.mp3',  '_320.mp3')
    url = url.replace('_160.mp3', '_320.mp3')

    return url


def clean(text):
    if not text:
        return ''
    text = re.sub(r'&quot;', '"',  text)
    text = re.sub(r'&amp;',  '&',  text)
    text = re.sub(r'&lt;',   '<',  text)
    text = re.sub(r'&gt;',   '>',  text)
    text = re.sub(r'&#039;', "'",  text)
    text = re.sub(r'<[^>]+>', '',  text)
    return text.strip()

def hi_res(url):
    if not url:
        return ''
    return url.replace('50x50','500x500').replace('150x150','500x500')

def get_artists(song):
    more_info  = song.get('more_info', {})
    artist_map = more_info.get('artistMap', {})
    primary    = artist_map.get('primary_artists', [])
    if primary:
        return ', '.join(a['name'] for a in primary if a.get('name'))
    subtitle = clean(song.get('subtitle', ''))
    return subtitle.split(' - ')[0].strip() if ' - ' in subtitle else subtitle

def get_song_from_raw(raw):
    if isinstance(raw, dict):
        songs = raw.get('songs', [])
        if songs and isinstance(songs, list):
            return songs[0]
    return None

def fetch_song(song_id):
    r = requests.get(SAAVN, params={
        '__call':      'song.getDetails',
        'pids':        song_id,
        '_format':     'json',
        '_marker':     '0',
        'api_version': '4',
        'ctx':         'wap6dot0',
    }, headers=HEADERS, timeout=10)
    r.raise_for_status()
    song = get_song_from_raw(r.json())
    if not song:
        raise Exception("Song not found")
    return song

def get_stream_url(song):
    more_info = song.get('more_info', {})
    encrypted = more_info.get('encrypted_media_url', '')
    if not encrypted:
        raise Exception("No encrypted_media_url found")
    url = decrypt_url(encrypted)
    print(f"🔓 Decrypted URL: {url[:80]}...")
    return url


# ── Routes ────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return jsonify({'status': 'ok', 'source': 'jiosaavn'})

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'source': 'jiosaavn'})

@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    try:
        r = requests.get(SAAVN, params={
            '__call':      'search.getResults',
            'q':           q,
            '_format':     'json',
            '_marker':     '0',
            'api_version': '4',
            'ctx':         'wap6dot0',
            'n':           '20',
            'p':           '1',
        }, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data    = r.json()
        results = data.get('results', [])
        songs   = []
        for s in results:
            if s.get('type') != 'song':
                continue
            sid = s.get('id', '')
            if not sid:
                continue
            duration = 0
            try:
                duration = int(s.get('more_info', {}).get('duration', 0))
            except:
                pass
            songs.append({
                'id':       sid,
                'title':    clean(s.get('title', '')),
                'channel':  get_artists(s),
                'duration': duration,
                'thumb':    hi_res(s.get('image', '')),
            })
        return jsonify(songs[:15])
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/stream')
def stream():
    song_id = request.args.get('id', '').strip()
    if not song_id:
        return jsonify({'error': 'no id'}), 400
    try:
        song       = fetch_song(song_id)
        stream_url = get_stream_url(song)  # validate decryption works
        duration   = 0
        try:
            duration = int(song.get('more_info', {}).get('duration', 0))
        except:
            pass
        return jsonify({
            'title':    clean(song.get('title', '')),
            'channel':  get_artists(song),
            'thumb':    hi_res(song.get('image', '')),
            'duration': duration,
            'url':      f"/proxy?id={song_id}",
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/proxy')
def proxy():
    song_id = request.args.get('id', '').strip()
    if not song_id:
        return jsonify({'error': 'no id'}), 400
    try:
        song       = fetch_song(song_id)
        stream_url = get_stream_url(song)

        print(f"🔊 Proxying: {stream_url[:80]}...")

        req_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept':     '*/*',
            'Referer':    'https://www.jiosaavn.com/',
        }
        if request.headers.get('Range'):
            req_headers['Range'] = request.headers['Range']

        sr = requests.get(stream_url, headers=req_headers, stream=True, timeout=30)

        resp_headers = {
            'Content-Type':                'audio/mpeg',
            'Accept-Ranges':               'bytes',
            'Cache-Control':               'no-cache',
            'Access-Control-Allow-Origin': '*',
        }
        if 'Content-Length' in sr.headers:
            resp_headers['Content-Length'] = sr.headers['Content-Length']
        if 'Content-Range' in sr.headers:
            resp_headers['Content-Range'] = sr.headers['Content-Range']

        return Response(
            stream_with_context(sr.iter_content(chunk_size=16384)),
            status=sr.status_code,
            headers=resp_headers
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🎵 FreeBeat (JioSaavn) on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)