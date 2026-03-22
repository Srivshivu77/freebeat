from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import yt_dlp
import requests
import os
import traceback

app = Flask(__name__)
CORS(app)

# Force audio-only formats, prefer opus/m4a which browsers handle well
AUDIO_FORMATS = 'bestaudio[ext=webm][acodec=opus]/bestaudio[ext=m4a]/bestaudio[acodec=opus]/bestaudio'

STRATEGY_OPTS = [
    {
        'quiet': True, 'no_warnings': True,
        'format': AUDIO_FORMATS,
        'extractor_args': {'youtube': {'player_client': ['android_vr']}},
    },
    {
        'quiet': True, 'no_warnings': True,
        'format': AUDIO_FORMATS,
        'extractor_args': {'youtube': {'player_client': ['android']}},
    },
    {
        'quiet': True, 'no_warnings': True,
        'format': AUDIO_FORMATS,
        'extractor_args': {'youtube': {'player_client': ['tv_embedded']}},
    },
    {
        'quiet': True, 'no_warnings': True,
        'format': AUDIO_FORMATS,
    },
]

def get_audio(vid_id):
    errors = []
    for i, opts in enumerate(STRATEGY_OPTS):
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={vid_id}",
                    download=False
                )
                fmts = info.get('formats', [])

                # Strictly audio only — no video codec
                audio = [
                    f for f in fmts
                    if f.get('vcodec') in ('none', None, '')
                    and f.get('acodec') not in ('none', None, '')
                    and f.get('url')
                ]
                if not audio:
                    audio = [f for f in fmts if f.get('url')]

                if not audio:
                    errors.append(f"Strategy {i+1}: no formats")
                    continue

                best = sorted(audio, key=lambda f: f.get('abr') or 0, reverse=True)[0]

                print(f"✅ Strategy {i+1} OK | ext={best.get('ext')} acodec={best.get('acodec')} abr={best.get('abr')}")
                return best, info

        except Exception as e:
            errors.append(f"Strategy {i+1}: {e}")
            print(f"❌ Strategy {i+1} failed: {e}")

    raise Exception("All strategies failed:\n" + "\n".join(errors))


@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'FreeBeat API'})

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'yt_dlp': yt_dlp.version.__version__})

@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    try:
        opts = {
            'quiet': True, 'no_warnings': True,
            'extract_flat': True, 'playlistend': 20,
            'extractor_args': {'youtube': {'player_client': ['android_vr', 'android']}},
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch20:{q} music", download=False)
            results = []
            for entry in info.get('entries', []):
                dur = entry.get('duration') or 0
                if dur > 600:
                    continue
                vid_id = entry.get('id', '')
                results.append({
                    'id':       vid_id,
                    'title':    entry.get('title', ''),
                    'channel':  entry.get('uploader') or entry.get('channel', ''),
                    'duration': dur,
                    'thumb':    f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg",
                })
        return jsonify(results[:15])
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/stream')
def stream():
    vid_id = request.args.get('id', '').strip()
    if not vid_id:
        return jsonify({'error': 'no id'}), 400
    try:
        best, info = get_audio(vid_id)

        ext      = best.get('ext', 'webm')
        acodec   = best.get('acodec', '')
        ct_map   = {'webm': 'audio/webm', 'm4a': 'audio/mp4', 'mp4': 'audio/mp4', 'ogg': 'audio/ogg', 'opus': 'audio/ogg'}
        content_type = ct_map.get(ext, 'audio/webm')

        return jsonify({
            'title':        info.get('title', ''),
            'channel':      info.get('uploader', ''),
            'thumb':        info.get('thumbnail', ''),
            'duration':     info.get('duration', 0),
            'url':          f"/proxy?id={vid_id}",
            'content_type': content_type,
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/proxy')
def proxy():
    vid_id = request.args.get('id', '').strip()
    if not vid_id:
        return jsonify({'error': 'no id'}), 400
    try:
        best, _ = get_audio(vid_id)
        yt_url   = best['url']
        ext      = best.get('ext', 'webm')
        acodec   = best.get('acodec', '')

        print(f"🔊 Proxying | ext={ext} | acodec={acodec} | url={yt_url[:80]}...")

        ct_map = {
            'webm': 'audio/webm',
            'm4a':  'audio/mp4',
            'mp4':  'audio/mp4',
            'ogg':  'audio/ogg',
            'opus': 'audio/ogg',
        }
        content_type = ct_map.get(ext, 'audio/webm')

        req_headers = {
            'User-Agent': 'com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin':  'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/',
        }
        if request.headers.get('Range'):
            req_headers['Range'] = request.headers.get('Range')

        r = requests.get(yt_url, headers=req_headers, stream=True, timeout=30)

        print(f"📡 YouTube response: {r.status_code} | Content-Type: {r.headers.get('Content-Type','?')}")

        resp_headers = {
            'Content-Type':                content_type,
            'Accept-Ranges':               'bytes',
            'Cache-Control':               'no-cache',
            'Access-Control-Allow-Origin': '*',
            'X-Content-Type-Options':      'nosniff',
        }
        if 'Content-Length' in r.headers:
            resp_headers['Content-Length'] = r.headers['Content-Length']
        if 'Content-Range' in r.headers:
            resp_headers['Content-Range'] = r.headers['Content-Range']

        return Response(
            stream_with_context(r.iter_content(chunk_size=16384)),
            status=r.status_code,
            headers=resp_headers
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🎵 FreeBeat on port {port} | yt-dlp {yt_dlp.version.__version__}")
    app.run(host='0.0.0.0', port=port, debug=False)