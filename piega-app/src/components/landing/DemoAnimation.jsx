"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "@/lib/theme";
import { useInView } from "./hooks";

/* ── Timing ── */
const PHASE_DURATIONS = [3000, 2500, 7500, 5500];
const TOTAL = PHASE_DURATIONS.reduce((a, b) => a + b, 0);
const PHASE_STARTS = PHASE_DURATIONS.reduce((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + PHASE_DURATIONS[i - 1]);
  return acc;
}, []);
const MILESTONE_PCT = PHASE_STARTS.map((t) => (t / TOTAL) * 100);

const MILESTONES = ["Browse", "Click", "Analyse", "Report"];

const PHASE_LABELS = [
  "This is all Rightmove shows you.",
  "One click. That\u2019s all you do.",
  "Five trained models. One chain of thought.",
  "The full reading. Before and after.",
];

/* Pipeline steps shown during Phase 2 */
const PIPE_STEPS = [
  { label: "Reading the building", result: "Interwar Semi \u00B7 1930\u20131945" },
  { label: "Spotting what matters", result: "3 issues found \u00B7 5 unknowns flagged" },
  { label: "Designing the renovation", result: "palette \u00B7 materials \u00B7 mood" },
  { label: "Seeing the difference", result: "before \u2192 after" },
  { label: "Writing the full reading", result: "4 chapters \u00B7 ready" },
];
const PIPE_INTERVAL = 1400;

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

export default function DemoAnimation({ demoImage, demoAfterImage, demoInteriorImage, demoInteriorAfterImage, demoCost, demoName }) {
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
      let pi = 0;
      procRef.current = setInterval(() => {
        pi = Math.min(pi + 1, PIPE_STEPS.length - 1);
        setProcMsg(pi);
        if (pi >= PIPE_STEPS.length - 1) clearInterval(procRef.current);
      }, PIPE_INTERVAL);
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
          let pi = 0;
          clearInterval(procRef.current);
          procRef.current = setInterval(() => {
            pi = Math.min(pi + 1, PIPE_STEPS.length - 1);
            setProcMsg(pi);
            if (pi >= PIPE_STEPS.length - 1) clearInterval(procRef.current);
          }, PIPE_INTERVAL);
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
        @keyframes demo-node-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(196,119,91,0.3); }
          50% { box-shadow: 0 0 14px rgba(196,119,91,0.6), 0 0 28px rgba(196,119,91,0.15); }
        }
        @keyframes demo-scan {
          0% { background-position: 0 -100%; }
          100% { background-position: 0 200%; }
        }
        @keyframes demo-fade-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes demo-report-scroll {
          0%, 4%    { transform: translateY(0); }
          18%, 22%  { transform: translateY(-14%); }
          36%, 40%  { transform: translateY(-28%); }
          56%, 60%  { transform: translateY(-42%); }
          78%, 82%  { transform: translateY(-54%); }
          94%, 100% { transform: translateY(-64%); }
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
              {/* Left — Property photos: exterior + raw interior */}
              <div style={{ width: "clamp(130px,35%,240px)", flexShrink: 0 }}>
                <div style={{ aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                {/* Thumbnail strip — show raw interior in slot 1 to expose dated rooms */}
                <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ flex: 1, height: 28, borderRadius: 2, overflow: "hidden", background: RM.dummy, opacity: i <= 1 ? 1 : 0.5 }}>
                      {i === 0 && <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {i === 1 && demoInteriorImage && <img src={demoInteriorImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Details + what's missing */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,3.5vw,28px)", fontWeight: 700, color: RM.text, marginBottom: 4, lineHeight: 1.1 }}>{"\u00A3340,000+"}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(11px,1.4vw,14px)", color: RM.textMuted, marginBottom: 10, lineHeight: 1.3 }}>{name}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                  {["4 bed", "Detached", "Freehold"].map((t) => (
                    <span key={t} style={{ fontSize: 10, color: RM.textMuted, padding: "3px 8px", background: RM.bgSoft, borderRadius: 3, fontFamily: "'Inter',sans-serif" }}>{t}</span>
                  ))}
                </div>
                {/* Skeleton description — what you do get */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                  {[90, 100, 75, 85, 0, 95].map((w, i) =>
                    w === 0
                      ? <div key={i} style={{ height: 4 }} />
                      : <div key={i} style={{ height: 7, background: RM.dummy, borderRadius: 3, width: `${w}%` }} />
                  )}
                </div>
                {/* "Not included" — what Rightmove doesn't tell you */}
                <div style={{ borderTop: `1px solid ${RM.dummy}`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    "Renovation cost",
                    "Structural assessment",
                    "What it could look like",
                  ].map((label) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10, color: "#CC6B5A", fontFamily: "'Inter',sans-serif", lineHeight: 1 }}>{"\u2715"}</span>
                      <span style={{ fontSize: 9, color: RM.textMuted, fontFamily: "'Inter',sans-serif", letterSpacing: "0.01em" }}>{label}</span>
                    </div>
                  ))}
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

        {/* ═══════ PHASE 2 — AI Pipeline Visualization ═══════ */}
        <div style={{ ...panelBase, ...hidden(2), background: C.dark }}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "clamp(16px,3vw,28px) clamp(20px,4vw,44px)" }}>

            {/* Pipeline node indicator — horizontal chain */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "clamp(10px,2vw,20px)" }}>
              {PIPE_STEPS.flatMap((_, i) => {
                const done = i < procMsg;
                const active = i === procMsg;
                const items = [];
                if (i > 0) {
                  items.push(
                    <div key={`l${i}`} style={{
                      width: "clamp(16px,3vw,32px)", height: 1,
                      background: done || active ? `${C.accent}50` : `${C.warmGrey}18`,
                      transition: "background 0.5s",
                    }} />
                  );
                }
                items.push(
                  <div key={`n${i}`} style={{
                    width: "clamp(8px,1.2vw,11px)", height: "clamp(8px,1.2vw,11px)",
                    borderRadius: "50%",
                    background: active ? C.terracotta : done ? C.accent : `${C.warmGrey}25`,
                    transition: "all 0.4s ease",
                    boxShadow: active ? `0 0 10px ${C.terracotta}50, 0 0 20px ${C.terracotta}20` : "none",
                    animation: active ? "demo-node-pulse 2s ease-in-out infinite" : "none",
                    flexShrink: 0,
                  }} />
                );
                return items;
              })}
            </div>

            {/* Visual artifact area */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

              {/* Step 0: Reading the building — photo with scan overlay */}
              {procMsg === 0 && (
                <div style={{ textAlign: "center", animation: "demo-fade-in 0.4s ease both" }}>
                  <div style={{ position: "relative", width: "clamp(160px,36%,240px)", margin: "0 auto 10px", borderRadius: 4, overflow: "hidden", boxShadow: `0 4px 24px rgba(0,0,0,0.3)` }}>
                    <img src={demoImage} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      background: `linear-gradient(transparent 45%, ${C.terracotta}15 50%, transparent 55%)`,
                      backgroundSize: "100% 300%",
                      animation: "demo-scan 2s linear infinite",
                      pointerEvents: "none",
                    }} />
                  </div>
                  <div style={{
                    fontFamily: "'Bebas Neue',sans-serif",
                    fontSize: "clamp(11px,1.5vw,15px)",
                    letterSpacing: "0.08em",
                    color: C.terracotta, opacity: 0.9,
                  }}>
                    {"INTERWAR SEMI \u00B7 1930\u20131945"}
                  </div>
                </div>
              )}

              {/* Step 1: Spotting issues — cards appearing */}
              {procMsg === 1 && (
                <div style={{ width: "clamp(220px,55%,340px)", animation: "demo-fade-in 0.4s ease both" }}>
                  {[
                    { issue: "Damp staining on chimney breast", sev: "moderate", c: C.clay },
                    { issue: "Window seals dated throughout", sev: "minor", c: C.warmGrey },
                    { issue: "Roof age unknown", sev: "investigate", c: C.terracotta },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "clamp(6px,1vw,10px) clamp(8px,1.2vw,14px)",
                      background: C.darkMid, border: `1px solid ${C.bd}`,
                      borderRadius: 4, marginBottom: i < 2 ? "clamp(4px,0.6vw,8px)" : 0,
                    }}>
                      <span style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(11px,1.3vw,14px)", color: C.paper }}>{item.issue}</span>
                      <span style={{
                        fontFamily: "'Inter',sans-serif", fontSize: "clamp(7px,0.8vw,9px)",
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        color: item.c, fontWeight: 600, flexShrink: 0, marginLeft: 12,
                      }}>{item.sev}</span>
                    </div>
                  ))}
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(8px,0.9vw,10px)", color: `${C.warmGrey}99`, marginTop: "clamp(6px,1vw,10px)" }}>
                    + 5 unknowns flagged for site visit
                  </div>
                </div>
              )}

              {/* Step 2: Designing — palette swatches + mood */}
              {procMsg === 2 && (
                <div style={{ width: "clamp(220px,55%,320px)", textAlign: "center", animation: "demo-fade-in 0.4s ease both" }}>
                  <div style={{ display: "flex", gap: "clamp(4px,0.6vw,8px)", marginBottom: "clamp(10px,1.5vw,16px)" }}>
                    {[
                      { hex: C.accent, name: "Raw linen" },
                      { hex: C.sage, name: "Sage" },
                      { hex: C.terracotta, name: "Terracotta" },
                      { hex: C.clay, name: "Clay" },
                      { hex: C.accentDark, name: "Aged brass" },
                    ].map((col, i) => (
                      <div key={i} style={{ flex: 1 }}>
                        <div style={{ height: "clamp(24px,4vw,40px)", borderRadius: 3, background: col.hex, border: `1px solid ${C.bd}` }} />
                        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(7px,0.8vw,9px)", color: C.warmGrey, marginTop: 4, lineHeight: 1.2 }}>{col.name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: "clamp(13px,1.6vw,17px)",
                    fontStyle: "italic", color: C.accent,
                    lineHeight: 1.5, opacity: 0.8,
                  }}>
                    {"\u201Chonest, warm, rooted in place\u201D"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "clamp(8px,1.2vw,14px)", marginTop: "clamp(8px,1vw,12px)" }}>
                    {["Lime plaster", "Engineered oak", "Reclaimed stone"].map((m, i) => (
                      <span key={i} style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(8px,0.9vw,10px)", color: C.warmGrey, letterSpacing: "0.02em" }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Seeing the difference — before/after */}
              {procMsg === 3 && (
                <div style={{ width: "clamp(260px,65%,400px)", animation: "demo-fade-in 0.4s ease both" }}>
                  <div style={{ display: "flex", gap: "clamp(4px,0.6vw,8px)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <img src={demoInteriorImage || demoImage} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", filter: "saturate(0.7)" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 8px 4px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(9px,1.1vw,12px)", color: "#fff", opacity: 0.8, letterSpacing: "0.1em" }}>NOW</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <img src={demoInteriorAfterImage || demoAfterImage || demoImage} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 8px 4px", background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(9px,1.1vw,12px)", color: C.paper, opacity: 0.9, letterSpacing: "0.1em" }}>AFTER</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Writing the reading — mini report silhouette */}
              {procMsg === 4 && (
                <div style={{ width: "clamp(150px,32%,200px)", animation: "demo-fade-in 0.4s ease both" }}>
                  <div style={{ background: C.darkMid, borderRadius: 4, border: `1px solid ${C.bd}`, overflow: "hidden", boxShadow: `0 4px 24px rgba(0,0,0,0.3)` }}>
                    <div style={{ background: C.dark, padding: "8px 10px 6px" }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 7, fontStyle: "italic", color: C.accent }}>Piega</div>
                      <div style={{ height: 3, background: C.accent, width: "60%", borderRadius: 1, marginTop: 4, opacity: 0.3 }} />
                    </div>
                    <div style={{ height: 36, position: "relative" }}>
                      <img src={demoAfterImage || demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                    </div>
                    <div style={{ background: "#FAF8F5", padding: "6px 10px 8px" }}>
                      {[1, 2, 3, 4].map((ch) => (
                        <div key={ch} style={{ marginBottom: 4 }}>
                          <div style={{ height: 2, background: "#DFDAD4", borderRadius: 1, width: `${40 + ch * 8}%`, marginBottom: 2 }} />
                          <div style={{ height: 1.5, background: "#ECEAE6", borderRadius: 1, width: "90%" }} />
                          <div style={{ height: 1.5, background: "#ECEAE6", borderRadius: 1, width: "70%", marginTop: 1 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Bebas Neue',sans-serif",
                    fontSize: "clamp(10px,1.2vw,13px)",
                    letterSpacing: "0.1em", color: C.sage,
                    textAlign: "center", marginTop: "clamp(8px,1vw,12px)",
                  }}>
                    READY.
                  </div>
                </div>
              )}

            </div>

            {/* Step label + result */}
            <div style={{ textAlign: "center", marginTop: "clamp(8px,1.5vw,16px)" }}>
              <div style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: "clamp(14px,1.8vw,18px)",
                fontStyle: "italic", color: C.paper,
              }}>
                {PIPE_STEPS[procMsg]?.label}
              </div>
              <div style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: "clamp(9px,1vw,11px)",
                color: C.warmGrey,
                marginTop: 3, letterSpacing: "0.03em",
              }}>
                {PIPE_STEPS[procMsg]?.result}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ PHASE 3 — Scrolling report preview ═══════ */}
        <div style={{ ...panelBase, ...hidden(3), background: C.dark, overflow: "hidden" }}>
          {/* Report "window" — centred card with overflow clipping */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width: "clamp(280px, 65%, 390px)",
            height: "clamp(280px, 80%, 360px)",
            overflow: "hidden", borderRadius: 6,
            boxShadow: "0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,169,154,0.08)",
          }}>
            {/* Top fade mask */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20, background: `linear-gradient(${C.dark}90, transparent)`, zIndex: 2, pointerEvents: "none" }} />
            {/* Bottom fade mask */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(transparent, ${C.dark})`, zIndex: 2, pointerEvents: "none" }} />

            {/* Scrolling content — auto-scrolls through the report */}
            <div style={{
              animation: phase === 3 ? "demo-report-scroll 4.6s ease-in-out 0.4s both" : "none",
            }}>

              {/* ── 0. TRANSFORMATION HERO — before → after ── */}
              <div style={{ background: C.dark, padding: "10px 10px 8px", position: "relative" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, letterSpacing: "0.2em", color: C.terracotta, marginBottom: 5, textAlign: "center" }}>WHAT IT IS. WHAT IT COULD BE.</div>
                <div style={{ display: "flex", gap: 4, borderRadius: 4, overflow: "hidden" }}>
                  {/* Before — raw interior */}
                  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <img src={demoInteriorImage || demoImage} alt="" style={{ width: "100%", height: 75, objectFit: "cover", display: "block", filter: "saturate(0.7)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 6px 3px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, color: "#fff", opacity: 0.8, letterSpacing: "0.1em" }}>BEFORE</span>
                    </div>
                  </div>
                  {/* After — renovated */}
                  <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <img src={demoInteriorAfterImage || demoAfterImage || demoImage} alt="" style={{ width: "100%", height: 75, objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 6px 3px", background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, color: C.paper, opacity: 0.9, letterSpacing: "0.1em" }}>AFTER</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 1. DARK HERO ── */}
              <div style={{ background: C.dark, padding: "12px 16px 14px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)", fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: "rgba(255,255,255,0.02)", letterSpacing: "0.05em", pointerEvents: "none", whiteSpace: "nowrap" }}>INTERWAR SEMI</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 9, fontStyle: "italic", color: C.accent, marginBottom: 3 }}>Piega</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, letterSpacing: "0.2em", color: C.terracotta, marginBottom: 6 }}>{"RIGHTMOVE \u00B7 LUTON \u00B7 LU2"}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(14px,2.2vw,18px)", color: C.paper, fontWeight: 400, lineHeight: 1.15, marginBottom: 4 }}>{name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 7.5, color: "rgba(184,169,154,0.5)", marginBottom: 8 }}>{"4 bed \u00B7 Detached \u00B7 Freehold"}</div>
                <div style={{ display: "flex", gap: 14 }}>
                  {[{ v: "\u00A3340K+", s: "guide", c: C.clay }, { v: "4 BED", s: "2 bath" }, { v: "DETACHED", s: "Freehold" }, { v: "1930\u20131945", s: "Interwar Semi" }].map((stat, i) => (
                    <div key={i}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 10, letterSpacing: "0.04em", color: stat.c ?? C.paper }}>{stat.v}</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 5.5, color: "rgba(184,169,154,0.4)" }}>{stat.s}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 2. HERO IMAGE ── */}
              <div style={{ lineHeight: 0, position: "relative" }}>
                <img src={demoAfterImage || demoImage} alt="" style={{ width: "100%", height: 75, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", top: 5, left: 8, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, letterSpacing: "0.2em", color: "rgba(250,248,245,0.35)", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>THE APPROACH</div>
              </div>

              {/* ── BODY — paper background ── */}
              <div style={{ background: "#FAF8F5", padding: "0 14px" }}>

                {/* 3. Opening hook */}
                <div style={{ padding: "10px 0 4px" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", lineHeight: 1.55, color: "#1E1C1A" }}>
                    {"\u201CThe bones are good. The walls tell a straightforward story \u2014 but the numbers tell another.\u201D"}
                  </div>
                </div>

                {/* 4. Archetype slab */}
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 9, letterSpacing: "0.04em", color: C.terracotta, margin: "6px 0 8px", textTransform: "uppercase" }}>
                  Interwar Semi. 1930{"\u2013"}1945. Cavity brick, concrete tile roof.
                </div>

                {/* 5. Chapter 1 — DIMMED */}
                <div style={{ opacity: 0.35, margin: "8px 0" }}>
                  <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 1</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A", marginBottom: 6 }}>{"What You\u2019re Looking At"}</div>
                  {[92, 100, 78, 88, 60].map((w, i) => (
                    <div key={i} style={{ height: 3.5, background: "#DFDAD4", borderRadius: 2, width: `${w}%`, marginBottom: 3 }} />
                  ))}
                </div>

                {/* Period features — semi-focused */}
                <div style={{ opacity: 0.6, marginBottom: 6 }}>
                  <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 4 }}>Period Features</div>
                  {[{ f: "Original sash windows", s: "visible", hidden: false }, { f: "Ceiling cornicing", s: "visible", hidden: false }, { f: "Timber floorboards", s: "likely beneath carpet", hidden: true }, { f: "Cast-iron radiators", s: "visible", hidden: false }, { f: "Fireplaces behind boarding", s: "hidden — inferred", hidden: true }].map((feat, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0", borderBottom: i < 4 ? "1px solid rgba(30,28,26,0.05)" : "none" }}>
                      <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7, color: feat.hidden ? "#6B6560" : "#1E1C1A", fontStyle: feat.hidden ? "italic" : "normal" }}>{feat.f}</span>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 5, color: "#9B9590", textTransform: "lowercase", flexShrink: 0, marginLeft: 8 }}>{feat.s}</span>
                    </div>
                  ))}
                </div>

                {/* 6. Construction grid — DIMMED */}
                <div style={{ opacity: 0.3, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, margin: "4px 0 10px" }}>
                  {["Walls", "Roof", "Found.", "Insul.", "Windows", "Heating"].map((label) => (
                    <div key={label} style={{ padding: "3px 4px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff" }}>
                      <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "#9B9590" }}>{label}</div>
                      <div style={{ height: 2.5, background: "#DFDAD4", borderRadius: 1, width: "65%", marginTop: 2 }} />
                    </div>
                  ))}
                </div>

                {/* divider */}
                <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "0 auto 10px" }} />

                {/* 7. Chapter 2 heading */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 2</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A" }}>What It Could Become</div>
                </div>

                {/* 8. BEFORE / AFTER EXTERIOR — FOCUS AREA */}
                <div style={{ margin: "0 -6px 3px" }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 5.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.clay, marginBottom: 2, paddingLeft: 6 }}>{"DRAG \u00B7 FRONT EXTERIOR"}</div>
                  <div style={{ position: "relative", overflow: "hidden", borderRadius: 3, display: "flex", height: 80 }}>
                    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                      <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <span style={{ position: "absolute", bottom: 3, left: 5, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, color: "#fff", opacity: 0.65, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>NOW</span>
                    </div>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.5, background: "rgba(250,248,245,0.5)", transform: "translateX(-50%)", zIndex: 1 }}>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 14, height: 14, borderRadius: "50%", background: "rgba(30,28,26,0.6)", border: "1px solid rgba(250,248,245,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, color: "#FAF8F5" }}>{"\u2194"}</div>
                    </div>
                    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                      <img src={demoAfterImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <span style={{ position: "absolute", bottom: 3, right: 5, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, color: "#fff", opacity: 0.65, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>POSSIBLE</span>
                    </div>
                  </div>
                </div>

                {/* 8b. BEFORE / AFTER INTERIOR — FOCUS AREA */}
                {(demoInteriorImage || demoInteriorAfterImage) && (
                  <div style={{ margin: "0 -6px 3px" }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 5.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.clay, marginBottom: 2, paddingLeft: 6 }}>{"DRAG \u00B7 LIVING ROOM"}</div>
                    <div style={{ position: "relative", overflow: "hidden", borderRadius: 3, display: "flex", height: 65 }}>
                      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                        <img src={demoInteriorImage || demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <span style={{ position: "absolute", bottom: 3, left: 5, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, color: "#fff", opacity: 0.65, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>NOW</span>
                      </div>
                      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.5, background: "rgba(250,248,245,0.5)", transform: "translateX(-50%)", zIndex: 1 }}>
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "rgba(30,28,26,0.6)", border: "1px solid rgba(250,248,245,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 5, color: "#FAF8F5" }}>{"\u2194"}</div>
                      </div>
                      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                        <img src={demoInteriorAfterImage || demoAfterImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <span style={{ position: "absolute", bottom: 3, right: 5, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, color: "#fff", opacity: 0.65, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>POSSIBLE</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Palette */}
                <div style={{ margin: "8px 0 4px" }}>
                  <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Palette</div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 3 }}>
                    {[{ hex: C.accent, name: "Raw linen" }, { hex: C.sage, name: "Sage" }, { hex: C.terracotta, name: "Terracotta" }, { hex: C.clay, name: "Clay" }, { hex: C.accentDark, name: "Aged brass" }].map((col, i) => (
                      <div key={i} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ height: 14, borderRadius: 2, background: col.hex, border: "1px solid rgba(30,28,26,0.06)" }} />
                        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 5, color: "#6B6560", marginTop: 2, lineHeight: 1.2 }}>{col.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 9b. Materials list */}
                <div style={{ margin: "4px 0" }}>
                  <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Materials</div>
                  {["Lime plaster", "Engineered oak", "Reclaimed stone", "Aged brass hardware"].map((mat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", padding: "2px 0", borderBottom: i < 3 ? "1px solid rgba(30,28,26,0.05)" : "none" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: [C.terracotta, C.clay, C.sage, C.accentDark][i], marginRight: 6, opacity: 0.6, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7, color: "#1E1C1A" }}>{mat}</span>
                    </div>
                  ))}
                </div>

                {/* Mood + avoid */}
                <div style={{ margin: "4px 0 6px" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 7.5, fontStyle: "italic", color: "#B8A99A", marginBottom: 3 }}>
                    {"\u201Chonest, warm, rooted in place\u201D"}
                  </div>
                  <div style={{ opacity: 0.4, fontFamily: "'Inter',sans-serif", fontSize: 5.5, color: "#9B9590" }}>
                    {"Avoid: grey composite, chrome fittings, vinyl plank"}
                  </div>
                </div>

                {/* divider */}
                <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "8px auto" }} />

                {/* 10. Chapter 3 — issues (semi-focused) */}
                <div style={{ margin: "0 0 8px" }}>
                  <div style={{ opacity: 0.5 }}>
                    <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 3</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A", marginBottom: 4 }}>What to Investigate</div>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: "#1E1C1A", letterSpacing: "0.03em", marginBottom: 5 }}>
                    WHERE THE REAL DECISIONS ARE.
                  </div>
                  {[{ label: "Damp staining on chimney breast", sev: "moderate", c: C.clay }, { label: "Dated window seals throughout", sev: "minor", c: "#9B9590" }].map((issue, i) => (
                    <div key={i} style={{ padding: "4px 6px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff", marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7.5, color: "#1E1C1A" }}>{issue.label}</span>
                      <span style={{ fontSize: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: issue.c, fontFamily: "'Inter',sans-serif" }}>{issue.sev}</span>
                    </div>
                  ))}
                  <div style={{ opacity: 0.4, padding: "4px 6px", borderRadius: 2, background: "rgba(30,28,26,0.03)", marginTop: 3 }}>
                    <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Cannot be assessed from photos</div>
                    {["Electrics age", "Drainage", "Asbestos risk"].map((u, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
                        <div style={{ width: 2, height: 2, borderRadius: "50%", background: "#9B9590" }} />
                        <span style={{ fontSize: 5.5, color: "#6B6560", fontFamily: "'EB Garamond',serif" }}>{u}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* divider */}
                <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "8px auto" }} />

                {/* 11. Chapter 4 heading */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 4</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A" }}>The Numbers</div>
                </div>

                {/* Narrative transition */}
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 7.5, fontStyle: "italic", color: "#B8A99A", marginBottom: 4, lineHeight: 1.5 }}>
                  {"Here\u2019s what all that means in money."}
                </div>

                {/* Cost rows — semi-focused with more items */}
                <div style={{ opacity: 0.65, marginBottom: 6 }}>
                  {[{ cat: "Structural & Shell", range: "\u00A38k\u2013\u00A315k" }, { cat: "M&E Services", range: "\u00A35k\u2013\u00A312k" }, { cat: "Kitchen & Bath", range: "\u00A36k\u2013\u00A314k" }, { cat: "Finishes & Decoration", range: "\u00A34k\u2013\u00A38k" }, { cat: "External Works", range: "\u00A33k\u2013\u00A37k" }, { cat: "Contingency (15%)", range: "\u00A34k\u2013\u00A38k" }].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0", borderBottom: i < 5 ? "1px solid rgba(30,28,26,0.05)" : "none" }}>
                      <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7, color: "#1E1C1A" }}>{row.cat}</span>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 7, fontWeight: 600, color: "#1E1C1A" }}>{row.range}</span>
                    </div>
                  ))}
                </div>

                {/* 12. BIG NUMBER — FOCUS */}
                <div style={{ textAlign: "center", padding: "10px 0", borderTop: "1px solid rgba(30,28,26,0.06)", borderBottom: "1px solid rgba(30,28,26,0.06)", margin: "2px 0" }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,5vw,40px)", letterSpacing: "0.02em", color: "#1E1C1A", lineHeight: 1 }}>{cost}</div>
                  <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 6.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9B9590", marginTop: 3 }}>
                    ten-year cost of ownership beyond purchase
                  </div>
                </div>

                {/* 13. Stacked bar — FOCUS with labels */}
                <div style={{ margin: "8px 0 2px" }}>
                  <div style={{ display: "flex", height: 8, overflow: "hidden", borderRadius: 1 }}>
                    {[{ flex: 3, color: C.terracotta }, { flex: 2.5, color: C.clay }, { flex: 2, color: C.accent }, { flex: 1.5, color: C.sage }, { flex: 1, color: "#8A8580" }].map((seg, i) => (
                      <div key={i} style={{ flex: seg.flex, background: seg.color, height: "100%" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", marginTop: 2 }}>
                    {[{ label: "Structural", flex: 3 }, { label: "M&E", flex: 2.5 }, { label: "Finishes", flex: 2 }, { label: "External", flex: 1.5 }, { label: "Other", flex: 1 }].map((seg, i) => (
                      <div key={i} style={{ flex: seg.flex, fontFamily: "'Bebas Neue',sans-serif", fontSize: 5, letterSpacing: "0.06em", color: "#6B6560", lineHeight: 1.2, paddingRight: 2, overflow: "hidden" }}>{seg.label}</div>
                    ))}
                  </div>
                </div>

                {/* Price gap — semi-focus */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", opacity: 0.7 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 5, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590" }}>Asking</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: "#1E1C1A" }}>{"\u00A3340K"}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#9B9590" }}>{"\u2192"}</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 5, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590" }}>Post-Works</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.sage }}>{"\u00A3420K\u2013\u00A3480K"}</div>
                  </div>
                </div>

                {/* Phased budget — semi-focused with descriptions */}
                <div style={{ opacity: 0.6, margin: "5px 0" }}>
                  <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Phased Budget</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {[{ label: "Move-in Basics", range: "\u00A38k\u2013\u00A312k", desc: "Rewire, boiler, damp treatment", c: C.terracotta }, { label: "Year 1\u20132", range: "\u00A312k\u2013\u00A328k", desc: "Kitchen, bathrooms, flooring", c: C.clay }, { label: "Complete Vision", range: "\u00A34k\u2013\u00A38k", desc: "Garden, external works, finishes", c: C.sage }].map((p, i) => (
                      <div key={i} style={{ padding: "4px 6px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 6, fontWeight: 600, color: p.c }}>{p.label}</span>
                          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, color: "#1E1C1A" }}>{p.range}</span>
                        </div>
                        <div style={{ fontSize: 5, color: "#9B9590", marginTop: 1 }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost drivers */}
                <div style={{ opacity: 0.5, margin: "5px 0" }}>
                  <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Key Cost Drivers</div>
                  {[{ factor: "Roof condition", impact: "Unknown age \u2014 could add \u00A35\u201312k" }, { factor: "Electrics rewire", impact: "Likely needed \u2014 \u00A34\u20138k" }].map((d, i) => (
                    <div key={i} style={{ padding: "3px 5px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff", marginBottom: 2 }}>
                      <div style={{ fontSize: 6, fontWeight: 600, color: "#1E1C1A" }}>{d.factor}</div>
                      <div style={{ fontSize: 5, color: "#6B6560" }}>{d.impact}</div>
                    </div>
                  ))}
                </div>

                {/* Confidence — dimmed */}
                <div style={{ opacity: 0.3, padding: "3px 5px", borderRadius: 2, background: "rgba(30,28,26,0.03)", marginBottom: 6 }}>
                  <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 5.5, fontStyle: "italic", color: "#6B6560", lineHeight: 1.4 }}>
                    Desktop appraisal based on listing photos and public data. Not a survey. Not a tender.
                  </div>
                </div>

                {/* divider */}
                <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "0 auto 8px" }} />

                {/* 15. CLOSING GATE — FOCUS */}
                <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 8, fontStyle: "italic", color: "#B8A99A", marginBottom: 6, lineHeight: 1.5, maxWidth: 180, margin: "0 auto 6px" }}>
                    {"\u201CThis one has warmth. But warmth alone doesn\u2019t fix the roof.\u201D"}
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: "#1E1C1A", letterSpacing: "0.04em", marginBottom: 2 }}>YOU READ THIS FAR.</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 6.5, fontStyle: "italic", color: "#6B6560" }}>This is one building. Yours is different.</div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, letterSpacing: 3, color: "#9B9590" }}>PIEGA<span style={{ color: C.terracotta }}>.</span></div>
                  </div>
                </div>

              </div>{/* end paper body */}
            </div>{/* end scrolling content */}
          </div>{/* end report window */}
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
