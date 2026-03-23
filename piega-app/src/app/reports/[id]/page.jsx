"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { C } from "@/lib/theme";

// ─── Constants ──────────────────────────────────────────────────────────────
const AGENTS_URL = "http://localhost:3001";
const POLL_INTERVAL_MS = 3000;

// ─── Tiny utility components ─────────────────────────────────────────────────

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
    pending:  { color: C.warmGrey,   label: "Pending",  dot: true },
    running:  { color: C.clay,       label: "Running",  dot: true, pulse: true },
    complete: { color: C.sage,       label: "Complete", dot: true },
    error:    { color: C.terracotta, label: "Error",    dot: true },
  };
  const cfg = map[status] ?? map.pending;

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

function Card({ children, style }) {
  return (
    <div style={{
      background: "#232019", border: `1px solid ${C.bd}`,
      borderRadius: 6, padding: "20px 20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct >= 85 ? C.sage : pct >= 60 ? C.clay : C.terracotta;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 2,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color, borderRadius: 2,
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ─── Archetype block ──────────────────────────────────────────────────────────
function ArchetypeCard({ classification }) {
  const arch = classification?.archetype;
  if (!arch) return null;

  return (
    <Card>
      <SectionTitle>Archetype</SectionTitle>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.paper, marginBottom: 4 }}>
        {arch.displayName}
      </div>
      <div style={{ fontSize: 12, color: C.warmGrey, marginBottom: 14 }}>
        {arch.era}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.warmGrey, marginBottom: 6 }}>Confidence</div>
        <ConfidenceBar score={arch.confidenceScore} />
      </div>

      {arch.constructionType && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.warmGrey, marginBottom: 5 }}>Construction</div>
          <div style={{ fontSize: 12, color: C.accent }}>{arch.constructionType}</div>
        </div>
      )}

      {arch.typicalCharacteristics?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.warmGrey, marginBottom: 8 }}>Typical characteristics</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {arch.typicalCharacteristics.map((c, i) => (
              <Badge key={i} color={C.accent}>{c}</Badge>
            ))}
          </div>
        </div>
      )}

      {classification.summary && (
        <div style={{
          marginTop: 16, paddingTop: 16,
          borderTop: `1px solid ${C.bd}`,
          fontSize: 12, color: C.warmGrey, lineHeight: 1.7,
          fontStyle: "italic",
        }}>
          "{classification.summary}"
        </div>
      )}
    </Card>
  );
}

// ─── Image grid ───────────────────────────────────────────────────────────────

const DEPICTS_LABELS = {
  front_exterior: "Front Exterior",
  rear_exterior:  "Rear Exterior",
  side_exterior:  "Side Exterior",
  street_view:    "Street View",
  living_room:    "Living Room",
  kitchen:        "Kitchen",
  bedroom:        "Bedroom",
  bathroom:       "Bathroom",
  wc:             "WC",
  garden_rear:    "Rear Garden",
  garden_front:   "Front Garden",
  garage:         "Garage",
  hallway:        "Hallway",
  floorplan:      "Floorplan",
  other:          "Other",
};

const USEFULNESS_COLOR = {
  high:   C.sage,
  medium: C.clay,
  low:    C.warmGrey,
};

function ImageTile({ img }) {
  const cls = img.classification;
  const label = DEPICTS_LABELS[cls?.depicts] ?? cls?.depicts ?? "—";
  const usefulColor = USEFULNESS_COLOR[cls?.usefulness] ?? C.warmGrey;

  return (
    <div style={{
      background: "#1e1c19",
      border: `1px solid ${C.bd}`,
      borderRadius: 5, overflow: "hidden",
    }}>
      {/* Image */}
      <div style={{ position: "relative", paddingTop: "66%", background: "#141210" }}>
        {img.url ? (
          <img
            src={img.url}
            alt={label}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
            }}
            loading="lazy"
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.warmGrey, fontSize: 10,
          }}>
            No image
          </div>
        )}
        {/* Usefulness dot */}
        <div style={{
          position: "absolute", top: 6, right: 6,
          width: 7, height: 7, borderRadius: "50%",
          background: usefulColor,
          boxShadow: `0 0 0 2px #141210`,
        }} />
      </div>

      {/* Meta */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.paper, marginBottom: 3 }}>
          {label}
        </div>
        {cls?.room && (
          <div style={{ fontSize: 10, color: C.warmGrey, marginBottom: 4 }}>
            {cls.room}
          </div>
        )}
        {cls?.observations?.length > 0 && (
          <ul style={{
            margin: "6px 0 0", paddingLeft: 12,
            fontSize: 10, color: C.warmGrey, lineHeight: 1.6,
          }}>
            {cls.observations.slice(0, 4).map((obs, i) => (
              <li key={i}>{obs}</li>
            ))}
            {cls.observations.length > 4 && (
              <li style={{ color: C.accentDark }}>+{cls.observations.length - 4} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function ImagesGrid({ images }) {
  if (!images?.length) return null;

  return (
    <Card style={{ padding: "20px 20px" }}>
      <SectionTitle>Image Analysis · {images.length} images</SectionTitle>
      <div style={{ display: "flex", gap: 6, fontSize: 10, color: C.warmGrey, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.sage, display: "inline-block" }} />
          High usefulness
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.clay, display: "inline-block" }} />
          Medium
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.warmGrey, display: "inline-block" }} />
          Low
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 10,
      }}>
        {images.map((img, i) => (
          <ImageTile key={i} img={img} />
        ))}
      </div>
    </Card>
  );
}

// ─── Listing header ───────────────────────────────────────────────────────────
function ListingHeader({ listing, status, reportId }) {
  if (!listing) return null;

  const price = listing.askingPrice
    ? `£${Number(listing.askingPrice).toLocaleString("en-GB")}`
    : null;
  const beds  = listing.bedrooms  ? `${listing.bedrooms} bed` : null;
  const baths = listing.bathrooms ? `${listing.bathrooms} bath` : null;

  return (
    <div style={{
      borderBottom: `1px solid ${C.bd}`,
      paddingBottom: 20, marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.paper, marginBottom: 6 }}>
            {listing.address ?? `Listing ${listing.listingId}`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {price && <span style={{ fontSize: 16, color: C.clay, fontWeight: 600 }}>{price}</span>}
            {[beds, baths, listing.propertyType].filter(Boolean).map((v, i) => (
              <span key={i} style={{ fontSize: 13, color: C.warmGrey }}>· {v}</span>
            ))}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.warmGrey + "88" }}>
        Report ID: {reportId}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
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

function RunningState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <Skeleton height={28} width="60%" style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="25%" style={{ marginBottom: 20 }} />
        <Skeleton height={8} style={{ marginBottom: 16 }} />
        <Skeleton height={40} />
      </Card>
      <Card>
        <Skeleton height={14} width="30%" style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i}>
              <Skeleton height={110} style={{ marginBottom: 6 }} />
              <Skeleton height={12} width="70%" style={{ marginBottom: 4 }} />
              <Skeleton height={10} width="50%" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────
function ErrorState({ errors, reportId }) {
  return (
    <Card style={{ borderColor: C.terracotta + "40" }}>
      <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 12 }}>
        Pipeline error
      </div>
      {errors?.length > 0 && (
        <ul style={{ paddingLeft: 16, color: C.warmGrey, fontSize: 12, lineHeight: 1.7 }}>
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {!errors?.length && (
        <div style={{ fontSize: 12, color: C.warmGrey }}>
          No error details available.
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ReportDebugPage() {
  const { id } = useParams();
  const [report, setReport]   = useState(null);
  const [fetchErr, setFetchErr] = useState(null);
  const pollRef = useRef(null);

  // Fetch + start polling
  useEffect(() => {
    if (!id) return;

    async function fetchReport() {
      try {
        const res = await fetch(`${AGENTS_URL}/reports/${id}`);
        if (!res.ok) {
          setFetchErr(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        setReport(data);

        // Stop polling when terminal state
        if (data.status === "complete" || data.status === "error") {
          clearInterval(pollRef.current);
        }
      } catch (err) {
        setFetchErr(`Cannot reach server at ${AGENTS_URL} — is piega-agents running?`);
        clearInterval(pollRef.current);
      }
    }

    fetchReport(); // immediate
    pollRef.current = setInterval(fetchReport, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const classification = report?.results?.classification ?? null;

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
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

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
              Classifier Debug
            </span>
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

          {/* ── Loading (no data yet) ── */}
          {!fetchErr && !report && (
            <div>
              <Skeleton height={30} width="50%" style={{ marginBottom: 8 }} />
              <Skeleton height={18} width="30%" style={{ marginBottom: 32 }} />
              <RunningState />
            </div>
          )}

          {/* ── Report loaded ── */}
          {report && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <ListingHeader
                listing={report.listing}
                status={report.status}
                reportId={report.id}
              />

              {/* Pipeline running — show skeleton */}
              {(report.status === "pending" || report.status === "running") && !classification && (
                <div>
                  <div style={{
                    fontSize: 12, color: C.warmGrey,
                    marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: C.clay, display: "inline-block",
                      animation: "pulseDot 1.2s ease-in-out infinite",
                    }} />
                    Classifier running — analysing {report.listing?.imageCount ?? "—"} images…
                  </div>
                  <RunningState />
                </div>
              )}

              {/* Error state */}
              {report.status === "error" && (
                <ErrorState errors={report.errors} reportId={report.id} />
              )}

              {/* Classification result */}
              {classification && (
                <>
                  <ArchetypeCard classification={classification} />
                  <ImagesGrid images={classification.images} />
                </>
              )}

              {/* Raw JSON debug toggle */}
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
