from flask import Flask, jsonify, request
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

SEARCH_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': True,
    'playlistend': 20,
}

STREAM_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'format': 'bestaudio/best',
}

@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])

    with yt_dlp.YoutubeDL(SEARCH_OPTS) as ydl:
        info = ydl.extract_info(f"ytsearch20:{q} music", download=False)
        results = []
        for entry in info.get('entries', []):
            # Filter out very long videos (likely not songs)
            duration = entry.get('duration') or 0
            if duration > 600:  # skip anything over 10 mins
                continue
            results.append({
                'id':       entry.get('id', ''),
                'title':    entry.get('title', ''),
                'channel':  entry.get('uploader') or entry.get('channel', ''),
                'duration': duration,
                'thumb':    f"https://i.ytimg.com/vi/{entry.get('id')}/mqdefault.jpg",
            })
        return jsonify(results[:15])

@app.route('/stream')
def stream():
    vid_id = request.args.get('id', '').strip()
    if not vid_id:
        return jsonify({'error': 'no id'}), 400

    try:
        with yt_dlp.YoutubeDL(STREAM_OPTS) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={vid_id}",
                download=False
            )
            formats = info.get('formats', [])

            # Prefer audio-only formats
            audio_only = [
                f for f in formats
                if f.get('vcodec') == 'none' and f.get('acodec') != 'none' and f.get('url')
            ]
            if not audio_only:
                audio_only = [f for f in formats if f.get('url')]

            best = sorted(audio_only, key=lambda f: f.get('abr') or 0, reverse=True)[0]

            return jsonify({
                'url':      best['url'],
                'title':    info.get('title', ''),
                'channel':  info.get('uploader', ''),
                'thumb':    info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8080))
    print(f"🎵 Music server running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)