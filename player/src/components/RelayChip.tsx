import { useEffect, useState } from 'react'

interface RelayStream {
  codec_type: string
  width?: number
  height?: number
}

interface RelayPayload {
  ok: boolean
  status?: string
  message?: string
  source?: string
  checkedAt?: string
  streams?: RelayStream[]
}

export default function RelayChip() {
  const [payload, setPayload] = useState<RelayPayload>({ ok: false, status: 'checking', streams: [] })

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/restream/relay-health', { cache: 'no-store' })
        if (!res.ok) throw new Error(`${res.status}`)
        setPayload(await res.json())
      } catch (e) {
        setPayload({ ok: false, status: 'error', message: (e as Error).message, streams: [] })
      }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  const video = payload.streams?.find(s => s.codec_type === 'video')
  const audio = payload.streams?.find(s => s.codec_type === 'audio')
  const resolution = video?.width && video?.height ? ` ${video.width}x${video.height}` : ''
  const audioLabel = audio ? ' + audio' : ''

  const isLive = payload.ok
  const status = payload.status || 'unknown'

  const chipClass = isLive
    ? 'bg-[#0F2A18] border-[#1F6B3A] text-[#D1FAE5]'
    : status === 'error' || status === 'offline'
      ? 'bg-danger-bg border-danger-border text-[#FFE4E6]'
      : 'bg-[#1A1A20] border-[#3A3A46] text-muted'

  const dotClass = isLive
    ? 'bg-green'
    : status === 'error' || status === 'offline'
      ? 'bg-danger'
      : 'bg-muted'

  const label = isLive
    ? `OBS Relay: live${resolution}${audioLabel}`
    : `OBS Relay: ${status}`

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-black whitespace-nowrap border transition-all ${chipClass}`}
      title={`${payload.source || ''}\n${payload.message || ''}\nChecked: ${payload.checkedAt || '-'}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <span>{label}</span>
    </div>
  )
}
