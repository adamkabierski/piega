"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { C } from "@/lib/theme";

// ─── Constants ──────────────────────────────────────────────────────────────
const AGENTS_URL = "http://localhost:4711";
const POLL_INTERVAL_MS = 3000;

// ─── Tiny shared components ─────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: C.darkCard, border: `1px solid ${C.bd}`,
      borderRadius: 6, padding: "20px 20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
      color: C.warmGrey, textTransform: "uppercase",
      marginBottom: 12,
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
    running:  { color: C.clay,       label: "Generating", pulse: true },
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

// ─── Depicts label helper ────────────────────────────────────────────────────
const DEPICTS_LABELS = {
  front_exterior: "Front Exterior",
  rear_exterior: "Rear Exterior",
  side_exterior: "Side Exterior",
  garden_rear: "Rear Garden",
  garden_front: "Front Garden",
  driveway: "Driveway",
  living_room: "Living Room",
  kitchen: "Kitchen",
  dining_room: "Dining Room",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  hallway: "Hallway",
  landing: "Landing",
};

// ─── Before / After pair ─────────────────────────────────────────────────────

function BeforeAfterPair({ result, index }) {
  const [showAfter, setShowAfter] = useState(true);
  const label = DEPICTS_LABELS[result.depicts] ?? result.depicts;
  const hasPostProduction = !!result.prePostProductionUrl;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: `1px solid ${C.bd}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: C.warmGrey,
            background: "rgba(255,255,255,0.05)",
            padding: "2px 7px", borderRadius: 3,
          }}>
            #{index + 1}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.paper }}>
            {label}
          </span>
          {result.room && (
            <span style={{ fontSize: 11, color: C.warmGrey }}>
              · {result.room}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {hasPostProduction && (
            <Badge color={C.accent}>Post-produced</Badge>
          )}
          <Badge color={result.type === "exterior" ? C.sage : C.clay}>
            {result.type}
          </Badge>
        </div>
      </div>

      {/* Image area */}
      <div style={{
        display: "grid",
        gridTemplateColumns: hasPostProduction ? "1fr 1fr 1fr" : "1fr 1fr",
        gap: 0,
      }}>
        {/* Before (original) */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", top: 8, left: 8, zIndex: 2,
            fontSize: 9, fontWeight: 600, letterSpacing: 1,
            color: C.warmGrey, textTransform: "uppercase",
            background: "rgba(26,24,22,0.85)", padding: "3px 8px",
            borderRadius: 3,
          }}>
            Before
          </div>
          <div style={{ paddingTop: "66%", position: "relative", background: "#141210" }}>
            <img
              src={result.originalUrl}
              alt={`${label} — before`}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
              }}
              loading="lazy"
            />
          </div>
        </div>

        {/* Pre-post-production (raw renovation) — only shown when post-production ran */}
        {hasPostProduction && (
          <div style={{ position: "relative", borderLeft: `1px solid ${C.bd}` }}>
            <div style={{
              position: "absolute", top: 8, left: 8, zIndex: 2,
              fontSize: 9, fontWeight: 600, letterSpacing: 1,
              color: C.clay, textTransform: "uppercase",
              background: "rgba(26,24,22,0.85)", padding: "3px 8px",
              borderRadius: 3,
            }}>
              Renovation
            </div>
            <div style={{ paddingTop: "66%", position: "relative", background: "#141210" }}>
              <img
                src={result.prePostProductionUrl}
                alt={`${label} — renovation (raw)`}
                style={{
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover",
                }}
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* After (final — post-produced or raw if no post-production) */}
        <div style={{ position: "relative", borderLeft: `1px solid ${C.bd}` }}>
          <div style={{
            position: "absolute", top: 8, left: 8, zIndex: 2,
            fontSize: 9, fontWeight: 600, letterSpacing: 1,
            color: C.sage, textTransform: "uppercase",
            background: "rgba(26,24,22,0.85)", padding: "3px 8px",
            borderRadius: 3,
          }}>
            {hasPostProduction ? "Post-produced" : "After"}
          </div>
          <div style={{ paddingTop: "66%", position: "relative", background: "#141210" }}>
            <img
              src={result.renovatedUrl}
              alt={`${label} — after`}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
              }}
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Prompt used */}
      <details style={{ borderTop: `1px solid ${C.bd}` }}>
        <summary style={{
          cursor: "pointer", fontSize: 10, color: C.warmGrey,
          padding: "10px 16px", letterSpacing: 0.5, userSelect: "none",
        }}>
          Prompt used · {result.model}
        </summary>
        <div style={{
          padding: "0 16px 14px",
          fontSize: 11, color: C.warmGrey, lineHeight: 1.7,
          fontStyle: "italic",
        }}>
          &ldquo;{result.promptUsed}&rdquo;
        </div>
      </details>
    </Card>
  );
}

// ─── Generating skeleton ─────────────────────────────────────────────────────

function GeneratingSkeleton({ count }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px" }}>
            <Skeleton height={14} width="40%" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <Skeleton height={180} style={{ borderRadius: 0 }} />
            <Skeleton height={180} style={{ borderRadius: 0 }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Cost & stats bar ────────────────────────────────────────────────────────

function StatsBar({ visualisation }) {
  if (!visualisation) return null;
  const total = (visualisation.exteriors?.length ?? 0) + (visualisation.interiors?.length ?? 0);
  const elapsed = visualisation.totalDurationMs
    ? `${(visualisation.totalDurationMs / 1000).toFixed(1)}s`
    : "—";
  const cost = visualisation.totalCost != null
    ? `$${visualisation.totalCost.toFixed(2)}`
    : "—";

  return (
    <div style={{
      display: "flex", gap: 20, fontSize: 11, color: C.warmGrey,
      padding: "12px 0", borderBottom: `1px solid ${C.bd}`, marginBottom: 4,
    }}>
      <span><strong style={{ color: C.paper }}>{total}</strong> images</span>
      <span><strong style={{ color: C.paper }}>{visualisation.exteriors?.length ?? 0}</strong> exterior</span>
      <span><strong style={{ color: C.paper }}>{visualisation.interiors?.length ?? 0}</strong> interior</span>
      <span style={{ marginLeft: "auto" }}>
        Model: <strong style={{ color: C.accent }}>{visualisation.model ?? "—"}</strong>
      </span>
      <span>
        Cost: <strong style={{ color: C.clay }}>{cost}</strong>
      </span>
      <span>
        Time: <strong style={{ color: C.accent }}>{elapsed}</strong>
      </span>
    </div>
  );
}

// ─── Report picker (initial state) ──────────────────────────────────────────

function ReportPicker({ onSelect }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${AGENTS_URL}/reports`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setReports)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card style={{ borderColor: C.terracotta + "40" }}>
        <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 8 }}>
          Cannot load reports
        </div>
        <div style={{ fontSize: 12, color: C.warmGrey }}>{error}</div>
      </Card>
    );
  }

  if (!reports) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3].map(i => <Skeleton key={i} height={56} />)}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: C.warmGrey, textAlign: "center", padding: 20 }}>
          No classified reports found.<br />
          <span style={{ fontSize: 11 }}>Run the classifier on a property listing first.</span>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <SectionTitle>Select a classified report</SectionTitle>
      {reports.map(r => {
        const listing = r.listing ?? {};
        const arch = r.results?.classification?.archetype;
        const imgCount = r.results?.classification?.images?.length ?? 0;
        const price = listing.askingPrice
          ? `£${Number(listing.askingPrice).toLocaleString("en-GB")}`
          : null;
        const hasVis = !!r.results?.renovation_visualisation;

        return (
          <div
            key={r.id}
            onClick={() => onSelect(r.id)}
            style={{
              background: C.darkCard,
              border: `1px solid ${C.bd}`,
              borderRadius: 6,
              padding: "14px 16px",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "60"}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.paper, marginBottom: 4 }}>
                  {listing.address ?? `Listing ${listing.listingId ?? r.listing_id}`}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {price && <span style={{ fontSize: 12, color: C.clay, fontWeight: 500 }}>{price}</span>}
                  {arch && (
                    <Badge color={C.accent}>{arch.displayName}</Badge>
                  )}
                  <span style={{ fontSize: 10, color: C.warmGrey }}>{imgCount} images classified</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {hasVis && <Badge color={C.sage}>Visualised</Badge>}
                <span style={{ fontSize: 9, color: C.warmGrey + "88" }}>
                  {new Date(r.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VisualiserPage() {
  const { reportId: routeReportId } = useParams();
  const [report, setReport] = useState(null);
  const [fetchErr, setFetchErr] = useState(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const pollRef = useRef(null);

  // Fetch report data
  const fetchReport = useCallback(async (id) => {
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${id}`);
      if (!res.ok) {
        setFetchErr(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setReport(data);

      // Stop polling when visualiser is done
      const visStatus = data.results?.renovation_visualisation_status;
      if (visStatus === "complete" || visStatus === "error" || (!visStatus && data.results?.renovation_visualisation?.totalCost != null)) {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      setFetchErr(`Cannot reach server at ${AGENTS_URL}`);
      clearInterval(pollRef.current);
    }
  }, []);

  // Load report when we have an ID
  useEffect(() => {
    if (!routeReportId) return;
    fetchReport(routeReportId);
    pollRef.current = setInterval(() => fetchReport(routeReportId), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [routeReportId, fetchReport]);

  // Trigger visualiser
  const handleRunVisualiser = async () => {
    if (!report?.id) return;
    setTriggerLoading(true);
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${report.id}/visualise`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? `HTTP ${res.status}`);
        return;
      }
      // Start polling for results
      pollRef.current = setInterval(() => fetchReport(report.id), POLL_INTERVAL_MS);
    } catch (err) {
      alert(`Failed to start visualiser: ${err.message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  // For the picker flow (no reportId in route), navigate on select
  const handleReportSelect = (id) => {
    window.location.href = `/visualiser/${id}`;
  };

  const classification = report?.results?.classification ?? null;
  const visualisation = report?.results?.renovation_visualisation ?? null;
  const visStatus = report?.results?.renovation_visualisation_status ?? (visualisation?.totalCost != null ? "complete" : "idle");

  const allResults = [
    ...(visualisation?.exteriors ?? []),
    ...(visualisation?.interiors ?? []),
  ];

  return (
    <>
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.5; }
          50%  { opacity: 0.9; }
          100% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: C.dark,
        color: C.paper,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* ── Top nav ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 32,
          }}>
            <span style={{
              fontFamily: "'Bebas Neue', Inter, sans-serif",
              fontSize: 22, letterSpacing: 4, color: C.paper,
            }}>
              PIEGA<span style={{ color: C.terracotta }}>.</span>
            </span>
            <span style={{
              fontSize: 11, color: C.warmGrey, letterSpacing: 0.5,
              paddingLeft: 8, borderLeft: `1px solid ${C.bd}`,
            }}>
              Renovation Visualiser
            </span>
          </div>

          {/* ── No report selected — show picker ── */}
          {!routeReportId && (
            <ReportPicker onSelect={handleReportSelect} />
          )}

          {/* ── Fetch error ── */}
          {routeReportId && fetchErr && !report && (
            <Card style={{ borderColor: C.terracotta + "40" }}>
              <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 8 }}>
                Connection error
              </div>
              <div style={{ fontSize: 12, color: C.warmGrey }}>{fetchErr}</div>
            </Card>
          )}

          {/* ── Loading ── */}
          {routeReportId && !fetchErr && !report && (
            <div>
              <Skeleton height={30} width="50%" style={{ marginBottom: 8 }} />
              <Skeleton height={18} width="30%" style={{ marginBottom: 32 }} />
            </div>
          )}

          {/* ── Report loaded ── */}
          {report && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Listing header */}
              <div style={{
                borderBottom: `1px solid ${C.bd}`,
                paddingBottom: 16, marginBottom: 4,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.paper, marginBottom: 4 }}>
                      {report.listing?.address ?? `Listing ${report.listing_id}`}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {report.listing?.askingPrice && (
                        <span style={{ fontSize: 15, color: C.clay, fontWeight: 600 }}>
                          £{Number(report.listing.askingPrice).toLocaleString("en-GB")}
                        </span>
                      )}
                      {classification?.archetype && (
                        <Badge color={C.accent}>{classification.archetype.displayName}</Badge>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={visStatus} />
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: C.warmGrey + "88" }}>
                  Report: {report.id}
                </div>
              </div>

              {/* Action bar */}
              {visStatus === "idle" && classification && (
                <Card style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: C.sage + "10", borderColor: C.sage + "30",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.paper, marginBottom: 4 }}>
                      Ready to visualise
                    </div>
                    <div style={{ fontSize: 11, color: C.warmGrey }}>
                      {classification.images?.length ?? 0} images classified · best candidates will be selected automatically
                    </div>
                  </div>
                  <button
                    onClick={handleRunVisualiser}
                    disabled={triggerLoading}
                    style={{
                      background: C.sage,
                      color: "#fff",
                      border: "none",
                      borderRadius: 5,
                      padding: "10px 20px",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      cursor: triggerLoading ? "wait" : "pointer",
                      opacity: triggerLoading ? 0.6 : 1,
                      transition: "opacity 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {triggerLoading ? "Starting…" : "Run Visualiser"}
                  </button>
                </Card>
              )}

              {/* No classification */}
              {!classification && (
                <Card style={{ borderColor: C.terracotta + "40" }}>
                  <div style={{ fontSize: 13, color: C.terracotta, fontWeight: 600, marginBottom: 6 }}>
                    No classification data
                  </div>
                  <div style={{ fontSize: 12, color: C.warmGrey }}>
                    This report hasn't been classified yet. Run the classifier first.
                  </div>
                </Card>
              )}

              {/* Running state */}
              {visStatus === "running" && (
                <div>
                  <div style={{
                    fontSize: 12, color: C.warmGrey,
                    marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: C.clay, display: "inline-block",
                      animation: "pulseDot 1.2s ease-in-out infinite",
                    }} />
                    Generating renovation images…
                    {visualisation?.remaining != null && (
                      <span style={{ color: C.accent }}>{visualisation.remaining} remaining</span>
                    )}
                  </div>

                  {/* Show any results that have arrived so far */}
                  {allResults.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                      {allResults.map((r, i) => (
                        <BeforeAfterPair key={`${r.depicts}-${i}`} result={r} index={i} />
                      ))}
                    </div>
                  )}

                  {/* Skeletons for remaining */}
                  <GeneratingSkeleton count={Math.max(1, (visualisation?.remaining ?? 3) - allResults.length)} />
                </div>
              )}

              {/* Error state */}
              {visStatus === "error" && (
                <Card style={{ borderColor: C.terracotta + "40" }}>
                  <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 8 }}>
                    Visualiser error
                  </div>
                  <div style={{ fontSize: 12, color: C.warmGrey }}>
                    Something went wrong during image generation. Check the server logs for details.
                  </div>
                  {report.errors?.length > 0 && (
                    <ul style={{
                      marginTop: 10, paddingLeft: 16,
                      fontSize: 11, color: C.warmGrey, lineHeight: 1.7,
                    }}>
                      {report.errors.filter(e => e.includes("Visualiser")).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {/* Complete results */}
              {visStatus === "complete" && visualisation && (
                <>
                  <StatsBar visualisation={visualisation} />

                  {/* Exteriors */}
                  {visualisation.exteriors?.length > 0 && (
                    <div>
                      <SectionTitle>Exterior Renovations · {visualisation.exteriors.length}</SectionTitle>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {visualisation.exteriors.map((r, i) => (
                          <BeforeAfterPair key={`ext-${i}`} result={r} index={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interiors */}
                  {visualisation.interiors?.length > 0 && (
                    <div>
                      <SectionTitle>Interior Renovations · {visualisation.interiors.length}</SectionTitle>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {visualisation.interiors.map((r, i) => (
                          <BeforeAfterPair
                            key={`int-${i}`}
                            result={r}
                            index={i + (visualisation.exteriors?.length ?? 0)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No results */}
                  {allResults.length === 0 && (
                    <Card>
                      <div style={{ fontSize: 13, color: C.warmGrey, textAlign: "center", padding: 20 }}>
                        No suitable images were found for visualisation.
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Raw JSON */}
              <details style={{ marginTop: 8 }}>
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
                  overflow: "auto", maxHeight: 400,
                  lineHeight: 1.5,
                }}>
                  {JSON.stringify(report, null, 2)}
                </pre>
              </details>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
