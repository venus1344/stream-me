import { useState, useEffect, useCallback, useRef } from 'react'
import NavBar from '../components/NavBar'
import RelayChip from '../components/RelayChip'
import GlowBackground from '../components/GlowBackground'

interface DestinationDef {
  name: string; title: string; subtitle: string; icon: string
}

interface DestState {
  running?: boolean; mode?: string; pid?: number; startedAt?: string; lastExitCode?: number | null
}

interface OfflineScene {
  name: string; size: number; modifiedAt?: string; selected?: boolean
}

const DESTINATIONS: DestinationDef[] = [
  { name: 'youtube', title: 'YouTube', subtitle: 'Recommended default: copy OBS video/audio directly to YouTube.', icon: 'Y' },
  { name: 'facebook', title: 'Facebook', subtitle: 'Vertical output by default: rotate 90\u00b0 clockwise, then scale height to 1280.', icon: 'F' },
  { name: 'instagram', title: 'Instagram', subtitle: 'Vertical output by default: rotate 90\u00b0 clockwise, then scale height to 1280.', icon: 'I' },
]

function formatBytes(b: number) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}

export default function Settings() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [destinations, setDestinations] = useState<Record<string, DestState>>({})
  const [logs, setLogs] = useState<Record<string, string>>({})
  const [runningTargets, setRunningTargets] = useState<string[]>([])
  const [configuredTargets, setConfiguredTargets] = useState<string[]>([])
  const [offlineScenes, setOfflineScenes] = useState<OfflineScene[]>([])
  const [message, setMessage] = useState({ text: 'Ready.', error: false })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const api = useCallback(async (path: string, method = 'GET', body?: any) => {
    const res = await fetch(`/api/restream/${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(await res.text() || `${res.status}`)
    return res.json()
  }, [])

  const refresh = useCallback(async () => {
    try {
      const p = await api('status')
      setConfig(p.config || {})
      setDestinations(p.destinations || {})
      setLogs(p.logs || {})
      setRunningTargets(p.status?.runningTargets || [])
      setConfiguredTargets(p.status?.targets || [])
      // fetch offline scenes
      try {
        const s = await api('offline-scenes')
        setOfflineScenes(s.files || [])
      } catch {}
    } catch (e: any) {
      setMessage({ text: e.message, error: true })
    }
  }, [api])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2500)
    return () => clearInterval(id)
  }, [refresh])

  const getFieldValue = (name: string, field: string) => config[`${name}${field}`] ?? ''

  const handleSave = async (name: string) => {
    try {
      const patch: Record<string, any> = { inputUrl: config.inputUrl || '' }
      const prefix = name
      const fields = ['Url', 'Key', 'CopyMode', 'HoldOnStop', 'HoldSeconds', 'HoldFps', 'HoldWidth', 'HoldHeight',
        'HoldVideoBitrateKbps', 'HoldAudioBitrateKbps', 'VideoBitrateKbps', 'AudioBitrateKbps',
        'MaxrateKbps', 'BufsizeKbps', 'Fps', 'GopSeconds', 'Preset', 'VideoFilter', 'ExtraArgs']
      fields.forEach(f => { patch[`${prefix}${f}`] = config[`${prefix}${f}`] ?? '' })
      const p = await api(`${name}/config`, 'POST', patch)
      setConfig(p.config || {})
      setMessage({ text: `${name} settings saved.`, error: false })
    } catch (e: any) { setMessage({ text: e.message, error: true }) }
  }

  const handleToggle = async (name: string) => {
    try {
      const isRunning = destinations[name]?.running
      if (isRunning) {
        const p = await api(`${name}/stop`, 'POST', {})
        setDestinations(p.destinations || {})
        setMessage({ text: `${name} stopped.`, error: false })
      } else {
        const patch: Record<string, any> = { inputUrl: config.inputUrl || '' }
        const p = await api(`${name}/start`, 'POST', patch)
        setConfig(p.config || {})
        setDestinations(p.destinations || {})
        setMessage({ text: `${name} started.`, error: false })
      }
    } catch (e: any) { setMessage({ text: e.message, error: true }) }
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setMessage({ text: 'Choose an offline scene clip first.', error: true }); return }
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/restream/offline-scenes/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text() || `${res.status}`)
      const p = await res.json()
      setOfflineScenes(p.files || [])
      if (fileRef.current) fileRef.current.value = ''
      setMessage({ text: 'Offline scene uploaded.', error: false })
    } catch (e: any) { setMessage({ text: e.message, error: true }) }
  }

  const handleSceneSelect = async (name: string) => {
    try {
      const p = await api('offline-scenes/select', 'POST', { name })
      setOfflineScenes(p.files || [])
      setMessage({ text: `Offline scene selected: ${name}`, error: false })
    } catch (e: any) { setMessage({ text: e.message, error: true }) }
  }

  const handleSceneDelete = async (name: string) => {
    try {
      const p = await api('offline-scenes/delete', 'POST', { name })
      setOfflineScenes(p.files || [])
      setMessage({ text: `Offline scene deleted: ${name}`, error: false })
    } catch (e: any) { setMessage({ text: e.message, error: true }) }
  }

  const setField = (key: string, val: any) => setConfig(prev => ({ ...prev, [key]: val }))

  const isYtCopy = Boolean(Number(config.youtubeCopyMode || 0))

  return (
    <main className="w-full max-w-[1600px] mx-auto relative px-12 pt-7 pb-10 z-[1]">
      <GlowBackground variant="settings" />

      <NavBar
        items={[{ label: 'Settings', to: '/settings' }, { label: 'Player', to: '/home' }]}
        rightContent={
          <>
            <RelayChip />
            <button onClick={refresh} className="flex items-center px-4 py-2.5 rounded-full border border-border-2 bg-[#181B22] text-[13px] font-bold text-text cursor-pointer hover:brightness-110">
              Refresh
            </button>
          </>
        }
      />

      {/* Hero Stats */}
      <section className="flex items-center justify-between gap-6 p-7 bg-[#0B0C10] border border-border-3 rounded-[26px] shadow-[0_24px_60px_-30px_rgba(217,119,42,0.2)] mb-5 flex-wrap">
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          <h1 className="text-[clamp(28px,4vw,54px)] font-extrabold tracking-[-2.4px] leading-none">Live Routing Studio</h1>
          <p className="text-muted text-base leading-[22px]">Control YouTube, Facebook and Instagram restreams independently while preserving the custom web stream.</p>
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 border border-border rounded-[18px] px-4 py-4 min-w-[100px]">
            <span className="text-2xl font-extrabold text-danger">{runningTargets.length}</span>
            <span className="text-[11px] font-bold text-muted uppercase">LIVE</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 border border-border rounded-[18px] px-4 py-4 min-w-[100px]">
            <span className="text-2xl font-extrabold text-blue">{configuredTargets.length}</span>
            <span className="text-[11px] font-bold text-muted uppercase">CONFIGURED</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 border border-border rounded-[18px] px-4 py-4 min-w-[100px]">
            <span className="text-2xl font-extrabold text-amber">-</span>
            <span className="text-[11px] font-bold text-muted uppercase">FAILOVER</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-surface-2 border border-border rounded-[18px] px-4 py-4 min-w-[100px]">
            <span className="text-2xl font-extrabold text-green">-</span>
            <span className="text-[11px] font-bold text-muted uppercase">OFFLINE LOOP</span>
          </div>
        </div>
      </section>

      {/* Status Bar */}
      <section className="flex items-center justify-between gap-4 px-4 py-3.5 border border-border rounded-[18px] bg-surface/90 shadow-[0_10px_30px_rgba(0,0,0,0.18)] mb-5 flex-wrap">
        <div>
          <div className={`font-bold ${runningTargets.length > 0 ? 'text-green' : 'text-muted'}`}>
            {runningTargets.length > 0 ? `Running: ${runningTargets.join(', ')}` : 'No restream destinations running'}
          </div>
          <div className="text-muted text-sm">
            {configuredTargets.length ? `Configured targets: ${configuredTargets.join(', ')}` : 'No destination has a stream key yet.'}
          </div>
        </div>
        <div className={`text-sm ${message.error ? 'text-[#ffd0d0]' : 'text-muted'}`}>{message.text}</div>
      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-[350px_1fr] gap-5 items-start max-lg:grid-cols-1">
        {/* Sidebar */}
        <aside className="bg-surface/90 border border-border rounded-3xl shadow-[0px_20px_50px_-36px_rgba(0,0,0,0.8)]">
          <div className="p-5 flex flex-col gap-4">
            <span className="text-accent text-xs font-extrabold tracking-[1.2px] uppercase">Global Controls</span>

            <div>
              <h3 className="text-text text-lg font-extrabold mb-2">Relay Input</h3>
              <label className="grid gap-1.5 text-muted text-sm">
                Shared input URL
                <input value={config.inputUrl || ''} onChange={e => setField('inputUrl', e.target.value)}
                  placeholder="rtmp://127.0.0.1:1936/restream/input"
                  className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
              </label>
              <p className="text-muted text-[0.78rem] leading-relaxed mt-1">Every destination pulls from this relay branch.</p>
            </div>

            <div>
              <h3 className="text-text text-lg font-extrabold mb-2">Default Filters</h3>
              <div className="flex flex-col gap-2">
                <div className="bg-surface-2 border border-border rounded-[14px] p-3 flex flex-col gap-0.5">
                  <span className="text-muted text-[11px] font-extrabold uppercase">YouTube</span>
                  <span className="text-[#7DD3FC] font-mono text-xs">scale=-2:720</span>
                </div>
                <div className="bg-surface-2 border border-border rounded-[14px] p-3 flex flex-col gap-0.5">
                  <span className="text-muted text-[11px] font-extrabold uppercase">Vertical (Facebook / Instagram)</span>
                  <span className="text-[#7DD3FC] font-mono text-xs">transpose=1,scale=-2:1280</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-text text-lg font-extrabold mb-2">Offline Scene</h3>
              <p className="text-muted text-[0.76rem] leading-relaxed mb-2">The selected clip is used for every destination when OBS relay drops.</p>
              <input type="file" ref={fileRef} accept="video/*,.mkv,.ts" className="text-xs text-muted mb-2" />
              <div className="flex gap-2 flex-wrap mb-2">
                <button onClick={handleUpload} className="px-3 py-2 bg-accent text-white rounded-full text-[13px] font-extrabold cursor-pointer border-none hover:brightness-110">Upload</button>
                <button onClick={() => refresh()} className="px-3 py-2 bg-[#181B22] text-text border border-border-2 rounded-full text-[13px] font-extrabold cursor-pointer hover:brightness-110">Refresh Clips</button>
              </div>
              <div className="grid gap-2">
                {offlineScenes.length === 0 ? (
                  <span className="text-muted text-sm">No offline clips loaded yet.</span>
                ) : offlineScenes.map(f => (
                  <div key={f.name} className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center p-2 border rounded-xl bg-[#0B0C10] ${f.selected ? 'border-green/60' : 'border-border'}`}>
                    <div>
                      <strong className="text-sm block break-all">{f.name}</strong>
                      <span className="text-muted text-[0.72rem]">{formatBytes(f.size)} · {f.modifiedAt || ''}{f.selected ? ' · selected' : ''}</span>
                    </div>
                    <button onClick={() => handleSceneSelect(f.name)} className="px-2 py-1.5 bg-[#181B22] text-text border border-border-2 rounded-full text-xs font-extrabold cursor-pointer">Select</button>
                    <button onClick={() => handleSceneDelete(f.name)} className="px-2 py-1.5 bg-gradient-to-br from-[#ff9c9c] to-danger text-white rounded-full text-xs font-extrabold cursor-pointer border-none">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Destination Cards */}
        <div className="flex flex-col gap-3.5">
          {DESTINATIONS.map(dest => {
            const state = destinations[dest.name] || {}
            const isRunning = Boolean(state.running)
            const isOpen = expanded.has(dest.name)
            const key = config[`${dest.name}Key`] || ''
            const filter = config[`${dest.name}VideoFilter`] || 'none'
            const summary = `${key ? 'configured' : 'no key'}${state.mode ? ` · ${state.mode}` : ''} · filter: ${filter}`
            const isCopyDisabled = dest.name === 'youtube' && isYtCopy

            return (
              <article key={dest.name} className="border border-border rounded-3xl bg-[#0B0C10] overflow-hidden">
                {/* Card Head */}
                <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b flex-wrap ${isOpen ? 'border-accent/40' : 'border-border'}`}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-[58px] h-[58px] rounded-2xl flex items-center justify-center shrink-0 text-2xl font-black text-white ${dest.name === 'youtube' ? 'bg-accent' : 'bg-[#181B22]'}`}>
                      {dest.icon}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-[26px] font-extrabold m-0">{dest.title}</h2>
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full border text-[11px] font-extrabold ${isRunning ? 'bg-accent border-accent text-white' : 'bg-[#181B22] border-[#3B4251] text-muted'}`}>
                          {isRunning ? `running${state.mode ? `/${state.mode}` : ''}` : 'idle'}
                        </span>
                      </div>
                      <span className="text-muted text-[13px] leading-relaxed">{dest.subtitle}</span>
                      <span className="text-[#B6C2D1] font-mono text-[11px] break-all">{summary}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button onClick={() => handleToggle(dest.name)}
                      className={`px-6 py-3 rounded-full text-[15px] font-black cursor-pointer border ${isRunning ? 'bg-gradient-to-br from-[#ff9c9c] to-danger border-[rgba(255,123,123,0.75)] text-white' : 'bg-bg border-[#556070] text-white'}`}>
                      {isRunning ? 'End' : 'Live'}
                    </button>
                    <button onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(dest.name) ? s.delete(dest.name) : s.add(dest.name); return s })}
                      className="px-4 py-3 rounded-full text-[15px] bg-[#181B22] border border-border-2 text-text font-extrabold cursor-pointer">
                      {isOpen ? 'Hide' : 'Settings'}
                    </button>
                  </div>
                </div>

                {/* Card Details */}
                {isOpen && (
                  <div className="p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      <label className="col-span-2 grid gap-1.5 text-muted text-sm max-sm:col-span-1">Server URL
                        <input value={getFieldValue(dest.name, 'Url')} onChange={e => setField(`${dest.name}Url`, e.target.value)}
                          className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                      </label>
                      <label className="col-span-2 grid gap-1.5 text-muted text-sm max-sm:col-span-1">Stream key
                        <input type="password" value={getFieldValue(dest.name, 'Key')} onChange={e => setField(`${dest.name}Key`, e.target.value)}
                          placeholder="Leave empty to disable this destination"
                          className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                      </label>

                      {dest.name === 'youtube' && (
                        <>
                          <label className="col-span-2 border border-accent/40 rounded-[14px] p-3 bg-accent/[0.08] max-sm:col-span-1">
                            <span className="flex items-start gap-2.5 text-text">
                              <input type="checkbox" checked={Boolean(Number(config.youtubeCopyMode || 0))}
                                onChange={e => setField('youtubeCopyMode', e.target.checked ? 1 : 0)}
                                className="w-auto mt-0.5" />
                              <span>
                                Recommended: copy OBS video/audio without re-encoding
                                <span className="block text-muted text-[0.76rem] leading-relaxed mt-1">Best for YouTube stability. Uncheck only if you need to resize or force different encoder settings.</span>
                              </span>
                            </span>
                          </label>
                          <label className="col-span-2 border border-amber/40 rounded-[14px] p-3 bg-amber/[0.08] max-sm:col-span-1">
                            <span className="flex items-start gap-2.5 text-text">
                              <input type="checkbox" checked={Boolean(Number(config.youtubeHoldOnStop || 0))}
                                onChange={e => setField('youtubeHoldOnStop', e.target.checked ? 1 : 0)}
                                className="w-auto mt-0.5" />
                              <span>
                                Graceful YouTube stop: send black video and silent audio before closing
                                <span className="block text-muted text-[0.76rem] leading-relaxed mt-1">Keeps YouTube receiving data for the configured grace period.</span>
                              </span>
                            </span>
                          </label>
                          {Boolean(Number(config.youtubeHoldOnStop || 0)) && (
                            <>
                              <label className="grid gap-1.5 text-muted text-sm">Hold seconds
                                <input type="number" value={getFieldValue('youtube', 'HoldSeconds')} onChange={e => setField('youtubeHoldSeconds', e.target.value)}
                                  className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                              </label>
                              <label className="grid gap-1.5 text-muted text-sm">Hold FPS
                                <input type="number" value={getFieldValue('youtube', 'HoldFps')} onChange={e => setField('youtubeHoldFps', e.target.value)}
                                  className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                              </label>
                              <label className="grid gap-1.5 text-muted text-sm">Hold width
                                <input type="number" value={getFieldValue('youtube', 'HoldWidth')} onChange={e => setField('youtubeHoldWidth', e.target.value)}
                                  className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                              </label>
                              <label className="grid gap-1.5 text-muted text-sm">Hold height
                                <input type="number" value={getFieldValue('youtube', 'HoldHeight')} onChange={e => setField('youtubeHoldHeight', e.target.value)}
                                  className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                              </label>
                            </>
                          )}
                        </>
                      )}

                      <div className={`col-span-2 grid grid-cols-2 gap-3 max-sm:grid-cols-1 ${isCopyDisabled ? 'opacity-45 pointer-events-none' : ''}`}>
                        <label className="grid gap-1.5 text-muted text-sm">Video bitrate
                          <input type="number" value={getFieldValue(dest.name, 'VideoBitrateKbps')} onChange={e => setField(`${dest.name}VideoBitrateKbps`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                        <label className="grid gap-1.5 text-muted text-sm">Audio bitrate
                          <input type="number" value={getFieldValue(dest.name, 'AudioBitrateKbps')} onChange={e => setField(`${dest.name}AudioBitrateKbps`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                        <label className="grid gap-1.5 text-muted text-sm">Maxrate
                          <input type="number" value={getFieldValue(dest.name, 'MaxrateKbps')} onChange={e => setField(`${dest.name}MaxrateKbps`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                        <label className="grid gap-1.5 text-muted text-sm">Buffer size
                          <input type="number" value={getFieldValue(dest.name, 'BufsizeKbps')} onChange={e => setField(`${dest.name}BufsizeKbps`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                        <label className="grid gap-1.5 text-muted text-sm">FPS
                          <input type="number" value={getFieldValue(dest.name, 'Fps')} onChange={e => setField(`${dest.name}Fps`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                        <label className="grid gap-1.5 text-muted text-sm">GOP seconds
                          <input type="number" value={getFieldValue(dest.name, 'GopSeconds')} onChange={e => setField(`${dest.name}GopSeconds`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                        <label className="col-span-2 grid gap-1.5 text-muted text-sm max-sm:col-span-1">Preset
                          <select value={getFieldValue(dest.name, 'Preset') || 'veryfast'} onChange={e => setField(`${dest.name}Preset`, e.target.value)}
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent">
                            {['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </label>
                        <label className="col-span-2 grid gap-1.5 text-muted text-sm max-sm:col-span-1">Video filter
                          <input value={getFieldValue(dest.name, 'VideoFilter')} onChange={e => setField(`${dest.name}VideoFilter`, e.target.value)}
                            placeholder="scale=-2:720"
                            className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent" />
                        </label>
                      </div>

                      <label className="col-span-2 grid gap-1.5 text-muted text-sm max-sm:col-span-1">Extra ffmpeg args
                        <textarea value={getFieldValue(dest.name, 'ExtraArgs')} onChange={e => setField(`${dest.name}ExtraArgs`, e.target.value)}
                          placeholder='-metadata title="My Live"'
                          className="w-full border border-border-2 rounded-[14px] px-3.5 py-3 text-text bg-surface-3 font-mono text-xs outline-none focus:border-accent min-h-[78px] resize-y" />
                      </label>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleSave(dest.name)} className="px-3.5 py-2.5 bg-[#181B22] text-text border border-border-2 rounded-full text-[13px] font-extrabold cursor-pointer hover:brightness-110">Save</button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
                      <div className="border border-border rounded-[14px] bg-surface-3 p-3">
                        <span className="block text-muted text-[0.7rem] uppercase tracking-wider mb-1">PID</span>
                        <strong className="text-sm font-bold font-mono">{state.pid || '-'}</strong>
                      </div>
                      <div className="border border-border rounded-[14px] bg-surface-3 p-3">
                        <span className="block text-muted text-[0.7rem] uppercase tracking-wider mb-1">Started</span>
                        <strong className="text-sm font-bold font-mono">{state.startedAt || '-'}</strong>
                      </div>
                      <div className="border border-border rounded-[14px] bg-surface-3 p-3">
                        <span className="block text-muted text-[0.7rem] uppercase tracking-wider mb-1">Exit</span>
                        <strong className="text-sm font-bold font-mono">{state.lastExitCode ?? '-'}</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-accent text-xs font-extrabold tracking-[1.2px] uppercase block mb-2">ffmpeg Log</span>
                      <div className="h-[230px] overflow-y-auto whitespace-pre-wrap break-words text-[#AAB4C2] bg-surface-3 border border-border rounded-[14px] p-3.5 font-mono text-[11px] leading-[15px]">
                        {logs[dest.name] || 'No log yet.'}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
