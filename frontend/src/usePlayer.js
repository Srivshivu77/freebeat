import { useState, useRef, useCallback, useEffect } from 'react'
import { searchTracks, getStream } from './api'

export function usePlayer() {
  const audioRef = useRef(new Audio())
  const [tracks, setTracks]                  = useState([])
  const [currentIdx, setCurrentIdx]          = useState(-1)
  const [nowPlaying, setNowPlaying]          = useState(null)
  const [isPlaying, setIsPlaying]            = useState(false)
  const [loading, setLoading]                = useState(false)
  const [streamLoading, setStreamLoading]    = useState(false)
  const [error, setError]                    = useState(null)
  const [progress, setProgress]              = useState(0)
  const [duration, setDuration]              = useState(0)
  const [volume, setVolumeState]             = useState(0.8)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [playlists, setPlaylists]            = useState(() => {
    try { return JSON.parse(localStorage.getItem('fb_playlists') || '[]') }
    catch { return [] }
  })
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat]   = useState('none')

  const audio = audioRef.current

  const tracksRef       = useRef([])
  const currentIdxRef   = useRef(-1)
  const repeatRef       = useRef('none')
  const shuffleRef      = useRef(false)
  const playbackRateRef = useRef(1)
  const volumeRef       = useRef(0.8)
  const playNextRef     = useRef(null)
  const playPrevRef     = useRef(null)

  useEffect(() => { tracksRef.current     = tracks     }, [tracks])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { repeatRef.current     = repeat     }, [repeat])
  useEffect(() => { shuffleRef.current    = shuffle    }, [shuffle])

  // MediaSession — lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !nowPlaying) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   nowPlaying.title   || 'Unknown',
      artist:  nowPlaying.channel || 'Unknown',
      artwork: [{ src: nowPlaying.thumb || '', sizes: '512x512', type: 'image/jpeg' }]
    })
    navigator.mediaSession.setActionHandler('play',          () => audio.play())
    navigator.mediaSession.setActionHandler('pause',         () => audio.pause())
    navigator.mediaSession.setActionHandler('nexttrack',     () => playNextRef.current?.())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current?.())
    navigator.mediaSession.setActionHandler('seekto', e => {
      if (e.seekTime != null) audio.currentTime = e.seekTime
    })
  }, [nowPlaying])

  // Wake lock — keep audio alive when screen turns off
  const wakeLockRef = useRef(null)
  useEffect(() => {
    const acquire = async () => {
      if ('wakeLock' in navigator) {
        try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch {}
      }
    }
    const release = () => {
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null }
    }
    if (isPlaying) acquire(); else release()
    return release
  }, [isPlaying])

  // Audio events
  useEffect(() => {
    const a = audio
    const onTime  = () => setProgress(a.currentTime)
    const onDur   = () => setDuration(a.duration)
    const onPlay  = () => {
      setIsPlaying(true)
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
    }
    const onPause = () => {
      setIsPlaying(false)
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    }
    const onEnded = () => {
      if (repeatRef.current === 'one') { a.currentTime = 0; a.play(); return }
      playNextRef.current?.()
    }
    a.addEventListener('timeupdate',     onTime)
    a.addEventListener('durationchange', onDur)
    a.addEventListener('play',           onPlay)
    a.addEventListener('pause',          onPause)
    a.addEventListener('ended',          onEnded)
    return () => {
      a.removeEventListener('timeupdate',     onTime)
      a.removeEventListener('durationchange', onDur)
      a.removeEventListener('play',           onPlay)
      a.removeEventListener('pause',          onPause)
      a.removeEventListener('ended',          onEnded)
    }
  }, [])

  // ── Core play ─────────────────────────────────────────────────────────
  const playIndex = useCallback(async (idx) => {
    const list = tracksRef.current
    if (idx < 0 || idx >= list.length) return
    const track = list[idx]
    setCurrentIdx(idx)
    setStreamLoading(true)
    setError(null)

    try {
      const stream = await getStream(track.id)
      console.log('▶️ Playing URL:', stream.url)

      // Reset audio element fully before loading new src
      audio.pause()
      audio.src = ''
      audio.load()
      audio.src = stream.url
      audio.volume = volumeRef.current
      audio.playbackRate = playbackRateRef.current

      // Wait for canplay before calling play()
      await new Promise((resolve, reject) => {
        const onCanPlay = () => { cleanup(); resolve() }
        const onError   = () => {
          cleanup()
          reject(new Error(audio.error ? `MediaError code ${audio.error.code}` : 'Unknown audio error'))
        }
        const cleanup = () => {
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error',   onError)
        }
        audio.addEventListener('canplay', onCanPlay)
        audio.addEventListener('error',   onError)
        // Fallback: if canplay never fires in 8s, try anyway
        setTimeout(() => { cleanup(); resolve() }, 8000)
      })

      await audio.play()
      setNowPlaying({ ...track, ...stream })

    } catch (err) {
      console.error('❌ Playback error:', err?.message || err)
      setError(`Could not play "${track.title}" — ${err?.message || 'unknown error'}`)
      setTimeout(() => playIndex(idx + 1), 1500)
    }

    setStreamLoading(false)
  }, [])

  const next = useCallback(() => {
    const list = tracksRef.current
    const idx  = currentIdxRef.current
    if (!list.length) return
    if (shuffleRef.current) {
      let r
      do { r = Math.floor(Math.random() * list.length) } while (r === idx && list.length > 1)
      playIndex(r)
    } else {
      if (repeatRef.current === 'all') playIndex((idx + 1) % list.length)
      else if (idx + 1 < list.length) playIndex(idx + 1)
    }
  }, [playIndex])

  const prev = useCallback(() => {
    const idx = currentIdxRef.current
    if (audio.currentTime > 3) { audio.currentTime = 0; return }
    if (idx > 0) playIndex(idx - 1)
  }, [playIndex])

  useEffect(() => { playNextRef.current = next }, [next])
  useEffect(() => { playPrevRef.current = prev }, [prev])

  const search = useCallback(async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const results = await searchTracks(q)
      setTracks(results)
      setCurrentIdx(-1)
    } catch {
      setError('Cannot reach server. Make sure backend is running on port 8080.')
    }
    setLoading(false)
  }, [])

  const togglePlay = () => { if (isPlaying) audio.pause(); else audio.play() }
  const seek       = (t) => { audio.currentTime = t }

  const setVolume = (v) => {
    audio.volume = v
    volumeRef.current = v
    setVolumeState(v)
  }

  const setPlaybackRate = useCallback((rate) => {
    audio.playbackRate = rate
    playbackRateRef.current = rate
    setPlaybackRateState(rate)
  }, [])

  const toggleShuffle = () => setShuffle(s => !s)
  const cycleRepeat   = () => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')

  const savePlaylists = (updated) => {
    setPlaylists(updated)
    localStorage.setItem('fb_playlists', JSON.stringify(updated))
  }

  const createPlaylist     = useCallback((name) => savePlaylists([...playlists, { id: Date.now(), name, tracks: [] }]), [playlists])
  const deletePlaylist     = useCallback((id)   => savePlaylists(playlists.filter(p => p.id !== id)), [playlists])
  const loadPlaylist       = useCallback((pl)   => { setTracks(pl.tracks); setCurrentIdx(-1) }, [])

  const addToPlaylist = useCallback((plId, track) => {
    savePlaylists(playlists.map(pl =>
      pl.id === plId
        ? pl.tracks.find(t => t.id === track.id) ? pl : { ...pl, tracks: [...pl.tracks, track] }
        : pl
    ))
  }, [playlists])

  const removeFromPlaylist = useCallback((plId, trackId) => {
    savePlaylists(playlists.map(pl =>
      pl.id === plId ? { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) } : pl
    ))
  }, [playlists])

  return {
    tracks, setTracks, currentIdx, nowPlaying, isPlaying,
    loading, streamLoading, error,
    progress, duration, volume, playbackRate,
    shuffle, repeat, playlists,
    search, playIndex, togglePlay, seek, setVolume,
    setPlaybackRate, next, prev,
    toggleShuffle, cycleRepeat,
    createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, loadPlaylist,
  }
}