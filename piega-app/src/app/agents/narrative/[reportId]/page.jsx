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
    running:  { color: C.clay,       label: "Writing", pulse: true },
    complete: { color: C.sage,       label: "Complete" },
    error:    { color: C.terracotta, label: "Error" },
  };
  const cfg = map[status] ?? map.idle;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 4,
      background: cfg.color + "14", border: `1px solid ${cfg.color}30`,
      fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
      color: cfg.color, textTransform: "uppercase",
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

// ─── Narrative section renderer ────────────────────────────────────────────

const SECTIONS = [
  { key: "openingHook", label: "Opening Hook", hint: "The first thing the reader sees" },
  { key: "buildingReadingTransition", label: "Building Reading Transition", hint: "Bridge to the architectural chapter" },
  { key: "honestLayerNarrative", label: "Honest Layer", hint: "Issues + unknowns as constructive prose" },
  { key: "numbersTransition", label: "Numbers Transition", hint: "Connects the vision to the costs" },
  { key: "valueGapNarrative", label: "Value Gap Narrative", hint: "Price gap framed for humans" },
  { key: "closingStatement", label: "Closing Statement", hint: "What the reader should do next" },
];

function NarrativeSection({ section, text }) {
  if (!text) return null;

  const wordCount = text.split(/\s+/).length;

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10,
      }}>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: C.paper,
            marginBottom: 2,
          }}>
            {section.label}
          </div>
          <div style={{ fontSize: 10, color: C.warmGrey + "88" }}>
            {section.hint}
          </div>
        </div>
        <span style={{
          fontSize: 10, color: C.warmGrey + "66",
          fontVariantNumeric: "tabular-nums",
        }}>
          {wordCount} words
        </span>
      </div>
      <div style={{
        fontSize: 14, color: C.accent, lineHeight: 1.75,
        fontFamily: "'EB Garamond', serif", fontStyle: "italic",
        whiteSpace: "pre-wrap",
      }}>
        {text}
      </div>
    </Card>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function NarrativeWriterPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [triggerRunning, setTriggerRunning] = useState(false);
  const [triggerError, setTriggerError] = useState(null);

  // ── Fetch + poll ──
  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);

      // Clear running state when narrative result arrives
      if (data.results?.narrative) setTriggerRunning(false);
    } catch (err) {
      setError(err.message);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
    const iv = setInterval(fetchReport, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchReport]);

  // ── Trigger ──
  const handleTrigger = useCallback(async () => {
    setTriggerError(null);
    setTriggerRunning(true);
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}/narrative`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setTriggerError(err.message);
      setTriggerRunning(false);
    }
  }, [reportId]);

  // ── Derived state ──
  const results = report?.results;
  const narrative = results?.narrative;
  const classification = results?.classification;
  const designBrief = results?.design_brief;
  const costEstimate = results?.cost_estimate;
  const listing = report?.listing ?? {};

  const hasDeps = !!classification && !!designBrief && !!costEstimate;
  const isRunning = triggerRunning || results?.narrative_status === "running";
  const status = narrative ? "complete" : isRunning ? "running" : hasDeps ? "idle" : "locked";

  const totalWords = narrative
    ? Object.values(narrative).join(" ").split(/\s+/).length
    : 0;

  return (
    <>
      <style>{`@keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>

      <div style={{
        minHeight: "100vh", background: C.dark, color: C.paper,
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

          {/* ── Nav ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 32,
          }}>
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
              Narrative Writer
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
          {error && !report && (
            <Card>
              <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 6 }}>
                Cannot load report
              </div>
              <div style={{ fontSize: 12, color: C.warmGrey }}>{error}</div>
            </Card>
          )}

          {/* ── Report loaded ── */}
          {report && (
            <>
              {/* Property header */}
              <Card style={{ marginBottom: 24 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start",
                }}>
                  <div>
                    <h2 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 22, fontWeight: 400,
                      color: C.paper, margin: "0 0 6px",
                    }}>
                      {listing.address ?? `Report ${report.id.slice(0, 8)}…`}
                    </h2>
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 8,
                      alignItems: "center",
                    }}>
                      {listing.askingPrice && (
                        <span style={{ fontSize: 15, color: C.clay, fontWeight: 600 }}>
                          £{Number(listing.askingPrice).toLocaleString("en-GB")}
                        </span>
                      )}
                      {classification?.archetype && (
                        <Badge color={C.accent}>{classification.archetype.displayName}</Badge>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>
              </Card>

              {/* ── Dependencies check ── */}
              {!hasDeps && (
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: C.warmGrey, lineHeight: 1.6 }}>
                    The Narrative Writer needs the <strong style={{ color: C.paper }}>Classifier</strong>,{" "}
                    <strong style={{ color: C.paper }}>Design Brief</strong>, and{" "}
                    <strong style={{ color: C.paper }}>Cost Estimator</strong> to run first.
                  </div>
                  <div style={{ fontSize: 11, color: C.warmGrey + "88", marginTop: 8 }}>
                    Missing:{" "}
                    {[
                      !classification && "Classifier",
                      !designBrief && "Design Brief",
                      !costEstimate && "Cost Estimator",
                    ].filter(Boolean).join(", ")}
                  </div>
                </Card>
              )}

              {/* ── Trigger button ── */}
              {hasDeps && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  marginBottom: 24,
                }}>
                  <button
                    onClick={handleTrigger}
                    disabled={isRunning}
                    style={{
                      fontSize: 12, fontWeight: 600,
                      color: isRunning ? C.warmGrey : narrative ? C.warmGrey : C.paper,
                      padding: "8px 20px", borderRadius: 5,
                      background: isRunning
                        ? "transparent"
                        : narrative
                        ? "transparent"
                        : C.terracotta,
                      border: `1px solid ${isRunning ? C.bd : narrative ? C.bd : C.terracotta}`,
                      cursor: isRunning ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {isRunning ? "Writing…" : narrative ? "Re-run ↻" : "Run Narrative Writer ▶"}
                  </button>

                  {narrative && (
                    <span style={{ fontSize: 11, color: C.warmGrey }}>
                      {totalWords} words across {SECTIONS.length} sections
                    </span>
                  )}

                  {triggerError && (
                    <span style={{ fontSize: 11, color: C.terracotta }}>
                      {triggerError}
                    </span>
                  )}
                </div>
              )}

              {/* ── Running indicator ── */}
              {isRunning && !narrative && (
                <Card style={{ marginBottom: 16 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13, color: C.clay,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: C.clay,
                      animation: "pulseDot 1.2s ease-in-out infinite",
                    }} />
                    Writing editorial narrative…
                  </div>
                </Card>
              )}

              {/* ── Narrative sections ── */}
              {narrative && (
                <>
                  <SectionTitle>Narrative Sections</SectionTitle>
                  {SECTIONS.map((section) => (
                    <NarrativeSection
                      key={section.key}
                      section={section}
                      text={narrative[section.key]}
                    />
                  ))}

                  {/* View Report link */}
                  <div style={{ textAlign: "center", marginTop: 24 }}>
                    <Link
                      href={`/report/${report.id}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        fontSize: 13, fontWeight: 600, color: C.paper,
                        padding: "10px 24px", borderRadius: 5,
                        background: C.terracotta,
                        textDecoration: "none",
                      }}
                    >
                      View Assembled Report →
                    </Link>
                  </div>
                </>
              )}

              {/* ── Raw JSON ── */}
              {narrative && (
                <details style={{ marginTop: 32 }}>
                  <summary style={{
                    cursor: "pointer", fontSize: 11, color: C.warmGrey,
                    letterSpacing: 0.5, userSelect: "none",
                  }}>
                    Raw JSON
                  </summary>
                  <pre style={{
                    marginTop: 10, padding: 16,
                    background: "#141210", borderRadius: 5,
                    border: `1px solid ${C.bd}`,
                    fontSize: 11, color: C.warmGrey,
                    overflow: "auto", maxHeight: 400, lineHeight: 1.5,
                  }}>
                    {JSON.stringify(narrative, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
