from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import yt_dlp
import requests
import os
import traceback

app = Flask(__name__)
CORS(app)

# ── yt-dlp options ────────────────────────────────────────────────────
# These options help bypass YouTube bot detection on cloud servers

BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extractor_args': {
        'youtube': {
            'player_client': ['android', 'web'],
        }
    },
}

SEARCH_OPTS = {
    **BASE_OPTS,
    'extract_flat': True,
    'playlistend': 20,
}

STREAM_OPTS = {
    **BASE_OPTS,
    'format': 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
}


def get_best_audio(vid_id):
    """Extract best audio URL for a video ID. Tries multiple strategies."""

    strategies = [
        # Strategy 1: android client (most reliable on servers)
        {
            **STREAM_OPTS,
            'extractor_args': {'youtube': {'player_client': ['android']}},
        },
        # Strategy 2: web client
        {
            **STREAM_OPTS,
            'extractor_args': {'youtube': {'player_client': ['web']}},
        },
        # Strategy 3: mweb client
        {
            **STREAM_OPTS,
            'extractor_args': {'youtube': {'player_client': ['mweb']}},
        },
    ]

    last_error = None
    for opts in strategies:
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={vid_id}",
                    download=False
                )
                formats = info.get('formats', [])

                audio_only = [
                    f for f in formats
                    if f.get('vcodec') == 'none'
                    and f.get('acodec') != 'none'
                    and f.get('url')
                ]
                if not audio_only:
                    audio_only = [f for f in formats if f.get('url')]

                if not audio_only:
                    continue

                best = sorted(
                    audio_only,
                    key=lambda f: f.get('abr') or 0,
                    reverse=True
                )[0]

                return best, info
        except Exception as e:
            last_error = e
            continue

    raise Exception(f"All strategies failed. Last error: {last_error}")


# ── Routes ────────────────────────────────────────────────────────────

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'yt_dlp': yt_dlp.version.__version__})


@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    try:
        with yt_dlp.YoutubeDL(SEARCH_OPTS) as ydl:
            info = ydl.extract_info(f"ytsearch20:{q} music", download=False)
            results = []
            for entry in info.get('entries', []):
                duration = entry.get('duration') or 0
                if duration > 600:
                    continue
                vid_id = entry.get('id', '')
                results.append({
                    'id':       vid_id,
                    'title':    entry.get('title', ''),
                    'channel':  entry.get('uploader') or entry.get('channel', ''),
                    'duration': duration,
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
        _, info = get_best_audio(vid_id)
        return jsonify({
            'title':    info.get('title', ''),
            'channel':  info.get('uploader', ''),
            'thumb':    info.get('thumbnail', ''),
            'duration': info.get('duration', 0),
            'url':      f"/proxy?id={vid_id}",
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/proxy')
def proxy():
    """Stream audio through backend — fixes YouTube IP binding issue."""
    vid_id = request.args.get('id', '').strip()
    if not vid_id:
        return jsonify({'error': 'no id'}), 400

    try:
        best, _ = get_best_audio(vid_id)
        yt_url = best['url']
        audio_ext = best.get('audio_ext') or best.get('ext', 'webm')

        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Linux; Android 10; SM-G981B) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/80.0.3987.162 Mobile Safari/537.36'
            ),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com',
        }

        range_header = request.headers.get('Range')
        if range_header:
            headers['Range'] = range_header

        r = requests.get(yt_url, headers=headers, stream=True, timeout=30)

        ct_map = {
            'webm': 'audio/webm',
            'm4a':  'audio/mp4',
            'mp4':  'audio/mp4',
            'ogg':  'audio/ogg',
            'opus': 'audio/ogg',
        }
        content_type = ct_map.get(audio_ext, 'audio/webm')

        response_headers = {
            'Content-Type':                content_type,
            'Accept-Ranges':               'bytes',
            'Cache-Control':               'no-cache',
            'Access-Control-Allow-Origin': '*',
        }
        if 'Content-Length' in r.headers:
            response_headers['Content-Length'] = r.headers['Content-Length']
        if 'Content-Range' in r.headers:
            response_headers['Content-Range'] = r.headers['Content-Range']

        return Response(
            stream_with_context(r.iter_content(chunk_size=16384)),
            status=r.status_code,
            headers=response_headers
        )

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🎵 FreeBeat running on port {port}")
    print(f"   yt-dlp version: {yt_dlp.version.__version__}")
    app.run(host='0.0.0.0', port=port, debug=False)