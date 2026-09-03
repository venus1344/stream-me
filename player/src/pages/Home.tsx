import { useState, useRef, useCallback, useEffect } from 'react'
import NavBar from '../components/NavBar'
import RelayChip from '../components/RelayChip'
import GlowBackground from '../components/GlowBackground'
import { useNavItems } from '../lib/useNavItems'
import { getRouting } from '../lib/auth'

declare global {
  interface Window {
    Hls: any
    OvenPlayer: any
  }
}

function formatSeconds(v: number) {
  return Number.isFinite(v) ? `${v.toFixed(2)}s` : '-'
}

function formatBitrate(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '-'
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mbps`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} Kbps`
  return `${v} bps`
}

function getQualityLabel(w: number, h: number) {
  const edge = Math.max(w || 0, h || 0)
  if (!edge) return '-'
  if (edge >= 3800) return '4K'
  if (edge >= 2500) return '1440p'
  if (edge >= 1900) return '1080p'
  if (edge >= 1200) return '720p'
  if (edge >= 900) return '540p'
  if (edge >= 600) return '480p'
  return `${Math.min(w, h)}p`
}

export default function Home() {
  const navItems = useNavItems()
  const [host, setHost] = useState(() => {
    const r = getRouting()
    const base = r?.omeUrl || r?.workerUrl || null
    if (!base) return ''
    try {
      const u = new URL(base)
      return `${u.protocol}//${u.host}`
    } catch { return '' }
  })
  const [protocol, setProtocol] = useState<'hls' | 'webrtc'>('hls')
  const [app, setApp] = useState('app')
  const [stream, setStream] = useState('key')
  const [statusText, setStatusText] = useState('Idle')
  const [statusState, setStatusState] = useState<'idle' | 'playing' | 'error' | 'loading'>('idle')
  const [statsText, setStatsText] = useState('Stats will appear here after playback starts.')
  const [debugText, setDebugText] = useState('Debug log ready.')
  const [metricJitter, setMetricJitter] = useState('0ms')

  const videoRef = useRef<HTMLVideoElement>(null)
  const ovenRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<any>(null)
  const ovenInstanceRef = useRef<any>(null)
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debugRef = useRef(debugText)

  useEffect(() => { debugRef.current = debugText }, [debugText])

  const appendDebug = useCallback((msg: string) => {
    const stamp = new Date().toLocaleTimeString()
    setDebugText(prev => `[${stamp}] ${msg}\n${prev}`.trimEnd())
  }, [])

  useEffect(() => {
    appendDebug(`Page loaded from ${window.location.origin}`)
    return () => { if (statsTimerRef.current) clearInterval(statsTimerRef.current) }
  }, [])

  const getBaseOrigin = useCallback(() => {
    const h = host.trim()
    if (!h) return window.location.origin
    if (h.startsWith('http://') || h.startsWith('https://')) return h.replace(/\/$/, '')
    return `http://${h}`
  }, [host])

  const getPlaylistUrl = useCallback(() => {
    return `${getBaseOrigin()}/${app.trim() || 'app'}/${stream.trim() || 'key'}/llhls.m3u8`
  }, [getBaseOrigin, app, stream])

  const getWebRtcUrl = useCallback(() => {
    const h = host.trim()
    const pageHost = window.location.hostname
    const hostVal = h ? h.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : `${pageHost}:3333`
    return `ws://${hostVal}/${app.trim() || 'app'}/${stream.trim() || 'key'}`
  }, [host, app, stream])

  const computedUrl = protocol === 'webrtc' ? getWebRtcUrl() : getPlaylistUrl()

  const destroyHls = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
  }, [])

  const destroyOven = useCallback(() => {
    if (ovenInstanceRef.current?.remove) ovenInstanceRef.current.remove()
    ovenInstanceRef.current = null
    if (ovenRef.current) ovenRef.current.innerHTML = ''
  }, [])

  const stopStats = useCallback(() => {
    if (statsTimerRef.current) { clearInterval(statsTimerRef.current); statsTimerRef.current = null }
  }, [])

  const buildStatsLines = useCallback(() => {
    const mode = protocol
    const media = mode === 'webrtc' ? ovenRef.current?.querySelector('video') : videoRef.current
    const quality = media && typeof (media as any).getVideoPlaybackQuality === 'function'
      ? (media as any).getVideoPlaybackQuality() : {}

    const getBuffered = () => {
      if (!media?.buffered?.length) return NaN
      try { return Math.max(0, media.buffered.end(media.buffered.length - 1) - media.currentTime) }
      catch { return NaN }
    }

    const state = ovenInstanceRef.current?.getState?.() || (media ? (media.paused ? 'paused' : 'playing') : 'idle')

    if (state === 'playing') setStatusState('playing')

    if (mode === 'hls' && hlsRef.current && Number.isFinite(hlsRef.current.latency)) {
      setMetricJitter(`${(hlsRef.current.latency * 1000).toFixed(0)}ms`)
    }

    const lines = [
      `Protocol: ${mode === 'webrtc' ? 'WebRTC' : 'LL-HLS'}`,
      `State: ${state}`,
      `Source: ${mode === 'webrtc' ? getWebRtcUrl() : getPlaylistUrl()}`,
      `Media quality: ${media?.videoWidth ? getQualityLabel(media.videoWidth, media.videoHeight) : '-'}`,
      `Resolution: ${media?.videoWidth ? `${media.videoWidth}x${media.videoHeight}` : '-'}`,
      `Current time: ${media ? formatSeconds(media.currentTime) : '-'}`,
      `Buffered ahead: ${media ? formatSeconds(getBuffered()) : '-'}`,
      `Ready state: ${media ? media.readyState : '-'}`,
      `Frames: ${Number.isFinite(quality.totalVideoFrames) ? quality.totalVideoFrames : '-'}`,
      `Dropped frames: ${Number.isFinite(quality.droppedVideoFrames) ? quality.droppedVideoFrames : '-'}`,
    ]

    if (mode === 'hls' && hlsRef.current) {
      const hls = hlsRef.current
      const level = hls.levels?.[hls.currentLevel] || hls.levels?.[hls.nextLevel]
      lines.push(`Latency: ${Number.isFinite(hls.latency) ? formatSeconds(hls.latency) : '-'}`)
      lines.push(`Level: ${level ? `${level.width || '?'}x${level.height || '?'} @ ${formatBitrate(level.bitrate)}` : '-'}`)
    }

    if (mode === 'webrtc' && ovenInstanceRef.current) {
      const op = ovenInstanceRef.current
      const qls = op.getQualityLevels?.() || []
      const qi = op.getCurrentQuality?.()
      const cq = Array.isArray(qls) && Number.isInteger(qi) ? qls[qi] : null
      lines.push(`Selected rendition: ${cq ? getQualityLabel(cq.width, cq.height) : '-'}`)
      lines.push(`Quality track: ${cq ? `${cq.width || '?'}x${cq.height || '?'} @ ${formatBitrate(cq.bitrate)}` : '-'}`)
    }

    return lines
  }, [protocol, getPlaylistUrl, getWebRtcUrl])

  const startStats = useCallback(() => {
    stopStats()
    setStatsText(buildStatsLines().join('\n'))
    statsTimerRef.current = setInterval(() => {
      setStatsText(buildStatsLines().join('\n'))
    }, 1000)
  }, [stopStats, buildStatsLines])

  const loadStream = useCallback(async () => {
    const mode = protocol
    const playlistUrl = getPlaylistUrl()
    const webrtcUrl = getWebRtcUrl()

    destroyHls()
    destroyOven()
    stopStats()
    setStatsText('Stats will appear here after playback starts.')
    setStatusState('loading')
    setStatusText('Loading...')

    const video = videoRef.current!
    video.pause()
    video.removeAttribute('src')
    video.load()

    // Probe
    try {
      const res = await fetch(playlistUrl, { method: 'GET', cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 404) {
          setStatusText(`Stream offline. OME returned 404.`)
          setStatusState('error')
          appendDebug(`Stream probe failed: 404 (${playlistUrl})`)
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (e: any) {
      setStatusText(`Probe failed: ${e.message}`)
      setStatusState('error')
      appendDebug(`Stream probe failed: ${e.message}`)
      return
    }

    if (mode === 'webrtc') {
      if (!window.OvenPlayer) {
        setStatusText('OvenPlayer not loaded. WebRTC unavailable.')
        setStatusState('error')
        return
      }
      const h = host.trim()
      if (!h && ['localhost', '127.0.0.1', '::1', ''].includes(window.location.hostname)) {
        setStatusText('WebRTC needs remote OME host. Enter IP in Host field.')
        setStatusState('error')
        return
      }
      appendDebug(`Creating OvenPlayer: ${webrtcUrl}`)
      try {
        const instance = window.OvenPlayer.create('ovenplayer', {
          autoStart: true, autoFallback: false, mute: true,
          sources: [{ type: 'webrtc', file: webrtcUrl }],
        })
        ovenInstanceRef.current = instance
        instance.on?.('ready', () => appendDebug('OvenPlayer ready'))
        instance.on?.('error', (d: any) => {
          appendDebug(`player error: ${JSON.stringify(d)}`)
          setStatusText(`WebRTC error`)
          setStatusState('error')
        })
        setStatusText(`Loading via WebRTC: ${webrtcUrl}`)
        setStatusState('playing')
        startStats()
      } catch (e: any) {
        setStatusText(`WebRTC setup failed: ${e.message}`)
        setStatusState('error')
      }
      return
    }

    // HLS
    if (window.Hls?.isSupported()) {
      const hls = new window.Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 })
      hlsRef.current = hls
      hls.on(window.Hls.Events.MANIFEST_PARSED, async () => {
        try {
          await video.play()
          appendDebug(`HLS manifest parsed: ${playlistUrl}`)
          setStatusText(`Playing via hls.js: ${playlistUrl}`)
          setStatusState('playing')
          startStats()
        } catch (e: any) {
          setStatusText(`Autoplay failed: ${e.message}`)
          setStatusState('error')
        }
      })
      hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
        appendDebug(`hls.js error: ${JSON.stringify(data)}`)
        if (data.fatal) { setStatusText(`hls.js error: ${data.type}`); setStatusState('error') }
      })
      hls.loadSource(playlistUrl)
      hls.attachMedia(video)
      setStatusText(`Loading via hls.js: ${playlistUrl}`)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playlistUrl
      try {
        await video.play()
        setStatusText(`Playing via native HLS`)
        setStatusState('playing')
        startStats()
      } catch (e: any) {
        setStatusText(`Native HLS failed: ${e.message}`)
        setStatusState('error')
      }
    } else {
      setStatusText('Browser does not support HLS playback.')
      setStatusState('error')
    }
  }, [protocol, host, getPlaylistUrl, getWebRtcUrl, destroyHls, destroyOven, stopStats, startStats, appendDebug])

  const dotClass = statusState === 'playing' ? 'bg-green' : statusState === 'error' ? 'bg-danger' : 'bg-muted'
  const metricStateClass = statusState === 'playing' ? 'text-green' : statusState === 'error' ? 'text-danger' : 'text-muted'

  return (
    <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-8 lg:px-14 pt-5 sm:pt-[30px] pb-8 lg:pb-14 overflow-hidden min-h-screen">
      <GlowBackground variant="home" />

      <NavBar
        items={navItems}
        rightContent={
          <>
            <RelayChip />
          </>
        }
      />

      {/* Hero */}
      <section className="relative z-[3] flex items-center justify-between bg-surface rounded-[26px] border border-border-3 shadow-[0px_24px_60px_-34px_#D9772A55] p-4 sm:p-7 mb-6 gap-4 sm:gap-6 flex-wrap">
        <div className="flex flex-col gap-2.5 flex-1 min-w-[220px]">
          <h1 className="text-[clamp(24px,4vw,50px)] font-black tracking-[-2px] leading-none">Local Stream Preview</h1>
          <p className="text-muted text-[15px] leading-5">
            Verify LL-HLS or WebRTC playback, monitor stream health, and confirm OBS ingest without leaving the control surface.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 rounded-[18px] border border-border px-4 py-4 min-w-0">
            <span className="text-xl font-black text-blue">{protocol === 'webrtc' ? 'WebRTC' : 'LL-HLS'}</span>
            <span className="text-[10px] font-black text-muted">PROTOCOL</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 rounded-[18px] border border-border px-4 py-4 min-w-0">
            <span className="text-xl font-black text-green">{stream || 'key'}</span>
            <span className="text-[10px] font-black text-muted">STREAM</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 rounded-[18px] border border-border px-4 py-4 min-w-0">
            <span className="text-xl font-black text-amber">{metricJitter}</span>
            <span className="text-[10px] font-black text-muted">JITTER</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 rounded-[18px] border border-border px-4 py-4 min-w-0">
            <span className={`text-xl font-black ${metricStateClass}`}>{statusState}</span>
            <span className="text-[10px] font-black text-muted">STATE</span>
          </div>
        </div>
      </section>

      {/* Main Layout */}
      <div className="relative z-[4] flex gap-5.5 max-lg:flex-col">
        {/* Controls Panel */}
        <aside className="flex flex-col gap-4.5 bg-surface rounded-3xl border border-border shadow-[0px_20px_50px_-36px_#000000CC] p-5.5 w-[360px] shrink-0 max-lg:w-full">
          <span className="text-accent text-xs font-black tracking-[1.2px]">STREAM SOURCE</span>

          <div className="flex flex-col gap-2 w-full">
            <label className="text-muted text-xs font-black">HOST</label>
            <input value={host} onChange={e => setHost(e.target.value)} placeholder="213.199.53.211"
              className="w-full bg-surface-3 rounded-[14px] border border-border-2 px-3.5 py-3 font-mono text-[13px] font-extrabold text-text outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,42,0.2)] transition-all" />
          </div>

          <div className="flex flex-col gap-2 w-full">
            <label className="text-muted text-xs font-black">PROTOCOL</label>
            <select value={protocol} onChange={e => setProtocol(e.target.value as any)}
              className="w-full bg-surface-3 rounded-[14px] border border-border-2 px-3.5 py-3 font-sans text-[13px] font-extrabold text-text outline-none cursor-pointer appearance-none focus:border-accent transition-all">
              <option value="hls">LL-HLS</option>
              <option value="webrtc">WebRTC</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <label className="text-muted text-xs font-black">APP</label>
            <input value={app} onChange={e => setApp(e.target.value)}
              className="w-full bg-surface-3 rounded-[14px] border border-border-2 px-3.5 py-3 font-mono text-[13px] font-extrabold text-text outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,42,0.2)] transition-all" />
          </div>

          <div className="flex flex-col gap-2 w-full">
            <label className="text-muted text-xs font-black">STREAM</label>
            <input value={stream} onChange={e => setStream(e.target.value)}
              className="w-full bg-surface-3 rounded-[14px] border border-border-2 px-3.5 py-3 font-mono text-[13px] font-extrabold text-text outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,42,0.2)] transition-all" />
          </div>

          <button onClick={loadStream}
            className="w-full flex items-center justify-center py-4 px-4 bg-accent border border-accent rounded-full text-white font-sans text-[15px] font-black cursor-pointer hover:bg-accent-hover hover:shadow-[0_8px_24px_-8px_rgba(217,119,42,0.5)] active:opacity-80 transition-all">
            Load Stream
          </button>

          <div className="flex flex-col gap-1.5 bg-surface-3 rounded-2xl border border-border p-3.5 w-full">
            <span className="text-muted text-[11px] font-black">COMPUTED URL</span>
            <span className="text-text font-mono text-xs leading-[15px] break-all">{computedUrl}</span>
          </div>

          <div className="flex items-center gap-2.5 bg-surface-2 rounded-[14px] border border-border-2 px-3.5 py-3 w-full">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
            <span className="text-[13px] font-black">{statusText}</span>
          </div>
        </aside>

        {/* Player Workspace */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="flex flex-col gap-4 bg-surface rounded-3xl border border-border shadow-[0px_20px_50px_-36px_#000000CC] p-5">
            <div className="flex items-center justify-between w-full flex-wrap gap-2.5">
              <h2 className="text-[22px] font-black">Stream Output</h2>
              <div className="flex gap-2 flex-wrap max-sm:hidden">
                <span className="px-2.5 py-1.5 bg-surface-2 rounded-full border border-border-2 text-[11px] font-black text-blue">
                  {protocol === 'webrtc' ? 'WebRTC' : 'LL-HLS'}
                </span>
                <span className="px-2.5 py-1.5 bg-surface-2 rounded-full border border-border-2 text-[11px] font-black text-green">Proxy 8081</span>
                <span className="px-2.5 py-1.5 bg-surface-2 rounded-full border border-border-2 text-[11px] font-black text-amber">Muted</span>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-border-2 bg-surface-3 overflow-hidden w-full aspect-video">
              <video ref={videoRef} controls autoPlay muted playsInline
                className={`block w-full h-full object-contain rounded-[22px] bg-black ${protocol === 'webrtc' ? 'hidden' : ''}`} />
              <div ref={ovenRef} id="ovenplayer"
                className={`w-full h-full rounded-[22px] overflow-hidden ${protocol !== 'webrtc' ? 'hidden' : ''}`} />
            </div>

            <div className="flex gap-3 w-full max-sm:flex-col">
              {[
                { title: 'LL-HLS path', color: 'text-blue', body: 'Uses same-origin nginx proxy through port 8081.' },
                { title: 'WebRTC path', color: 'text-green', body: 'Connects directly to OME on port 3333 when selected.' },
                { title: 'Remote host', color: 'text-amber', body: 'Use explicit server host when testing from localhost.' },
              ].map(n => (
                <div key={n.title} className="flex-1 flex flex-col gap-1 bg-surface-3 rounded-[14px] border border-border p-3 min-w-0">
                  <span className={`text-xs font-black ${n.color}`}>{n.title}</span>
                  <span className="text-[11px] text-muted leading-[14px]">{n.body}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 w-full max-sm:flex-col">
            <div className="flex-1 flex flex-col gap-3 bg-surface-3 rounded-[18px] border border-border p-4 min-w-0">
              <h3 className="text-base font-black">Playback Stats</h3>
              <pre className="font-mono text-xs leading-5 text-muted whitespace-pre-wrap break-all m-0 overflow-auto">{statsText}</pre>
            </div>
            <div className="flex-1 flex flex-col gap-3 bg-surface-3 rounded-[18px] border border-border p-4 min-w-0">
              <h3 className="text-base font-black">Debug Log</h3>
              <pre className="font-mono text-xs leading-5 text-muted whitespace-pre-wrap break-all m-0 overflow-auto">{debugText}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
