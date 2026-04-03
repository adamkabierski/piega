"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "@/lib/theme";
import { useInView } from "./hooks";

const PHASE_DURATIONS = [3500, 2800, 3200, 4000];
const PHASE_LABELS = [
  "You\u2019re browsing Rightmove. As usual.",
  "One click. That\u2019s all you do.",
  "We read every photo. Every detail.\nEvery number the agent left out.",
  "The full reading. Ready.",
];
const PROCESSING_MSGS = [
  "Reading the listing\u2026",
  "Studying the photos\u2026",
  "Running the numbers\u2026",
  "Writing the honest version\u2026",
];

/* Light-mode palette for the Rightmove mockup */
const RM = {
  bg: "#FFFFFF", bgSoft: "#F7F5F3",
  green: "#00B140", text: "#2C2C2C",
  textMuted: "#8A8580", dummy: "#ECEAE6", dummyDark: "#D8D4CF",
};

/* Shared browser chrome bar (appears in Phase 0 + 1) */
function BrowserChrome() {
  return (
    <div style={{ height: 32, background: "#36342F", display: "flex", alignItems: "center", padding: "0 12px", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 5 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
        ))}
      </div>
      <div style={{ flex: 1, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 10px" }}>
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
          {"rightmove.co.uk/properties/145891267"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ width: 18, height: 18, borderRadius: 4, background: C.terracotta, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 9, fontWeight: 700, color: "#fff" }}>P</span>
        </div>
      </div>
    </div>
  );
}

export default function DemoAnimation({ demoImage, demoAfterImage, demoCost, demoName }) {
  const [containerRef, inView] = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const [procMsg, setProcMsg] = useState(0);
  const timeoutRef = useRef(null);
  const procRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (!inView) {
      clearTimeout(timeoutRef.current);
      clearInterval(procRef.current);
      return;
    }
    phaseRef.current = 0;
    setPhase(0);
    setProcMsg(0);

    const next = () => {
      timeoutRef.current = setTimeout(() => {
        phaseRef.current = (phaseRef.current + 1) % 4;
        setPhase(phaseRef.current);
        if (phaseRef.current === 2) {
          setProcMsg(0);
          let mi = 0;
          clearInterval(procRef.current);
          procRef.current = setInterval(() => {
            mi = (mi + 1) % PROCESSING_MSGS.length;
            setProcMsg(mi);
          }, 800);
        } else {
          clearInterval(procRef.current);
        }
        next();
      }, PHASE_DURATIONS[phaseRef.current]);
    };
    next();
    return () => { clearTimeout(timeoutRef.current); clearInterval(procRef.current); };
  }, [inView]);

  const panelBase = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", transition: "all 0.6s ease" };
  const hidden = (p) => ({ opacity: phase === p ? 1 : 0, transform: phase === p ? "translateX(0)" : `translateX(${phase > p ? "-30px" : "30px"})`, pointerEvents: phase === p ? "auto" : "none" });
  const name = demoName ?? "14 Woodbury Hill Path";
  const cost = demoCost ?? "\u00A322K \u2013 \u00A362K";

  return (
    <div ref={containerRef} style={{ maxWidth: 900, margin: "0 auto", borderRadius: 8, overflow: "hidden", position: "relative", aspectRatio: "16/9", minHeight: 320, background: C.darkCard, boxShadow: "0 4px 32px rgba(0,0,0,0.3)" }}>

      {/* ====== PHASE 0 — Rightmove listing (LIGHT MODE) ====== */}
      <div style={{ ...panelBase, ...hidden(0) }}>
        <BrowserChrome />
        <div style={{ flex: 1, background: RM.bg, overflow: "hidden", position: "relative" }}>
          {/* Green header strip */}
          <div style={{ height: 6, background: RM.green }} />
          <div style={{ padding: "clamp(10px,2vw,18px) clamp(12px,2.5vw,24px)", display: "flex", gap: "clamp(12px,2vw,20px)" }}>
            {/* Left — Property photo (REAL) */}
            <div style={{ width: "clamp(130px,35%,240px)", flexShrink: 0 }}>
              <div style={{ aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              {/* Photo strip */}
              <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ flex: 1, height: 28, borderRadius: 2, overflow: "hidden", background: RM.dummy, opacity: i === 0 ? 1 : 0.6 }}>
                    {i === 0 && <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Property details (REAL data + dummy skeleton) */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,3.5vw,28px)", fontWeight: 700, color: RM.text, marginBottom: 4, lineHeight: 1.1 }}>
                {"\u00A3340,000+"}
              </div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(11px,1.4vw,14px)", color: RM.textMuted, marginBottom: 10, lineHeight: 1.3 }}>
                {name}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {["4 bed", "Detached", "Freehold"].map((t) => (
                  <span key={t} style={{ fontSize: 10, color: RM.textMuted, padding: "3px 8px", background: RM.bgSoft, borderRadius: 3, fontFamily: "'Inter',sans-serif" }}>{t}</span>
                ))}
              </div>

              {/* Dummy description skeleton */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[90, 100, 75, 85, 0, 95, 60].map((w, i) =>
                  w === 0
                    ? <div key={i} style={{ height: 6 }} />
                    : <div key={i} style={{ height: 8, background: RM.dummy, borderRadius: 3, width: `${w}%` }} />
                )}
              </div>

              {/* Dummy "Key features" */}
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 10, background: RM.dummyDark, borderRadius: 3, width: 80, marginBottom: 6 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[65, 80, 55, 70].map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: RM.dummyDark }} />
                      <div style={{ height: 6, background: RM.dummy, borderRadius: 2, width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom strip — dummy agent / map bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px clamp(12px,2.5vw,24px)", display: "flex", gap: 10, background: `linear-gradient(transparent, ${RM.bgSoft})` }}>
            <div style={{ height: 32, flex: 1, background: RM.dummy, borderRadius: 4 }} />
            <div style={{ height: 32, width: 100, background: RM.dummy, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* ====== PHASE 1 — Extension popup on dimmed Rightmove ====== */}
      <div style={{ ...panelBase, ...hidden(1) }}>
        <BrowserChrome />
        {/* Dimmed Rightmove content */}
        <div style={{ flex: 1, background: RM.bg, position: "relative", overflow: "hidden" }}>
          <div style={{ opacity: 0.2, padding: "clamp(10px,2vw,18px) clamp(12px,2.5vw,24px)" }}>
            <div style={{ height: 6, background: RM.green, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ width: "35%", aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", background: "#ddd" }}>
                <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 20, background: RM.dummy, borderRadius: 3, width: 120, marginBottom: 8 }} />
                <div style={{ height: 14, background: RM.dummy, borderRadius: 3, width: 160, marginBottom: 8 }} />
                {[80, 90, 60].map((w, i) => (
                  <div key={i} style={{ height: 8, background: RM.dummy, borderRadius: 3, width: `${w}%`, marginBottom: 5 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Extension popup — Piega dark theme */}
          <div style={{
            position: "absolute", top: 8, right: "clamp(12px,2.5vw,24px)",
            width: "clamp(200px,42%,260px)", background: C.dark,
            border: `1px solid ${C.bd}`, borderRadius: 8,
            padding: "clamp(12px,2vw,18px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}>
            {/* Triangle pointer */}
            <div style={{ position: "absolute", top: -6, right: 18, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: `6px solid ${C.dark}` }} />

            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(12px,1.5vw,15px)", color: C.paper, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>{name}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1.1vw,11px)", color: C.warmGrey, marginBottom: 10 }}>{"\u00A3340,000+ \u00B7 4 bed \u00B7 Detached"}</div>

            {/* Photo thumbnail */}
            <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 4, overflow: "hidden", marginBottom: 10, background: C.darkMid }}>
              <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ padding: "clamp(7px,1vw,10px) 12px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(10px,1.3vw,13px)", color: C.paper, letterSpacing: "0.08em" }}>
              {"ANALYSE THIS PROPERTY \u2192"}
            </div>
          </div>
        </div>
      </div>

      {/* ====== PHASE 2 — Processing (abstract, no pipeline) ====== */}
      <div style={{ ...panelBase, ...hidden(2), justifyContent: "center", alignItems: "center", background: C.dark }}>
        <div style={{ textAlign: "center", maxWidth: 320, width: "100%", padding: "0 20px" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(14px,2.5vw,20px)", color: C.paper, marginBottom: 28, lineHeight: 1.3 }}>{name}</div>

          {/* Progress line */}
          <div style={{ width: "100%", height: 2, background: `${C.accent}20`, borderRadius: 1, overflow: "hidden", marginBottom: 22 }}>
            <div style={{ height: "100%", background: C.accent, borderRadius: 1, width: phase === 2 ? "100%" : "0%", transition: phase === 2 ? "width 3s ease-in-out" : "none" }} />
          </div>

          {/* Cycling message */}
          <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "clamp(13px,1.5vw,16px)", color: C.tertGrey, minHeight: 24 }}>
            {PROCESSING_MSGS[procMsg]}
          </div>
        </div>
      </div>

      {/* ====== PHASE 3 — Report delivered ====== */}
      <div style={{ ...panelBase, ...hidden(3), justifyContent: "center", alignItems: "center", background: C.dark }}>
        <div style={{ textAlign: "center", maxWidth: 400, width: "100%", padding: "0 20px" }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.warmGrey, letterSpacing: "0.12em", marginBottom: 8 }}>YOUR REPORT</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(16px,3vw,24px)", color: C.paper, marginBottom: 16 }}>{name}</div>

          {/* Before / after pair */}
          <div style={{ display: "flex", gap: 2, borderRadius: 4, overflow: "hidden", marginBottom: 16, width: "clamp(200px,70%,360px)", aspectRatio: "3/1", margin: "0 auto 16px" }}>
            <div style={{ flex: 1, position: "relative", background: C.darkMid }}>
              <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", bottom: 4, left: 6, fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: C.paper, opacity: 0.5 }}>NOW</span>
            </div>
            <div style={{ flex: 1, position: "relative", background: C.darkMid }}>
              <img src={demoAfterImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", bottom: 4, right: 6, fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: C.paper, opacity: 0.5 }}>POSSIBLE</span>
            </div>
          </div>

          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,5vw,44px)", color: C.terracotta, letterSpacing: "0.02em" }}>{cost}</div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, fontStyle: "italic", color: C.warmGrey, marginTop: 4 }}>estimated renovation</div>
        </div>
      </div>

      {/* Label bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 24px 18px", background: "linear-gradient(transparent, rgba(26,24,22,0.9))", pointerEvents: "none" }}>
        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(12px,1.5vw,15px)", fontStyle: "italic", color: C.accent, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.5 }}>
          {PHASE_LABELS[phase]}
        </div>
      </div>

      {/* Phase dots */}
      <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
        {[0, 1, 2, 3].map((p) => (
          <div key={p} style={{ width: 5, height: 5, borderRadius: "50%", background: phase === p ? C.accent : C.warmGrey, opacity: phase === p ? 0.8 : 0.2, transition: "all 0.3s ease" }} />
        ))}
      </div>
    </div>
  );
}
