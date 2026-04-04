"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "@/lib/theme";
import { useInView } from "./hooks";

import {
  PHASE_DURATIONS, TOTAL, PHASE_STARTS, MILESTONE_PCT,
  MILESTONES, PHASE_LABELS, PIPE_STEPS, PIPE_INTERVAL,
  CURSOR_SCRIPTS, DEMO_KEYFRAMES,
} from "./demo/constants";
import { PhaseRightmove, PhaseExtension } from "./demo/PhaseBrowse";
import PhasePipeline from "./demo/PhasePipeline";
import PhaseReport from "./demo/PhaseReport";

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
      <style>{DEMO_KEYFRAMES}</style>

      <div
        ref={containerRef}
        style={{
          maxWidth: 900, margin: "0 auto", borderRadius: 8, overflow: "hidden",
          position: "relative", aspectRatio: "16/9", minHeight: 240,
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

        <PhaseRightmove panelBase={panelBase} hidden={hidden(0)} name={name} demoImage={demoImage} demoInteriorImage={demoInteriorImage} />
        <PhaseExtension panelBase={panelBase} hidden={hidden(1)} name={name} demoImage={demoImage} />
        <PhasePipeline panelBase={panelBase} hidden={hidden(2)} procMsg={procMsg} demoImage={demoImage} demoAfterImage={demoAfterImage} demoInteriorImage={demoInteriorImage} demoInteriorAfterImage={demoInteriorAfterImage} />
        <PhaseReport panelBase={panelBase} hidden={hidden(3)} phase={phase} name={name} cost={cost} demoImage={demoImage} demoAfterImage={demoAfterImage} demoInteriorImage={demoInteriorImage} demoInteriorAfterImage={demoInteriorAfterImage} />

        {/* ═══════ Bottom: label + progress bar ═══════ */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "0 28px 12px",
          background: `linear-gradient(transparent, rgba(26,24,22,0.97) 35%)`,
          display: "flex", flexDirection: "column", gap: 8,
          justifyContent: "flex-end",
        }}>
          {/* Phase label */}
          <div style={{ textAlign: "center", pointerEvents: "none" }}>
            <span style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(12px,1.4vw,15px)", fontStyle: "italic", color: C.accent, whiteSpace: "pre-line", lineHeight: 1.4 }}>
              {PHASE_LABELS[phase]}
            </span>
          </div>

          {/* Milestone labels row */}
          <div style={{ position: "relative", height: 16 }}>
            {MILESTONES.map((label, i) => (
              <span
                key={i}
                onClick={() => jumpToPhase(i)}
                style={{
                  position: "absolute",
                  left: `${MILESTONE_PCT[i]}%`,
                  top: 0,
                  transform: i === 0 ? "translateX(0)" : i === MILESTONES.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                  fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1vw,11px)",
                  letterSpacing: "0.05em", cursor: "pointer",
                  color: phase === i ? C.accent : C.warmGrey,
                  opacity: phase === i ? 1 : 0.5,
                  transition: "all 0.3s",
                  whiteSpace: "nowrap",
                }}
              >{label}</span>
            ))}
          </div>

          {/* Bar track + dots */}
          <div style={{ position: "relative", height: 8, marginBottom: 0 }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, transform: "translateY(-50%)", background: `${C.warmGrey}20`, borderRadius: 1 }}>
              <div ref={barRef} style={{ height: "100%", background: C.accent, borderRadius: 1, opacity: 0.5, width: "0%" }} />
            </div>
            {MILESTONE_PCT.map((pct, i) => (
              <div
                key={i}
                onClick={() => jumpToPhase(i)}
                style={{
                  position: "absolute",
                  left: `${pct}%`, top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 7, height: 7, borderRadius: "50%",
                  background: phase >= i ? C.accent : `${C.warmGrey}30`,
                  cursor: "pointer", transition: "all 0.3s",
                  boxShadow: phase === i ? `0 0 8px ${C.accent}50` : "none",
                }}
                // Invisible padding for touch target
              ><div style={{ position: "absolute", inset: -18 }} /></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
