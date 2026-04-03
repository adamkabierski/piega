"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "@/lib/theme";
import { useInView } from "./hooks";

/* ── Timing ── */
const PHASE_DURATIONS = [3500, 2800, 3200, 4000];
const TOTAL = PHASE_DURATIONS.reduce((a, b) => a + b, 0);
const PHASE_STARTS = PHASE_DURATIONS.reduce((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + PHASE_DURATIONS[i - 1]);
  return acc;
}, []);
const MILESTONE_PCT = PHASE_STARTS.map((t) => (t / TOTAL) * 100);

const MILESTONES = ["Browse", "Click", "Reading\u2026", "Report"];

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

/* Cursor waypoints per phase: [ms_offset, x%, y%, click?] */
const CURSOR_SCRIPTS = [
  [[0, 45, 50], [600, 28, 40], [1600, 58, 22], [2600, 80, 16]],
  [[0, 94, 3.5], [500, 94, 3.5, true], [1200, 81, 52], [2000, 81, 52, true]],
  [],
  [],
];

/* Light-mode palette for the Rightmove mockup */
const RM = {
  bg: "#FFFFFF", bgSoft: "#F7F5F3",
  green: "#00B140", text: "#2C2C2C",
  textMuted: "#8A8580", dummy: "#ECEAE6", dummyDark: "#D8D4CF",
};

/* ── Browser chrome bar ── */
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
          rightmove.co.uk/properties/145891267
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

/* ══════════════════════════════════════════════════════════════════════ */

export default function DemoAnimation({ demoImage, demoAfterImage, demoCost, demoName }) {
  const [containerRef, inView] = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const [procMsg, setProcMsg] = useState(0);

  /* Cursor state */
  const [cursorX, setCursorX] = useState(45);
  const [cursorY, setCursorY] = useState(50);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [clicking, setClicking] = useState(false);
  const [ripples, setRipples] = useState([]);

  /* Refs */
  const timeoutRef = useRef(null);
  const procRef = useRef(null);
  const phaseRef = useRef(0);
  const cursorTimers = useRef([]);
  const barRef = useRef(null);
  const cycleStartRef = useRef(0);
  const animFrameRef = useRef(null);

  const name = demoName ?? "14 Woodbury Hill Path";
  const cost = demoCost ?? "\u00A322K \u2013 \u00A362K";

  /* ── Cursor helpers ── */
  const clearCursorTimers = useCallback(() => {
    cursorTimers.current.forEach(clearTimeout);
    cursorTimers.current = [];
  }, []);

  const runCursorScript = useCallback((p) => {
    clearCursorTimers();
    const script = CURSOR_SCRIPTS[p];
    if (!script?.length) { setCursorVisible(false); return; }
    setCursorVisible(true);
    script.forEach(([ms, x, y, click]) => {
      const tid = setTimeout(() => {
        setCursorX(x);
        setCursorY(y);
        if (click) {
          setClicking(true);
          const rid = Date.now() + Math.random();
          setRipples((prev) => [...prev, { id: rid, x, y }]);
          setTimeout(() => setClicking(false), 150);
          setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== rid)), 600);
        }
      }, ms);
      cursorTimers.current.push(tid);
    });
  }, [clearCursorTimers]);

  /* ── Progress bar (rAF, direct DOM) ── */
  useEffect(() => {
    if (!inView) { cancelAnimationFrame(animFrameRef.current); return; }
    const tick = () => {
      const elapsed = (performance.now() - cycleStartRef.current) % TOTAL;
      if (barRef.current) barRef.current.style.width = `${(elapsed / TOTAL) * 100}%`;
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [inView]);

  /* ── Phase cycling helper ── */
  const startCycleFrom = useCallback((startPhase) => {
    clearTimeout(timeoutRef.current);
    clearInterval(procRef.current);
    clearCursorTimers();

    phaseRef.current = startPhase;
    setPhase(startPhase);
    runCursorScript(startPhase);

    if (startPhase === 2) {
      setProcMsg(0);
      let mi = 0;
      procRef.current = setInterval(() => {
        mi = (mi + 1) % PROCESSING_MSGS.length;
        setProcMsg(mi);
      }, 800);
    } else {
      clearInterval(procRef.current);
    }

    const advance = () => {
      timeoutRef.current = setTimeout(() => {
        phaseRef.current = (phaseRef.current + 1) % 4;
        const p = phaseRef.current;
        setPhase(p);
        runCursorScript(p);
        if (p === 0) cycleStartRef.current = performance.now();
        if (p === 2) {
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
        advance();
      }, PHASE_DURATIONS[phaseRef.current]);
    };
    advance();
  }, [runCursorScript, clearCursorTimers]);

  /* ── Start / stop on visibility ── */
  useEffect(() => {
    if (!inView) {
      clearTimeout(timeoutRef.current);
      clearInterval(procRef.current);
      clearCursorTimers();
      return;
    }
    cycleStartRef.current = performance.now();
    startCycleFrom(0);
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(procRef.current);
      clearCursorTimers();
    };
  }, [inView, startCycleFrom, clearCursorTimers]);

  /* ── Jump to milestone ── */
  const jumpToPhase = (target) => {
    let elapsed = 0;
    for (let i = 0; i < target; i++) elapsed += PHASE_DURATIONS[i];
    cycleStartRef.current = performance.now() - elapsed;
    startCycleFrom(target);
  };

  /* ── Layout helpers ── */
  const panelBase = {
    position: "absolute", inset: "0 0 48px 0",
    display: "flex", flexDirection: "column", transition: "all 0.6s ease",
  };
  const hidden = (p) => ({
    opacity: phase === p ? 1 : 0,
    transform: phase === p ? "translateX(0)" : `translateX(${phase > p ? "-30px" : "30px"})`,
    pointerEvents: phase === p ? "auto" : "none",
  });

  return (
    <>
      <style>{`
        @keyframes demo-ripple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        @keyframes demo-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.6); }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          maxWidth: 900, margin: "0 auto", borderRadius: 8, overflow: "hidden",
          position: "relative", aspectRatio: "16/9", minHeight: 320,
          background: C.darkCard,
          border: `1px solid ${C.bd}`,
          boxShadow: `0 4px 32px rgba(0,0,0,0.3), 0 0 0 1px ${C.bd}`,
        }}
      >

        {/* ── Animated cursor ── */}
        <div style={{
          position: "absolute",
          left: `${cursorX}%`, top: `${cursorY}%`,
          zIndex: 50, pointerEvents: "none",
          opacity: cursorVisible ? 0.9 : 0,
          transform: clicking ? "scale(0.8)" : "scale(1)",
          transition: "left 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, transform 0.1s",
        }}>
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}>
            <path d="M0 0v17l4.5-4.5L8 18l3-1.5L7.5 11H14L0 0z" fill="#fff" stroke="#333" strokeWidth="0.8" />
          </svg>
        </div>

        {/* ── Click ripples ── */}
        {ripples.map((r) => (
          <div key={r.id} style={{
            position: "absolute", left: `${r.x}%`, top: `${r.y}%`,
            width: 28, height: 28, borderRadius: "50%",
            border: `1.5px solid ${C.accent}`,
            animation: "demo-ripple 0.5s ease-out forwards",
            pointerEvents: "none", zIndex: 49,
          }} />
        ))}

        {/* ═══════ PHASE 0 — Rightmove listing (LIGHT MODE) ═══════ */}
        <div style={{ ...panelBase, ...hidden(0) }}>
          <BrowserChrome />
          <div style={{ flex: 1, background: RM.bg, overflow: "hidden", position: "relative" }}>
            <div style={{ height: 6, background: RM.green }} />
            <div style={{ padding: "clamp(10px,2vw,18px) clamp(12px,2.5vw,24px)", display: "flex", gap: "clamp(12px,2vw,20px)" }}>
              {/* Left — Property photo */}
              <div style={{ width: "clamp(130px,35%,240px)", flexShrink: 0 }}>
                <div style={{ aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ flex: 1, height: 28, borderRadius: 2, overflow: "hidden", background: RM.dummy, opacity: i === 0 ? 1 : 0.6 }}>
                      {i === 0 && <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Details + skeleton */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,3.5vw,28px)", fontWeight: 700, color: RM.text, marginBottom: 4, lineHeight: 1.1 }}>{"\u00A3340,000+"}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(11px,1.4vw,14px)", color: RM.textMuted, marginBottom: 10, lineHeight: 1.3 }}>{name}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                  {["4 bed", "Detached", "Freehold"].map((t) => (
                    <span key={t} style={{ fontSize: 10, color: RM.textMuted, padding: "3px 8px", background: RM.bgSoft, borderRadius: 3, fontFamily: "'Inter',sans-serif" }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {[90, 100, 75, 85, 0, 95, 60].map((w, i) =>
                    w === 0
                      ? <div key={i} style={{ height: 6 }} />
                      : <div key={i} style={{ height: 8, background: RM.dummy, borderRadius: 3, width: `${w}%` }} />
                  )}
                </div>
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
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px clamp(12px,2.5vw,24px)", display: "flex", gap: 10, background: `linear-gradient(transparent, ${RM.bgSoft})` }}>
              <div style={{ height: 32, flex: 1, background: RM.dummy, borderRadius: 4 }} />
              <div style={{ height: 32, width: 100, background: RM.dummy, borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* ═══════ PHASE 1 — Extension popup ═══════ */}
        <div style={{ ...panelBase, ...hidden(1) }}>
          <BrowserChrome />
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
            <div style={{
              position: "absolute", top: 8, right: "clamp(12px,2.5vw,24px)",
              width: "clamp(200px,42%,260px)", background: C.dark,
              border: `1px solid ${C.bd}`, borderRadius: 8,
              padding: "clamp(12px,2vw,18px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}>
              <div style={{ position: "absolute", top: -6, right: 18, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: `6px solid ${C.dark}` }} />
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(12px,1.5vw,15px)", color: C.paper, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>{name}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1.1vw,11px)", color: C.warmGrey, marginBottom: 10 }}>{"\u00A3340,000+ \u00B7 4 bed \u00B7 Detached"}</div>
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 4, overflow: "hidden", marginBottom: 10, background: C.darkMid }}>
                <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: "clamp(7px,1vw,10px) 12px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(10px,1.3vw,13px)", color: C.paper, letterSpacing: "0.08em" }}>
                {"ANALYSE THIS PROPERTY \u2192"}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ PHASE 2 — Processing ═══════ */}
        <div style={{ ...panelBase, ...hidden(2), justifyContent: "center", alignItems: "center", background: C.dark }}>
          <div style={{ textAlign: "center", maxWidth: 320, width: "100%", padding: "0 20px" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(14px,2.5vw,20px)", color: C.paper, marginBottom: 24, lineHeight: 1.3 }}>{name}</div>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, margin: "0 auto 20px", animation: "demo-pulse 1.5s ease-in-out infinite" }} />
            <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: "clamp(13px,1.5vw,16px)", color: C.tertGrey, minHeight: 24 }}>
              {PROCESSING_MSGS[procMsg]}
            </div>
          </div>
        </div>

        {/* ═══════ PHASE 3 — Mini report preview ═══════ */}
        <div style={{ ...panelBase, ...hidden(3), justifyContent: "center", alignItems: "center", background: C.dark }}>
          <div style={{
            width: "clamp(240px,55%,340px)",
            background: "#FAF8F5", borderRadius: 6, overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}>
            {/* Dark hero strip */}
            <div style={{ background: C.dark, padding: "10px 14px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 9, fontStyle: "italic", color: C.accent, marginBottom: 4 }}>Piega.</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(12px,1.8vw,15px)", color: C.paper, fontWeight: 700, lineHeight: 1.2 }}>{name}</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: C.warmGrey, letterSpacing: "0.1em", marginTop: 2 }}>INTERWAR SEMI {"\u00B7"} 1930{"\u2013"}1945</div>
            </div>

            {/* Before / After pair */}
            <div style={{ display: "flex", gap: 2, padding: "8px 10px 0" }}>
              <div style={{ flex: 1, position: "relative", aspectRatio: "4/3", borderRadius: 3, overflow: "hidden", background: C.darkMid }}>
                <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", bottom: 2, left: 4, fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, color: "#fff", opacity: 0.6, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>NOW</span>
              </div>
              <div style={{ flex: 1, position: "relative", aspectRatio: "4/3", borderRadius: 3, overflow: "hidden", background: C.darkMid }}>
                <img src={demoAfterImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", bottom: 2, right: 4, fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, color: "#fff", opacity: 0.6, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>POSSIBLE</span>
              </div>
            </div>

            {/* Palette swatches */}
            <div style={{ display: "flex", gap: 2, padding: "6px 10px 0" }}>
              {[C.accent, C.sage, C.terracotta, C.clay, C.accentDark].map((hex, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: hex }} />
              ))}
            </div>

            {/* Cost */}
            <div style={{ padding: "8px 10px 2px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(18px,3vw,28px)", color: C.terracotta, letterSpacing: "0.02em" }}>{cost}</div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 9, fontStyle: "italic", color: "#8A8580" }}>estimated renovation</div>
            </div>

            {/* Narrative excerpt */}
            <div style={{ padding: "4px 12px 10px" }}>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 9, fontStyle: "italic", color: "#6A655F", lineHeight: 1.5 }}>
                {"\u201CThe bones are good. The walls tell a straightforward story\u2026\u201D"}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ Bottom: label + progress bar ═══════ */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 48,
          padding: "0 28px 10px",
          background: `linear-gradient(transparent, rgba(26,24,22,0.95) 30%)`,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}>
          {/* Phase label */}
          <div style={{ textAlign: "center", marginBottom: 10, pointerEvents: "none" }}>
            <span style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(11px,1.3vw,14px)", fontStyle: "italic", color: C.accent, whiteSpace: "pre-line", lineHeight: 1.4 }}>
              {PHASE_LABELS[phase]}
            </span>
          </div>

          {/* Progress bar + milestones */}
          <div style={{ position: "relative", height: 14 }}>
            {/* Milestone labels */}
            {MILESTONES.map((label, i) => (
              <span
                key={i}
                onClick={() => jumpToPhase(i)}
                style={{
                  position: "absolute",
                  left: `${MILESTONE_PCT[i]}%`,
                  top: 0,
                  transform: i === 0 ? "translateX(0)" : i === MILESTONES.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                  fontFamily: "'Inter',sans-serif", fontSize: 7,
                  letterSpacing: "0.04em", cursor: "pointer",
                  color: phase === i ? C.accent : C.warmGrey,
                  opacity: phase === i ? 1 : 0.4,
                  transition: "all 0.3s",
                }}
              >{label}</span>
            ))}

            {/* Bar track */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `${C.warmGrey}20`, borderRadius: 1 }}>
              <div ref={barRef} style={{ height: "100%", background: C.accent, borderRadius: 1, opacity: 0.5, width: "0%" }} />
            </div>

            {/* Milestone dots */}
            {MILESTONE_PCT.map((pct, i) => (
              <div
                key={i}
                onClick={() => jumpToPhase(i)}
                style={{
                  position: "absolute",
                  left: `${pct}%`, bottom: -2,
                  transform: "translate(-50%, 0)",
                  width: 6, height: 6, borderRadius: "50%",
                  background: phase >= i ? C.accent : `${C.warmGrey}30`,
                  cursor: "pointer", transition: "all 0.3s",
                  boxShadow: phase === i ? `0 0 6px ${C.accent}40` : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
