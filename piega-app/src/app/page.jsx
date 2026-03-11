"use client";
import { useState } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";

const WoodburyCardSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 200" style={{ width: "100%", display: "block", aspectRatio: "2.2/1", opacity: 0.85 }}>
    <defs>
      <linearGradient id="cg" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#141210" />
        <stop offset="1" stopColor="#1A1816" />
      </linearGradient>
    </defs>
    <rect fill="url(#cg)" width="440" height="200" />
    <path d="M0,140 Q110,133 220,122 Q330,108 440,100" stroke={C.sage} strokeOpacity=".12" strokeWidth="1.5" fill="none" />
    <path d="M0,143 Q110,136 220,125 Q330,111 440,103 L440,200 L0,200 Z" fill={C.sage} fillOpacity=".015" />
    <rect x="155" y="72" width="130" height="42" fill="none" stroke={C.paper} strokeOpacity=".14" strokeWidth="1.2" />
    <path d="M155,72 L220,52 L285,72" fill="none" stroke={C.paper} strokeOpacity=".14" strokeWidth="1.2" />
    <rect x="132" y="114" width="60" height="28" fill="none" stroke={C.terracotta} strokeOpacity=".08" strokeWidth="1" strokeDasharray="3,2" />
    <line x1="137" y1="142" x2="187" y2="142" stroke={C.sage} strokeOpacity=".2" strokeWidth="1.5" />
    <text x="220" y="178" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="6.5" fill={C.warmGrey} fillOpacity=".25">147m elevation · split-level · the house steps down the hillside</text>
    <rect x="305" y="82" width="50" height="32" fill="none" stroke={C.warmGrey} strokeOpacity=".05" strokeWidth="1" />
    <path d="M305,82 L330,72 L355,82" fill="none" stroke={C.warmGrey} strokeOpacity=".05" strokeWidth="1" />
    <line x1="220" y1="46" x2="220" y2="36" stroke={C.terracotta} strokeOpacity=".2" strokeWidth=".8" />
    <text x="220" y="33" textAnchor="middle" fontFamily="serif" fontSize="7.5" fill={C.terracotta} fillOpacity=".5" fontStyle="italic">Woodbury</text>
  </svg>
);

const StatStrip = ({ stats }) => (
  <div style={{ display: "flex", borderTop: `1px solid ${C.bd}`, borderBottom: `1px solid ${C.bd}`, margin: "0 -20px", padding: "0 20px" }}>
    {stats.map((s, i) => (
      <div key={i} style={{ flex: 1, padding: "9px 0 9px 6px", borderRight: i < stats.length - 1 ? `1px solid ${C.bd}` : "none" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "14px", letterSpacing: "0.05em", color: s.c || C.paper }}>{s.v}</div>
        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "7px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.warmGrey, opacity: 0.45 }}>{s.l}</div>
      </div>
    ))}
  </div>
);

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  function go() {
    if (!email || !email.includes("@")) { setError(true); setTimeout(() => setError(false), 1400); return; }
    setDone(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      {/* Header */}
      <header style={{ padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0, animation: "arise .8s ease .2s forwards" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "17px", fontStyle: "italic", color: C.accentDark, letterSpacing: "0.02em" }}>Piega</div>
        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "12px", fontStyle: "italic", color: `${C.tertGrey}60` }}>Early access · UK property</div>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px 50px", textAlign: "center" }}>
        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", color: `${C.accent}60`, marginBottom: "44px", opacity: 0, animation: "arise .9s ease .5s forwards" }}>
          Property Intelligence · United Kingdom
        </div>
        <div style={{ opacity: 0, animation: "arise 1s ease .7s forwards" }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,6vw,70px)", fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.02em", color: C.paper, margin: 0 }}>
            The estate agent<br />told you a story.
          </h1>
          <span style={{ display: "block", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(11px,1.4vw,16px)", letterSpacing: "0.26em", color: `${C.tertGrey}45`, margin: "16px 0 20px", opacity: 0, animation: "arise .8s ease .9s forwards" }}>
            — WE ARE NOT THE ESTATE AGENT —
          </span>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(32px,6vw,70px)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.06, letterSpacing: "-0.02em", color: C.terracotta, margin: 0 }}>
            We tell you the building.
          </h1>
        </div>
        <p style={{ maxWidth: "460px", margin: "20px auto 0", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "clamp(15px,1.8vw,19px)", color: `${C.accent}80`, lineHeight: 1.65, opacity: 0, animation: "arise .9s ease 1.1s forwards" }}>
          An honest analysis of any UK property — what it is, where it sits, and what it will actually cost you to own. No flattery. No agenda. Just the fold.
        </p>
      </div>

      {/* Reports */}
      <div style={{ maxWidth: "840px", margin: "0 auto", padding: "20px 24px 60px", opacity: 0, animation: "arise 1s ease 1.3s forwards", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontFamily: "'EB Garamond',serif", fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: `${C.accent}50` }}>Recent Analyses</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {/* Woodbury */}
          <Link href="/reports/woodbury" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", background: C.darkCard, border: `1px solid ${C.bd}`, overflow: "hidden", transition: "border-color .4s, transform .4s", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.bdh; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.transform = "none"; }}>
            <img src="/House_1/slot4.jpg" alt="Woodbury" style={{ width: "100%", aspectRatio: "2.2/1", objectFit: "cover", display: "block" }} />
            <div style={{ padding: "16px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "8px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.terracotta, opacity: 0.55, marginBottom: "7px" }}>Auction · 18 March 2026</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(18px,2.6vw,24px)", fontWeight: 700, lineHeight: 1.1, color: C.paper, marginBottom: "3px" }}>Woodbury</div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "11px", color: `${C.tertGrey}75`, letterSpacing: "0.04em", marginBottom: "14px", lineHeight: 1.5 }}>Woodbury Hill Path, Luton, LU2 7JR · 4 bed · Detached · Split-level · Freehold</div>
              <StatStrip stats={[{ v: "£340K+", l: "Guide", c: C.accentDark }, { v: "109 SQM", l: "Area" }, { v: "25 MIN", l: "London" }, { v: "£126K", l: "Upside" }]} />
              <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "12px", lineHeight: 1.6, color: C.accent, margin: "14px 0", paddingLeft: "10px", borderLeft: `2px solid ${C.terracotta}55`, opacity: 0.65, flex: 1 }}>
                Someone else's unfinished project. Possibly your perfect beginning.
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: C.accentDark, marginTop: "auto" }}>READ THE FULL ANALYSIS →</div>
            </div>
          </Link>

          {/* Cherry Cottage */}
          <Link href="/reports/cherry-cottage" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", background: C.darkCard, border: `1px solid ${C.bd}`, overflow: "hidden", transition: "border-color .4s, transform .4s", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.bdh; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.transform = "none"; }}>
            <img src="/House_2/slot1.jpg" alt="Cherry Cottage" style={{ width: "100%", aspectRatio: "2.2/1", objectFit: "cover", display: "block" }} />
            <div style={{ padding: "16px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "8px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.terracotta, opacity: 0.55, marginBottom: "7px" }}>Auction · Digby Hall, Sherborne</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(18px,2.6vw,24px)", fontWeight: 700, lineHeight: 1.1, color: C.paper, marginBottom: "3px" }}>Cherry Cottage</div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "11px", color: `${C.tertGrey}75`, letterSpacing: "0.04em", marginBottom: "14px", lineHeight: 1.5 }}>Alton Pancras, Dorchester, Dorset, DT2 7RW · 2 bed · Thatched · Grade II Listed</div>
              <StatStrip stats={[{ v: "£200K", l: "Guide", c: C.accentDark }, { v: "GRADE II", l: "Listed", c: C.terracotta }, { v: "0.2 ACRE", l: "Land" }, { v: "£150K+", l: "Upside" }]} />
              <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "12px", lineHeight: 1.6, color: C.accent, margin: "14px 0", paddingLeft: "10px", borderLeft: `2px solid ${C.terracotta}55`, opacity: 0.65, flex: 1 }}>
                The panelling is Georgian. The damp behind it is older. You are buying both.
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: C.accentDark, marginTop: "auto" }}>READ THE FULL ANALYSIS →</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "40px", height: "1px", background: C.accentDark, margin: "0 auto", opacity: 0.18 }} />

      {/* Proposition */}
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "44px 24px 52px", textAlign: "center", opacity: 0, animation: "arise .9s ease 1.55s forwards" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(20px,3vw,30px)", fontWeight: 700, color: C.paper, lineHeight: 1.15, marginBottom: "16px" }}>
          Every property has a <em style={{ fontWeight: 400, fontStyle: "italic", color: C.terracotta }}>piega.</em>
        </h2>
        <p style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "clamp(14px,1.6vw,17px)", color: `${C.accent}66`, lineHeight: 1.7 }}>
          A fold. A turning point. The moment it stops being someone else's problem and starts being your project. We find that moment — with architectural reading, honest numbers, and no agenda. If the numbers don't work, we'll tell you to fold.
        </p>
      </div>

      <div style={{ width: "40px", height: "1px", background: C.accentDark, margin: "0 auto", opacity: 0.18 }} />

      {/* How it works */}
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 24px 56px", opacity: 0, animation: "arise .9s ease 1.7s forwards", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontFamily: "'EB Garamond',serif", fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: `${C.accent}44` }}>What you get</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { n: "01", t: "The Place", d: "Context map, commute analysis, neighbourhood comparables. Where the building sits and what that means for you." },
            { n: "02", t: "The Building", d: "Room-by-room reading. Floor plans, cross sections, condition matrix. What the photos show and what they hide." },
            { n: "03", t: "The Number", d: "Total cost envelope — not just the asking price. Remedial budget, scenarios, the gap between guide and done." },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.darkCard, border: `1px solid ${C.bd}`, padding: "16px 14px" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", color: `${C.accent}1F`, marginBottom: "4px", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "13px", fontWeight: 700, color: C.paper, lineHeight: 1.2, marginBottom: "5px" }}>{s.t}</div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "11.5px", color: `${C.tertGrey}60`, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Email */}
      <div style={{ maxWidth: "460px", margin: "0 auto", padding: "0 24px 90px", textAlign: "center", opacity: 0, animation: "arise .9s ease 1.85s forwards", width: "100%" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(18px,2.6vw,24px)", fontWeight: 700, color: C.paper, marginBottom: "5px", lineHeight: 1.2 }}>
          Get the next analysis<br /><em style={{ fontWeight: 400, fontStyle: "italic", color: C.terracotta }}>before anyone else does.</em>
        </div>
        <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "13.5px", color: `${C.accent}66`, marginBottom: "22px", lineHeight: 1.5 }}>
          One property. Laid bare. No pitch, no weekly newsletter.
        </div>
        {!done ? (
          <>
            <div style={{ display: "flex", width: "100%" }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && go()}
                placeholder="your@email.com"
                style={{ flex: 1, background: "rgba(255,255,255,0.035)", border: `1px solid ${error ? C.terracotta : "rgba(184,169,154,0.32)"}`, borderRight: "none", padding: "15px 20px", fontFamily: "'EB Garamond',serif", fontSize: "17px", color: C.paper, outline: "none", transition: "border-color .3s" }}
              />
              <button onClick={go} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "14px", letterSpacing: "0.18em", color: C.dark, background: C.accent, border: "none", padding: "0 26px", cursor: "pointer", flexShrink: 0 }}>
                SEND IT
              </button>
            </div>
            <div style={{ marginTop: "11px", fontFamily: "'EB Garamond',serif", fontSize: "11.5px", fontStyle: "italic", color: `${C.tertGrey}4C` }}>
              Early access. We'll tell you when the next building is ready.
            </div>
          </>
        ) : (
          <div style={{ padding: "18px 0", animation: "arise .6s ease both" }}>
            <b style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(30px,4.5vw,48px)", letterSpacing: "0.06em", color: C.paper, display: "block" }}>DONE.</b>
            <span style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "15px", color: `${C.accent}80`, marginTop: "5px", display: "block" }}>You'll know when the next one is ready.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ padding: "22px 40px", display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${C.bd}`, opacity: 0, animation: "arise .8s ease 2s forwards", marginTop: "auto" }}>
        <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "11px", fontStyle: "italic", color: `${C.tertGrey}40`, margin: 0 }}>
          <strong style={{ fontStyle: "normal", fontWeight: 500, color: `${C.tertGrey}60` }}>Piega</strong> is in private development. Not affiliated with any estate agent. That is the point.
        </p>
      </footer>
    </div>
  );
}
