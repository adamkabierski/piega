"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { useReveal } from "./hooks";

export default function ReportCard({ report }) {
  const [ref, visible] = useReveal();
  const listing = report.listing ?? {};
  const r = report.results ?? {};
  const classification = r.classification;
  const costEstimate = r.cost_estimate;
  const narrative = r.narrative;
  const vis = r.renovation_visualisation;

  const archetype = classification?.archetype;
  const propertyName = listing.address?.split(",")[0]?.trim() ?? "Property";
  const archetypeTag = archetype?.displayName ?? "";
  const era = archetype?.era ?? "";
  const price = listing.askingPrice
    ? `\u00A3${Math.round(listing.askingPrice / 1000)}K` : "";

  /* Best visual for slider — prefer exterior, fall back to interior */
  const best = vis?.exteriors?.[0] ?? vis?.interiors?.[0];

  /* Cost */
  const env = costEstimate?.totalEnvelope;
  const costLo = env ? Math.round((env.low ?? env.min ?? 0) / 1000) : 0;
  const costHi = env ? Math.round((env.high ?? env.max ?? 0) / 1000) : 0;
  const costStr = costLo > 0 && costHi > 0 ? `\u00A3${costLo}K \u2013 \u00A3${costHi}K` : null;

  /* Narrative hook */
  const hook = narrative?.openingHook;

  /* Slider state */
  const [split, setSplit] = useState(50);
  const cRef = useRef(null);
  const move = (cx) => {
    if (!cRef.current) return;
    const rect = cRef.current.getBoundingClientRect();
    setSplit(Math.max(5, Math.min(95, ((cx - rect.left) / rect.width) * 100)));
  };

  if (!best) return null;

  return (
    <div
      ref={ref}
      style={{
        maxWidth: 680, margin: "0 auto", padding: "0 24px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Property header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "clamp(22px,3.5vw,30px)",
          fontWeight: 700, color: C.paper, lineHeight: 1.25,
        }}>
          {propertyName}
        </div>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "4px 12px",
          marginTop: 6, alignItems: "baseline",
        }}>
          {archetypeTag && (
            <span style={{
              fontFamily: "'Bebas Neue',sans-serif", fontSize: 13,
              color: C.terracotta, letterSpacing: "0.06em",
            }}>
              {archetypeTag.toUpperCase()}
            </span>
          )}
          {era && (
            <span style={{
              fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey,
            }}>
              {era}
            </span>
          )}
          {price && (
            <span style={{
              fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: C.clay,
            }}>
              {price}
            </span>
          )}
        </div>
      </div>

      {/* Before / after slider */}
      <div
        ref={cRef}
        style={{
          position: "relative", width: "100%", aspectRatio: "16/9",
          borderRadius: 8, overflow: "hidden",
          cursor: "ew-resize", userSelect: "none",
          background: C.darkMid,
        }}
        onMouseMove={(e) => { if (e.buttons === 1) move(e.clientX); }}
        onTouchMove={(e) => move(e.touches[0].clientX)}
      >
        {/* After (base layer) */}
        <img src={best.renovatedUrl} alt="" loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; }} />
        {/* Before (clipped overlay) */}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <img src={best.originalUrl} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }} />
        </div>
        {/* Labels */}
        <div style={{ position: "absolute", bottom: 12, left: 14, fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: C.paper, opacity: 0.6, letterSpacing: "0.06em", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>NOW</div>
        <div style={{ position: "absolute", bottom: 12, right: 14, fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: C.paper, opacity: 0.6, letterSpacing: "0.06em", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>POSSIBLE</div>
        {/* Divider + handle */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${split}%`, width: 2, background: C.paper, opacity: 0.5, transform: "translateX(-1px)" }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(26,24,22,0.6)", border: "1.5px solid rgba(250,248,245,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Inter',sans-serif", fontSize: 9, color: C.paper, opacity: 0.8,
          }}>{"\u2194"}</div>
        </div>
        {/* Room label */}
        <div style={{
          position: "absolute", top: 12, left: 14,
          fontFamily: "'Inter',sans-serif", fontSize: 11,
          color: C.paper, opacity: 0.5, letterSpacing: "0.04em",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}>
          {best.room ?? best.depicts ?? "Exterior"}
        </div>
      </div>

      {/* Cost + narrative + link */}
      <div style={{ marginTop: 20 }}>
        {costStr && (
          <>
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: "clamp(32px,5vw,48px)",
              color: C.terracotta, letterSpacing: "0.02em", lineHeight: 1,
            }}>
              {costStr}
            </div>
            <div style={{
              fontFamily: "'EB Garamond',serif", fontSize: 14,
              fontStyle: "italic", color: C.tertGrey, marginTop: 4,
            }}>
              estimated renovation
            </div>
          </>
        )}
        {hook && (
          <p style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: "clamp(15px,1.5vw,17px)",
            fontStyle: "italic", color: C.accent,
            lineHeight: 1.7, marginTop: costStr ? 16 : 0,
          }}>
            {"\u201C"}{hook}{"\u201D"}
          </p>
        )}
        <Link href={`/report/${report.id}`} style={{
          display: "inline-block", marginTop: 14,
          fontFamily: "'Inter',sans-serif", fontSize: 13,
          color: C.warmGrey, letterSpacing: "0.04em",
          textDecoration: "none",
          borderBottom: `1px solid ${C.bd}`,
          paddingBottom: 2,
        }}>
          View full report \u2192
        </Link>
      </div>
    </div>
  );
}
