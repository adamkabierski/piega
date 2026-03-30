"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/theme";

const AGENTS_URL = "http://localhost:4711";

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT PAGE — The assembled, shareable property report
   ═══════════════════════════════════════════════════════════════════════════
   A single scrolling page that combines all agent outputs with the
   narrative writer's editorial glue into a readable report.

   Structure:
     Hero → Chapter 1 (Building) → Chapter 2 (Vision) →
     Chapter 3 (Honest Layer) → Chapter 4 (Numbers) → Closing Gate

   Design: 680px max-width, warm off-white background, serif headings,
   generous whitespace. Not a dashboard — a document.

   Primitives:
     Reveal — scroll-triggered fade+rise animation
     BeforeAfterSlider — draggable before/after at 16:9 full width
     Slab — dramatic Bebas Neue interruptions
     Verse — Playfair Display italic editorial asides
     DecisionItem — expandable issues (click to reveal detail)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Colour palette (light/report mode) ─────────────────────────────── */
const R = {
  bg: "#FAF8F5",
  text: "#1E1C1A",
  textMuted: "#6B6560",
  textLight: "#9B9590",
  accent: "#B8A99A",
  terracotta: "#C4775B",
  sage: "#7D8B75",
  clay: "#D4A882",
  border: "rgba(30,28,26,0.08)",
  cardBg: "#FFFFFF",
  divider: "rgba(30,28,26,0.06)",
};

/* ─── Common colour name → hex (best-effort for palette swatches) ───── */
const COLOUR_MAP = {
  "slate grey": "#708090", slate: "#708090", grey: "#9B9590", gray: "#9B9590",
  "warm grey": "#8A8580", charcoal: "#36454F", "raw linen": "#E8DCC8",
  linen: "#E8DCC8", cream: "#FFFDD0", ivory: "#FFFFF0", "off-white": "#FAF8F5",
  white: "#FFFFFF", sand: "#C2B280", sandstone: "#786D5F", "aged brass": "#B5A642",
  brass: "#B5A642", copper: "#B87333", bronze: "#CD7F32", terracotta: "#C4775B",
  clay: "#D4A882", "raw clay": "#D4A882", brick: "#CB4154", "london stock": "#D4A882",
  sage: "#7D8B75", olive: "#808000", "forest green": "#228B22", moss: "#8A9A5B",
  "chalk white": "#F0EDE5", chalk: "#F0EDE5", oak: "#806517", timber: "#DEB887",
  walnut: "#5C4033", "aged oak": "#6B4423", "engineered oak": "#C9A96E",
  "lime plaster": "#E8E0D0", plaster: "#E8DCC8", "reclaimed stone": "#8B8378",
  stone: "#8B8378", "bath stone": "#E8D8A0", "portland stone": "#D8CDB8",
  mortar: "#B8B0A0", concrete: "#999999", "polished concrete": "#A0A0A0",
  black: "#1A1816", navy: "#001F3F", "midnight blue": "#191970",
  "soft black": "#2C2C2C", "warm black": "#1E1C1A",
};

function guessHex(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (COLOUR_MAP[n]) return COLOUR_MAP[n];
  for (const [key, hex] of Object.entries(COLOUR_MAP)) {
    if (n.includes(key) || key.includes(n)) return hex;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVES — scroll reveal, editorial typography, interactive images
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Reveal (scroll-triggered fade + rise) ──────────────────────────── */

function useReveal(threshold = 0.1) {
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

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : "translateY(22px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Slab — dramatic Bebas Neue interruption ────────────────────────── */

function Slab({ children, colour }) {
  return (
    <div style={{
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: "clamp(19px, 3.8vw, 28px)",
      letterSpacing: "0.04em", lineHeight: 1.3,
      color: colour ?? R.text,
      margin: "40px 0", textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

/* ─── Verse — editorial italic aside ─────────────────────────────────── */

function Verse({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: "'Playfair Display', serif",
      fontSize: "clamp(15px, 2.6vw, 20px)",
      fontStyle: "italic", lineHeight: 1.55,
      color: R.accent, margin: "28px 0", maxWidth: 540,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Typography helpers ─────────────────────────────────────────────── */

function ChapterHeading({ number, title }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 2,
        textTransform: "uppercase", color: R.textLight, marginBottom: 8,
      }}>
        Chapter {number}
      </div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 400,
        fontStyle: "italic", color: R.text,
        margin: 0, lineHeight: 1.2,
      }}>
        {title}
      </h2>
    </div>
  );
}

function Prose({ children, style }) {
  return (
    <div style={{
      fontFamily: "'EB Garamond', serif",
      fontSize: 17, lineHeight: 1.8, color: R.text,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Cap({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", fontSize: 11,
      color: R.textLight, letterSpacing: "0.02em", lineHeight: 1.5,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      width: 40, height: 1, background: R.border, margin: "56px auto",
    }} />
  );
}

function SectionSpacer() {
  return <div style={{ height: 64 }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA VISUALISATION — cost breakdown, price gap, phased budget
   ═══════════════════════════════════════════════════════════════════════════ */

const BUDGET_COLOURS = [
  "#C4775B", "#D4A882", "#B8A99A", "#7D8B75",
  "#8A8580", "#6B6560", "#A0927E", "#C49A7A",
];

/* ─── Cost breakdown — generous editorial rows + stacked bar ─────────── */

function CostBreakdownRows({ breakdown }) {
  if (!breakdown?.length) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      {breakdown.map((b, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", padding: "16px 0",
          borderBottom: i < breakdown.length - 1 ? `1px solid ${R.border}` : "none",
        }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
            <div style={{
              fontFamily: "'EB Garamond', serif", fontSize: 16,
              color: R.text, lineHeight: 1.35,
            }}>
              {b.category}
            </div>
            {b.notes && (
              <div style={{
                fontFamily: "'EB Garamond', serif", fontSize: 12,
                fontStyle: "italic", color: R.textLight,
                marginTop: 3, lineHeight: 1.4,
              }}>
                {b.notes}
              </div>
            )}
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 16,
            fontWeight: 600, color: R.text,
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            £{Math.round(b.low / 1000)}k–£{Math.round(b.high / 1000)}k
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Stacked proportional bar (where the weight sits at a glance) ───── */

function CostStackedBar({ breakdown }) {
  if (!breakdown?.length) return null;
  const totals = breakdown.map((b) => (b.low + b.high) / 2);
  const sum = totals.reduce((a, c) => a + c, 0);
  if (!sum) return null;

  return (
    <div style={{ margin: "32px 0 12px" }}>
      {/* Bar */}
      <div style={{ display: "flex", height: 28, overflow: "hidden" }}>
        {breakdown.map((b, i) => {
          const flex = totals[i] / sum;
          return (
            <div key={i} style={{
              flex, height: "100%",
              background: BUDGET_COLOURS[i % BUDGET_COLOURS.length],
            }} />
          );
        })}
      </div>
      {/* Labels beneath */}
      <div style={{ display: "flex", marginTop: 9 }}>
        {breakdown.map((b, i) => {
          const flex = totals[i] / sum;
          return (
            <div key={i} style={{
              flex, paddingRight: 10, minWidth: 0, overflow: "hidden",
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 13,
                letterSpacing: "0.08em", color: R.text,
                lineHeight: 1.2, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {b.category}
              </div>
              <div style={{
                fontFamily: "'EB Garamond', serif", fontSize: 11,
                color: R.textMuted, lineHeight: 1.4,
              }}>
                £{Math.round(b.low / 1000)}k–£{Math.round(b.high / 1000)}k
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Price gap visual ───────────────────────────────────────────────── */

function PriceGapVisual({ priceGap }) {
  if (!priceGap) return null;
  const { askingPrice, estimatedPostWorksValue } = priceGap;
  const fmtK = (n) => `£${Math.round(n / 1000)}k`;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center", gap: 16, padding: "24px 0",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
          color: R.textLight, marginBottom: 6,
        }}>
          Asking Price
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28, letterSpacing: 1, color: R.text,
        }}>
          {fmtK(askingPrice)}
        </div>
      </div>
      <div style={{ fontSize: 20, color: R.textLight }}>→</div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
          color: R.textLight, marginBottom: 6,
        }}>
          Est. Post-Works Value
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28, letterSpacing: 1, color: R.sage,
        }}>
          {fmtK(estimatedPostWorksValue.low)}–{fmtK(estimatedPostWorksValue.high)}
        </div>
      </div>
    </div>
  );
}

/* ─── Phased budget ──────────────────────────────────────────────────── */

function PhasedBudget({ phased }) {
  if (!phased) return null;
  const phases = [
    { key: "moveInBasics", label: "Move-in Basics", colour: R.terracotta },
    { key: "yearOneTwo", label: "Year 1–2", colour: R.clay },
    { key: "completeVision", label: "Complete Vision", colour: R.sage },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {phases.map((p) => {
        const data = phased[p.key];
        if (!data) return null;
        return (
          <div key={p.key} style={{
            padding: "16px 20px", borderRadius: 4,
            border: `1px solid ${R.border}`, background: R.cardBg,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: p.colour }}>
                {p.label}
              </span>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18, letterSpacing: 0.5, color: R.text,
              }}>
                £{Math.round(data.low / 1000)}k–£{Math.round(data.high / 1000)}k
              </span>
            </div>
            <div style={{ fontSize: 12, color: R.textMuted, lineHeight: 1.5 }}>
              {data.description}
            </div>
            {data.timeframe && (
              <div style={{ fontSize: 10, color: R.textLight, marginTop: 4 }}>
                {data.timeframe}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BEFORE / AFTER — cinematic draggable slider (16:9, wider than content)
   ═══════════════════════════════════════════════════════════════════════════
   Breaks out of the 680px column to ~900px for editorial impact.
   Left side = NOW (original), Right side = POSSIBLE (renovated).
   The clipped overlay shows the BEFORE image; the base is AFTER.
   Dragging the handle left reveals more of the renovated version.
   ═══════════════════════════════════════════════════════════════════════════ */

function BeforeAfterSlider({ beforeSrc, afterSrc, label }) {
  const [split, setSplit] = useState(50);
  const cRef = useRef(null);

  const handle = (cx) => {
    if (!cRef.current) return;
    const r = cRef.current.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100)));
  };

  return (
    <div style={{
      /* Break out of 680px column — widen to ~900px centred */
      width: "min(900px, calc(100vw - 32px))",
      marginLeft: "calc(50% - min(450px, calc(50vw - 16px)))",
      marginBottom: 36,
    }}>
      {label && (
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 10,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: R.clay, marginBottom: 8,
          /* Keep label aligned with content column */
          paddingLeft: "max(0px, calc((min(900px, calc(100vw - 32px)) - 680px) / 2))",
        }}>
          {label}
        </div>
      )}
      <div
        ref={cRef}
        style={{
          position: "relative", width: "100%",
          aspectRatio: "16/9", borderRadius: 4,
          overflow: "hidden", cursor: "ew-resize", userSelect: "none",
        }}
        onMouseMove={(e) => e.buttons === 1 && handle(e.clientX)}
        onTouchMove={(e) => handle(e.touches[0].clientX)}
      >
        {/* Base layer = AFTER (renovated) — visible on the right */}
        <img src={afterSrc} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Clipped overlay = BEFORE (original) — visible on the left */}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <img src={beforeSrc} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        {/* Labels */}
        <div style={{
          position: "absolute", bottom: 12, left: 14,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 11,
          color: "#FAF8F5", opacity: 0.65, letterSpacing: "0.06em",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}>
          NOW
        </div>
        <div style={{
          position: "absolute", bottom: 12, right: 14,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 11,
          color: "#FAF8F5", opacity: 0.65, letterSpacing: "0.06em",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}>
          POSSIBLE
        </div>
        {/* Divider line + drag handle */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${split}%`, width: 2,
          background: "#FAF8F5", opacity: 0.5, transform: "translateX(-1px)",
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(30,28,26,0.6)",
            border: "1.5px solid rgba(250,248,245,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Inter', sans-serif", fontSize: 9,
            color: "#FAF8F5", opacity: 0.8,
          }}>
            ↔
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONDITION INDICATORS — 2-col grid of construction inferences
   ═══════════════════════════════════════════════════════════════════════════ */

function ConditionIndicators({ constructionInferences }) {
  if (!constructionInferences) return null;
  const items = [
    { label: "Walls", value: constructionInferences.wallType },
    { label: "Roof", value: constructionInferences.roofStructure },
    { label: "Foundations", value: constructionInferences.foundations },
    { label: "Insulation", value: constructionInferences.insulation },
    { label: "Windows & Doors", value: constructionInferences.windowsAndDoors },
    { label: "Heating & Services", value: constructionInferences.heatingAndServices },
  ].filter((i) => i.value);

  if (!items.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: "10px 14px", borderRadius: 4,
          border: `1px solid ${R.border}`, background: R.cardBg,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", color: R.textLight, marginBottom: 4,
          }}>
            {item.label}
          </div>
          <div style={{ fontSize: 12, color: R.textMuted, lineHeight: 1.4 }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN LANGUAGE — palette · materials · mood (standalone sections)
   ═══════════════════════════════════════════════════════════════════════════ */

function DesignLanguageBlock({ designLanguage }) {
  if (!designLanguage) return null;

  return (
    <div style={{ marginBottom: 32 }}>

      {/* ── Palette — generous swatches like paint chips ── */}
      {designLanguage.palette?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
            textTransform: "uppercase", color: R.textLight, marginBottom: 16,
          }}>
            Palette
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {designLanguage.palette.map((colour, i) => {
              const hex = guessHex(colour);
              return (
                <div key={i} style={{
                  flex: "1 1 0", minWidth: 80, maxWidth: 160,
                }}>
                  {/* Colour swatch rectangle */}
                  <div style={{
                    height: 48, borderRadius: 3,
                    background: hex || R.border,
                    border: `1px solid ${R.border}`,
                  }} />
                  {/* Name beneath */}
                  <div style={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: 12, color: R.textMuted,
                    marginTop: 6, lineHeight: 1.3,
                    textAlign: "center",
                  }}>
                    {colour}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Materials — specification list ── */}
      {designLanguage.materials?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
            textTransform: "uppercase", color: R.textLight, marginBottom: 14,
          }}>
            Materials
          </div>
          <div>
            {designLanguage.materials.map((mat, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                padding: "9px 0",
                borderBottom: i < designLanguage.materials.length - 1
                  ? `1px solid ${R.border}` : "none",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: BUDGET_COLOURS[i % BUDGET_COLOURS.length],
                  marginRight: 14, opacity: 0.6,
                }} />
                <span style={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: 15, color: R.text, lineHeight: 1.4,
                }}>
                  {mat}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mood — generous italic quote ── */}
      {designLanguage.mood && (
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(16px, 2.6vw, 20px)",
          fontStyle: "italic", lineHeight: 1.55,
          color: R.accent, maxWidth: 540,
          padding: "16px 0",
          borderTop: `1px solid ${R.border}`,
        }}>
          “{designLanguage.mood}”
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPANDABLE DECISION ITEM — for Chapter 3 issues
   ═══════════════════════════════════════════════════════════════════════════ */

function DecisionItem({ issue }) {
  const [open, setOpen] = useState(false);
  const severityColour =
    issue.severity === "significant" ? R.terracotta
    : issue.severity === "moderate" ? R.clay
    : R.textLight;

  return (
    <div style={{
      borderRadius: 4, border: `1px solid ${R.border}`,
      background: R.cardBg, marginBottom: 8, overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "14px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'EB Garamond', serif",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: R.text, textAlign: "left" }}>
          {issue.issue}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
            textTransform: "uppercase", color: severityColour,
            fontFamily: "'Inter', sans-serif",
          }}>
            {issue.severity}
          </span>
          <span style={{
            fontSize: 14, color: R.textLight,
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.25s ease", display: "inline-block",
          }}>
            ▾
          </span>
        </span>
      </button>
      <div style={{
        maxHeight: open ? 300 : 0, overflow: "hidden",
        transition: "max-height 0.35s ease",
      }}>
        <div style={{
          padding: "0 18px 14px", fontSize: 13,
          color: R.textMuted, lineHeight: 1.6,
          fontFamily: "'EB Garamond', serif",
        }}>
          {issue.evidence && (
            <div style={{ marginBottom: 6, fontSize: 12, color: R.textLight }}>
              Evidence: {issue.evidence}
            </div>
          )}
          {issue.implication}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN REPORT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ReportPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [reportId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  /* ─── Loading / error states ───────────────────────────────────────── */

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: R.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center", color: R.textMuted }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Report not found</div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{
        minHeight: "100vh", background: R.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 24, height: 24, border: `2px solid ${R.border}`,
          borderTopColor: R.terracotta, borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Extract all agent outputs ────────────────────────────────────── */

  const results = report.results ?? {};
  const listing = report.listing ?? {};
  const classification = results.classification;
  const reading = classification?.architecturalReading;
  const designBrief = results.design_brief;
  const visualisation = results.renovation_visualisation;
  const costEstimate = results.cost_estimate;
  const narrative = results.narrative;

  const allImages = [
    ...(visualisation?.exteriors ?? []),
    ...(visualisation?.interiors ?? []),
  ];

  // Best hero image
  const heroImage = visualisation?.exteriors?.[0]?.renovatedUrl
    ?? classification?.images?.find((i) => i.classification?.depicts === "front_exterior")?.url
    ?? listing.photos?.[0]?.url;

  // Build archetype slab text
  const archetype = classification?.archetype;
  const archetypeSlab = archetype
    ? [archetype.displayName, archetype.era, archetype.constructionMethod]
        .filter(Boolean).join(". ").toUpperCase()
    : null;

  const fmtGBP = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;
  const fmtK = (n) => `£${Math.round(n / 1000)}k`;

  /* ─── Build short-form name from address ─────────────────────────── */
  // Try to extract a short name: first line, or street name, or first part
  const shortName = (() => {
    const addr = listing.address ?? "Property Report";
    // If listing has a name field, use that
    if (listing.name) return listing.name;
    // Take first comma-separated part as the headline
    const firstPart = addr.split(",")[0].trim();
    // If it looks like a number + street, try to get just the street name portion
    // but keep the full first part if it's already short
    return firstPart.length <= 40 ? firstPart : firstPart.slice(0, 40) + "…";
  })();

  /* ─── Stats row data ─────────────────────────────────────────────── */
  const stats = [
    listing.askingPrice ? { v: fmtGBP(listing.askingPrice), s: "guide", c: R.clay } : null,
    listing.bedrooms ? { v: `${listing.bedrooms} BED`, s: listing.bathrooms ? `${listing.bathrooms} bath` : "" } : null,
    listing.propertyType ? { v: listing.propertyType.toUpperCase(), s: listing.tenure ?? "" } : null,
    archetype?.era ? { v: archetype.era.toUpperCase(), s: archetype.displayName ?? "" } : null,
  ].filter(Boolean);

  /* ─── Postcode / location tag ────────────────────────────────────── */
  const locationTag = (() => {
    const parts = (listing.address ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    // Try to get postcode (last part) + area (second-to-last)
    if (parts.length >= 2) {
      return parts.slice(-2).join(" · ").toUpperCase();
    }
    return parts[parts.length - 1]?.toUpperCase() ?? "";
  })();

  return (
    <div style={{
      minHeight: "100vh", background: R.bg,
      fontFamily: "Inter, system-ui, sans-serif", color: R.text,
    }}>

      {/* ═══════════════════════════════ HERO ═══════════════════════════════
         Dark header — no background image. Typographic hierarchy only.
         Matches the handcrafted Woodbury / Cherry Cottage approach.
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: "#1A1816", position: "relative", overflow: "hidden",
      }}>
        {/* Ghost watermark */}
        <div style={{
          position: "absolute", right: -20, top: "50%",
          transform: "translateY(-50%)",
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(90px, 16vw, 200px)",
          color: "rgba(255,255,255,0.02)",
          letterSpacing: "0.06em", pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {archetype?.displayName?.toUpperCase() ?? "HONEST"}
        </div>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>

          {/* Wordmark */}
          <div style={{ padding: "24px 0 0" }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 14, fontStyle: "italic",
              color: R.accent, letterSpacing: "0.02em",
            }}>
              Piega
            </span>
          </div>

          {/* Hero content */}
          <div style={{ padding: "52px 0 0" }}>

            {/* Context tag */}
            {locationTag && (
              <Reveal>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 11, letterSpacing: "0.24em",
                  color: R.terracotta, marginBottom: 18,
                }}>
                  RIGHTMOVE · {locationTag}
                </div>
              </Reveal>
            )}

            {/* Property name — big Playfair headline */}
            <Reveal delay={0.08}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(34px, 5vw, 48px)", fontWeight: 400,
                color: "#FAF8F5", margin: "0 0 8px", lineHeight: 1.08,
              }}>
                {shortName}
              </h1>
            </Reveal>

            {/* Full address + meta as a Cap line */}
            <Reveal delay={0.13}>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 12,
                color: "rgba(184,169,154,0.5)", marginTop: 8, lineHeight: 1.5,
              }}>
                {[
                  listing.address,
                  listing.bedrooms ? `${listing.bedrooms} bed` : null,
                  listing.propertyType,
                  listing.tenure,
                ].filter(Boolean).join(" · ")}
              </div>
            </Reveal>

            {/* Stats row — discrete Bebas Neue data points */}
            {stats.length > 0 && (
              <Reveal delay={0.2}>
                <div style={{
                  display: "flex", gap: 24, flexWrap: "wrap", marginTop: 24,
                }}>
                  {stats.map((s, i) => (
                    <div key={i}>
                      <div style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(17px, 2.8vw, 22px)",
                        letterSpacing: "0.05em",
                        color: s.c ?? "#FAF8F5",
                      }}>
                        {s.v}
                      </div>
                      {s.s && (
                        <div style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 9, color: "rgba(184,169,154,0.4)",
                          letterSpacing: "0.05em",
                        }}>
                          {s.s}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>

          {/* Bottom spacing */}
          <div style={{ height: 52 }} />
        </div>
      </div>

      {/* ═══════════════════════════════ BODY ═══════════════════════════════ */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Hero photo — in the content flow, not a background ── */}
        {heroImage && (
          <Reveal>
            <div style={{
              /* Break out to ~900px like the before/after sliders */
              width: "min(900px, calc(100vw - 32px))",
              marginLeft: "calc(50% - min(450px, calc(50vw - 16px)))",
              marginTop: -1, marginBottom: 8,
              position: "relative",
            }}>
              <img src={heroImage} alt="Property"
                style={{
                  width: "100%", aspectRatio: "2.2/1",
                  objectFit: "cover", display: "block",
                }}
              />
              <div style={{
                position: "absolute", top: 16, left: 20,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 11, letterSpacing: "0.24em",
                color: "rgba(250,248,245,0.35)",
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}>
                THE APPROACH
              </div>
            </div>
          </Reveal>
        )}

        {/* Opening hook — as a Verse, the first editorial moment */}
        {narrative?.openingHook && (
          <Reveal>
            <Verse style={{
              fontSize: "clamp(17px, 2.8vw, 22px)",
              color: R.text, maxWidth: 580,
              marginTop: 28, marginBottom: 8,
            }}>
              {narrative.openingHook}
            </Verse>
          </Reveal>
        )}

        {/* ── Archetype slab ── */}
        {archetypeSlab && (
          <Reveal>
            <Slab colour={R.terracotta}>{archetypeSlab + "."}</Slab>
          </Reveal>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CHAPTER 1 — WHAT YOU'RE LOOKING AT
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <SectionSpacer />
        <Reveal>
          <ChapterHeading number={1} title="What You're Looking At" />
        </Reveal>

        {/* Transition — styled as Verse */}
        {narrative?.buildingReadingTransition && (
          <Reveal>
            <Verse>{narrative.buildingReadingTransition}</Verse>
          </Reveal>
        )}

        {/* Building narrative */}
        {reading?.buildingNarrative && (
          <Reveal>
            <Prose style={{ marginBottom: 32, whiteSpace: "pre-wrap" }}>
              {reading.buildingNarrative}
            </Prose>
          </Reveal>
        )}

        {/* Period features — vertical inventory list */}
        {reading?.periodFeatures?.length > 0 && (
          <Reveal>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                textTransform: "uppercase", color: R.textLight, marginBottom: 14,
              }}>
                Period Features
              </div>
              <div>
                {reading.periodFeatures.map((f, i) => {
                  const hidden = /hidden|likely|beneath|behind|under/i.test(f.status);
                  return (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "baseline", padding: "10px 0",
                      borderBottom: i < reading.periodFeatures.length - 1
                        ? `1px solid ${R.border}` : "none",
                    }}>
                      <span style={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: 15, color: hidden ? R.textMuted : R.text,
                        fontStyle: hidden ? "italic" : "normal",
                        lineHeight: 1.4,
                      }}>
                        {f.feature}
                      </span>
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 10,
                        color: R.textLight, letterSpacing: "0.02em",
                        flexShrink: 0, marginLeft: 16,
                        textTransform: "lowercase",
                      }}>
                        {f.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}

        {/* Construction inferences */}
        {reading?.constructionInferences && (
          <Reveal>
            <ConditionIndicators constructionInferences={reading.constructionInferences} />
          </Reveal>
        )}

        <Divider />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CHAPTER 2 — WHAT IT COULD BECOME
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Reveal>
          <ChapterHeading number={2} title="What It Could Become" />
        </Reveal>

        {/* Concept statement */}
        {designBrief?.conceptStatement && (
          <Reveal>
            <Prose style={{ marginBottom: 28 }}>
              {designBrief.conceptStatement}
            </Prose>
          </Reveal>
        )}

        {/* Design language block — palette swatches + materials + mood */}
        {designBrief?.designLanguage && (
          <Reveal>
            <DesignLanguageBlock designLanguage={designBrief.designLanguage} />
          </Reveal>
        )}

        {/* Before/after — full-width draggable sliders at 16:9 */}
        {allImages.length > 0 ? (
          <div>
            {allImages.map((item, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <BeforeAfterSlider
                  beforeSrc={item.originalUrl}
                  afterSrc={item.renovatedUrl}
                  label={`DRAG · ${(item.depicts ?? item.room ?? `Image ${i + 1}`).toUpperCase()}`}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <Verse style={{ color: R.textLight }}>
              Renovation images not yet generated.
            </Verse>
          </Reveal>
        )}

        {/* Strategy rationale */}
        {designBrief?.strategyRationale && (
          <Reveal>
            <Cap style={{ marginTop: 8 }}>
              {designBrief.strategyRationale}
            </Cap>
          </Reveal>
        )}

        <Divider />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CHAPTER 3 — WHAT TO INVESTIGATE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Reveal>
          <ChapterHeading number={3} title="What to Investigate" />
        </Reveal>

        {/* Dramatic slab lead-in */}
        <Reveal>
          <Slab colour={R.text}>Where the real decisions are.</Slab>
        </Reveal>

        {/* Honest layer narrative */}
        {narrative?.honestLayerNarrative && (
          <Reveal>
            <Prose style={{ whiteSpace: "pre-wrap", marginBottom: 28 }}>
              {narrative.honestLayerNarrative}
            </Prose>
          </Reveal>
        )}

        {/* Issues — expandable decision items */}
        {reading?.issuesIdentified?.length > 0 && (
          <Reveal>
            <div style={{ marginBottom: 24 }}>
              {reading.issuesIdentified.map((issue, i) => (
                <DecisionItem key={i} issue={issue} />
              ))}
            </div>
          </Reveal>
        )}

        {/* Unknowns */}
        {reading?.unknowns?.length > 0 && (
          <Reveal>
            <div style={{
              padding: "16px 20px", borderRadius: 4,
              border: `1px solid ${R.border}`, background: R.divider,
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                textTransform: "uppercase", color: R.textLight, marginBottom: 10,
              }}>
                Cannot Be Assessed From Photos
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {reading.unknowns.map((u, i) => (
                  <li key={i} style={{
                    fontSize: 13, color: R.textMuted, lineHeight: 1.6,
                    marginBottom: 3, fontFamily: "'EB Garamond', serif",
                  }}>
                    {typeof u === "string" ? u : u.item ?? u.description ?? JSON.stringify(u)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        <Divider />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CHAPTER 4 — THE NUMBERS
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {costEstimate && (
          <>
            <Reveal>
              <ChapterHeading number={4} title="The Numbers" />
            </Reveal>

            {/* Numbers transition — as Verse */}
            {narrative?.numbersTransition && (
              <Reveal>
                <Verse>{narrative.numbersTransition}</Verse>
              </Reveal>
            )}

            {/* Cost breakdown — generous rows */}
            <Reveal>
              <CostBreakdownRows breakdown={costEstimate.budgetBreakdown} />
            </Reveal>

            {/* Stacked proportional bar */}
            <Reveal>
              <CostStackedBar breakdown={costEstimate.budgetBreakdown} />
            </Reveal>

            {/* Total envelope — the BIG number (Bebas Neue, demo-style) */}
            {costEstimate.totalEnvelope && (
              <Reveal>
                <div style={{
                  margin: "40px 0", padding: "32px 0",
                  borderTop: `1px solid ${R.border}`,
                  borderBottom: `1px solid ${R.border}`,
                }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(52px, 10vw, 96px)",
                    letterSpacing: "0.02em", color: R.text,
                    lineHeight: 1,
                  }}>
                    {fmtK(costEstimate.totalEnvelope.low)}–{fmtK(costEstimate.totalEnvelope.high)}
                  </div>
                  <div style={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: 12, letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: R.textLight, marginTop: 8,
                  }}>
                    ten-year cost of ownership beyond purchase
                  </div>
                </div>
              </Reveal>
            )}

            {/* Price gap */}
            <Reveal>
              <PriceGapVisual priceGap={costEstimate.priceGap} />
            </Reveal>

            {/* Value gap narrative — as Verse */}
            {narrative?.valueGapNarrative && (
              <Reveal>
                <Verse style={{ maxWidth: 600 }}>
                  {narrative.valueGapNarrative}
                </Verse>
              </Reveal>
            )}

            {/* Phased budget */}
            <Reveal>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                textTransform: "uppercase", color: R.textLight,
                marginBottom: 12, marginTop: 32,
              }}>
                Phased Budget
              </div>
              <PhasedBudget phased={costEstimate.phasedBudget} />
            </Reveal>

            {/* Cost drivers */}
            {costEstimate.costDrivers?.length > 0 && (
              <Reveal>
                <div style={{ marginTop: 28 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                    textTransform: "uppercase", color: R.textLight, marginBottom: 12,
                  }}>
                    Key Cost Drivers
                  </div>
                  {costEstimate.costDrivers.map((d, i) => (
                    <div key={i} style={{
                      padding: "12px 16px", borderRadius: 4,
                      border: `1px solid ${R.border}`, background: R.cardBg,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: R.text, marginBottom: 3,
                      }}>
                        {d.factor}
                      </div>
                      <div style={{ fontSize: 12, color: R.textMuted, lineHeight: 1.5 }}>
                        {d.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Confidence + assumptions */}
            <Reveal>
              <div style={{
                marginTop: 28, padding: "16px 20px", borderRadius: 4,
                background: R.divider,
              }}>
                {costEstimate.confidenceStatement && (
                  <div style={{
                    fontSize: 12, color: R.textMuted, lineHeight: 1.6,
                    marginBottom: costEstimate.keyAssumptions?.length ? 12 : 0,
                    fontStyle: "italic",
                  }}>
                    {costEstimate.confidenceStatement}
                  </div>
                )}
                {costEstimate.keyAssumptions?.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: 1,
                      textTransform: "uppercase", color: R.textLight, marginBottom: 6,
                    }}>
                      Key Assumptions
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {costEstimate.keyAssumptions.map((a, i) => (
                        <li key={i} style={{
                          fontSize: 11, color: R.textMuted, lineHeight: 1.5,
                          marginBottom: 2,
                        }}>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Reveal>

            <Divider />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
           CLOSING GATE — "You read this far."
        ═══════════════════════════════════════════════════════════════════ */}
        <Reveal>
          <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
            {narrative?.closingStatement && (
              <Verse style={{
                maxWidth: 520, margin: "0 auto 32px",
                color: R.text, fontSize: "clamp(16px, 2.8vw, 21px)",
              }}>
                {narrative.closingStatement}
              </Verse>
            )}

            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(16px, 2.8vw, 20px)",
              color: R.text, letterSpacing: "0.04em",
              textTransform: "uppercase", marginBottom: 6,
            }}>
              You read this far.
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 13, fontStyle: "italic",
              color: R.textMuted, maxWidth: 340,
              margin: "0 auto 24px", lineHeight: 1.5,
            }}>
              This is one building. Yours is different.
            </div>
          </div>
        </Reveal>

        {/* ─── Footer ─── */}
        <div style={{
          textAlign: "center", padding: "40px 0 60px",
          borderTop: `1px solid ${R.border}`,
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14, letterSpacing: 5,
            color: R.textLight, marginBottom: 8,
          }}>
            PIEGA<span style={{ color: R.terracotta }}>.</span>
          </div>
          <div style={{
            fontFamily: "'EB Garamond', serif",
            fontSize: 12, fontStyle: "italic", color: R.textLight,
          }}>
            Property intelligence · United Kingdom
          </div>
          <Cap style={{ marginTop: 24, opacity: 0.4 }}>
            Not affiliated with any estate agent. That is the point.
          </Cap>

          {/* Back to pipeline link */}
          <div style={{ marginTop: 20 }}>
            <Link
              href={`/pipeline/${reportId}`}
              style={{
                fontSize: 11, color: R.textLight,
                textDecoration: "none",
                padding: "6px 14px", borderRadius: 3,
                border: `1px solid ${R.border}`,
              }}
            >
              ← Pipeline Hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
