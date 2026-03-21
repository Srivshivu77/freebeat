import { useState, useRef, useCallback, useEffect } from 'react'
import { searchTracks, getStream } from './api'

export function usePlayer() {
  const audioRef = useRef(new Audio())
  const [tracks, setTracks]               = useState([])
  const [currentIdx, setCurrentIdx]       = useState(-1)
  const [nowPlaying, setNowPlaying]       = useState(null)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [loading, setLoading]             = useState(false)
  const [streamLoading, setStreamLoading] = useState(false)
  const [error, setError]                 = useState(null)
  const [progress, setProgress]           = useState(0)
  const [duration, setDuration]           = useState(0)
  const [volume, setVolumeState]          = useState(0.8)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [playlists, setPlaylists]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('fb_playlists') || '[]') }
    catch { return [] }
  })
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat]   = useState('none') // none | one | all

  const audio = audioRef.current

  // Refs so callbacks always see latest values without stale closures
  const tracksRef       = useRef(tracks)
  const currentIdxRef   = useRef(currentIdx)
  const repeatRef       = useRef(repeat)
  const shuffleRef      = useRef(shuffle)
  const playbackRateRef = useRef(1)
  const volumeRef       = useRef(0.8)

  useEffect(() => { tracksRef.current     = tracks     }, [tracks])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { repeatRef.current     = repeat     }, [repeat])
  useEffect(() => { shuffleRef.current    = shuffle    }, [shuffle])

  // ── MediaSession (lock screen / notification controls) ───────────────
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
    navigator.mediaSession.setActionHandler('seekto', (e) => {
      if (e.seekTime !== undefined) audio.currentTime = e.seekTime
    })
  }, [nowPlaying])

  // ── Wake Lock (prevent screen/audio from sleeping) ────────────────────
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

  // ── Audio event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const a = audio
    const onTimeUpdate   = () => setProgress(a.currentTime)
    const onDuration     = () => setDuration(a.duration)
    const onPlay         = () => {
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
    a.addEventListener('timeupdate',     onTimeUpdate)
    a.addEventListener('durationchange', onDuration)
    a.addEventListener('play',           onPlay)
    a.addEventListener('pause',          onPause)
    a.addEventListener('ended',          onEnded)
    return () => {
      a.removeEventListener('timeupdate',     onTimeUpdate)
      a.removeEventListener('durationchange', onDuration)
      a.removeEventListener('play',           onPlay)
      a.removeEventListener('pause',          onPause)
      a.removeEventListener('ended',          onEnded)
    }
  }, [])

  // ── Core play ─────────────────────────────────────────────────────────
  const playNextRef = useRef(null)
  const playPrevRef = useRef(null)

  const playIndex = useCallback(async (idx) => {
    const list = tracksRef.current
    if (idx < 0 || idx >= list.length) return
    const track = list[idx]
    setCurrentIdx(idx)
    setStreamLoading(true)
    setError(null)
    try {
      const stream = await getStream(track.id)
      audio.src = stream.url
      audio.volume = volumeRef.current
      audio.playbackRate = playbackRateRef.current
      await audio.play()
      setNowPlaying({ ...track, ...stream })
    } catch {
      setError(`Could not stream "${track.title}". Skipping…`)
      setTimeout(() => playIndex(idx + 1), 1200)
    }
    setStreamLoading(false)
  }, [])

  const next = useCallback(() => {
    const list = tracksRef.current
    const idx  = currentIdxRef.current
    if (list.length === 0) return
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

  // ── Search ────────────────────────────────────────────────────────────
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

  // ── Controls ──────────────────────────────────────────────────────────
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

  // ── Playlist management ───────────────────────────────────────────────
  const savePlaylists = (updated) => {
    setPlaylists(updated)
    localStorage.setItem('fb_playlists', JSON.stringify(updated))
  }

  const createPlaylist = useCallback((name) => {
    const updated = [...playlists, { id: Date.now(), name, tracks: [] }]
    savePlaylists(updated)
  }, [playlists])

  const addToPlaylist = useCallback((playlistId, track) => {
    const updated = playlists.map(pl =>
      pl.id === playlistId
        ? pl.tracks.find(t => t.id === track.id)
          ? pl
          : { ...pl, tracks: [...pl.tracks, track] }
        : pl
    )
    savePlaylists(updated)
  }, [playlists])

  const removeFromPlaylist = useCallback((playlistId, trackId) => {
    const updated = playlists.map(pl =>
      pl.id === playlistId
        ? { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) }
        : pl
    )
    savePlaylists(updated)
  }, [playlists])

  const deletePlaylist = useCallback((playlistId) => {
    savePlaylists(playlists.filter(pl => pl.id !== playlistId))
  }, [playlists])

  const loadPlaylist = useCallback((playlist) => {
    setTracks(playlist.tracks)
    setCurrentIdx(-1)
  }, [])

  return {
    tracks, setTracks, currentIdx, nowPlaying, isPlaying,
    loading, streamLoading, error,
    progress, duration, volume, playbackRate,
    shuffle, repeat, playlists,
    search, playIndex, togglePlay, seek, setVolume,
    setPlaybackRate, next, prev,
    toggleShuffle, cycleRepeat,
    createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, loadPlaylist
  }
}