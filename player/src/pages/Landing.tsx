import { useState } from 'react'
import { Link } from 'react-router-dom'
import streamIcon from '../assets/stream-bold.svg'
import lightningIcon from '../assets/lightning-1.svg'
import refreshIcon from '../assets/refresh.svg'
import calendarIcon from '../assets/calendar.svg'
import branchIcon from '../assets/branch-24-regular.svg'
import pricingData from '../assets/pricing.json'
import sourceStreamImg from '../assets/source-stream.png'

const CHECK_COLORS = { blue: 'text-blue', green: 'text-green', amber: 'text-amber' } as const

// Hero fan broadcast constants
const SRC = { x: 860, y: 410 }
const FAN_POS = [
  { top: '8%',  left: '58%', delay: '0s' },
  { top: '26%', left: '74%', delay: '0.6s' },
  { top: '48%', left: '80%', delay: '1.2s' },
  { top: '68%', left: '70%', delay: '1.8s' },
  { top: '84%', left: '52%', delay: '2.4s' },
]
const FAN_LINES = FAN_POS.map(p => {
  const x2 = parseFloat(p.left) / 100 * 1600 + 20
  const y2 = parseFloat(p.top) / 100 * 820 + 20
  const mx = SRC.x + (x2 - SRC.x) * 0.55
  const my = SRC.y + (y2 - SRC.y) * 0.15
  return { d: `M ${SRC.x} ${SRC.y} Q ${mx} ${my} ${x2} ${y2}` }
})
const PLATFORMS = [
  { name: 'YouTube',   color: 'oklch(0.62 0.19 25)',  icon: 'yt'     as const },
  { name: 'Twitch',    color: 'oklch(0.6 0.18 305)',   icon: 'twitch' as const },
  { name: 'TikTok',    color: 'oklch(0.72 0.03 200)',  icon: 'tiktok' as const },
  { name: 'Instagram', color: 'oklch(0.62 0.16 350)',  icon: 'ig'     as const },
  { name: 'Facebook',  color: 'oklch(0.6 0.14 255)',   icon: 'fb'     as const },
].map((p, i) => ({ ...p, ...FAN_POS[i] }))

function PlatformIcon({ type }: { type: 'yt' | 'twitch' | 'tiktok' | 'ig' | 'fb' }) {
  const s = 'oklch(0.14 0.01 80)'
  if (type === 'yt')
    return <svg width="12" height="12" viewBox="0 0 24 24"><path d="M9 7L18 12L9 17V7Z" fill={s} /></svg>
  if (type === 'twitch')
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="2"><rect x="6" y="4" width="12" height="12" rx="1" /><line x1="9" y1="16" x2="9" y2="20" /><line x1="15" y1="16" x2="15" y2="20" /></svg>
  if (type === 'tiktok')
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="2"><path d="M9 18a4 4 0 1 0 4-4V4" /><path d="M13 4c0 2.5 2 4.5 4.5 4.5" strokeLinecap="round" /></svg>
  if (type === 'ig')
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="16.5" cy="7.5" r="0.8" fill={s} stroke="none" /></svg>
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="2"><path d="M15 8h-2a2 2 0 0 0-2 2v10M9 13h5" /></svg>
}

function Check({ color }: { color: keyof typeof CHECK_COLORS }) {
  return <span className={`text-sm font-black ${CHECK_COLORS[color]}`}>✓</span>
}

function FeatureItem({ text, color = 'blue' }: { text: string; color?: keyof typeof CHECK_COLORS }) {
  return (
    <div className="flex items-center gap-2.5">
      <Check color={color} />
      <span className="text-sm text-text">{text}</span>
    </div>
  )
}

function Spec({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-base font-black" style={{ color }}>{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  )
}

export default function Landing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="flex flex-col items-start bg-bg w-full max-w-[1600px] mx-auto overflow-hidden">
      {/* Hero */}
      <section
        className="w-full relative shrink-0 overflow-hidden flex flex-col xl:h-[820px]"
        style={{ minHeight: 560, background: 'linear-gradient(120deg, oklch(0.09 0.006 80) 0%, oklch(0.13 0.01 70) 55%, oklch(0.16 0.03 50) 100%)' }}
      >
        {/* Orange glow — always present */}
        <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.62 0.16 45) 0%, transparent 65%)', opacity: 0.18, filter: 'blur(40px)', pointerEvents: 'none' }} />

        {/* Nav — always visible, links collapse on mobile */}
        <div className="relative z-[3] flex items-center justify-between px-6 py-5 md:px-12 xl:px-[48px] xl:py-[22px] shrink-0">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'oklch(0.62 0.16 45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: 'oklch(0.09 0.006 80)' }}>O</div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.01em', color: 'oklch(0.97 0.006 80)' }}>OME Stream</span>
          </div>
          {/* Full nav links — tablet and up */}
          <div className="hidden md:flex items-center" style={{ gap: 32 }}>
            {['Product', 'Pricing', 'Docs'].map(label => (
              <a key={label} href="#" style={{ fontWeight: 500, fontSize: 15, color: 'oklch(0.72 0.015 80)' }}>{label}</a>
            ))}
            <Link to="/login" style={{ fontWeight: 600, fontSize: 15, color: 'oklch(0.97 0.006 80)', border: '1px solid oklch(0.4 0.01 80)', borderRadius: 8, padding: '9px 18px' }}>Sign in</Link>
          </div>
          {/* Mobile — sign in only */}
          <Link to="/login" className="md:hidden" style={{ fontWeight: 600, fontSize: 14, color: 'oklch(0.97 0.006 80)', border: '1px solid oklch(0.4 0.01 80)', borderRadius: 8, padding: '8px 16px' }}>Sign in</Link>
        </div>

        {/* ── DESKTOP (xl+): absolute fan broadcast layout ── */}

        {/* Stream preview with left fade */}
        <div className="hidden xl:block" style={{ position: 'absolute', left: 300, top: 210, width: 560, height: 400, zIndex: 1, WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 55%)', maskImage: 'linear-gradient(to right, transparent 0%, black 55%)', borderRadius: 16, overflow: 'hidden', border: '1px solid oklch(1 0 0 / 0.08)' }}>
          <img src={sourceStreamImg} alt="Source stream preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        {/* SVG fan lines + animated dots */}
        <svg className="hidden xl:block" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} viewBox="0 0 1600 820">
          <defs>
            <linearGradient id="fanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.62 0.16 45)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="oklch(0.72 0.17 45)" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {FAN_LINES.map((line, i) => (
            <g key={i}>
              <path d={line.d} fill="none" stroke="url(#fanGrad)" strokeWidth={2} strokeLinecap="round" />
              <circle r={4} fill="oklch(0.75 0.17 45)">
                <animateMotion dur="3.5s" repeatCount="indefinite" path={line.d} />
              </circle>
            </g>
          ))}
          <circle cx={SRC.x} cy={SRC.y} r={6} fill="oklch(0.62 0.16 45)" />
        </svg>

        {/* Platform bubbles — desktop only, absolutely positioned */}
        {PLATFORMS.map(p => (
          <div key={p.name} className="hero-drift hidden xl:flex" style={{ position: 'absolute', zIndex: 2, alignItems: 'center', gap: 10, background: 'oklch(0.15 0.01 80 / 0.9)', border: '1px solid oklch(1 0 0 / 0.08)', borderRadius: 999, padding: '10px 18px 10px 12px', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', boxShadow: '0 8px 24px oklch(0 0 0 / 0.35)', top: p.top, left: p.left, animationDelay: p.delay }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlatformIcon type={p.icon} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'oklch(0.97 0.006 80)', whiteSpace: 'nowrap' }}>{p.name}</span>
          </div>
        ))}

        {/* Text block — desktop absolute, bottom-left */}
        <div className="hidden xl:block" style={{ position: 'absolute', left: 48, bottom: 64, maxWidth: 620, zIndex: 2 }}>
          <div style={{ display: 'inline-block', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'oklch(0.72 0.17 45)', border: '1px solid oklch(0.62 0.16 45)', borderRadius: 999, padding: '6px 14px', marginBottom: 20 }}>
            One source. Every platform.
          </div>
          <h1 style={{ fontWeight: 900, fontSize: 68, lineHeight: 1.02, letterSpacing: '-0.03em', color: 'oklch(0.97 0.006 80)', margin: '0 0 22px 0' }}>
            Go live once.<br />Reach every<br />platform at once.
          </h1>
          <p style={{ fontWeight: 400, fontSize: 19, lineHeight: 1.5, color: 'oklch(0.72 0.015 80)', margin: '0 0 32px 0', maxWidth: 540 }}>
            One OBS setup. YouTube, Twitch, TikTok, Instagram, and Facebook — simultaneously. No extra encoders, no dropped frames.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link to="/login" style={{ fontWeight: 700, fontSize: 16, color: 'oklch(0.09 0.006 80)', background: 'oklch(0.62 0.16 45)', borderRadius: 10, padding: '15px 28px' }}>Start Free Trial</Link>
            <a href="#features" style={{ fontWeight: 600, fontSize: 16, color: 'oklch(0.97 0.006 80)' }}>See how it works →</a>
          </div>
        </div>

        {/* ── TABLET + MOBILE (< xl): stacked / two-column layout ── */}
        <div className="xl:hidden relative z-[2] flex-1 flex flex-col md:flex-row md:items-center md:gap-10 px-6 md:px-12 pt-6 pb-12">
          {/* Text */}
          <div className="flex-1">
            <div style={{ display: 'inline-block', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'oklch(0.72 0.17 45)', border: '1px solid oklch(0.62 0.16 45)', borderRadius: 999, padding: '5px 12px', marginBottom: 18 }}>
              One source. Every platform.
            </div>
            <h1 className="font-black tracking-tight" style={{ fontSize: 'clamp(32px, 5.5vw, 54px)', lineHeight: 1.04, letterSpacing: '-0.025em', color: 'oklch(0.97 0.006 80)', margin: '0 0 18px 0' }}>
              Go live once. Reach every platform at once.
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: 'oklch(0.72 0.015 80)', margin: '0 0 28px 0', maxWidth: 480 }}>
              One OBS setup. YouTube, Twitch, TikTok, Instagram, and Facebook — simultaneously. No extra encoders, no dropped frames.
            </p>
            <div className="flex items-center flex-wrap gap-4">
              <Link to="/login" style={{ fontWeight: 700, fontSize: 15, color: 'oklch(0.09 0.006 80)', background: 'oklch(0.62 0.16 45)', borderRadius: 10, padding: '13px 24px' }}>Start Free Trial</Link>
              <a href="#features" style={{ fontWeight: 600, fontSize: 15, color: 'oklch(0.97 0.006 80)' }}>See how it works →</a>
            </div>
          </div>

          {/* Platform list — column on tablet, wrap on mobile */}
          <div className="mt-10 md:mt-0 flex flex-wrap md:flex-col gap-2.5 md:gap-3 md:w-48 shrink-0">
            {PLATFORMS.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'oklch(0.15 0.01 80 / 0.85)', border: '1px solid oklch(1 0 0 / 0.08)', borderRadius: 999, padding: '8px 14px 8px 10px', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PlatformIcon type={p.icon} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'oklch(0.97 0.006 80)', whiteSpace: 'nowrap' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="flex flex-col gap-8 px-6 md:px-10 xl:px-[120px] py-10 xl:py-[60px] w-full">
        <span className="text-xs font-black tracking-[1.5px] text-accent">WHO IT'S FOR</span>
        <h2 className="text-3xl xl:text-4xl font-black text-text">Built for Your Workflow</h2>
        <div className="flex flex-col md:flex-row gap-5 w-full">
          {[
            { color: 'bg-accent', title: 'Individual Creators', desc: 'One stream, multiple audiences. Reach your fans on YouTube and TikTok simultaneously without managing separate streams.' },
            { color: 'bg-green', title: 'Broadcasters & Teams', desc: 'Coordinate multi-platform broadcasts. Schedule streams, monitor health, and manage viewers across all platforms in one dashboard.' },
            { color: 'bg-blue', title: 'Events & Live Content', desc: 'Host conferences, workshops, or live events. Stream to YouTube, Facebook, Instagram simultaneously with fallback video if your connection drops.' },
          ].map(c => (
            <div key={c.title} className="flex-1 flex flex-col gap-4 bg-surface rounded-[18px] border border-border p-7">
              <div className={`${c.color} rounded-sm h-1 w-9`} />
              <h3 className="text-xl font-black text-text">{c.title}</h3>
              <p className="text-sm text-muted leading-5">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="flex flex-col gap-8 px-6 md:px-10 xl:px-[120px] py-10 xl:py-[60px] w-full">
        <span className="text-xs font-black tracking-[1.5px] text-blue">FEATURES</span>
        <h2 className="text-3xl xl:text-4xl font-black text-text">Powerful Features Built In</h2>
        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-col md:flex-row gap-5 w-full">
            {[
              { icon: streamIcon, title: 'Stream to Multiple Platforms', desc: 'Send your stream to YouTube, Facebook, Instagram, and more simultaneously. One OBS setup, infinite reach.' },
              { icon: lightningIcon, title: 'Low-Latency Playback', desc: 'LL-HLS and WebRTC playback with minimal delay. Keep your audience engaged in real-time.' },
            ].map(f => (
              <div key={f.title} className="flex-1 flex flex-col gap-3 bg-surface rounded-[18px] border border-border p-7">
                <img src={f.icon} alt={f.title} className="w-7 h-7" />
                <h3 className="text-lg font-black text-text">{f.title}</h3>
                <p className="text-sm text-muted leading-5">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-5 w-full">
            {[
              { icon: refreshIcon, title: 'Never Miss a Beat', desc: 'If your connection drops, pre-recorded videos automatically play. Your stream stays live.' },
              { icon: calendarIcon, title: 'Schedule & Queue Streams', desc: 'Plan your content in advance. Schedule broadcasts and queue multiple streams to go live at set times.' },
            ].map(f => (
              <div key={f.title} className="flex-1 flex flex-col gap-3 bg-surface rounded-[18px] border border-border p-7">
                <img src={f.icon} alt={f.title} className="w-7 h-7" />
                <h3 className="text-lg font-black text-text">{f.title}</h3>
                <p className="text-sm text-muted leading-5">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex w-full xl:justify-center">
            <div className="w-full xl:w-[660px] flex flex-col gap-3 bg-surface rounded-[18px] border border-border p-7">
              <img src={branchIcon} alt="One Stream, Infinite Reach" className="w-7 h-7" />
              <h3 className="text-lg font-black text-text">One Stream, Infinite Reach</h3>
              <p className="text-sm text-muted leading-5">Send one RTMP stream to OME. No OBS plugins, no configuration per platform. We handle the distribution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="flex flex-col md:flex-row gap-5 px-6 md:px-10 xl:px-[120px] py-10 xl:py-[60px] w-full">
        {[
          { value: '99.9%', label: 'Uptime Guaranteed', sub: 'Backed by enterprise infrastructure', color: '#F5B84B' },
          { value: '50K+', label: 'Successful Streams', sub: 'Powering creators worldwide', color: '#2EE66B' },
          { value: '10K+', label: 'Active Users', sub: 'Streaming right now', color: '#4DA3FF' },
        ].map(s => (
          <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5 bg-surface rounded-[18px] border border-border py-8 px-7">
            <span className="text-5xl font-black" style={{ color: s.color }}>{s.value}</span>
            <span className="text-base font-black text-text">{s.label}</span>
            <span className="text-xs text-muted text-center">{s.sub}</span>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="flex flex-col gap-8 px-6 md:px-10 xl:px-[120px] py-10 xl:py-[60px] w-full">
        <span className="text-xs font-black tracking-[1.5px] text-amber">PRICING</span>
        <h2 className="text-3xl xl:text-4xl font-black text-text">Simple, Transparent Pricing</h2>
        <div className="flex items-center gap-4 w-fit bg-surface rounded-xl border border-border p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-accent text-white'
                : 'text-muted hover:text-text'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${
              billingPeriod === 'annual'
                ? 'bg-green text-text'
                : 'text-muted hover:text-text'
            }`}
          >
            Annual
          </button>
        </div>
        {billingPeriod === 'annual' && (
          <span className="text-sm font-black text-green">{pricingData.discountLabel}</span>
        )}
        <div className="flex flex-col lg:flex-row gap-5 w-full">
          {pricingData.tiers.map(tier => {
            const price = billingPeriod === 'annual' ? tier.annual : tier.monthly
            const period = billingPeriod === 'annual' ? '/year' : '/month'
            const displayPrice = price === null ? 'Custom' : `$${price}`

            return (
            <div key={tier.name} className={`flex flex-col gap-5 rounded-[20px] py-8 px-7 lg:flex-1 ${tier.highlighted ? 'border-2 border-green bg-surface' : 'border border-border bg-surface'}`} style={tier.highlighted ? { boxShadow: '0px 0px 30px 0px #2EE66B22' } : {}}>
              <span className="inline-flex px-3 py-1.5 rounded-lg text-[11px] font-black w-fit" style={{ background: tier.badgeBg, border: `1px solid ${tier.badgeBorder}`, color: tier.badgeText }}>
                {tier.badge}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[44px] font-black text-text">{displayPrice}</span>
                {price !== null && <span className="text-sm text-muted">{period}</span>}
              </div>
              <div className="flex gap-3 w-full">
                <Spec value={tier.specs.platforms.value} label="Platforms" color={tier.specs.platforms.color} />
                <Spec value={tier.specs.offline.value} label="Offline" color={tier.specs.offline.color} />
                <Spec value={tier.specs.quality.value} label="Quality" color={tier.specs.quality.color} />
              </div>
              <div className="flex flex-col gap-2.5">
                {tier.features.map(feat => (
                  <FeatureItem key={feat.text} text={feat.text} color={feat.color as keyof typeof CHECK_COLORS} />
                ))}
              </div>
              {tier.cta.href.startsWith('mailto:') ? (
                <a href={tier.cta.href} className="flex items-center justify-center bg-transparent border border-blue rounded-xl py-3.5 px-4 text-[15px] font-black text-blue hover:opacity-90 transition-opacity w-full">
                  {tier.cta.text}
                </a>
              ) : (
                <Link to={tier.cta.href} className="flex items-center justify-center bg-accent rounded-xl py-3.5 px-4 text-[15px] font-black text-white hover:opacity-90 transition-opacity w-full">
                  {tier.cta.text}
                </Link>
              )}
              {tier.note && <span className="text-[11px] text-muted">{tier.note}</span>}
            </div>
            )
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="flex flex-col gap-8 px-6 md:px-10 xl:px-[120px] py-10 xl:py-[60px] w-full bg-surface">
        <span className="text-xs font-black tracking-[1.5px] text-green">TESTIMONIALS</span>
        <h2 className="text-3xl xl:text-4xl font-black text-text">Loved by Creators</h2>
        <div className="flex flex-col md:flex-row gap-5 w-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 flex items-center justify-center bg-bg rounded-[18px] border border-border h-[160px] md:h-[200px] p-7">
              <span className="text-sm text-muted">Testimonial coming soon</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="flex flex-col items-center gap-6 px-6 md:px-10 xl:px-[120px] py-14 xl:py-20 w-full text-center">
        <h2 className="text-[28px] md:text-[36px] xl:text-[40px] font-black text-text">Ready to Stream Smarter?</h2>
        <p className="text-base text-muted">Join thousands of creators reducing complexity and costs.</p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/login" className="flex items-center justify-center bg-accent rounded-xl px-10 py-4 text-[15px] font-black text-white hover:opacity-90 transition-opacity">
            Start Your Free Trial
          </Link>
          <a href="mailto:sales@omeplayer.com" className="text-[15px] text-blue">
            Schedule a demo →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-4 px-6 md:px-10 xl:px-[120px] py-10 w-full border-t border-border">
        <div className="flex flex-wrap gap-4 md:gap-6">
          <span className="text-[13px] text-muted">Privacy Policy</span>
          <span className="text-[13px] text-muted">Terms of Service</span>
          <span className="text-[13px] text-muted">Contact</span>
        </div>
        <span className="text-xs text-muted">© 2026 OME Player. All rights reserved.</span>
      </footer>
    </div>
  )
}
