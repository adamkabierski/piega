"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/theme";

// ─── Constants ──────────────────────────────────────────────────────────────
const AGENTS_URL = "http://localhost:4711";
const POLL_INTERVAL_MS = 3000;

// ─── Tiny shared components ─────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: C.darkCard, border: `1px solid ${C.bd}`,
      borderRadius: 6, padding: "20px 20px", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
      color: C.warmGrey, textTransform: "uppercase", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 3,
      background: color + "18", border: `1px solid ${color}30`,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.3,
      color, textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    idle:     { color: C.warmGrey,   label: "Ready" },
    running:  { color: C.clay,       label: "Estimating", pulse: true },
    complete: { color: C.sage,       label: "Complete" },
    error:    { color: C.terracotta, label: "Error" },
  };
  const cfg = map[status] ?? map.idle;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 4,
      background: cfg.color + "18", border: `1px solid ${cfg.color}35`,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.5, color: cfg.color,
      textTransform: "uppercase",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: cfg.color,
        animation: cfg.pulse ? "pulseDot 1.2s ease-in-out infinite" : "none",
      }} />
      {cfg.label}
    </span>
  );
}

function Skeleton({ height = 20, width = "100%", style }) {
  return (
    <div style={{
      height, width, borderRadius: 3,
      background: "rgba(255,255,255,0.04)",
      animation: "shimmer 1.5s ease-in-out infinite",
      ...style,
    }} />
  );
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return "—";
  return `£${Number(n).toLocaleString("en-GB")}`;
}

function range(low, high) {
  return `${fmt(low)} – ${fmt(high)}`;
}

function pct(n) {
  if (n == null) return "";
  return `${Math.round(n)}%`;
}

// ─── Budget bar ──────────────────────────────────────────────────────────────

function BudgetBar({ categories, totalHigh }) {
  if (!categories?.length || !totalHigh) return null;

  const COLORS = [C.terracotta, C.clay, C.sage, C.accent, "#7B9BB5", C.warmGrey, "#C4A06A", "#8B7D6B"];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Stacked bar */}
      <div style={{
        display: "flex", height: 24, borderRadius: 4, overflow: "hidden",
        border: `1px solid ${C.bd}`,
      }}>
        {categories.map((cat, i) => {
          const width = totalHigh > 0 ? (cat.high / totalHigh) * 100 : 0;
          return (
            <div
              key={i}
              title={`${cat.category}: ${range(cat.low, cat.high)} (${pct(cat.percentage)})`}
              style={{
                width: `${width}%`, minWidth: width > 2 ? 2 : 0,
                background: COLORS[i % COLORS.length],
                opacity: 0.7,
                transition: "width 0.4s ease",
              }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "6px 14px",
        marginTop: 10,
      }}>
        {categories.map((cat, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 2,
              background: COLORS[i % COLORS.length], opacity: 0.7,
            }} />
            <span style={{ fontSize: 10, color: C.warmGrey }}>
              {cat.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Phase card ──────────────────────────────────────────────────────────────

function PhaseCard({ label, phase, color }) {
  if (!phase) return null;
  return (
    <div style={{
      flex: "1 1 200px",
      background: color + "08",
      border: `1px solid ${color}25`,
      borderRadius: 6, padding: "16px 14px",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
        color, textTransform: "uppercase", marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20, color: C.paper, marginBottom: 4,
      }}>
        {range(phase.low, phase.high)}
      </div>
      <div style={{ fontSize: 11, color: C.warmGrey, marginBottom: 6, lineHeight: 1.5 }}>
        {phase.timeframe}
      </div>
      <div style={{ fontSize: 12, color: C.paper, lineHeight: 1.6, opacity: 0.85 }}>
        {phase.description}
      </div>
    </div>
  );
}

// ─── Cost driver row ─────────────────────────────────────────────────────────

function CostDriverRow({ driver }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 5,
      border: `1px solid ${C.bd}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.paper, marginBottom: 4 }}>
        {driver.factor}
      </div>
      <div style={{ fontSize: 12, color: C.clay, marginBottom: 3, lineHeight: 1.5 }}>
        {driver.impact}
      </div>
      <div style={{ fontSize: 11, color: C.warmGrey, lineHeight: 1.5 }}>
        Current assumption: {driver.currentAssumption}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function CostEstimatePage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  // Determine status
  const results = report?.results ?? {};
  const costStatus = results.cost_estimate_status ?? (results.cost_estimate ? "complete" : "idle");
  const costEstimate = results.cost_estimate ?? null;
  const classification = results.classification ?? null;
  const designBrief = results.design_brief ?? null;
  const hasReading = !!classification?.architecturalReading;
  const canRun = !!classification && !!designBrief && hasReading;

  // Polling
  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (costStatus !== "running") return;
    const interval = setInterval(fetchReport, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [costStatus, fetchReport]);

  // Trigger
  const handleRun = async () => {
    if (!canRun || triggerLoading) return;
    setTriggerLoading(true);
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}/cost-estimate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      // Start polling
      setTimeout(fetchReport, 1000);
    } catch (err) {
      alert(`Failed to start cost estimator: ${err.message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  const listing = report?.listing ?? {};

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:.9} }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.3} }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{
        minHeight: "100vh", background: C.dark, color: C.paper,
        fontFamily: "Inter, system-ui, sans-serif", padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          {/* ── Nav ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
            <Link href="/pipeline" style={{ textDecoration: "none" }}>
              <span style={{
                fontFamily: "'Bebas Neue', Inter, sans-serif",
                fontSize: 22, letterSpacing: 4, color: C.paper,
              }}>
                PIEGA<span style={{ color: C.terracotta }}>.</span>
              </span>
            </Link>
            <span style={{
              fontSize: 11, color: C.warmGrey, letterSpacing: 0.5,
              paddingLeft: 8, borderLeft: `1px solid ${C.bd}`,
            }}>
              Cost Estimator
            </span>
            <div style={{ marginLeft: "auto" }}>
              <Link href={`/pipeline/${reportId}`} style={{
                fontSize: 11, color: C.warmGrey, textDecoration: "none",
                padding: "4px 10px", borderRadius: 3,
                border: `1px solid ${C.bd}`,
              }}>
                ← Pipeline
              </Link>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <Card style={{ borderColor: C.terracotta + "40", marginBottom: 20 }}>
              <div style={{ color: C.terracotta, fontWeight: 600 }}>{error}</div>
            </Card>
          )}

          {/* ── Loading ── */}
          {!report && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Skeleton height={48} />
              <Skeleton height={200} />
            </div>
          )}

          {report && (
            <>
              {/* ── Property header ── */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(24px,3.5vw,34px)", fontWeight: 400,
                  color: C.paper, margin: "0 0 8px",
                }}>
                  {listing.address ?? "Property Report"}
                </h1>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {listing.askingPrice && (
                    <span style={{ fontSize: 14, color: C.clay, fontWeight: 500 }}>
                      {fmt(listing.askingPrice)}
                    </span>
                  )}
                  {classification?.archetype && (
                    <Badge color={C.accent}>{classification.archetype.displayName}</Badge>
                  )}
                  <StatusBadge status={costStatus} />
                </div>
              </div>

              {/* ── Prerequisites check ── */}
              {!canRun && costStatus === "idle" && (
                <Card style={{ borderColor: C.terracotta + "30", marginBottom: 20 }}>
                  <SectionTitle>Prerequisites</SectionTitle>
                  <div style={{ fontSize: 13, color: C.warmGrey, lineHeight: 1.7 }}>
                    The cost estimator requires:
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      <li style={{ color: classification ? C.sage : C.terracotta }}>
                        Classification {classification ? "✓" : "✗ — run classifier first"}
                      </li>
                      <li style={{ color: hasReading ? C.sage : C.terracotta }}>
                        Architectural reading {hasReading ? "✓" : "✗ — re-run classifier for expanded output"}
                      </li>
                      <li style={{ color: designBrief ? C.sage : C.terracotta }}>
                        Design brief {designBrief ? "✓" : "✗ — generate a design brief first"}
                      </li>
                    </ul>
                  </div>
                </Card>
              )}

              {/* ── Run button ── */}
              {canRun && costStatus === "idle" && (
                <Card style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.paper, marginBottom: 4 }}>
                        Ready to estimate
                      </div>
                      <div style={{ fontSize: 12, color: C.warmGrey }}>
                        Strategy: {designBrief.transformationStrategy?.replace(/_/g, " ")} · ~$0.01
                      </div>
                    </div>
                    <button
                      onClick={handleRun}
                      disabled={triggerLoading}
                      style={{
                        background: C.terracotta, color: C.paper,
                        border: "none", borderRadius: 5,
                        padding: "10px 20px", fontSize: 13, fontWeight: 600,
                        cursor: triggerLoading ? "wait" : "pointer",
                        opacity: triggerLoading ? 0.6 : 1,
                        letterSpacing: 0.3,
                      }}
                    >
                      {triggerLoading ? "Starting…" : "Run Cost Estimate"}
                    </button>
                  </div>
                </Card>
              )}

              {/* ── Running skeleton ── */}
              {costStatus === "running" && !costEstimate && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Skeleton height={100} />
                  <Skeleton height={200} />
                  <div style={{ display: "flex", gap: 12 }}>
                    <Skeleton height={140} width="33%" />
                    <Skeleton height={140} width="33%" />
                    <Skeleton height={140} width="33%" />
                  </div>
                </div>
              )}

              {/* ── Results ── */}
              {costEstimate && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* ═══ Total envelope ═══ */}
                  <Card>
                    <SectionTitle>Total Renovation Envelope</SectionTitle>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 28, color: C.paper, marginBottom: 8,
                    }}>
                      {range(costEstimate.totalEnvelope?.low, costEstimate.totalEnvelope?.high)}
                    </div>

                    <BudgetBar
                      categories={costEstimate.budgetBreakdown}
                      totalHigh={costEstimate.totalEnvelope?.high}
                    />
                  </Card>

                  {/* ═══ Budget breakdown table ═══ */}
                  <Card>
                    <SectionTitle>Budget Breakdown</SectionTitle>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{
                        width: "100%", borderCollapse: "collapse",
                        fontSize: 12,
                      }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
                            {["Category", "Low", "High", "%", "Notes"].map(h => (
                              <th key={h} style={{
                                textAlign: h === "Notes" ? "left" : "right",
                                padding: "8px 10px", color: C.warmGrey,
                                fontSize: 10, fontWeight: 600, letterSpacing: 1,
                                textTransform: "uppercase",
                                ...(h === "Category" ? { textAlign: "left" } : {}),
                              }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {costEstimate.budgetBreakdown?.map((row, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${C.bd}` }}>
                              <td style={{ padding: "10px 10px", color: C.paper, fontWeight: 500 }}>
                                {row.category}
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "right", color: C.paper }}>
                                {fmt(row.low)}
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "right", color: C.paper }}>
                                {fmt(row.high)}
                              </td>
                              <td style={{ padding: "10px 10px", textAlign: "right", color: C.warmGrey }}>
                                {pct(row.percentage)}
                              </td>
                              <td style={{
                                padding: "10px 10px", color: C.warmGrey,
                                fontSize: 11, lineHeight: 1.4, maxWidth: 250,
                              }}>
                                {row.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* ═══ Price gap ═══ */}
                  {costEstimate.priceGap && (
                    <Card>
                      <SectionTitle>Price Gap Analysis</SectionTitle>
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16, marginBottom: 12,
                      }}>
                        <div>
                          <div style={{ fontSize: 10, color: C.warmGrey, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                            Asking Price
                          </div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.paper }}>
                            {fmt(costEstimate.priceGap.askingPrice)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: C.warmGrey, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                            Total Investment
                          </div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.terracotta }}>
                            {range(costEstimate.priceGap.totalInvestment?.low, costEstimate.priceGap.totalInvestment?.high)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: C.warmGrey, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                            Est. Post-Works Value
                          </div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.sage }}>
                            {range(costEstimate.priceGap.estimatedPostWorksValue?.low, costEstimate.priceGap.estimatedPostWorksValue?.high)}
                          </div>
                        </div>
                      </div>
                      {costEstimate.priceGap.estimatedPostWorksValue?.basis && (
                        <div style={{ fontSize: 11, color: C.warmGrey, fontStyle: "italic", lineHeight: 1.5 }}>
                          {costEstimate.priceGap.estimatedPostWorksValue.basis}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* ═══ Phased budget ═══ */}
                  {costEstimate.phasedBudget && (
                    <div>
                      <SectionTitle>Phased Budget</SectionTitle>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <PhaseCard
                          label="Move-in Basics"
                          phase={costEstimate.phasedBudget.moveInBasics}
                          color={C.terracotta}
                        />
                        <PhaseCard
                          label="Year 1–2"
                          phase={costEstimate.phasedBudget.yearOneTwo}
                          color={C.clay}
                        />
                        <PhaseCard
                          label="Complete Vision"
                          phase={costEstimate.phasedBudget.completeVision}
                          color={C.sage}
                        />
                      </div>
                    </div>
                  )}

                  {/* ═══ Cost drivers ═══ */}
                  {costEstimate.costDrivers?.length > 0 && (
                    <Card>
                      <SectionTitle>Key Cost Drivers</SectionTitle>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {costEstimate.costDrivers.map((d, i) => (
                          <CostDriverRow key={i} driver={d} />
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* ═══ Key assumptions ═══ */}
                  {costEstimate.keyAssumptions?.length > 0 && (
                    <Card>
                      <SectionTitle>Key Assumptions</SectionTitle>
                      <ul style={{
                        margin: 0, paddingLeft: 16,
                        fontSize: 12, color: C.warmGrey, lineHeight: 1.8,
                      }}>
                        {costEstimate.keyAssumptions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* ═══ Confidence statement ═══ */}
                  {costEstimate.confidenceStatement && (
                    <Card style={{
                      borderColor: C.accent + "25",
                      background: C.accent + "06",
                    }}>
                      <SectionTitle>Confidence & Disclaimer</SectionTitle>
                      <div style={{
                        fontSize: 13, color: C.paper, lineHeight: 1.7,
                        fontStyle: "italic", opacity: 0.85,
                      }}>
                        {costEstimate.confidenceStatement}
                      </div>
                    </Card>
                  )}

                </div>
              )}

              {/* ── Error display ── */}
              {costStatus === "error" && !costEstimate && (
                <Card style={{ borderColor: C.terracotta + "40" }}>
                  <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 6 }}>
                    Cost estimator error
                  </div>
                  <div style={{ fontSize: 12, color: C.warmGrey }}>
                    Check the server logs for details. You can try running it again.
                  </div>
                  {canRun && (
                    <button
                      onClick={handleRun}
                      style={{
                        marginTop: 12,
                        background: C.terracotta, color: C.paper,
                        border: "none", borderRadius: 5,
                        padding: "8px 16px", fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Retry
                    </button>
                  )}
                </Card>
              )}

            </>
          )}
        </div>
      </div>
    </>
  );
}
