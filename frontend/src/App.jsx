import { useState, useRef } from 'react'
import { usePlayer } from './usePlayer'
import './App.css'

const QUICK = [
  'Arijit Singh', 'AR Rahman', 'Taylor Swift', 'Coldplay',
  'Kishore Kumar', 'Punjabi Hits 2024', 'Bollywood 90s',
  'Lata Mangeshkar', 'Drake', 'The Weeknd', 'Lofi Chill', 'Sonu Nigam'
]

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Icons ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d={d} />
  </svg>
)
const ICONS = {
  play:     'M8 5v14l11-7z',
  pause:    'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  next:     'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  prev:     'M6 6h2v12H6zm3.5 6 8.5 6V6z',
  shuffle:  'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
  repeat:   'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
  repeatOne:'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
  expand:   'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  close:    'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  list:     'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  plus:     'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  trash:    'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  music:    'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  volume:   'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  speed:    'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
  search:   'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
}

// ── Add to Playlist dropdown ──────────────────────────────────────────
function AddToPlaylistMenu({ track, playlists, createPlaylist, addToPlaylist, onClose }) {
  const [newName, setNewName] = useState('')
  return (
    <div className="playlist-menu" onClick={e => e.stopPropagation()}>
      <div className="pm-header">Add to playlist</div>
      {playlists.length === 0 && <div className="pm-empty">No playlists yet</div>}
      {playlists.map(pl => (
        <div key={pl.id} className="pm-item" onClick={() => { addToPlaylist(pl.id, track); onClose() }}>
          <Icon d={ICONS.list} size={15} />
          {pl.name}
        </div>
      ))}
      <div className="pm-divider" />
      <div className="pm-new">
        <input
          placeholder="New playlist name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newName.trim()) {
              createPlaylist(newName.trim())
              setTimeout(() => {
                const pl = JSON.parse(localStorage.getItem('fb_playlists') || '[]')
                const last = pl[pl.length - 1]
                if (last) addToPlaylist(last.id, track)
              }, 50)
              onClose()
            }
          }}
        />
        <button onClick={() => {
          if (!newName.trim()) return
          createPlaylist(newName.trim())
          onClose()
        }}>
          <Icon d={ICONS.plus} size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Big Player Modal ──────────────────────────────────────────────────
function BigPlayer({ p, onClose }) {
  const [showSpeeds, setShowSpeeds] = useState(false)

  return (
    <div className="bigplayer-overlay" onClick={onClose}>
      <div className="bigplayer" onClick={e => e.stopPropagation()}>
        <button className="bp-close" onClick={onClose}><Icon d={ICONS.close} size={22} /></button>

        {/* Album art */}
        <div className="bp-art-wrap">
          <img
            src={p.nowPlaying?.thumb}
            alt=""
            className={`bp-art ${p.isPlaying ? 'spinning' : ''}`}
          />
          <div className="bp-art-glow" style={{ backgroundImage: `url(${p.nowPlaying?.thumb})` }} />
        </div>

        {/* Info */}
        <div className="bp-info">
          <div className="bp-title">{p.nowPlaying?.title}</div>
          <div className="bp-channel">{p.nowPlaying?.channel}</div>
        </div>

        {/* Progress */}
        <div className="bp-progress-wrap">
          <span className="bp-time">{fmtTime(p.progress)}</span>
          <input
            type="range" min={0} max={p.duration || 100}
            value={p.progress} step={1}
            onChange={e => p.seek(Number(e.target.value))}
            className="bp-progress"
            style={{ '--pct': `${((p.progress / (p.duration || 1)) * 100).toFixed(1)}%` }}
          />
          <span className="bp-time">{fmtTime(p.duration)}</span>
        </div>

        {/* Controls */}
        <div className="bp-controls">
          <button
            className={`bp-btn icon-btn ${p.shuffle ? 'active' : ''}`}
            onClick={p.toggleShuffle} title="Shuffle"
          >
            <Icon d={ICONS.shuffle} size={20} />
          </button>
          <button className="bp-btn icon-btn" onClick={p.prev} title="Previous">
            <Icon d={ICONS.prev} size={26} />
          </button>
          <button className="bp-btn play-btn" onClick={p.togglePlay}>
            <Icon d={p.isPlaying ? ICONS.pause : ICONS.play} size={30} />
          </button>
          <button className="bp-btn icon-btn" onClick={p.next} title="Next">
            <Icon d={ICONS.next} size={26} />
          </button>
          <button
            className={`bp-btn icon-btn ${p.repeat !== 'none' ? 'active' : ''}`}
            onClick={p.cycleRepeat} title="Repeat"
          >
            <Icon d={ICONS.repeat} size={20} />
            {p.repeat === 'one' && <span className="repeat-badge">1</span>}
          </button>
        </div>

        {/* Volume + Speed */}
        <div className="bp-secondary">
          <div className="bp-vol">
            <Icon d={ICONS.volume} size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              type="range" min={0} max={1} step={0.01}
              value={p.volume}
              onChange={e => p.setVolume(Number(e.target.value))}
              className="bp-vol-slider"
            />
          </div>

          {/* Playback speed */}
          <div className="speed-wrap">
            <button className="speed-btn" onClick={() => setShowSpeeds(s => !s)}>
              <Icon d={ICONS.speed} size={16} />
              {p.playbackRate}x
            </button>
            {showSpeeds && (
              <div className="speed-menu">
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    className={`speed-opt ${p.playbackRate === s ? 'active' : ''}`}
                    onClick={() => { p.setPlaybackRate(s); setShowSpeeds(false) }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Playlist Panel ────────────────────────────────────────────────────
function PlaylistPanel({ p, onClose }) {
  const [newName, setNewName] = useState('')
  const [openId, setOpenId] = useState(null)

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <span>Your Playlists</span>
          <button onClick={onClose}><Icon d={ICONS.close} size={20} /></button>
        </div>

        {/* Create new */}
        <div className="panel-new">
          <input
            placeholder="New playlist name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { p.createPlaylist(newName.trim()); setNewName('') }}}
          />
          <button onClick={() => { if (newName.trim()) { p.createPlaylist(newName.trim()); setNewName('') }}}>
            <Icon d={ICONS.plus} size={16} /> Create
          </button>
        </div>

        {p.playlists.length === 0 && (
          <div className="panel-empty">No playlists yet. Create one above and add songs from search results.</div>
        )}

        {p.playlists.map(pl => (
          <div key={pl.id} className="pl-card">
            <div className="pl-card-header" onClick={() => setOpenId(openId === pl.id ? null : pl.id)}>
              <div>
                <div className="pl-name">{pl.name}</div>
                <div className="pl-count">{pl.tracks.length} songs</div>
              </div>
              <div className="pl-actions">
                <button
                  className="pl-play-btn"
                  onClick={e => { e.stopPropagation(); p.loadPlaylist(pl); onClose() }}
                  disabled={pl.tracks.length === 0}
                >
                  Play
                </button>
                <button className="pl-del" onClick={e => { e.stopPropagation(); p.deletePlaylist(pl.id) }}>
                  <Icon d={ICONS.trash} size={15} />
                </button>
              </div>
            </div>

            {openId === pl.id && pl.tracks.length > 0 && (
              <div className="pl-tracks">
                {pl.tracks.map((t, i) => (
                  <div key={t.id} className="pl-track">
                    <span className="pl-track-num">{i + 1}</span>
                    <span className="pl-track-title">{t.title}</span>
                    <button onClick={() => p.removeFromPlaylist(pl.id, t.id)}>
                      <Icon d={ICONS.close} size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [query, setQuery]           = useState('')
  const [bigPlayer, setBigPlayer]   = useState(false)
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [menuTrack, setMenuTrack]   = useState(null) // track for add-to-playlist menu
  const [showSpeed, setShowSpeed]   = useState(false)
  const p = usePlayer()

  const handleSearch = (q) => { setQuery(q); p.search(q) }

  return (
    <div className="app">
      {/* Animated bg */}
      <div className="bg-canvas">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
        <div className="grain" />
      </div>

      <div className="container">
        {/* Header */}
        <header>
          <div className="logo-wrap">
            <div className="logo-icon"><Icon d={ICONS.music} size={18} /></div>
            <div className="logo">Free<span>Beat</span></div>
          </div>
          <div className="header-right">
            <button className="hdr-btn" onClick={() => setShowPlaylists(true)}>
              <Icon d={ICONS.list} size={18} />
              <span>Playlists</span>
              {p.playlists.length > 0 && <span className="pl-badge">{p.playlists.length}</span>}
            </button>
            <div className="badge">No Ads · Free Forever</div>
          </div>
        </header>

        {/* Hero search */}
        <div className="hero">
          <div className="hero-label">What do you want to hear?</div>
          <div className="search-row">
            <div className="search-icon"><Icon d={ICONS.search} size={18} /></div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
              placeholder="Song, artist, album, mood…"
              spellCheck={false}
            />
            <button className="search-btn" onClick={() => handleSearch(query)}>Search</button>
          </div>
        </div>

        {/* Quick picks */}
        <div className="section-label">Quick picks</div>
        <div className="pills">
          {QUICK.map(q => (
            <button key={q} className="pill" onClick={() => handleSearch(q)}>{q}</button>
          ))}
        </div>

        {/* Error */}
        {p.error && <div className="error-box">⚠ {p.error}</div>}

        {/* Results */}
        {p.loading ? (
          <div className="state-center">
            <div className="loader"><div /><div /><div /></div>
            <p>Finding songs…</p>
          </div>
        ) : p.tracks.length > 0 ? (
          <div className="track-section">
            <div className="section-label">Results · {p.tracks.length} songs</div>
            <div className="track-list">
              {p.tracks.map((t, i) => (
                <div
                  key={t.id}
                  className={`track-item ${i === p.currentIdx ? 'active' : ''}`}
                  onClick={() => { setMenuTrack(null); p.playIndex(i) }}
                >
                  <div className="track-num">
                    {i === p.currentIdx && p.isPlaying
                      ? <div className="bars"><span/><span/><span/></div>
                      : <span className="num-text">{i + 1}</span>}
                  </div>
                  <img src={t.thumb} alt="" className="track-thumb" />
                  <div className="track-info">
                    <div className="track-title">{t.title}</div>
                    <div className="track-meta">{t.channel} · {fmtTime(t.duration)}</div>
                  </div>
                  {i === p.currentIdx && p.streamLoading
                    ? <div className="spinner-sm" />
                    : (
                      <div className="track-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="ta-btn"
                          title="Add to playlist"
                          onClick={() => setMenuTrack(menuTrack?.id === t.id ? null : t)}
                        >
                          <Icon d={ICONS.plus} size={16} />
                        </button>
                        {menuTrack?.id === t.id && (
                          <AddToPlaylistMenu
                            track={t}
                            playlists={p.playlists}
                            createPlaylist={p.createPlaylist}
                            addToPlaylist={p.addToPlaylist}
                            onClose={() => setMenuTrack(null)}
                          />
                        )}
                      </div>
                    )
                  }
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="state-center empty">
            <div className="empty-visual">
              <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
              <div className="eq-bar" /><div className="eq-bar" />
            </div>
            <p>Every song in the world.<br />Search to start listening.</p>
          </div>
        )}
      </div>

      {/* ── Now Playing Bar ── */}
      {p.nowPlaying && (
        <div className="now-playing">
          {/* thin progress line at top */}
          <div
            className="np-prog-line"
            style={{ width: `${((p.progress / (p.duration || 1)) * 100).toFixed(1)}%` }}
          />
          <div className="np-inner">
            {/* Art + info */}
            <div className="np-left" onClick={() => setBigPlayer(true)}>
              <img src={p.nowPlaying.thumb} alt="" className="np-thumb" />
              <div className="np-info">
                <div className="np-title">{p.nowPlaying.title}</div>
                <div className="np-channel">{p.nowPlaying.channel}</div>
              </div>
            </div>

            {/* Center: seek */}
            <div className="np-center">
              <input
                type="range" min={0} max={p.duration || 100}
                value={p.progress} step={1}
                onChange={e => p.seek(Number(e.target.value))}
                className="np-seek"
                style={{ '--pct': `${((p.progress / (p.duration || 1)) * 100).toFixed(1)}%` }}
              />
              <div className="np-times">
                <span>{fmtTime(p.progress)}</span>
                <span>{fmtTime(p.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="np-controls">
              <button className={`nc-btn ${p.shuffle ? 'lit' : ''}`} onClick={p.toggleShuffle} title="Shuffle">
                <Icon d={ICONS.shuffle} size={16} />
              </button>
              <button className="nc-btn" onClick={p.prev}><Icon d={ICONS.prev} size={20} /></button>
              <button className="nc-btn play" onClick={p.togglePlay}>
                <Icon d={p.isPlaying ? ICONS.pause : ICONS.play} size={20} />
              </button>
              <button className="nc-btn" onClick={p.next}><Icon d={ICONS.next} size={20} /></button>
              <button className={`nc-btn ${p.repeat !== 'none' ? 'lit' : ''}`} onClick={p.cycleRepeat} title="Repeat">
                <Icon d={ICONS.repeat} size={16} />
                {p.repeat === 'one' && <span className="r1">1</span>}
              </button>
            </div>

            {/* Right: speed + volume + expand */}
            <div className="np-right">
              {/* Speed */}
              <div className="speed-wrap">
                <button className="speed-btn" onClick={() => setShowSpeed(s => !s)}>
                  <Icon d={ICONS.speed} size={14} />
                  {p.playbackRate}x
                </button>
                {showSpeed && (
                  <div className="speed-menu up">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        className={`speed-opt ${p.playbackRate === s ? 'active' : ''}`}
                        onClick={() => { p.setPlaybackRate(s); setShowSpeed(false) }}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume */}
              <div className="vol-row">
                <Icon d={ICONS.volume} size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={p.volume}
                  onChange={e => p.setVolume(Number(e.target.value))}
                  className="vol-slider"
                />
              </div>

              {/* Expand */}
              <button className="nc-btn" onClick={() => setBigPlayer(true)} title="Full player">
                <Icon d={ICONS.expand} size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {bigPlayer    && <BigPlayer    p={p} onClose={() => setBigPlayer(false)} />}
      {showPlaylists && <PlaylistPanel p={p} onClose={() => setShowPlaylists(false)} />}
    </div>
  )
}
