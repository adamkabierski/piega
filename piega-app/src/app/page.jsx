"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { AGENTS_URL } from "@/lib/config";

/* ═══════════════════════════════════════════════════════════════════════════
   CSS — grid, responsive, utility classes
   ═══════════════════════════════════════════════════════════════════════════ */

const STYLES = `
  * { box-sizing: border-box; }
  ::selection { background: ${C.terracotta}; color: ${C.paper}; }

  .piega-page {
    background: ${C.dark};
    color: ${C.paper};
    min-height: 100vh;
  }

  .piega-mosaic {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 10px;
    grid-auto-flow: dense;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .piega-large  { grid-column: span 7; }
  .piega-medium { grid-column: span 4; }
  .piega-small  { grid-column: span 2; }
  .piega-text   { grid-column: span 4; }
  .piega-video  { grid-column: span 5; }

  @media (max-width: 1024px) {
    .piega-mosaic { grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .piega-large  { grid-column: span 6; }
    .piega-medium { grid-column: span 3; }
    .piega-small  { grid-column: span 2; }
    .piega-text   { grid-column: span 3; }
    .piega-video  { grid-column: span 4; }
  }

  @media (max-width: 640px) {
    .piega-mosaic { grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .piega-large  { grid-column: span 4; }
    .piega-medium { grid-column: span 4; }
    .piega-small  { grid-column: span 2; }
    .piega-text   { grid-column: span 4; }
    .piega-video  { grid-column: span 4; }
  }

  .piega-desktop-only { display: block; }
  .piega-mobile-only  { display: none; }
  @media (max-width: 768px) {
    .piega-desktop-only { display: none !important; }
    .piega-mobile-only  { display: block !important; }
  }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — Extract mosaic blocks from pipeline reports
   ═══════════════════════════════════════════════════════════════════════════ */

function reportToBlocks(report) {
  const blocks = [];
  const r = report.results ?? {};
  const listing = report.listing ?? {};
  const vis = r.renovation_visualisation;
  const classification = r.classification;
  const costEstimate = r.cost_estimate;
  const designBrief = r.design_brief;
  const narrative = r.narrative;
  const videoFacade = r.video_facade;
  const archetype = classification?.archetype;

  const propertyName = listing.address?.split(",")[0]?.trim() ?? "Property";
  const archetypeTag = archetype
    ? `${archetype.era} \u00B7 ${archetype.displayName}` : "";
  const priceStr = listing.askingPrice
    ? `\u00A3${Math.round(listing.askingPrice / 1000)}K` : "";

  // Interiors → large sliders (first 2), then medium composites
  if (vis?.interiors?.length) {
    vis.interiors.forEach((img, i) => {
      blocks.push({
        type: i < 2 ? "large_slider" : "medium_composite",
        beforeImage: img.originalUrl,
        afterImage: img.renovatedUrl,
        room: img.room ?? img.depicts ?? "Interior",
        propertyName, archetype: archetypeTag, price: priceStr,
        reportId: report.id,
      });
    });
  }

  // Exteriors → medium composites
  if (vis?.exteriors?.length) {
    vis.exteriors.forEach((img) => {
      blocks.push({
        type: "medium_composite",
        beforeImage: img.originalUrl,
        afterImage: img.renovatedUrl,
        room: img.depicts ?? "Exterior",
        propertyName, reportId: report.id,
      });
    });
  }

  // After-only thumbnails
  const allVis = [...(vis?.interiors ?? []), ...(vis?.exteriors ?? [])];
  allVis.forEach((img) => {
    blocks.push({
      type: "small_after",
      image: img.renovatedUrl,
      alt: `${propertyName} \u2014 ${img.room ?? img.depicts ?? "renovated"}`,
      reportId: report.id,
    });
  });

  // Palette swatches
  const palette = designBrief?.designLanguage?.palette;
  if (palette?.length >= 3) {
    blocks.push({
      type: "small_palette",
      colours: palette.slice(0, 5).map((p) => p.name ?? p),
      hexValues: palette.slice(0, 5).map((p) => p.hex ?? "#B8A99A"),
      reportId: report.id,
    });
  }

  // Material spec
  const mats = designBrief?.designLanguage?.materials;
  if (mats?.length) {
    blocks.push({
      type: "small_material",
      materials: mats.slice(0, 3).map((m) => (typeof m === "string" ? m : m.name ?? m)),
      reportId: report.id,
    });
  }

  // Cost estimate → big number
  const env = costEstimate?.totalEnvelope;
  if (env) {
    const lo = Math.round((env.low ?? env.min ?? 0) / 1000);
    const hi = Math.round((env.high ?? env.max ?? 0) / 1000);
    if (lo > 0 && hi > 0) {
      blocks.push({
        type: "text_number",
        number: `\u00A3${lo}K \u2013 \u00A3${hi}K`,
        label: "estimated renovation",
        subtitle: `${archetypeTag}${archetypeTag && propertyName ? " \u00B7 " : ""}${propertyName}`,
        reportId: report.id,
      });
    }
  }

  // Video facade
  if (videoFacade?.videoUrl) {
    blocks.push({
      type: "video",
      videoUrl: videoFacade.videoUrl,
      propertyName, reportId: report.id,
    });
  }

  // Narrative hook
  if (narrative?.openingHook) {
    blocks.push({
      type: "text_hook",
      text: narrative.openingHook,
      reportId: report.id,
    });
  }

  return blocks;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HARDCODED TEXT BLOCKS — personality, zero AI risk
   ═══════════════════════════════════════════════════════════════════════════ */

const TEXT_BLOCKS = [
  {
    _key: "tb-cost", variant: "confrontation",
    lines: ["AN ARCHITECT CHARGES \u00A32,000.", "A SURVEYOR \u00A3500.", "A DESIGNER \u00A33,000."],
    punchline: "We did all three.\nFrom a Rightmove link.",
  },
  {
    _key: "tb-time", variant: "time",
    number: "90 SECONDS.",
    lines: ["From listing to renovation concept.", "Including the cost estimate", "your builder won\u2019t give you."],
  },
  {
    _key: "tb-hook", variant: "hook",
    text: "\u201CThe estate agent calls it \u2018characterful.\u2019\nThe surveyor would call it \u2018structural movement.\u2019\nWe call it Thursday.\u201D",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

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
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(26,24,22,0.6)", border: "1.5px solid rgba(250,248,245,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontSize: 9, color: C.paper, opacity: 0.8 }}>\u2194</div>
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
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.tertGrey }}>{block.propertyName} \u00B7 {block.room}</span>
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
      <div style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.paper, opacity: 0.5, letterSpacing: "0.08em" }}>FACADE \u00B7 4 SEC</div>
    </div>
  );
}

/* ---------- Mosaic block dispatcher ---------- */

function MosaicBlock({ block, index }) {
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

/* ═══════════════════════════════════════════════════════════════════════════
   DEMO ANIMATION — 4-phase loop showing the product journey
   Phase 0: Rightmove listing
   Phase 1: Extension popup + "Analyse"
   Phase 2: Pipeline agents completing
   Phase 3: Report output
   ═══════════════════════════════════════════════════════════════════════════ */

const DEMO_AGENTS = ["Classification", "Architectural Reading", "Design Brief", "Renovation Visualiser", "Cost Estimate"];
const PHASE_DURATIONS = [3000, 2500, 2500, 4000];
const PHASE_LABELS = [
  "You\u2019re browsing Rightmove. As usual.",
  "One click. We read every photo, every detail.",
  "Six specialists. 90 seconds. Zero phone calls.",
  "The full reading. Every room. Every cost.\nEvery issue the estate agent didn\u2019t mention.",
];

function DemoAnimation({ demoImage, demoAfterImage, demoCost, demoName }) {
  const [containerRef, inView] = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const timeoutRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (!inView) {
      clearTimeout(timeoutRef.current);
      return;
    }
    phaseRef.current = 0;
    setPhase(0);

    const next = () => {
      timeoutRef.current = setTimeout(() => {
        phaseRef.current = (phaseRef.current + 1) % 4;
        setPhase(phaseRef.current);
        next();
      }, PHASE_DURATIONS[phaseRef.current]);
    };
    next();
    return () => clearTimeout(timeoutRef.current);
  }, [inView]);

  const panelBase = { position: "absolute", inset: 0, padding: "clamp(20px,4vw,40px)", display: "flex", flexDirection: "column", transition: "all 0.6s ease" };
  const hidden = (p) => ({ opacity: phase === p ? 1 : 0, transform: phase === p ? "translateX(0)" : `translateX(${phase > p ? "-30px" : "30px"})`, pointerEvents: phase === p ? "auto" : "none" });
  const name = demoName ?? "14 Woodbury Hill Path";
  const cost = demoCost ?? "\u00A322K \u2013 \u00A362K";

  return (
    <div ref={containerRef} style={{ maxWidth: 900, margin: "0 auto", background: C.darkCard, borderRadius: 8, overflow: "hidden", position: "relative", aspectRatio: "16/9", minHeight: 320 }}>

      {/* PHASE 0 — Rightmove listing */}
      <div style={{ ...panelBase, ...hidden(0) }}>
        <div style={{ height: 4, background: "#00B140", width: 80, borderRadius: 2, marginBottom: 20 }} />
        <div style={{ display: "flex", gap: "clamp(12px,2vw,20px)", flex: 1, alignItems: "flex-start" }}>
          <div style={{ width: "clamp(120px,30%,220px)", aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", background: "#222", flexShrink: 0 }}>
            <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(14px,2vw,20px)", color: C.paper, marginBottom: 6 }}>{name}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(18px,3vw,26px)", color: C.clay, marginBottom: 10 }}>\u00A3340,000+</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["4 bed", "Detached", "Freehold"].map((t) => (
                <span key={t} style={{ fontSize: 10, color: C.warmGrey, padding: "3px 8px", border: `1px solid ${C.bd}`, borderRadius: 3 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Piega icon */}
        <div style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 6, background: C.darkMid, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.bd}` }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 12, fontStyle: "italic", color: C.accent }}>P</span>
        </div>
      </div>

      {/* PHASE 1 — Extension popup */}
      <div style={{ ...panelBase, ...hidden(1), justifyContent: "flex-start" }}>
        <div style={{ height: 4, background: "#00B14040", width: 80, borderRadius: 2, marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 16, flex: 1, alignItems: "flex-start", opacity: 0.3 }}>
          <div style={{ width: 160, aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", background: "#222", flexShrink: 0 }}>
            <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: C.paper }}>{name}</div>
          </div>
        </div>
        {/* Popup */}
        <div style={{ position: "absolute", top: 16, right: 16, width: "clamp(180px,40%,240px)", background: C.dark, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, color: C.paper, fontWeight: 600, marginBottom: 4 }}>{name}</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.warmGrey, marginBottom: 12 }}>\u00A3340,000+ \u00B7 4 bed \u00B7 Detached</div>
          <div style={{ padding: "8px 12px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.paper, letterSpacing: "0.08em", cursor: "pointer" }}>
            ANALYSE THIS PROPERTY \u2192
          </div>
        </div>
      </div>

      {/* PHASE 2 — Pipeline */}
      <div style={{ ...panelBase, ...hidden(2), justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: C.warmGrey, letterSpacing: "0.1em", marginBottom: 20 }}>READING YOUR BUILDING</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 280 }}>
          {DEMO_AGENTS.map((agent, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: phase === 2 ? 1 : 0, transition: `opacity 0.3s ease ${0.3 + i * 0.25}s` }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${C.sage}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.sage }}>\u2713</div>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.paper }}>{agent}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.sage, letterSpacing: "0.06em" }}>5/5 COMPLETE</div>
      </div>

      {/* PHASE 3 — Report */}
      <div style={{ ...panelBase, ...hidden(3), justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.warmGrey, letterSpacing: "0.1em", marginBottom: 8 }}>YOUR REPORT</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(16px,3vw,24px)", color: C.paper, marginBottom: 14 }}>{name}</div>
        <div style={{ display: "flex", gap: 2, borderRadius: 4, overflow: "hidden", marginBottom: 14, width: "clamp(200px,60%,360px)", aspectRatio: "3/1" }}>
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

      {/* Label bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px 16px", background: "linear-gradient(transparent, rgba(26,24,22,0.85))", pointerEvents: "none" }}>
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AGENTS_URL}/reports`);
        if (!res.ok) return;
        setReports(await res.json());
      } catch {}
    })();
  }, []);

  /* Build mosaic blocks */
  const dataBlocks = reports.flatMap(reportToBlocks);
  const seen = new Set();
  const uniqueBlocks = dataBlocks.filter((b) => {
    const key = b.image ?? b.afterImage ?? b.videoUrl ?? b.number ?? b.text ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* Interleave hardcoded text blocks every ~5 data blocks */
  const allBlocks = [];
  const texts = [...TEXT_BLOCKS];
  let ti = 0;
  for (let i = 0; i < uniqueBlocks.length; i++) {
    allBlocks.push({ ...uniqueBlocks[i], _key: `d-${i}` });
    if ((i + 1) % 5 === 0 && ti < texts.length) {
      allBlocks.push(texts[ti++]);
    }
  }
  while (ti < texts.length) allBlocks.push(texts[ti++]);

  // If zero data blocks, still show text blocks
  const hasMosaic = allBlocks.length > 0;

  /* Demo animation data — use best pipeline report or fallback */
  const demoReport = reports.find((r) => r.results?.renovation_visualisation?.exteriors?.length);
  const demoImage = demoReport?.results?.renovation_visualisation?.exteriors?.[0]?.originalUrl ?? "/House_1/slot4.jpg";
  const demoAfterImage = demoReport?.results?.renovation_visualisation?.exteriors?.[0]?.renovatedUrl ?? "/House_1/slot4.jpg";
  const demoEnv = demoReport?.results?.cost_estimate?.totalEnvelope;
  const demoCost = demoEnv ? `\u00A3${Math.round((demoEnv.low ?? 0) / 1000)}K \u2013 \u00A3${Math.round((demoEnv.high ?? 0) / 1000)}K` : null;
  const demoName = demoReport?.listing?.address?.split(",")[0]?.trim() ?? null;

  /* Email submit */
  async function submitEmail() {
    if (!email || !email.includes("@")) {
      setFormError(true);
      setTimeout(() => setFormError(false), 1400);
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${AGENTS_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setDone(true);
    setSubmitting(false);
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="piega-page">

        {/* ────────────────────────────────────────────────────────────
            ZONE 1 — HERO (compact — mosaic peeks above fold)
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(24px,4vh,40px) 24px clamp(20px,3vh,32px)", textAlign: "center" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {/* Wordmark */}
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent, marginBottom: "clamp(16px,3vh,28px)" }}>Piega</div>

            {/* Headline */}
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, color: C.paper, lineHeight: 1.15, margin: "0 0 6px" }}>
              The estate agent told you a story.
            </h1>

            {/* Italic line */}
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,4.5vw,44px)", fontStyle: "italic", color: C.terracotta, lineHeight: 1.2, margin: "8px 0 16px" }}>
              We tell you the building.
            </div>

            {/* What it actually does — clear product statement */}
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(15px,1.6vw,18px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 auto 12px", maxWidth: 520 }}>
              A Chrome extension that reads any Rightmove listing and gives you the full picture: architectural reading, renovation concept, and cost estimate \u2014 in 90 seconds.
            </p>

            {/* How it works in one line */}
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, letterSpacing: "0.04em", lineHeight: 1.8 }}>
              Install \u00B7 Browse Rightmove \u00B7 Click \u201CAnalyse\u201D \u00B7 Full report in 90 seconds
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 2 — MOSAIC (no background change — stays dark)
            ──────────────────────────────────────────────────────────── */}
        {hasMosaic && (
          <div style={{ padding: "clamp(16px,3vw,32px) 0" }}>
            <div className="piega-mosaic">
              {allBlocks.map((block, i) => (
                <MosaicBlock key={block._key ?? `b-${i}`} block={block} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────
            ZONE 3 — DEMO ANIMATION
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(20px,3vw,40px) 24px" }}>
          <DemoAnimation
            demoImage={demoImage}
            demoAfterImage={demoAfterImage}
            demoCost={demoCost}
            demoName={demoName}
          />
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 4 — CHROME EXTENSION CTA + EMAIL CAPTURE
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(32px,5vh,56px) 24px", textAlign: "center", borderTop: `1px solid ${C.bd}` }}>
          <div style={{ maxWidth: 540, margin: "0 auto" }}>

            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,30px)", fontWeight: 700, color: C.paper, margin: "0 0 12px" }}>
              See what your building is hiding.
            </h2>
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(15px,1.5vw,17px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 0 24px" }}>
              Piega lives on Rightmove. Install the extension. Browse any listing. Click once. The full reading arrives before you\u2019ve finished your tea.
            </p>

            {/* Desktop — Chrome extension card */}
            <div className="piega-desktop-only" style={{ background: C.darkMid, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "20px 24px", marginBottom: 16, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: C.darkCard, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.bd}`, flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent }}>P</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: C.paper }}>Add Piega to Chrome</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.tertGrey }}>Free \u00B7 No signup \u00B7 10 seconds</div>
                </div>
              </div>
              <a href="#chrome-store" style={{ display: "block", padding: "10px 16px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: C.paper, letterSpacing: "0.1em", textDecoration: "none", transition: "opacity 0.2s" }}>
                ADD TO CHROME \u2192
              </a>
            </div>

            {/* Desktop — 4 quiet steps */}
            <div className="piega-desktop-only" style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, lineHeight: 2, marginBottom: 20 }}>
              \u2460 Add to Chrome &nbsp;\u00B7&nbsp; \u2461 Browse Rightmove &nbsp;\u00B7&nbsp; \u2462 Click \u201CAnalyse\u201D &nbsp;\u00B7&nbsp; \u2463 Full reading in 90s
            </div>

            {/* Mobile — explain desktop-only */}
            <div className="piega-mobile-only" style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.tertGrey, lineHeight: 1.7, margin: "0 0 6px" }}>
                Piega is a Chrome extension that reads any Rightmove listing and shows you what the estate agent left out.
              </p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, margin: "0 0 12px" }}>Currently desktop only.</p>
              <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.paper, margin: "0 0 16px" }}>
                Send yourself the link and try it tonight.
              </p>
            </div>

            {/* Divider */}
            <div className="piega-desktop-only" style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.warmGrey, opacity: 0.5, margin: "0 0 16px" }}>\u2014 or \u2014</div>

            <p className="piega-desktop-only" style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: C.warmGrey, margin: "0 0 12px" }}>
              Not ready to install? Leave your email.
            </p>

            {/* Email capture */}
            {done ? (
              <div style={{ padding: "16px 0" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: C.terracotta, letterSpacing: "0.04em" }}>DONE.</div>
                <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: C.tertGrey, marginTop: 8 }}>We\u2019ll be in touch.</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 0, maxWidth: 380, margin: "0 auto" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                  placeholder="your@email.com"
                  style={{
                    flex: 1, padding: "10px 14px", border: `1px solid ${formError ? C.terracotta : C.bd}`,
                    borderRight: "none", borderRadius: "4px 0 0 4px",
                    background: C.darkMid, color: C.paper,
                    fontFamily: "'EB Garamond',serif", fontSize: 15,
                    outline: "none", transition: "border-color 0.3s",
                  }}
                />
                <button
                  onClick={submitEmail}
                  disabled={submitting}
                  style={{
                    padding: "10px 18px", border: "none", borderRadius: "0 4px 4px 0",
                    background: C.terracotta, color: C.paper, cursor: "pointer",
                    fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: "0.1em",
                    opacity: submitting ? 0.5 : 1, transition: "opacity 0.2s",
                  }}
                >
                  {submitting ? "\u2026" : "NOTIFY ME"}
                </button>
              </div>
            )}

            {/* Sub-note */}
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, opacity: 0.5, marginTop: 12 }}>
              No payment. No signup. Just the building.
            </p>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            FOOTER
            ──────────────────────────────────────────────────────────── */}
        <footer style={{ padding: "28px 24px 24px", textAlign: "center", borderTop: `1px solid ${C.bd}` }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent, marginBottom: 6 }}>Piega.</div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, marginBottom: 3 }}>
            Property intelligence \u00B7 United Kingdom
          </div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, opacity: 0.5 }}>
            Not affiliated with any estate agent. That is the point.
          </div>
        </footer>

      </div>
    </>
  );
}
