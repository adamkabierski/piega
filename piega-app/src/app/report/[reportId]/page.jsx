"use client";

import { useEffect, useState, useCallback } from "react";
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
     Chapter 3 (Honest Layer) → Chapter 4 (Numbers) → Closing

   Design: 680px max-width, warm off-white background, serif headings,
   generous whitespace. Not a dashboard — a document.
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

/* ─── Typography helpers ─────────────────────────────────────────────── */

function ChapterHeading({ number, title }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 2,
        textTransform: "uppercase", color: R.textLight,
        marginBottom: 8,
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

function Divider() {
  return (
    <div style={{
      width: 40, height: 1, background: R.border,
      margin: "48px auto",
    }} />
  );
}

function SectionSpacer() {
  return <div style={{ height: 56 }} />;
}

/* ─── Budget bar (proportional SVG) ──────────────────────────────────── */

const BUDGET_COLOURS = [
  "#C4775B", "#D4A882", "#B8A99A", "#7D8B75",
  "#8A8580", "#6B6560", "#A0927E", "#C49A7A",
];

function BudgetBar({ breakdown }) {
  if (!breakdown?.length) return null;
  const total = breakdown.reduce((s, b) => s + ((b.low + b.high) / 2), 0);
  if (!total) return null;

  let x = 0;
  const segments = breakdown.map((b, i) => {
    const mid = (b.low + b.high) / 2;
    const pct = mid / total;
    const seg = { ...b, x, width: pct, colour: BUDGET_COLOURS[i % BUDGET_COLOURS.length] };
    x += pct;
    return seg;
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <svg viewBox="0 0 680 24" style={{ width: "100%", display: "block", borderRadius: 4, overflow: "hidden" }}>
        {segments.map((s, i) => (
          <rect key={i} x={s.x * 680} y="0" width={s.width * 680} height="24"
            fill={s.colour} />
        ))}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 12 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2,
              background: s.colour, flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: R.textMuted }}>
              {s.category} · £{Math.round(((s.low + s.high) / 2) / 1000)}k
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Price gap visual ───────────────────────────────────────────────── */

function PriceGapVisual({ priceGap }) {
  if (!priceGap) return null;
  const { askingPrice, estimatedPostWorksValue, totalInvestment } = priceGap;
  const fmtK = (n) => `£${Math.round(n / 1000)}k`;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center", gap: 16,
      padding: "24px 0",
    }}>
      {/* Asking */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: R.textLight, marginBottom: 6 }}>
          Asking Price
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28, letterSpacing: 1, color: R.text,
        }}>
          {fmtK(askingPrice)}
        </div>
      </div>

      {/* Arrow */}
      <div style={{ fontSize: 20, color: R.textLight }}>→</div>

      {/* Post-works */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: R.textLight, marginBottom: 6 }}>
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
            padding: "16px 20px", borderRadius: 6,
            border: `1px solid ${R.border}`,
            background: R.cardBg,
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

/* ─── Before/After pairs ─────────────────────────────────────────────── */

function BeforeAfterPair({ item, index }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        borderRadius: 6, overflow: "hidden",
      }}>
        <div style={{ position: "relative" }}>
          <img src={item.originalUrl} alt="Before"
            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
          <span style={{
            position: "absolute", top: 8, left: 8,
            fontSize: 9, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", color: "#fff",
            background: "rgba(0,0,0,0.5)", padding: "3px 8px",
            borderRadius: 3,
          }}>
            Before
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <img src={item.renovatedUrl} alt="After"
            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
          <span style={{
            position: "absolute", top: 8, left: 8,
            fontSize: 9, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", color: "#fff",
            background: "rgba(0,0,0,0.5)", padding: "3px 8px",
            borderRadius: 3,
          }}>
            After
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: R.textLight, marginTop: 6, fontStyle: "italic" }}>
        {item.depicts}{item.room ? ` — ${item.room}` : ""}
      </div>
    </div>
  );
}

/* ─── Condition indicators ───────────────────────────────────────────── */

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
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px",
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: "10px 14px", borderRadius: 4,
          border: `1px solid ${R.border}`, background: R.cardBg,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", color: R.textLight,
            marginBottom: 4,
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

/* ─── Design language block ──────────────────────────────────────────── */

function DesignLanguageBlock({ designLanguage }) {
  if (!designLanguage) return null;

  return (
    <div style={{
      padding: "20px 24px", borderRadius: 6,
      border: `1px solid ${R.border}`, background: R.cardBg,
      marginBottom: 24,
    }}>
      {/* Palette swatches */}
      {designLanguage.palette?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
            textTransform: "uppercase", color: R.textLight, marginBottom: 8,
          }}>
            Palette
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {designLanguage.palette.map((colour, i) => (
              <span key={i} style={{
                fontSize: 11, color: R.textMuted,
                padding: "4px 10px", borderRadius: 3,
                border: `1px solid ${R.border}`, background: R.bg,
              }}>
                {colour}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {designLanguage.materials?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
            textTransform: "uppercase", color: R.textLight, marginBottom: 8,
          }}>
            Materials
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {designLanguage.materials.map((mat, i) => (
              <span key={i} style={{
                fontSize: 11, color: R.textMuted,
                padding: "4px 10px", borderRadius: 3,
                border: `1px solid ${R.border}`, background: R.bg,
              }}>
                {mat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mood */}
      {designLanguage.mood && (
        <div style={{
          fontFamily: "'EB Garamond', serif",
          fontSize: 15, fontStyle: "italic",
          color: R.textMuted, lineHeight: 1.6,
        }}>
          "{designLanguage.mood}"
        </div>
      )}
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

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: R.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center", color: R.textMuted }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Report not found
          </div>
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

  // ── Extract all agent outputs ──
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

  // Best hero image: first exterior from visualiser, or first listing photo
  const heroImage = visualisation?.exteriors?.[0]?.renovatedUrl
    ?? classification?.images?.find((i) => i.classification?.depicts === "front_exterior")?.url
    ?? listing.photos?.[0]?.url;

  const fmtGBP = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;
  const fmtK = (n) => `£${Math.round(n / 1000)}k`;

  return (
    <div style={{
      minHeight: "100vh", background: R.bg,
      fontFamily: "Inter, system-ui, sans-serif",
      color: R.text,
    }}>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <div style={{
        position: "relative",
        minHeight: 400,
        background: "#1A1816",
        overflow: "hidden",
      }}>
        {heroImage && (
          <img src={heroImage} alt="Property"
            style={{
              width: "100%", height: 400, objectFit: "cover",
              display: "block", opacity: 0.55,
            }}
          />
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(26,24,22,0.95) 0%, rgba(26,24,22,0.3) 50%, rgba(26,24,22,0.6) 100%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          maxWidth: 680, margin: "0 auto", padding: "0 24px 40px",
        }}>
          {/* Wordmark */}
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14, letterSpacing: 5,
            color: "rgba(255,255,255,0.4)", marginBottom: 20,
          }}>
            PIEGA<span style={{ color: R.terracotta }}>.</span>
          </div>

          {/* Address + price */}
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 400,
            color: "#FAF8F5", margin: "0 0 8px", lineHeight: 1.15,
          }}>
            {listing.address ?? "Property Report"}
          </h1>

          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            gap: 10, marginBottom: 20,
          }}>
            {listing.askingPrice && (
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: 1, color: R.clay,
              }}>
                {fmtGBP(listing.askingPrice)}
              </span>
            )}
            {classification?.archetype && (
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                padding: "3px 10px", borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.15)",
              }}>
                {classification.archetype.displayName}
              </span>
            )}
            {[
              listing.bedrooms ? `${listing.bedrooms} bed` : null,
              listing.bathrooms ? `${listing.bathrooms} bath` : null,
              listing.propertyType,
            ].filter(Boolean).map((v, i) => (
              <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                · {v}
              </span>
            ))}
          </div>

          {/* Opening hook */}
          {narrative?.openingHook && (
            <div style={{
              fontFamily: "'EB Garamond', serif",
              fontSize: "clamp(17px, 2.2vw, 21px)",
              fontStyle: "italic", lineHeight: 1.7,
              color: "rgba(250,248,245,0.85)",
              maxWidth: 560,
            }}>
              {narrative.openingHook}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ BODY ═══════════════════ */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>

        {/* ── CHAPTER 1: What You're Looking At ── */}
        <SectionSpacer />
        <ChapterHeading number={1} title="What You're Looking At" />

        {/* Transition from narrative writer */}
        {narrative?.buildingReadingTransition && (
          <Prose style={{ marginBottom: 24, color: R.textMuted, fontStyle: "italic" }}>
            {narrative.buildingReadingTransition}
          </Prose>
        )}

        {/* Building narrative from classifier's architectural reading */}
        {reading?.buildingNarrative && (
          <Prose style={{ marginBottom: 32, whiteSpace: "pre-wrap" }}>
            {reading.buildingNarrative}
          </Prose>
        )}

        {/* Period features */}
        {reading?.periodFeatures?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
              textTransform: "uppercase", color: R.textLight,
              marginBottom: 10,
            }}>
              Period Features
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {reading.periodFeatures.map((f, i) => (
                <span key={i} style={{
                  fontSize: 11, color: R.textMuted,
                  padding: "4px 10px", borderRadius: 3,
                  border: `1px solid ${R.border}`, background: R.cardBg,
                }}>
                  {f.feature} <span style={{ color: R.textLight }}>· {f.status}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Construction inferences */}
        {reading?.constructionInferences && (
          <ConditionIndicators constructionInferences={reading.constructionInferences} />
        )}

        <Divider />

        {/* ── CHAPTER 2: What It Could Become ── */}
        <ChapterHeading number={2} title="What It Could Become" />

        {/* Concept statement from design brief */}
        {designBrief?.conceptStatement && (
          <Prose style={{ marginBottom: 28 }}>
            {designBrief.conceptStatement}
          </Prose>
        )}

        {/* Design language */}
        {designBrief?.designLanguage && (
          <DesignLanguageBlock designLanguage={designBrief.designLanguage} />
        )}

        {/* Before/after images */}
        {allImages.length > 0 ? (
          <div>
            {allImages.map((item, i) => (
              <BeforeAfterPair key={i} item={item} index={i} />
            ))}
          </div>
        ) : (
          <Prose style={{ color: R.textLight, fontStyle: "italic", marginBottom: 24 }}>
            Renovation images not yet generated.
          </Prose>
        )}

        {/* Strategy rationale */}
        {designBrief?.strategyRationale && (
          <Prose style={{ color: R.textMuted, fontSize: 14, marginTop: 16 }}>
            {designBrief.strategyRationale}
          </Prose>
        )}

        <Divider />

        {/* ── CHAPTER 3: What to Investigate ── */}
        <ChapterHeading number={3} title="What to Investigate" />

        {/* Honest layer from narrative writer */}
        {narrative?.honestLayerNarrative ? (
          <Prose style={{ whiteSpace: "pre-wrap", marginBottom: 24 }}>
            {narrative.honestLayerNarrative}
          </Prose>
        ) : reading?.issuesIdentified?.length > 0 ? (
          /* Fallback: show issues as list if no narrative */
          <div style={{ marginBottom: 24 }}>
            {reading.issuesIdentified.map((issue, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderRadius: 4,
                border: `1px solid ${R.border}`, background: R.cardBg,
                marginBottom: 8,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "baseline", marginBottom: 4,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: R.text }}>
                    {issue.issue}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: issue.severity === "significant" ? R.terracotta
                      : issue.severity === "moderate" ? R.clay
                      : R.textLight,
                  }}>
                    {issue.severity}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: R.textMuted, lineHeight: 1.5 }}>
                  {issue.implication}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Divider />

        {/* ── CHAPTER 4: The Numbers ── */}
        {costEstimate && (
          <>
            <ChapterHeading number={4} title="The Numbers" />

            {/* Numbers transition from narrative writer */}
            {narrative?.numbersTransition && (
              <Prose style={{ marginBottom: 28, color: R.textMuted, fontStyle: "italic" }}>
                {narrative.numbersTransition}
              </Prose>
            )}

            {/* Budget breakdown bar */}
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
              textTransform: "uppercase", color: R.textLight, marginBottom: 12,
            }}>
              Budget Breakdown
            </div>
            <BudgetBar breakdown={costEstimate.budgetBreakdown} />

            {/* Total envelope */}
            {costEstimate.totalEnvelope && (
              <div style={{
                textAlign: "center", padding: "28px 0", marginBottom: 8,
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
                  color: R.textLight, marginBottom: 8,
                }}>
                  Total Renovation Estimate
                </div>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 42, letterSpacing: 2, color: R.text,
                }}>
                  {fmtK(costEstimate.totalEnvelope.low)}–{fmtK(costEstimate.totalEnvelope.high)}
                </div>
              </div>
            )}

            {/* Price gap */}
            <PriceGapVisual priceGap={costEstimate.priceGap} />

            {/* Value gap narrative from narrative writer */}
            {narrative?.valueGapNarrative && (
              <Prose style={{
                padding: "16px 20px", borderRadius: 6,
                background: R.cardBg, border: `1px solid ${R.border}`,
                marginBottom: 28,
              }}>
                {narrative.valueGapNarrative}
              </Prose>
            )}

            {/* Phased budget */}
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
              textTransform: "uppercase", color: R.textLight,
              marginBottom: 12, marginTop: 24,
            }}>
              Phased Budget
            </div>
            <PhasedBudget phased={costEstimate.phasedBudget} />

            {/* Cost drivers */}
            {costEstimate.costDrivers?.length > 0 && (
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: R.text, marginBottom: 3 }}>
                      {d.factor}
                    </div>
                    <div style={{ fontSize: 12, color: R.textMuted, lineHeight: 1.5 }}>
                      {d.impact}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Confidence + assumptions */}
            <div style={{
              marginTop: 28, padding: "16px 20px", borderRadius: 6,
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
                    textTransform: "uppercase", color: R.textLight,
                    marginBottom: 6,
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

            <Divider />
          </>
        )}

        {/* ═══════════════════ CLOSING ═══════════════════ */}
        {narrative?.closingStatement && (
          <div style={{
            textAlign: "center", padding: "20px 0 60px",
          }}>
            <Prose style={{
              fontSize: 18, color: R.text, fontStyle: "italic",
              maxWidth: 520, margin: "0 auto",
            }}>
              {narrative.closingStatement}
            </Prose>
          </div>
        )}

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
            fontSize: 12, fontStyle: "italic",
            color: R.textLight,
          }}>
            Property intelligence · United Kingdom
          </div>

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
