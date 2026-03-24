"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/theme";

const AGENTS_URL = "http://localhost:3001";

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
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: 3,
      background: color + "18", border: `1px solid ${color}30`,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.3,
      color, textTransform: "uppercase",
    }}>
      {children}
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

export default function VisualiserIndexPage() {
  const router = useRouter();
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${AGENTS_URL}/reports`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — is piega-agents running on port 3001?`);
        return r.json();
      })
      .then(setReports)
      .catch(err => setError(err.message));
  }, []);

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:.9} }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{
        minHeight: "100vh", background: C.dark, color: C.paper,
        fontFamily: "Inter, system-ui, sans-serif", padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
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

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(28px,4vw,38px)", fontWeight: 400,
              color: C.paper, margin: "0 0 8px",
            }}>
              Pick a classified report
            </h1>
            <p style={{ fontSize: 13, color: C.warmGrey, margin: 0, lineHeight: 1.6 }}>
              Select a property below to generate renovation visualisations.
              The classifier must have run first.
            </p>
          </div>

          {/* Error */}
          {error && (
            <Card style={{ borderColor: C.terracotta + "40" }}>
              <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 6 }}>
                Cannot load reports
              </div>
              <div style={{ fontSize: 12, color: C.warmGrey }}>{error}</div>
            </Card>
          )}

          {/* Loading */}
          {!error && !reports && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={68} />)}
            </div>
          )}

          {/* Empty */}
          {reports?.length === 0 && (
            <Card>
              <div style={{ fontSize: 13, color: C.warmGrey, textAlign: "center", padding: "24px 0" }}>
                No classified reports found.<br />
                <span style={{ fontSize: 11 }}>
                  Use the Chrome extension on a Rightmove listing to create one.
                </span>
              </div>
            </Card>
          )}

          {/* Report list */}
          {reports?.length > 0 && (
            <div>
              <SectionTitle>{reports.length} classified report{reports.length !== 1 ? "s" : ""}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                      onClick={() => router.push(`/visualiser/${r.id}`)}
                      style={{
                        background: C.darkCard,
                        border: `1px solid ${C.bd}`,
                        borderRadius: 6,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "60"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.paper, marginBottom: 5 }}>
                            {listing.address ?? `Listing ${listing.listingId ?? r.listing_id}`}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {price && (
                              <span style={{ fontSize: 12, color: C.clay, fontWeight: 500 }}>{price}</span>
                            )}
                            {arch && <Badge color={C.accent}>{arch.displayName}</Badge>}
                            <span style={{ fontSize: 10, color: C.warmGrey }}>
                              {imgCount} image{imgCount !== 1 ? "s" : ""} classified
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                          {hasVis
                            ? <Badge color={C.sage}>Visualised ↗</Badge>
                            : <Badge color={C.warmGrey}>Ready</Badge>
                          }
                          <span style={{ fontSize: 9, color: C.warmGrey + "88" }}>
                            {new Date(r.created_at).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
