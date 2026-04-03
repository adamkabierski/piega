"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { useReveal, useInView } from "./hooks";

/* ---------- Large before/after slider ---------- */

function LargeSlider({ block }) {
  const [split, setSplit] = useState(50);
  const [dragged, setDragged] = useState(false);
  const cRef = useRef(null);
  const move = (cx) => {
    if (!cRef.current) return;
    const r = cRef.current.getBoundingClientRect();
    setSplit(Math.max(5, Math.min(95, ((cx - r.left) / r.width) * 100)));
  };

  return (
    <>
      <div
        ref={cRef}
        style={{
          position: "relative", width: "100%", aspectRatio: "2/1",
          borderRadius: 6, overflow: "hidden",
          cursor: "ew-resize", userSelect: "none",
          background: C.darkMid,
        }}
        onMouseDown={() => setDragged(false)}
        onMouseMove={(e) => { if (e.buttons === 1) { setDragged(true); move(e.clientX); } }}
        onTouchMove={(e) => { setDragged(true); move(e.touches[0].clientX); }}
      >
        <img src={block.afterImage} alt="" loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; }} />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <img src={block.beforeImage} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }} />
        </div>
        <div style={{ position: "absolute", bottom: 10, left: 12, fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.paper, opacity: 0.6, letterSpacing: "0.06em", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>NOW</div>
        <div style={{ position: "absolute", bottom: 10, right: 12, fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.paper, opacity: 0.6, letterSpacing: "0.06em", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>POSSIBLE</div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 2, background: C.paper, opacity: 0.5, transform: "translateX(-1px)" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(26,24,22,0.6)", border: "1.5px solid rgba(250,248,245,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontSize: 9, color: C.paper, opacity: 0.8 }}>{"\u2194"}</div>
        </div>
      </div>
      <div style={{ padding: "8px 2px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: C.paper }}>{block.propertyName}</div>
          {block.archetype && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.tertGrey, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>{block.archetype}</div>}
        </div>
        {block.price && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: C.clay }}>{block.price}</div>}
      </div>
    </>
  );
}

/* ---------- Medium composite (side-by-side, hover crossfade) ---------- */

function MediumComposite({ block }) {
  const [hovered, setHovered] = useState(false);
  const inner = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "2/1", borderRadius: 6, overflow: "hidden", background: C.darkMid, cursor: "pointer" }}>
        <img src={block.afterImage} alt="" loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; }} />
        <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 50% 0 0)", opacity: hovered ? 0 : 1, transition: "opacity 1.5s ease" }}>
          <img src={block.beforeImage} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }} />
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: C.paper, opacity: hovered ? 0 : 0.3, transition: "opacity 0.5s ease" }} />
      </div>
      <div style={{ padding: "5px 2px 0" }}>
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.tertGrey }}>{block.propertyName} {"·"} {block.room}</span>
      </div>
    </div>
  );

  if (block.reportId) {
    return <Link href={`/report/${block.reportId}`} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  }
  return inner;
}

/* ---------- Small after-only thumbnail ---------- */

function SmallAfter({ block }) {
  const [h, setH] = useState(false);
  const inner = (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ transform: h ? "translateY(-3px)" : "translateY(0)", transition: "transform 0.25s ease" }}
    >
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", border: `1px solid ${h ? C.bdh : C.bd}`, transition: "border-color 0.25s ease", background: C.darkMid }}>
        <img src={block.image} alt={block.alt ?? ""} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; }} />
      </div>
    </div>
  );
  if (block.reportId) {
    return <Link href={`/report/${block.reportId}`} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  }
  return inner;
}

/* ---------- Small palette swatches ---------- */

function SmallPalette({ block }) {
  return (
    <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {block.hexValues.map((hex, i) => (
        <div key={i} style={{ flex: 1, background: hex, display: "flex", alignItems: "flex-end", padding: "0 6px 3px" }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: "0.04em" }}>{block.colours[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Small material spec ---------- */

function SmallMaterial({ block }) {
  return (
    <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, background: C.darkCard, border: `1px solid ${C.bd}`, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 14px", gap: 6 }}>
      {block.materials.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: [C.clay, C.sage, C.accent][i % 3], opacity: 0.6 }} />
          <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 13, fontStyle: "italic", color: C.paper, opacity: 0.8 }}>{m}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Text block (all variants) ---------- */

function TextBlock({ block }) {
  const base = { width: "100%", minHeight: 160, borderRadius: 6, background: C.darkMid, display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" };

  if (block.variant === "confrontation") {
    return (
      <div style={base}>
        {block.lines.map((line, i) => (
          <div key={i} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: C.paper, opacity: 0.45, letterSpacing: "0.04em", lineHeight: 1.5 }}>{line}</div>
        ))}
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontStyle: "italic", color: C.terracotta, marginTop: 12, lineHeight: 1.5, whiteSpace: "pre-line" }}>{block.punchline}</div>
      </div>
    );
  }

  if (block.variant === "time") {
    return (
      <div style={base}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,5vw,56px)", color: C.paper, letterSpacing: "0.02em", lineHeight: 1 }}>{block.number}</div>
        {block.lines.map((line, i) => (
          <div key={i} style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, fontStyle: "italic", color: C.tertGrey, lineHeight: 1.6, marginTop: i === 0 ? 10 : 0 }}>{line}</div>
        ))}
      </div>
    );
  }

  if (block.variant === "hook" || block.type === "text_hook") {
    return (
      <div style={{ ...base, alignItems: "stretch", borderLeft: `3px solid ${C.terracotta}` }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.paper, lineHeight: 1.7, whiteSpace: "pre-line" }}>{block.text}</div>
      </div>
    );
  }

  if (block.type === "text_number") {
    return (
      <div style={{ ...base, alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(32px,4vw,52px)", color: C.terracotta, letterSpacing: "0.02em", lineHeight: 1 }}>{block.number}</div>
        <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, fontStyle: "italic", color: C.tertGrey, marginTop: 8 }}>{block.label}</div>
        {block.subtitle && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.warmGrey, opacity: 0.7, marginTop: 4, letterSpacing: "0.04em" }}>{block.subtitle}</div>}
      </div>
    );
  }

  return null;
}

/* ---------- Video block ---------- */

function VideoBlock({ block }) {
  const [ref, inView] = useInView(0.1);
  const videoRef = useRef(null);
  useEffect(() => {
    if (!videoRef.current) return;
    if (inView) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [inView]);

  return (
    <div ref={ref} style={{ width: "100%", aspectRatio: "16/9", borderRadius: 6, overflow: "hidden", position: "relative", background: C.dark }}>
      <video ref={videoRef} src={block.videoUrl} muted loop playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.paper, opacity: 0.5, letterSpacing: "0.08em" }}>{"FACADE \u00B7 4 SEC"}</div>
    </div>
  );
}

/* ---------- Mosaic block dispatcher ---------- */

export default function MosaicBlock({ block, index }) {
  const delay = Math.min(index * 0.06, 0.6);
  const [ref, v] = useReveal();

  const classMap = {
    large_slider: "piega-large", medium_composite: "piega-medium",
    small_after: "piega-small", small_palette: "piega-small", small_material: "piega-small",
    text_number: "piega-text", text_hook: "piega-text",
    video: "piega-video",
  };
  const gridClass = block.variant ? "piega-text" : (classMap[block.type] ?? "piega-small");

  return (
    <div
      ref={ref}
      className={gridClass}
      style={{
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
      }}
    >
      {block.type === "large_slider" && <LargeSlider block={block} />}
      {block.type === "medium_composite" && <MediumComposite block={block} />}
      {block.type === "small_after" && <SmallAfter block={block} />}
      {block.type === "small_palette" && <SmallPalette block={block} />}
      {block.type === "small_material" && <SmallMaterial block={block} />}
      {block.type === "video" && <VideoBlock block={block} />}
      {(block.variant || block.type === "text_number" || block.type === "text_hook") && <TextBlock block={block} />}
    </div>
  );
}
