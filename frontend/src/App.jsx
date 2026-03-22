import { useState } from 'react'
import { usePlayer } from './usePlayer'
import './App.css'

const QUICK = [
  'Arijit Singh','AR Rahman','Taylor Swift','Coldplay',
  'Kishore Kumar','Punjabi Hits 2024','Bollywood 90s',
  'Lata Mangeshkar','Drake','The Weeknd','Lofi Chill','Sonu Nigam'
]
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
}

const Icon = ({ d, size=20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={d}/>
  </svg>
)
const IC = {
  play:    'M8 5v14l11-7z',
  pause:   'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  next:    'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  prev:    'M6 6h2v12H6zm3.5 6 8.5 6V6z',
  shuffle: 'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
  repeat:  'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  expand:  'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  close:   'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  list:    'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  plus:    'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  trash:   'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  music:   'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  volume:  'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
  speed:   'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
  search:  'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
}

function AddToPlaylistMenu({ track, playlists, createPlaylist, addToPlaylist, onClose }) {
  const [name, setName] = useState('')
  return (
    <div className="pm" onClick={e => e.stopPropagation()}>
      <div className="pm-head">Add to playlist</div>
      {playlists.length === 0 && <div className="pm-empty">No playlists yet</div>}
      {playlists.map(pl => (
        <div key={pl.id} className="pm-item" onClick={() => { addToPlaylist(pl.id, track); onClose() }}>
          <Icon d={IC.list} size={14}/> {pl.name}
        </div>
      ))}
      <div className="pm-div"/>
      <div className="pm-new">
        <input placeholder="New playlist…" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && name.trim()) { createPlaylist(name.trim()); onClose() }}}/>
        <button onClick={() => { if (name.trim()) { createPlaylist(name.trim()); onClose() }}}>
          <Icon d={IC.plus} size={14}/>
        </button>
      </div>
    </div>
  )
}

function BigPlayer({ p, onClose }) {
  const [showSpeeds, setShowSpeeds] = useState(false)
  const pct = `${((p.progress/(p.duration||1))*100).toFixed(1)}%`
  return (
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp" onClick={e => e.stopPropagation()}>
        <button className="bp-x" onClick={onClose}><Icon d={IC.close} size={20}/></button>
        <div className="bp-art-wrap">
          <img src={p.nowPlaying?.thumb} alt="" className={`bp-art ${p.isPlaying?'spin':''}`}/>
          <div className="bp-glow" style={{backgroundImage:`url(${p.nowPlaying?.thumb})`}}/>
        </div>
        <div className="bp-info">
          <div className="bp-title">{p.nowPlaying?.title}</div>
          <div className="bp-ch">{p.nowPlaying?.channel}</div>
        </div>
        <div className="bp-prog-row">
          <span className="t">{fmtTime(p.progress)}</span>
          <input type="range" min={0} max={p.duration||100} value={p.progress} step={1}
            onChange={e => p.seek(+e.target.value)} className="bp-prog" style={{'--pct':pct}}/>
          <span className="t">{fmtTime(p.duration)}</span>
        </div>
        <div className="bp-ctrls">
          <button className={`ib ${p.shuffle?'lit':''}`} onClick={p.toggleShuffle}><Icon d={IC.shuffle} size={19}/></button>
          <button className="ib" onClick={p.prev}><Icon d={IC.prev} size={24}/></button>
          <button className="pb" onClick={p.togglePlay}><Icon d={p.isPlaying?IC.pause:IC.play} size={28}/></button>
          <button className="ib" onClick={p.next}><Icon d={IC.next} size={24}/></button>
          <button className={`ib ${p.repeat!=='none'?'lit':''}`} onClick={p.cycleRepeat}>
            <Icon d={IC.repeat} size={19}/>
            {p.repeat==='one' && <span className="r1">1</span>}
          </button>
        </div>
        <div className="bp-sec">
          <div className="bp-vol">
            <Icon d={IC.volume} size={17} style={{color:'var(--muted)',flexShrink:0}}/>
            <input type="range" min={0} max={1} step={0.01} value={p.volume}
              onChange={e => p.setVolume(+e.target.value)} className="vsl"/>
          </div>
          <div className="spd-wrap">
            <button className="spd-btn" onClick={()=>setShowSpeeds(s=>!s)}>
              <Icon d={IC.speed} size={14}/> {p.playbackRate}x
            </button>
            {showSpeeds && (
              <div className="spd-menu">
                {SPEEDS.map(s=>(
                  <button key={s} className={`spd-opt ${p.playbackRate===s?'on':''}`}
                    onClick={()=>{p.setPlaybackRate(s);setShowSpeeds(false)}}>{s}x</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaylistPanel({ p, onClose }) {
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState(null)
  return (
    <div className="panel-ov" onClick={onClose}>
      <div className="panel" onClick={e=>e.stopPropagation()}>
        <div className="panel-hd">
          <span>Playlists</span>
          <button onClick={onClose}><Icon d={IC.close} size={18}/></button>
        </div>
        <div className="panel-new">
          <input placeholder="New playlist name…" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&name.trim()){p.createPlaylist(name.trim());setName('')}}}/>
          <button onClick={()=>{if(name.trim()){p.createPlaylist(name.trim());setName('')}}}>
            <Icon d={IC.plus} size={15}/> Create
          </button>
        </div>
        {p.playlists.length===0 && <div className="panel-empty">No playlists yet. Create one and add songs using the + button on any track.</div>}
        {p.playlists.map(pl=>(
          <div key={pl.id} className="plc">
            <div className="plc-hd" onClick={()=>setOpenId(openId===pl.id?null:pl.id)}>
              <div>
                <div className="plc-name">{pl.name}</div>
                <div className="plc-ct">{pl.tracks.length} songs</div>
              </div>
              <div className="plc-acts">
                <button className="plc-play" disabled={!pl.tracks.length}
                  onClick={e=>{e.stopPropagation();p.loadPlaylist(pl);onClose()}}>Play</button>
                <button className="plc-del" onClick={e=>{e.stopPropagation();p.deletePlaylist(pl.id)}}>
                  <Icon d={IC.trash} size={14}/>
                </button>
              </div>
            </div>
            {openId===pl.id && pl.tracks.length>0 && (
              <div className="plc-tracks">
                {pl.tracks.map((t,i)=>(
                  <div key={t.id} className="plc-t">
                    <span className="plc-tn">{i+1}</span>
                    <span className="plc-tt">{t.title}</span>
                    <button onClick={()=>p.removeFromPlaylist(pl.id,t.id)}><Icon d={IC.close} size={12}/></button>
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

export default function App() {
  const [query, setQuery]         = useState('')
  const [bigPlayer, setBigPlayer] = useState(false)
  const [showPL, setShowPL]       = useState(false)
  const [menuTrack, setMenuTrack] = useState(null)
  const [showSpd, setShowSpd]     = useState(false)
  const p = usePlayer()

  const doSearch = (q) => { setQuery(q); p.search(q) }
  const pct = `${((p.progress/(p.duration||1))*100).toFixed(1)}%`

  return (
    <div className="app">
      <div className="bg-canvas">
        <div className="orb o1"/><div className="orb o2"/><div className="orb o3"/>
        <div className="grain"/>
      </div>

      <div className="wrap">
        {/* Header */}
        <header>
          <div className="logo-row">
            <div className="logo-ic"><Icon d={IC.music} size={17}/></div>
            <div className="logo">Free<span>Beat</span></div>
          </div>
          <div className="hdr-r">
            <button className="hdr-btn" onClick={()=>setShowPL(true)}>
              <Icon d={IC.list} size={17}/> Playlists
              {p.playlists.length>0 && <span className="pl-dot">{p.playlists.length}</span>}
            </button>
            <div className="badge">No Ads · Free</div>
          </div>
        </header>

        {/* Hero */}
        <div className="hero">
          <h1>What do you want to hear?</h1>
          <div className="search-box">
            <div className="s-ic"><Icon d={IC.search} size={18}/></div>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&doSearch(query)}
              placeholder="Song, artist, album, mood…" spellCheck={false}/>
            <button className="s-btn" onClick={()=>doSearch(query)}>Search</button>
          </div>
        </div>

        {/* Pills */}
        <div className="sec-lbl">Quick picks</div>
        <div className="pills">
          {QUICK.map(q=><button key={q} className="pill" onClick={()=>doSearch(q)}>{q}</button>)}
        </div>

        {p.error && <div className="err">⚠ {p.error}</div>}

        {/* Track list */}
        {p.loading ? (
          <div className="state">
            <div className="dots"><div/><div/><div/></div>
            <p>Finding songs…</p>
          </div>
        ) : p.tracks.length > 0 ? (
          <div className="tlist-wrap">
            <div className="sec-lbl">Results · {p.tracks.length} songs</div>
            <div className="tlist">
              {p.tracks.map((t,i)=>(
                <div key={t.id} className={`ti ${i===p.currentIdx?'active':''}`}
                  onClick={()=>{setMenuTrack(null);p.playIndex(i)}}>
                  <div className="ti-num">
                    {i===p.currentIdx&&p.isPlaying
                      ? <div className="bars"><span/><span/><span/></div>
                      : <span className="n">{i+1}</span>}
                  </div>
                  <img src={t.thumb} alt="" className="ti-img"/>
                  <div className="ti-info">
                    <div className="ti-title">{t.title}</div>
                    <div className="ti-meta">{t.channel} · {fmtTime(t.duration)}</div>
                  </div>
                  {i===p.currentIdx&&p.streamLoading
                    ? <div className="spin-sm"/>
                    : <div className="ti-acts" onClick={e=>e.stopPropagation()}>
                        <button className="ti-btn" onClick={()=>setMenuTrack(menuTrack?.id===t.id?null:t)}>
                          <Icon d={IC.plus} size={15}/>
                        </button>
                        {menuTrack?.id===t.id &&
                          <AddToPlaylistMenu track={t} playlists={p.playlists}
                            createPlaylist={p.createPlaylist} addToPlaylist={p.addToPlaylist}
                            onClose={()=>setMenuTrack(null)}/>}
                      </div>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="state empty">
            <div className="eq"><div/><div/><div/><div/><div/></div>
            <p>Every song in the world.<br/>Search to start listening.</p>
          </div>
        )}
      </div>

      {/* Now Playing Bar */}
      {p.nowPlaying && (
        <div className="npb">
          <div className="npb-line" style={{width:pct}}/>
          <div className="npb-inner">
            <div className="npb-l" onClick={()=>setBigPlayer(true)}>
              <img src={p.nowPlaying.thumb} alt="" className="npb-img"/>
              <div className="npb-info">
                <div className="npb-title">{p.nowPlaying.title}</div>
                <div className="npb-ch">{p.nowPlaying.channel}</div>
              </div>
            </div>
            <div className="npb-c">
              <input type="range" min={0} max={p.duration||100} value={p.progress} step={1}
                onChange={e=>p.seek(+e.target.value)} className="npb-seek" style={{'--pct':pct}}/>
              <div className="npb-times"><span>{fmtTime(p.progress)}</span><span>{fmtTime(p.duration)}</span></div>
            </div>
            <div className="npb-ctrls">
              <button className={`nb ${p.shuffle?'lit':''}`} onClick={p.toggleShuffle}><Icon d={IC.shuffle} size={15}/></button>
              <button className="nb" onClick={p.prev}><Icon d={IC.prev} size={19}/></button>
              <button className="nb play" onClick={p.togglePlay}><Icon d={p.isPlaying?IC.pause:IC.play} size={19}/></button>
              <button className="nb" onClick={p.next}><Icon d={IC.next} size={19}/></button>
              <button className={`nb ${p.repeat!=='none'?'lit':''}`} onClick={p.cycleRepeat}>
                <Icon d={IC.repeat} size={15}/>
                {p.repeat==='one'&&<span className="r1">1</span>}
              </button>
            </div>
            <div className="npb-r">
              <div className="spd-wrap">
                <button className="spd-btn" onClick={()=>setShowSpd(s=>!s)}>
                  <Icon d={IC.speed} size={13}/> {p.playbackRate}x
                </button>
                {showSpd && (
                  <div className="spd-menu up">
                    {SPEEDS.map(s=>(
                      <button key={s} className={`spd-opt ${p.playbackRate===s?'on':''}`}
                        onClick={()=>{p.setPlaybackRate(s);setShowSpd(false)}}>{s}x</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="vol-row">
                <Icon d={IC.volume} size={15} style={{color:'var(--muted)',flexShrink:0}}/>
                <input type="range" min={0} max={1} step={0.01} value={p.volume}
                  onChange={e=>p.setVolume(+e.target.value)} className="vsl"/>
              </div>
              <button className="nb" onClick={()=>setBigPlayer(true)}><Icon d={IC.expand} size={17}/></button>
            </div>
          </div>
        </div>
      )}

      {bigPlayer && <BigPlayer p={p} onClose={()=>setBigPlayer(false)}/>}
      {showPL    && <PlaylistPanel p={p} onClose={()=>setShowPL(false)}/>}
    </div>
  )
}