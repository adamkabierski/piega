"use client";

import { useState, useEffect, useRef } from "react";
import { C } from "@/lib/theme";

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useReveal(t = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setV(true);
          o.disconnect();
        }
      },
      { threshold: t }
    );
    o.observe(el);
    return () => o.disconnect();
  }, [t]);
  return [ref, v];
}

// ── Primitive components ───────────────────────────────────────────────────

export function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Slab({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Bebas Neue',sans-serif",
        fontSize: "clamp(19px,3.8vw,28px)",
        letterSpacing: "0.04em",
        lineHeight: 1.3,
        color: C.paper,
        margin: "36px 0",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function Verse({ children, style = {} }) {
  return (
    <div
      style={{
        fontFamily: "'Playfair Display',serif",
        fontSize: "clamp(15px,2.6vw,20px)",
        fontStyle: "italic",
        lineHeight: 1.55,
        color: C.accent,
        margin: "28px 0",
        maxWidth: 540,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Cap({ children, style = {} }) {
  return (
    <div
      style={{
        fontFamily: "'Inter',sans-serif",
        fontSize: 11,
        color: C.tertGrey,
        letterSpacing: "0.02em",
        lineHeight: 1.5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Lab({ children, color }) {
  return (
    <div
      style={{
        fontFamily: "'Inter',sans-serif",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: color || C.tertGrey,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

export function Photo({ src, aspect = "16/9", tag, style = {} }) {
  const [ref, v] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 4,
        overflow: "hidden",
        opacity: v ? 1 : 0,
        transform: v ? "scale(1)" : "scale(0.98)",
        transition: "all 0.8s ease 0.15s",
        ...style,
      }}
    >
      <img
        src={src}
        style={{
          width: "100%",
          display: "block",
          aspectRatio: aspect,
          objectFit: "cover",
        }}
        alt=""
      />
      {tag && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            fontFamily: "'Inter',sans-serif",
            fontSize: 7,
            color: C.paper,
            opacity: 0.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {tag}
        </div>
      )}
    </div>
  );
}

export function BeforeAfterReal({ beforeSrc, afterSrc, label }) {
  const [split, setSplit] = useState(50);
  const [ref, v] = useReveal();
  const cRef = useRef(null);

  const hm = (cx) => {
    if (!cRef.current) return;
    const r = cRef.current.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100)));
  };

  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transition: "opacity 0.8s ease 0.15s" }}>
      {label && <Lab color={C.clay}>{label}</Lab>}
      <div
        ref={cRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: 4,
          overflow: "hidden",
          cursor: "ew-resize",
          userSelect: "none",
        }}
        onMouseMove={(e) => e.buttons === 1 && hm(e.clientX)}
        onTouchMove={(e) => hm(e.touches[0].clientX)}
      >
        <img
          src={beforeSrc}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          alt=""
        />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <img
            src={afterSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt=""
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            fontFamily: "'Bebas Neue',sans-serif",
            fontSize: 11,
            color: C.paper,
            opacity: 0.6,
            letterSpacing: "0.06em",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          NOW
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            fontFamily: "'Bebas Neue',sans-serif",
            fontSize: 11,
            color: C.paper,
            opacity: 0.6,
            letterSpacing: "0.06em",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          POSSIBLE
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${split}%`,
            width: 2,
            background: C.paper,
            opacity: 0.5,
            transform: "translateX(-1px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: C.dark,
              border: `1.5px solid ${C.paper}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Inter',sans-serif",
              fontSize: 8,
              color: C.paper,
              opacity: 0.65,
            }}
          >
            ↔
          </div>
        </div>
      </div>
    </div>
  );
}
