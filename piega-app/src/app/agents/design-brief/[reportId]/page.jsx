"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

// ─── Strategy display helpers ────────────────────────────────────────────────

const STRATEGY_LABELS = {
  full_renovation: { label: "Full Renovation", color: C.terracotta, desc: "Stripped / derelict → complete rethink" },
  refresh:         { label: "Refresh",          color: C.clay,       desc: "Dated but liveable → new surfaces, same bones" },
  staging:         { label: "Staging",           color: C.sage,       desc: "Already decent → furniture, styling, lifestyle" },
  minimal:         { label: "Minimal",           color: C.accent,     desc: "Already good → 1–2 subtle tweaks" },
  exterior_focus:  { label: "Exterior Focus",    color: "#7B9BB5",    desc: "Interiors too poor → lean on outside" },
};

const INTENSITY_COLORS = {
  heavy:   C.terracotta,
  moderate: C.clay,
  light:   C.sage,
};

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
  loft: "Loft",
  basement: "Basement",
  garage: "Garage",
  wc: "WC",
  floorplan: "Floorplan",
  street_view: "Street View",
  detail_closeup: "Detail",
  unknown: "Unknown",
};

// ─── Colour swatch ──────────────────────────────────────────────────────────

function ColourSwatch({ name }) {
  // Try to map common colour names to hex — fallback to a warm grey chip
  const CSS_SAFE = /^(#[0-9a-fA-F]{3,8}|[a-z]{3,20})$/;
  const isCssSafe = CSS_SAFE.test(name.toLowerCase().replace(/\s+/g, ""));
  const bgColor = isCssSafe ? name.toLowerCase().replace(/\s+/g, "") : C.warmGrey + "40";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 4,
        background: bgColor,
        border: `1px solid rgba(255,255,255,0.1)`,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, color: C.paper, fontWeight: 400 }}>
        {name}
      </span>
    </div>
  );
}

// ─── Image selection row ─────────────────────────────────────────────────────

function ImageSelectionRow({ sel, classifiedImage }) {
  const depicts = classifiedImage?.classification?.depicts;
  const room = classifiedImage?.classification?.room;
  const label = DEPICTS_LABELS[depicts] ?? depicts ?? `Image #${sel.index}`;
  const intensityColor = INTENSITY_COLORS[sel.transformationIntensity] ?? C.warmGrey;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px",
      background: sel.use ? "rgba(125,139,117,0.06)" : "rgba(255,255,255,0.02)",
      borderRadius: 5,
      border: `1px solid ${sel.use ? C.sage + "25" : C.bd}`,
    }}>
      {/* Thumbnail */}
      {classifiedImage?.url && (
        <div style={{
          width: 56, height: 38, borderRadius: 4, overflow: "hidden",
          flexShrink: 0, background: "#141210",
        }}>
          <img
            src={classifiedImage.url}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: C.warmGrey,
            background: "rgba(255,255,255,0.05)",
            padding: "1px 6px", borderRadius: 3,
          }}>
            #{sel.index}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.paper }}>
            {label}
          </span>
          {room && <span style={{ fontSize: 10, color: C.warmGrey }}>· {room}</span>}
        </div>

        {/* Badges row */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          <Badge color={sel.use ? C.sage : C.warmGrey}>
            {sel.use ? "✓ Selected" : "✗ Skipped"}
          </Badge>
          <Badge color={sel.type === "exterior" ? C.sage : C.clay}>
            {sel.type}
          </Badge>
          {sel.use && (
            <Badge color={intensityColor}>
              {sel.transformationIntensity}
            </Badge>
          )}
        </div>

        {/* Reason */}
        <div style={{ fontSize: 11, color: C.warmGrey, lineHeight: 1.6 }}>
          {sel.reason}
        </div>

        {/* Prompt guidance (only for selected) */}
        {sel.use && sel.promptGuidance && (
          <div style={{
            marginTop: 6, padding: "6px 10px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 4, borderLeft: `2px solid ${C.accent}40`,
          }}>
            <div style={{ fontSize: 9, color: C.warmGrey, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>
              Prompt guidance
            </div>
            <div style={{ fontSize: 11, color: C.accent, lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{sel.promptGuidance}&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DesignBriefPage() {
  const { reportId } = useParams();
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

      // Stop polling when brief is done
      const briefStatus = data.results?.design_brief_status;
      if (briefStatus === "complete" || briefStatus === "error") {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      setFetchErr(`Cannot reach server at ${AGENTS_URL}`);
      clearInterval(pollRef.current);
    }
  }, []);

  // Load report
  useEffect(() => {
    if (!reportId) return;
    fetchReport(reportId);
    pollRef.current = setInterval(() => fetchReport(reportId), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [reportId, fetchReport]);

  // Trigger design brief
  const handleRunBrief = async () => {
    if (!report?.id) return;
    setTriggerLoading(true);
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${report.id}/design-brief`, {
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
      alert(`Failed to start design brief: ${err.message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  const classification = report?.results?.classification ?? null;
  const brief = report?.results?.design_brief ?? null;
  const briefStatus = report?.results?.design_brief_status ?? (brief ? "complete" : "idle");
  const strategy = brief ? (STRATEGY_LABELS[brief.transformationStrategy] ?? STRATEGY_LABELS.refresh) : null;

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
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: C.dark,
        color: C.paper,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

          {/* ── Top nav ── */}
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
              Design Brief
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

          {/* ── Fetch error ── */}
          {fetchErr && !report && (
            <Card style={{ borderColor: C.terracotta + "40" }}>
              <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 8 }}>
                Connection error
              </div>
              <div style={{ fontSize: 12, color: C.warmGrey }}>{fetchErr}</div>
            </Card>
          )}

          {/* ── Loading ── */}
          {!fetchErr && !report && (
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
                  <StatusBadge status={briefStatus} />
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: C.warmGrey + "88" }}>
                  Report: {report.id}
                </div>
              </div>

              {/* ── Action bar (idle state) ── */}
              {briefStatus === "idle" && classification && (
                <Card style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: C.accent + "08", borderColor: C.accent + "30",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.paper, marginBottom: 4 }}>
                      Ready to generate design brief
                    </div>
                    <div style={{ fontSize: 11, color: C.warmGrey }}>
                      {classification.images?.length ?? 0} images classified · the brief will create a unified renovation concept
                    </div>
                  </div>
                  <button
                    onClick={handleRunBrief}
                    disabled={triggerLoading}
                    style={{
                      background: C.accent,
                      color: C.dark,
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
                    {triggerLoading ? "Starting…" : "Generate Brief"}
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

              {/* ── Running state ── */}
              {briefStatus === "running" && (
                <Card>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, color: C.warmGrey,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: C.clay, display: "inline-block",
                      animation: "pulseDot 1.2s ease-in-out infinite",
                    }} />
                    Generating design brief — assessing images, choosing strategy, defining palette…
                  </div>
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Skeleton height={60} />
                    <Skeleton height={100} />
                    <Skeleton height={80} />
                  </div>
                </Card>
              )}

              {/* ── Error state ── */}
              {briefStatus === "error" && (
                <Card style={{ borderColor: C.terracotta + "40" }}>
                  <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 8 }}>
                    Design brief error
                  </div>
                  <div style={{ fontSize: 12, color: C.warmGrey }}>
                    Something went wrong while generating the brief. Check the server logs for details.
                  </div>
                  {report.errors?.length > 0 && (
                    <ul style={{
                      marginTop: 10, paddingLeft: 16,
                      fontSize: 11, color: C.warmGrey, lineHeight: 1.7,
                    }}>
                      {report.errors.filter(e => e.includes("Design brief")).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                  {/* Allow retry */}
                  <button
                    onClick={handleRunBrief}
                    disabled={triggerLoading}
                    style={{
                      marginTop: 12,
                      background: "transparent",
                      color: C.terracotta,
                      border: `1px solid ${C.terracotta}40`,
                      borderRadius: 5,
                      padding: "8px 16px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: triggerLoading ? "wait" : "pointer",
                    }}
                  >
                    {triggerLoading ? "Starting…" : "Retry"}
                  </button>
                </Card>
              )}

              {/* ── Complete: Brief results ── */}
              {briefStatus === "complete" && brief && (
                <>
                  {/* ── Concept Statement ── */}
                  <Card style={{ borderColor: C.accent + "25" }}>
                    <SectionTitle>Concept Statement</SectionTitle>
                    <p style={{
                      fontSize: 14, color: C.paper, lineHeight: 1.8,
                      margin: 0, fontFamily: "'EB Garamond', serif",
                      fontStyle: "italic",
                    }}>
                      &ldquo;{brief.conceptStatement}&rdquo;
                    </p>
                  </Card>

                  {/* ── Strategy ── */}
                  <Card>
                    <SectionTitle>Transformation Strategy</SectionTitle>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <Badge color={strategy.color}>{strategy.label}</Badge>
                      <span style={{ fontSize: 11, color: C.warmGrey }}>{strategy.desc}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.warmGrey, lineHeight: 1.7, margin: 0 }}>
                      {brief.strategyRationale}
                    </p>
                  </Card>

                  {/* ── Design Language ── */}
                  <Card>
                    <SectionTitle>Design Language</SectionTitle>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      {/* Palette */}
                      <div>
                        <div style={{
                          fontSize: 10, color: C.warmGrey, letterSpacing: 0.8,
                          textTransform: "uppercase", marginBottom: 10,
                        }}>
                          Colour Palette
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {brief.designLanguage.palette.map((c, i) => (
                            <ColourSwatch key={i} name={c} />
                          ))}
                        </div>
                      </div>

                      {/* Materials */}
                      <div>
                        <div style={{
                          fontSize: 10, color: C.warmGrey, letterSpacing: 0.8,
                          textTransform: "uppercase", marginBottom: 10,
                        }}>
                          Materials
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {brief.designLanguage.materials.map((m, i) => (
                            <div key={i} style={{
                              fontSize: 12, color: C.paper,
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <span style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: C.accent, flexShrink: 0,
                              }} />
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Mood */}
                    <div style={{
                      marginTop: 20, padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 5,
                    }}>
                      <div style={{
                        fontSize: 10, color: C.warmGrey, letterSpacing: 0.8,
                        textTransform: "uppercase", marginBottom: 6,
                      }}>
                        Mood
                      </div>
                      <div style={{
                        fontSize: 13, color: C.paper, fontStyle: "italic",
                        fontFamily: "'EB Garamond', serif",
                      }}>
                        {brief.designLanguage.mood}
                      </div>
                    </div>

                    {/* Era Guidance */}
                    <div style={{
                      marginTop: 12, padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 5,
                    }}>
                      <div style={{
                        fontSize: 10, color: C.warmGrey, letterSpacing: 0.8,
                        textTransform: "uppercase", marginBottom: 6,
                      }}>
                        Era Guidance
                      </div>
                      <div style={{ fontSize: 12, color: C.paper, lineHeight: 1.7 }}>
                        {brief.designLanguage.eraGuidance}
                      </div>
                    </div>

                    {/* Avoid List */}
                    {brief.designLanguage.avoidList?.length > 0 && (
                      <div style={{
                        marginTop: 12, padding: "12px 14px",
                        background: C.terracotta + "08",
                        borderRadius: 5,
                        border: `1px solid ${C.terracotta}15`,
                      }}>
                        <div style={{
                          fontSize: 10, color: C.terracotta, letterSpacing: 0.8,
                          textTransform: "uppercase", marginBottom: 8,
                        }}>
                          Avoid
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {brief.designLanguage.avoidList.map((item, i) => (
                            <span key={i} style={{
                              fontSize: 11, color: C.terracotta,
                              padding: "3px 8px", borderRadius: 3,
                              background: C.terracotta + "12",
                              border: `1px solid ${C.terracotta}20`,
                            }}>
                              ✗ {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* ── Image Selections ── */}
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <SectionTitle style={{ margin: 0 }}>Image Selections</SectionTitle>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.warmGrey }}>
                        <span>
                          <strong style={{ color: C.sage }}>
                            {brief.imageSelections.filter(s => s.use).length}
                          </strong> selected
                        </span>
                        <span>
                          <strong style={{ color: C.warmGrey }}>
                            {brief.imageSelections.filter(s => !s.use).length}
                          </strong> skipped
                        </span>
                      </div>
                    </div>

                    {/* Recommended counts */}
                    <div style={{
                      display: "flex", gap: 16, fontSize: 11, color: C.warmGrey,
                      marginBottom: 14, padding: "8px 12px",
                      background: "rgba(255,255,255,0.02)", borderRadius: 4,
                    }}>
                      <span>Recommended: <strong style={{ color: C.paper }}>{brief.recommendedCount.total}</strong> images</span>
                      <span><strong style={{ color: C.paper }}>{brief.recommendedCount.exteriors}</strong> ext</span>
                      <span><strong style={{ color: C.paper }}>{brief.recommendedCount.interiors}</strong> int</span>
                    </div>

                    {/* Selected images first */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {brief.imageSelections
                        .filter(s => s.use)
                        .map((sel, i) => (
                          <ImageSelectionRow
                            key={`sel-${sel.index}`}
                            sel={sel}
                            classifiedImage={classification?.images?.find(img => img.index === sel.index)}
                          />
                        ))
                      }
                    </div>

                    {/* Skipped images (collapsible) */}
                    {brief.imageSelections.filter(s => !s.use).length > 0 && (
                      <details style={{ marginTop: 12 }}>
                        <summary style={{
                          cursor: "pointer", fontSize: 10, color: C.warmGrey,
                          letterSpacing: 0.5, userSelect: "none",
                          padding: "6px 0",
                        }}>
                          {brief.imageSelections.filter(s => !s.use).length} skipped images
                        </summary>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                          {brief.imageSelections
                            .filter(s => !s.use)
                            .map((sel, i) => (
                              <ImageSelectionRow
                                key={`skip-${sel.index}`}
                                sel={sel}
                                classifiedImage={classification?.images?.find(img => img.index === sel.index)}
                              />
                            ))
                          }
                        </div>
                      </details>
                    )}
                  </Card>

                  {/* ── Next step: Go to visualiser ── */}
                  <Card style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: C.sage + "10", borderColor: C.sage + "30",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.paper, marginBottom: 4 }}>
                        Brief ready — run the visualiser
                      </div>
                      <div style={{ fontSize: 11, color: C.warmGrey }}>
                        The visualiser will follow this brief's palette, materials, and image selections.
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `/agents/visualiser/${report.id}`}
                      style={{
                        background: C.sage,
                        color: "#fff",
                        border: "none",
                        borderRadius: 5,
                        padding: "10px 20px",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Open Visualiser →
                    </button>
                  </Card>
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
