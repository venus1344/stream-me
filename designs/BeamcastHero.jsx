import { useEffect, useRef, useState } from "react";

/* ============================================================
   BeamcastHero — animated hero for an OBS multistreaming SaaS
   - Netflix-style dark cinematic UI, burnt-orange accent
   - Canvas particle wave background (abstract, 3D-perspective)
   - Video-meeting preview (illustrated faces) → signal beams →
     3D destination tiles (YouTube, Twitch, TikTok, FB, IG, X)
   No external assets. Default export, no required props.
   ============================================================ */

const EMBER = "#e8590c";
const EMBER_HOT = "#ff7a2f";

/* ---------------- illustrated faces ---------------- */

function Face({ skin, shade, hair, shirt, variant, glasses, headphones }) {
  return (
    <svg viewBox="0 0 120 96" className="face" aria-hidden="true">
      {/* back hair mass (behind head) for long hair */}
      {variant === "long" && (
        <path
          d="M60 14c-16 0-25 11-24 26 1 14-2 22-6 27 8 3 14-2 16-8 3 6 25 6 28 0 2 6 8 11 16 8-4-5-7-13-6-27 1-15-8-26-24-26z"
          fill={hair}
        />
      )}
      {/* shoulders / shirt */}
      <path d="M18 96c2-16 18-24 42-24s40 8 42 24z" fill={shirt} />
      {/* neck */}
      <rect x="52" y="58" width="16" height="18" rx="7" fill={shade} />
      {/* head */}
      <ellipse cx="60" cy="42" rx="22" ry="24" fill={skin} />
      {/* ears */}
      <circle cx="38" cy="44" r="4.5" fill={skin} />
      <circle cx="82" cy="44" r="4.5" fill={skin} />
      {/* hair variants */}
      {variant === "curls" && (
        <g fill={hair}>
          <circle cx="45" cy="22" r="9" /><circle cx="60" cy="17" r="10" />
          <circle cx="75" cy="22" r="9" /><circle cx="38" cy="32" r="7" />
          <circle cx="82" cy="32" r="7" />
        </g>
      )}
      {variant === "short" && (
        <path d="M38 38c-2-16 10-25 22-25s24 9 22 25c-2-8-8-13-12-12 2 3 2 5 1 7-6-8-24-8-33 5z" fill={hair} />
      )}
      {variant === "fade" && (
        <path d="M39 34c0-13 9-20 21-20s21 7 21 20c-4-7-10-10-21-10s-17 3-21 10z" fill={hair} />
      )}
      {/* fringe for long hair */}
      {variant === "long" && <path d="M40 36c1-12 9-18 20-18s19 6 20 18c-5-7-11-9-20-9s-15 2-20 9z" fill={hair} />}
      {/* brows */}
      <rect x="47" y="35" width="10" height="2.6" rx="1.3" fill={hair} />
      <rect x="63" y="35" width="10" height="2.6" rx="1.3" fill={hair} />
      {/* eyes */}
      <g className="eyes">
        <circle cx="52" cy="42" r="2.6" fill="#1c1c22" />
        <circle cx="68" cy="42" r="2.6" fill="#1c1c22" />
      </g>
      {glasses && (
        <g fill="none" stroke="#1c1c22" strokeWidth="2">
          <rect x="45" y="37" width="14" height="11" rx="4" />
          <rect x="61" y="37" width="14" height="11" rx="4" />
          <path d="M59 42h2M45 41l-7 2M75 41l7 2" />
        </g>
      )}
      {/* nose + mouth */}
      <path d="M60 45v6l-3 1" fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round" />
      <path className="mouth" d="M53 56q7 5 14 0" fill="none" stroke={shade} strokeWidth="2.4" strokeLinecap="round" />
      {headphones && (
        <g>
          <path d="M36 40c0-16 10-26 24-26s24 10 24 26" fill="none" stroke="#26262e" strokeWidth="5" strokeLinecap="round" />
          <rect x="31" y="36" width="9" height="16" rx="4" fill="#26262e" />
          <rect x="80" y="36" width="9" height="16" rx="4" fill="#26262e" />
          <path d="M35 52c-4 8 4 14 14 15" fill="none" stroke="#26262e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="67" r="3" fill="#26262e" />
        </g>
      )}
    </svg>
  );
}

const PARTICIPANTS = [
  {
    id: "p1", name: "Asha K.", bg: "linear-gradient(140deg,#2b2036,#181322)",
    face: { skin: "#8d5a3b", shade: "#71462e", hair: "#241a17", shirt: "#7c5cf0", variant: "curls", headphones: true },
  },
  {
    id: "p2", name: "Joel M.", bg: "linear-gradient(140deg,#12262b,#0d181c)",
    face: { skin: "#e8b48c", shade: "#c9946c", hair: "#5a4632", shirt: "#14b8a6", variant: "short" },
  },
  {
    id: "p3", name: "Trix N.", bg: "linear-gradient(140deg,#2e1c14,#1b120d)",
    face: { skin: "#6f4530", shade: "#583624", hair: "#181210", shirt: EMBER, variant: "fade" },
  },
  {
    id: "p4", name: "Sara D.", bg: "linear-gradient(140deg,#1a2033,#111524)",
    face: { skin: "#d9a077", shade: "#b8815a", hair: "#2b2026", shirt: "#3b82f6", variant: "long", glasses: true },
  },
];

/* ---------------- destination icons ---------------- */

const CheckBadge = () => (
  <span className="badge">
    <svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
  </span>
);

const DEST_ICONS = {
  YouTube: (
    <svg viewBox="0 0 48 48"><rect x="4" y="10" width="40" height="28" rx="8" fill="#FF0033" /><path d="M20 17.5v13L31.5 24z" fill="#fff" /></svg>
  ),
  Twitch: (
    <svg viewBox="0 0 48 48"><path d="M10 6 6 12v26h9v6l6-6h8l13-13V6H10zm28 17-6 6h-8l-5 5v-5h-7V10h26v13z" fill="#9146FF" /><rect x="21" y="15" width="4" height="11" fill="#9146FF" /><rect x="30" y="15" width="4" height="11" fill="#9146FF" /></svg>
  ),
  TikTok: (
    <svg viewBox="0 0 48 48">
      <path d="M31.5 7c.8 4.5 3.7 7.5 8.5 7.9v5.6c-3.1.1-5.9-.8-8.5-2.6v11.8c0 7.2-5.3 11.3-11 11.3-5.4 0-10.5-3.9-10.5-10.4 0-6.8 5.6-10.8 11.9-10.2v5.9c-2.7-.6-5.9.7-5.9 4.1 0 3 2.3 4.6 4.6 4.6 2.7 0 4.9-1.8 4.9-5.5V7h6z" fill="#25F4EE" transform="translate(-1.2,-1)" />
      <path d="M31.5 7c.8 4.5 3.7 7.5 8.5 7.9v5.6c-3.1.1-5.9-.8-8.5-2.6v11.8c0 7.2-5.3 11.3-11 11.3-5.4 0-10.5-3.9-10.5-10.4 0-6.8 5.6-10.8 11.9-10.2v5.9c-2.7-.6-5.9.7-5.9 4.1 0 3 2.3 4.6 4.6 4.6 2.7 0 4.9-1.8 4.9-5.5V7h6z" fill="#FE2C55" transform="translate(1.2,1)" />
      <path d="M31.5 7c.8 4.5 3.7 7.5 8.5 7.9v5.6c-3.1.1-5.9-.8-8.5-2.6v11.8c0 7.2-5.3 11.3-11 11.3-5.4 0-10.5-3.9-10.5-10.4 0-6.8 5.6-10.8 11.9-10.2v5.9c-2.7-.6-5.9.7-5.9 4.1 0 3 2.3 4.6 4.6 4.6 2.7 0 4.9-1.8 4.9-5.5V7h6z" fill="#fff" />
    </svg>
  ),
  Facebook: (
    <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#1877F2" /><path d="M27 40V27h4.4l.8-5.2H27v-3.3c0-1.5.5-2.6 2.7-2.6h2.7V11c-.5-.1-2.1-.2-4-.2-4 0-6.7 2.4-6.7 6.9v4.1h-4.5V27h4.5v13h5.3z" fill="#fff" /></svg>
  ),
  Instagram: (
    <svg viewBox="0 0 48 48">
      <defs><radialGradient id="bc-ig" cx=".3" cy="1.1" r="1.3"><stop offset="0" stopColor="#FFDC80" /><stop offset=".25" stopColor="#F77737" /><stop offset=".5" stopColor="#E1306C" /><stop offset=".8" stopColor="#833AB4" /><stop offset="1" stopColor="#5851DB" /></radialGradient></defs>
      <rect x="5" y="5" width="38" height="38" rx="11" fill="url(#bc-ig)" />
      <circle cx="24" cy="24" r="8.2" fill="none" stroke="#fff" strokeWidth="3.2" />
      <circle cx="34.2" cy="13.8" r="2.4" fill="#fff" />
      <rect x="9.5" y="9.5" width="29" height="29" rx="8" fill="none" stroke="#fff" strokeWidth="3" />
    </svg>
  ),
  X: (
    <svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="10" fill="#0f0f13" stroke="rgba(255,255,255,.15)" /><path d="M27.5 21.7 37.2 11h-2.9l-8.1 9L19.7 11H11l10.2 14.6L11 37h2.9l8.6-9.6 6.8 9.6H38L27.5 21.7zm-3.1 3.4-1-1.4-7.9-11h4.4l6.4 9 1 1.4 8.3 11.7h-4.4l-6.8-9.7z" fill="#fff" /></svg>
  ),
};
const DESTS = Object.keys(DEST_ICONS);

const MicIcon = () => (
  <svg className="mic" viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12h-2z" /></svg>
);

/* ============================================================ */

export default function BeamcastHero() {
  const stageRef = useRef(null);
  const sourceRef = useRef(null);
  const svgRef = useRef(null);
  const pathsRef = useRef(null);
  const pulsesRef = useRef(null);
  const destRefs = useRef([]);
  const canvasRef = useRef(null);

  const [seconds, setSeconds] = useState(47 * 60 + 12);
  const [viewers, setViewers] = useState(2847);
  const [speaker, setSpeaker] = useState(0);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- live timer, viewer drift, speaker rotation ---- */
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      setSeconds((s) => s + 1);
      setViewers((v) => (Math.random() < 0.35 ? v + Math.floor(Math.random() * 17) - 6 : v));
    }, 1000);
    const sp = setInterval(() => setSpeaker(Math.floor(Math.random() * 4)), 3200);
    return () => { clearInterval(t); clearInterval(sp); };
  }, [reduced]);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  /* ---- particle wave background (canvas) ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, w, h, dpr;

    // perspective wave grid
    const COLS = 90, ROWS = 26;
    // ambient drifting dust
    const dust = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -0.00004 - Math.random() * 0.00012,
      ember: Math.random() < 0.22,
      tw: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      /* --- 3D particle wave, anchored to the lower third --- */
      const horizonY = h * 0.62;          // far edge of the wave plane
      const baseY = h * 1.02;             // near edge (just below viewport)
      for (let r = 0; r < ROWS; r++) {
        const depth = r / (ROWS - 1);               // 0 = near, 1 = far
        const persp = 1 - depth * 0.82;             // scale with distance
        const rowY = baseY + (horizonY - baseY) * Math.pow(depth, 0.78);
        const amp = (26 + 30 * (1 - depth)) * persp;
        for (let c = 0; c <= COLS; c++) {
          const u = c / COLS;
          const x = (u - 0.5) * (w * (0.7 + 0.75 * (1 - depth))) + w * 0.5;
          const wave =
            Math.sin(u * 7 + t * 0.9 + depth * 3.0) * 0.6 +
            Math.sin(u * 13 - t * 0.55 + depth * 5.0) * 0.4;
          const y = rowY + wave * amp;
          const size = (0.5 + 1.5 * (1 - depth)) * persp + 0.3;
          // mostly faint white, ember highlights ride the crests
          const crest = Math.max(0, wave);
          const alpha = (0.05 + 0.16 * (1 - depth)) * (0.55 + 0.45 * crest);
          if (crest > 0.72 && (c + r) % 3 === 0) {
            ctx.fillStyle = `rgba(255,122,47,${(alpha * 1.9).toFixed(3)})`;
          } else {
            ctx.fillStyle = `rgba(235,232,228,${alpha.toFixed(3)})`;
          }
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* --- ambient dust drifting upward --- */
      for (const p of dust) {
        p.x += p.vx; p.y += p.vy; p.tw += 0.02;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
        const a = (0.10 + 0.10 * Math.sin(p.tw)) * (p.ember ? 1.6 : 1);
        ctx.fillStyle = p.ember
          ? `rgba(232,89,12,${a.toFixed(3)})`
          : `rgba(235,232,228,${(a * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      t += 0.016;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    if (reduced) { t = 4; draw(); } // single static frame
    else raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [reduced]);

  /* ---- signal beams: source → destination tiles ---- */
  useEffect(() => {
    const stage = stageRef.current, svg = svgRef.current;
    const gPaths = pathsRef.current, gPulses = pulsesRef.current;
    const source = sourceRef.current;
    if (!stage || !svg || !source) return;

    const NS = "http://www.w3.org/2000/svg";
    let beams = [], raf, last = performance.now();

    const build = () => {
      gPaths.innerHTML = ""; gPulses.innerHTML = ""; beams = [];
      const sr = stage.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${sr.width} ${sr.height}`);
      const pr = source.getBoundingClientRect();
      const vertical = window.matchMedia("(max-width:960px)").matches;
      const ox = vertical ? pr.left - sr.left + pr.width / 2 : pr.right - sr.left - 4;
      const oy = vertical ? pr.bottom - sr.top + 30 : pr.top - sr.top + pr.height / 2;

      destRefs.current.forEach((el, i) => {
        if (!el) return;
        const dr = el.getBoundingClientRect();
        const dx = dr.left - sr.left + (vertical ? dr.width / 2 : 2);
        const dy = dr.top - sr.top + (vertical ? 2 : dr.height / 2);
        const path = document.createElementNS(NS, "path");
        let d;
        if (vertical) {
          const my = (oy + dy) / 2;
          d = `M${ox},${oy} C${ox},${my} ${dx},${my} ${dx},${dy}`;
        } else {
          const mx = ox + (dx - ox) * 0.55;
          d = `M${ox},${oy} C${mx},${oy} ${mx * 0.9 + dx * 0.1},${dy} ${dx},${dy}`;
        }
        path.setAttribute("d", d);
        gPaths.appendChild(path);

        const pulses = [];
        if (!reduced) {
          for (let k = 0; k < 2; k++) {
            const tail = document.createElementNS(NS, "circle");
            tail.setAttribute("r", "5"); tail.setAttribute("class", "pulse-tail");
            tail.setAttribute("filter", "url(#bc-pulse-glow)"); tail.setAttribute("opacity", ".5");
            const head = document.createElementNS(NS, "circle");
            head.setAttribute("r", "2.6"); head.setAttribute("class", "pulse-head");
            gPulses.appendChild(tail); gPulses.appendChild(head);
            pulses.push({ head, tail, t: (k / 2 + i * 0.13) % 1, speed: 0.0035 + Math.random() * 0.0012 });
          }
        }
        beams.push({ path, len: path.getTotalLength(), pulses, tile: el, flashUntil: 0 });
      });
    };

    const frame = (now) => {
      const dt = Math.min(now - last, 50); last = now;
      for (const b of beams) {
        for (const p of b.pulses) {
          p.t += (p.speed * dt) / 16.7;
          if (p.t >= 1) { p.t -= 1; b.tile.classList.add("hit"); b.flashUntil = now + 700; }
          const pt = b.path.getPointAtLength(p.t * b.len);
          const pt2 = b.path.getPointAtLength(Math.max(0, p.t - 0.03) * b.len);
          p.head.setAttribute("cx", pt.x); p.head.setAttribute("cy", pt.y);
          p.tail.setAttribute("cx", pt2.x); p.tail.setAttribute("cy", pt2.y);
          const fade = Math.min(1, p.t * 8, (1 - p.t) * 8);
          p.head.setAttribute("opacity", fade);
          p.tail.setAttribute("opacity", fade * 0.5);
        }
        if (b.flashUntil && now > b.flashUntil) { b.tile.classList.remove("hit"); b.flashUntil = 0; }
      }
      raf = requestAnimationFrame(frame);
    };

    const t1 = setTimeout(build, 1400); // after entrance animations settle
    let rt;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(build, 150); };
    window.addEventListener("resize", onResize);
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      clearTimeout(t1); clearTimeout(rt);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <section className="bc-root">
      <style>{CSS}</style>
      <div className="backdrop" />
      <canvas ref={canvasRef} className="particles" aria-hidden="true" />

      <div className="wrap">
        <nav>
          <div className="logo"><span className="logo-mark" />Beamcast</div>
          <div className="nav-links">
            <a href="#destinations">Destinations</a><a href="#pricing">Pricing</a><a href="#docs">Docs</a>
          </div>
          <a className="nav-cta" href="#signin">Sign in</a>
        </nav>

        <header className="hero-copy">
          <span className="eyebrow"><span className="dot" />Multistream straight from OBS</span>
          <h1>One stream.<br /><span className="glow">Every screen.</span></h1>
          <p className="sub">
            Point OBS at a single ingest and Beamcast fans it out to YouTube, Twitch,
            TikTok, Facebook, Instagram and X — full quality, in real time, from one dashboard.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#start">Start streaming free</a>
            <a className="btn btn-ghost" href="#how">See how it works</a>
          </div>
        </header>

        <div className="stage" ref={stageRef} aria-label="Live stream being relayed to six platforms">
          <svg ref={svgRef} className="beams" aria-hidden="true">
            <defs>
              <linearGradient id="bc-beam-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(232,89,12,.05)" />
                <stop offset=".5" stopColor="rgba(232,89,12,.5)" />
                <stop offset="1" stopColor="rgba(255,122,47,.75)" />
              </linearGradient>
              <filter id="bc-pulse-glow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="3.2" />
              </filter>
            </defs>
            <g ref={pathsRef} />
            <g ref={pulsesRef} />
          </svg>

          {/* ---- video meeting preview ---- */}
          <div className="preview" ref={sourceRef}>
            <div className="preview-top">
              <span className="live-pill"><span className="dot" />LIVE</span>
              <span className="timer">{hh}:{mm}:{ss}</span>
              <span className="viewers">
                <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /></svg>
                {viewers.toLocaleString()}
              </span>
            </div>

            <div className="ptiles">
              {PARTICIPANTS.map((p, i) => (
                <div key={p.id} className={`ptile ${speaker === i ? "speaking" : ""}`} style={{ background: p.bg }}>
                  <Face {...p.face} />
                  <span className="nameplate">
                    <MicIcon />{p.name}
                    {speaker === i && <span className="eq"><i /><i /><i /></span>}
                  </span>
                </div>
              ))}
            </div>

            <div className="preview-bar">
              <span className="ctrl"><MicIcon /></span>
              <span className="ctrl"><svg viewBox="0 0 24 24"><path d="M17 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5l4 4v-11l-4 4z" /></svg></span>
              <span className="ctrl"><svg viewBox="0 0 24 24"><path d="M4 6h16v10H4zM2 18h20v2H2z" /></svg></span>
              <span className="ctrl danger"><svg viewBox="0 0 24 24"><path d="M12 9c-3.9 0-7.4 1.5-10 4l2.5 2.5c.4.4 1 .5 1.5.2l2.5-1.4c.4-.2.6-.6.6-1V11c1-.3 1.9-.4 2.9-.4s2 .1 2.9.4v2.3c0 .4.2.8.6 1l2.5 1.4c.5.3 1.1.2 1.5-.2L22 13c-2.6-2.5-6.1-4-10-4z" /></svg></span>
            </div>
            <div className="sheen" />
            <span className="source-tag">RTMP in · <b>OBS Studio</b> · 1080p60</span>
          </div>

          {/* ---- destination tiles ---- */}
          <div className="destinations">
            {DESTS.map((name, i) => (
              <div
                key={name}
                className="dest"
                data-name={name}
                ref={(el) => (destRefs.current[i] = el)}
              >
                <CheckBadge />
                {DEST_ICONS[name]}
              </div>
            ))}
          </div>
        </div>

        <footer className="proof">
          <span><b>&lt;300 ms</b> relay latency</span>
          <span><b>6 platforms</b>, one RTMP key</span>
          <span><b>1080p60</b> passthrough, no re-encode tax</span>
          <span><b>Chat</b> from every platform, merged</span>
        </footer>
      </div>
    </section>
  );
}

/* ============================================================ */

const CSS = `
  .bc-root{
    --ink:#0a0a0e; --ink-2:#101016; --card:#15151c;
    --line:rgba(255,255,255,.07);
    --bone:#f5f2ed; --slate:#8a8a93;
    --ember:${EMBER}; --ember-hot:${EMBER_HOT}; --ember-soft:#ffb38a;
    --radius:14px;
    position:relative; min-height:100vh; overflow:hidden;
    background:var(--ink); color:var(--bone);
    font-family:"Helvetica Neue",Helvetica,Arial,-apple-system,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .bc-root *{margin:0;padding:0;box-sizing:border-box}

  /* ---------- cinematic backdrop + particles ---------- */
  .bc-root .backdrop{
    position:absolute;inset:0;z-index:0;pointer-events:none;
    background:
      radial-gradient(1200px 600px at 72% 30%, rgba(232,89,12,.14), transparent 60%),
      radial-gradient(900px 500px at 12% 85%, rgba(232,89,12,.07), transparent 60%),
      var(--ink);
  }
  .bc-root .particles{position:absolute;inset:0;z-index:1;width:100%;height:100%;pointer-events:none}
  .bc-root .backdrop::after{
    content:"";position:absolute;inset:0;
    background:radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(0,0,0,.55) 100%);
  }

  .bc-root .wrap{position:relative;z-index:2;max-width:1240px;margin:0 auto;padding:0 32px}

  /* ---------- nav ---------- */
  .bc-root nav{display:flex;align-items:center;justify-content:space-between;padding:26px 0}
  .bc-root .logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:21px;letter-spacing:-.02em}
  .bc-root .logo-mark{
    width:26px;height:26px;border-radius:7px;position:relative;
    background:linear-gradient(135deg,var(--ember-hot),var(--ember) 60%,#a33c05);
    box-shadow:0 0 18px rgba(232,89,12,.55);
  }
  .bc-root .logo-mark::after{
    content:"";position:absolute;inset:0;margin:auto;width:0;height:0;
    border-left:9px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;
    transform:translateX(2px);
  }
  .bc-root .nav-links{display:flex;gap:28px;font-size:14px;color:var(--slate)}
  .bc-root .nav-links a{color:inherit;text-decoration:none;transition:color .2s}
  .bc-root .nav-links a:hover,.bc-root .nav-links a:focus-visible{color:var(--bone)}
  .bc-root .nav-cta{
    font-size:14px;font-weight:700;color:var(--bone);text-decoration:none;
    padding:9px 18px;border-radius:8px;border:1px solid var(--line);
    background:rgba(255,255,255,.04);transition:border-color .2s,background .2s;
  }
  .bc-root .nav-cta:hover,.bc-root .nav-cta:focus-visible{border-color:rgba(232,89,12,.6);background:rgba(232,89,12,.12)}

  /* ---------- hero copy ---------- */
  .bc-root .hero-copy{text-align:center;padding:64px 0 30px;opacity:0;animation:bc-rise .8s .1s ease-out forwards}
  .bc-root .eyebrow{
    display:inline-flex;align-items:center;gap:8px;
    font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--ember-soft);
    border:1px solid rgba(232,89,12,.35);border-radius:999px;padding:7px 16px;
    background:rgba(232,89,12,.08);margin-bottom:26px;
  }
  .bc-root .eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--ember-hot);animation:bc-blink 1.6s infinite}
  .bc-root h1{
    font-size:clamp(42px,6.4vw,84px);font-weight:900;line-height:.98;letter-spacing:-.035em;
    max-width:14ch;margin:0 auto;
  }
  .bc-root h1 .glow{
    background:linear-gradient(100deg,var(--ember-soft),var(--ember-hot) 45%,var(--ember));
    -webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 0 26px rgba(232,89,12,.35));
  }
  .bc-root .sub{max-width:56ch;margin:22px auto 0;font-size:clamp(15px,1.6vw,18px);line-height:1.65;color:var(--slate)}
  .bc-root .cta-row{display:flex;gap:14px;justify-content:center;margin-top:34px;flex-wrap:wrap}
  .bc-root .btn{
    font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;padding:15px 30px;
    transition:transform .15s,box-shadow .2s,background .2s;display:inline-block;
  }
  .bc-root .btn:active{transform:scale(.98)}
  .bc-root .btn-primary{
    color:#fff;background:linear-gradient(135deg,var(--ember-hot),var(--ember) 70%);
    box-shadow:0 6px 30px rgba(232,89,12,.45);
  }
  .bc-root .btn-primary:hover,.bc-root .btn-primary:focus-visible{box-shadow:0 8px 40px rgba(232,89,12,.65);transform:translateY(-1px)}
  .bc-root .btn-ghost{color:var(--bone);border:1px solid var(--line);background:rgba(255,255,255,.03)}
  .bc-root .btn-ghost:hover,.bc-root .btn-ghost:focus-visible{background:rgba(255,255,255,.07)}

  /* ---------- stage + beams ---------- */
  .bc-root .stage{
    position:relative;margin:56px auto 90px;min-height:480px;
    display:grid;grid-template-columns:minmax(340px,560px) 1fr;gap:clamp(40px,7vw,120px);
    align-items:center;opacity:0;animation:bc-rise .9s .35s ease-out forwards;
  }
  .bc-root .beams{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1}
  .bc-root .beams path{fill:none;stroke:url(#bc-beam-grad);stroke-width:1.5;opacity:.5}
  .bc-root .beams .pulse-head{fill:var(--ember-hot)}
  .bc-root .beams .pulse-tail{fill:var(--ember)}

  /* ---------- stream preview ---------- */
  .bc-root .preview{
    position:relative;z-index:2;border-radius:var(--radius);overflow:visible;
    background:var(--card);border:1px solid var(--line);
    box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.02),0 0 60px rgba(232,89,12,.10);
    transform:perspective(1400px) rotateY(4deg) rotateX(1deg);
  }
  .bc-root .preview-top{
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.02);
    border-radius:var(--radius) var(--radius) 0 0;
  }
  .bc-root .live-pill{
    display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.12em;
    color:#fff;background:linear-gradient(135deg,#ff3b3b,#c81e1e);border-radius:6px;padding:5px 10px;
  }
  .bc-root .live-pill .dot{width:6px;height:6px;border-radius:50%;background:#fff;animation:bc-blink 1.2s infinite}
  .bc-root .timer{font-variant-numeric:tabular-nums;font-size:12px;color:var(--slate);letter-spacing:.06em}
  .bc-root .viewers{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--slate)}
  .bc-root .viewers svg{width:13px;height:13px;fill:var(--slate)}

  .bc-root .ptiles{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px;background:var(--ink-2)}
  .bc-root .ptile{
    position:relative;aspect-ratio:16/10.5;border-radius:8px;overflow:hidden;
    display:flex;align-items:flex-end;justify-content:center;
  }
  .bc-root .ptile.speaking{box-shadow:inset 0 0 0 2px var(--ember)}
  .bc-root .face{width:72%;max-height:92%;display:block}
  .bc-root .ptile.speaking .mouth{animation:bc-talk .5s ease-in-out infinite alternate}
  .bc-root .nameplate{
    position:absolute;left:8px;bottom:8px;display:flex;align-items:center;gap:6px;
    font-size:10.5px;font-weight:600;color:#e7e4df;
    background:rgba(0,0,0,.55);border-radius:5px;padding:4px 8px;backdrop-filter:blur(4px);
  }
  .bc-root .mic{width:10px;height:10px;fill:#9aa}
  .bc-root .speaking .nameplate .mic{fill:var(--ember-hot)}
  .bc-root .eq{display:inline-flex;align-items:flex-end;gap:1.5px;height:9px}
  .bc-root .eq i{width:2px;background:var(--ember-hot);border-radius:1px;animation:bc-eq .9s ease-in-out infinite}
  .bc-root .eq i:nth-child(2){animation-delay:.15s}
  .bc-root .eq i:nth-child(3){animation-delay:.3s}

  .bc-root .preview-bar{
    display:flex;align-items:center;justify-content:center;gap:10px;
    padding:11px;border-top:1px solid var(--line);background:rgba(255,255,255,.02);
    border-radius:0 0 var(--radius) var(--radius);
  }
  .bc-root .ctrl{
    width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.04);
    display:flex;align-items:center;justify-content:center;
  }
  .bc-root .ctrl svg{width:15px;height:15px;fill:#c9c6c1}
  .bc-root .ctrl.danger{background:rgba(200,30,30,.9);border-color:transparent}
  .bc-root .ctrl.danger svg{fill:#fff}
  .bc-root .sheen{
    position:absolute;inset:0;pointer-events:none;border-radius:var(--radius);overflow:hidden;
    background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.05) 50%,transparent 58%);
    transform:translateX(-120%);animation:bc-sheen 6s 2s ease-in-out infinite;
  }
  .bc-root .source-tag{
    position:absolute;left:50%;bottom:-38px;transform:translateX(-50%);
    display:inline-flex;align-items:center;gap:8px;white-space:nowrap;
    font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--slate);
  }
  .bc-root .source-tag b{color:var(--ember-soft);letter-spacing:.16em}

  /* ---------- destination tiles ---------- */
  .bc-root .destinations{position:relative;z-index:2;display:grid;grid-template-columns:repeat(2,116px);gap:26px 34px;justify-content:center}
  .bc-root .dest{
    width:116px;height:116px;border-radius:22px;position:relative;
    background:linear-gradient(160deg,#1d1d26,#101017);
    border:1px solid var(--line);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 18px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07);
    transform:perspective(900px) rotateY(-8deg);
    animation:bc-bob 5.2s ease-in-out infinite;
    transition:box-shadow .3s;
  }
  .bc-root .dest:nth-child(even){animation-delay:-2.6s}
  .bc-root .dest > svg{width:52px;height:52px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
  .bc-root .dest::after{
    content:"";position:absolute;left:14%;right:14%;bottom:-16px;height:12px;border-radius:50%;
    background:radial-gradient(ellipse,rgba(232,89,12,.25),transparent 70%);
    filter:blur(4px);opacity:.7;
  }
  .bc-root .dest .badge{
    position:absolute;top:-7px;right:-7px;width:20px;height:20px;border-radius:50%;
    background:var(--ember);display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 14px rgba(232,89,12,.8);opacity:0;transform:scale(.4);
    transition:opacity .25s,transform .25s;
  }
  .bc-root .dest .badge svg{width:11px;height:11px;fill:#fff;filter:none}
  .bc-root .dest.hit{box-shadow:0 18px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07), 0 0 34px rgba(232,89,12,.55)}
  .bc-root .dest.hit .badge{opacity:1;transform:scale(1)}

  /* ---------- proof strip ---------- */
  .bc-root .proof{
    display:flex;justify-content:center;gap:clamp(24px,5vw,64px);flex-wrap:wrap;
    padding:26px 0 70px;border-top:1px solid var(--line);
    font-size:13px;color:var(--slate);opacity:0;animation:bc-rise .9s .6s ease-out forwards;
  }
  .bc-root .proof span b{color:var(--bone);font-weight:700}

  /* ---------- animations ---------- */
  @keyframes bc-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  @keyframes bc-blink{0%,100%{opacity:1}50%{opacity:.25}}
  @keyframes bc-eq{0%,100%{height:3px}50%{height:9px}}
  @keyframes bc-bob{0%,100%{translate:0 0}50%{translate:0 -9px}}
  @keyframes bc-sheen{0%,55%{transform:translateX(-120%)}75%,100%{transform:translateX(120%)}}
  @keyframes bc-talk{from{d:path("M53 56q7 5 14 0")}to{d:path("M53 57q7 1 14 0")}}

  /* ---------- responsive ---------- */
  @media (max-width:960px){
    .bc-root .stage{grid-template-columns:1fr;gap:96px;justify-items:center}
    .bc-root .preview{max-width:560px;width:100%;transform:none}
    .bc-root .destinations{grid-template-columns:repeat(3,104px)}
    .bc-root .dest{width:104px;height:104px}
    .bc-root .dest > svg{width:44px;height:44px}
  }
  @media (max-width:560px){
    .bc-root .wrap{padding:0 20px}
    .bc-root .nav-links{display:none}
    .bc-root .destinations{grid-template-columns:repeat(3,88px);gap:18px}
    .bc-root .dest{width:88px;height:88px;border-radius:18px}
    .bc-root .dest > svg{width:38px;height:38px}
    .bc-root .beams{display:none}
  }
  @media (prefers-reduced-motion:reduce){
    .bc-root *{animation:none!important;transition:none!important}
    .bc-root .hero-copy,.bc-root .stage,.bc-root .proof{opacity:1}
    .bc-root .beams .pulse-head,.bc-root .beams .pulse-tail{display:none}
  }
`;
