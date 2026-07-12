import { useState } from 'react'
import { Link } from 'react-router-dom'
import streamIcon from '../assets/stream-bold.svg'
import lightningIcon from '../assets/lightning-1.svg'
import refreshIcon from '../assets/refresh.svg'
import calendarIcon from '../assets/calendar.svg'
import branchIcon from '../assets/branch-24-regular.svg'
import pricingData from '../assets/pricing.json'

const CHECK_COLORS = { blue: 'text-blue', green: 'text-green', amber: 'text-amber' } as const

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
      <section className="bg-bg w-full h-[620px] relative shrink-0">
        <div className="absolute w-[700px] h-[500px] rounded-full pointer-events-none z-0" style={{ left: 900, top: -200, backgroundImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #d9772a47 0%, #05050500 100%)' }} />
        <div className="absolute w-[550px] h-[420px] rounded-full pointer-events-none z-[1]" style={{ left: -200, top: 250, backgroundImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #4da3ff26 0%, #05050500 100%)' }} />
        <div className="absolute z-[2] flex flex-col gap-7 left-[120px] top-[160px] w-[900px]">
          <h1 className="text-[64px] font-black leading-[64px] tracking-[-2.5px] text-text">
            Stream to Multiple<br />Platforms at 1/3<br />the Cost
          </h1>
          <p className="text-lg text-muted leading-[27px]">
            One OBS setup. YouTube, Facebook, Instagram, anywhere.<br />
            Powered by low-latency OME infrastructure.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="flex items-center justify-center bg-accent rounded-xl px-8 py-4 text-[15px] font-black text-white hover:opacity-90 transition-opacity">
              Start Free Trial
            </Link>
            <span className="text-[13px] text-muted">No credit card required · 2 hours free</span>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="flex flex-col gap-8 px-[120px] py-[60px] w-full">
        <span className="text-xs font-black tracking-[1.5px] text-accent">WHO IT'S FOR</span>
        <h2 className="text-4xl font-black text-text">Built for Your Workflow</h2>
        <div className="flex gap-5 w-full">
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
      <section className="flex flex-col gap-8 px-[120px] py-[60px] w-full">
        <span className="text-xs font-black tracking-[1.5px] text-blue">FEATURES</span>
        <h2 className="text-4xl font-black text-text">Powerful Features Built In</h2>
        <div className="flex flex-col gap-5 w-full">
          <div className="flex gap-5 w-full">
            {[
              { icon: streamIcon, color: 'text-blue', title: 'Stream to Multiple Platforms', desc: 'Send your stream to YouTube, Facebook, Instagram, and more simultaneously. One OBS setup, infinite reach.' },
              { icon: lightningIcon, color: 'text-green', title: 'Low-Latency Playback', desc: 'LL-HLS and WebRTC playback with minimal delay. Keep your audience engaged in real-time.' },
            ].map(f => (
              <div key={f.title} className="flex-1 flex flex-col gap-3 bg-surface rounded-[18px] border border-border p-7">
                <img src={f.icon} alt={f.title} className="w-7 h-7" />
                <h3 className="text-lg font-black text-text">{f.title}</h3>
                <p className="text-sm text-muted leading-5">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-5 w-full">
            {[
              { icon: refreshIcon, color: 'text-amber', title: 'Never Miss a Beat', desc: 'If your connection drops, pre-recorded videos automatically play. Your stream stays live.' },
              { icon: calendarIcon, color: 'text-accent', title: 'Schedule & Queue Streams', desc: 'Plan your content in advance. Schedule broadcasts and queue multiple streams to go live at set times.' },
            ].map(f => (
              <div key={f.title} className="flex-1 flex flex-col gap-3 bg-surface rounded-[18px] border border-border p-7">
                <img src={f.icon} alt={f.title} className="w-7 h-7" />
                <h3 className="text-lg font-black text-text">{f.title}</h3>
                <p className="text-sm text-muted leading-5">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-5 justify-center w-full">
            <div className="w-[660px] flex flex-col gap-3 bg-surface rounded-[18px] border border-border p-7">
              <img src={branchIcon} alt="One Stream, Infinite Reach" className="w-7 h-7" />
              <h3 className="text-lg font-black text-text">One Stream, Infinite Reach</h3>
              <p className="text-sm text-muted leading-5">Send one RTMP stream to OME. No OBS plugins, no configuration per platform. We handle the distribution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="flex gap-5 px-[120px] py-[60px] w-full">
        {[
          { value: '99.9%', label: 'Uptime Guaranteed', sub: 'Backed by enterprise infrastructure', color: '#F5B84B' },
          { value: '50K+', label: 'Successful Streams', sub: 'Powering creators worldwide', color: '#2EE66B' },
          { value: '10K+', label: 'Active Users', sub: 'Streaming right now', color: '#4DA3FF' },
        ].map(s => (
          <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5 bg-surface rounded-[18px] border border-border py-8 px-7">
            <span className="text-5xl font-black" style={{ color: s.color }}>{s.value}</span>
            <span className="text-base font-black text-text">{s.label}</span>
            <span className="text-xs text-muted">{s.sub}</span>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="flex flex-col gap-8 px-[120px] py-[60px] w-full">
        <span className="text-xs font-black tracking-[1.5px] text-amber">PRICING</span>
        <h2 className="text-4xl font-black text-text">Simple, Transparent Pricing</h2>
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
        <div className="flex gap-5 w-full">
          {pricingData.tiers.map(tier => {
            const price = billingPeriod === 'annual' ? tier.annual : tier.monthly
            const period = billingPeriod === 'annual' ? '/year' : '/month'
            const displayPrice = price === null ? 'Custom' : `$${price}`

            return (
            <div key={tier.name} className={`flex-1 flex flex-col gap-5 rounded-[20px] py-8 px-7 ${tier.highlighted ? 'border-2 border-green bg-surface' : 'border border-border bg-surface'}`} style={tier.highlighted ? { boxShadow: '0px 0px 30px 0px #2EE66B22' } : {}}>
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
      <section className="flex flex-col gap-8 px-[120px] py-[60px] w-full bg-surface">
        <span className="text-xs font-black tracking-[1.5px] text-green">TESTIMONIALS</span>
        <h2 className="text-4xl font-black text-text">Loved by Creators</h2>
        <div className="flex gap-5 w-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 flex items-center justify-center bg-bg rounded-[18px] border border-border h-[200px] p-7">
              <span className="text-sm text-muted">Testimonial coming soon</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="flex flex-col items-center gap-6 px-[120px] py-20 w-full">
        <h2 className="text-[40px] font-black text-text">Ready to Stream Smarter?</h2>
        <p className="text-base text-muted">Join thousands of creators reducing complexity and costs.</p>
        <div className="flex items-center gap-4">
          <Link to="/login" className="flex items-center justify-center bg-accent rounded-xl px-10 py-4 text-[15px] font-black text-white hover:opacity-90 transition-opacity">
            Start Your Free Trial
          </Link>
          <a href="mailto:sales@omeplayer.com" className="text-[15px] text-blue">
            Schedule a demo →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-4 px-[120px] py-10 w-full border-t border-border">
        <div className="flex gap-6">
          <span className="text-[13px] text-muted">Privacy Policy</span>
          <span className="text-[13px] text-muted">Terms of Service</span>
          <span className="text-[13px] text-muted">Contact</span>
        </div>
        <span className="text-xs text-muted">© 2026 OME Player. All rights reserved.</span>
      </footer>
    </div>
  )
}
