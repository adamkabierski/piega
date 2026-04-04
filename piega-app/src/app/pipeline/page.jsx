"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/theme";
import { AGENTS_URL } from "@/lib/config";

// ─── Shared small components ────────────────────────────────────────────────

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

// ─── Pipeline progress mini-bar ─────────────────────────────────────────────

function PipelineProgress({ results }) {
  const keys = ["classification", "design_brief", "renovation_visualisation", "cost_estimate"];
  const done = keys.filter((k) => results?.[k]).length;
  const total = keys.length;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 2,
        background: "rgba(255,255,255,0.06)", overflow: "hidden",
      }}>
        <div style={{
          width: `${(done / total) * 100}%`, height: "100%",
          borderRadius: 2, transition: "width 0.3s ease",
          background: done === total ? C.sage : done === 0 ? C.warmGrey + "40" : C.accent,
        }} />
      </div>
      <span style={{ fontSize: 10, color: done === total ? C.sage : C.warmGrey, fontWeight: 600 }}>
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelineIndexPage() {
  const router = useRouter();
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({}); // reportId → "deleting" | "relaunching"

  function loadReports() {
    fetch(`${AGENTS_URL}/reports?all=1`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — is piega-agents running on port 4711?`);
        return r.json();
      })
      .then(setReports)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleDelete(e, reportId) {
    e.stopPropagation();
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setBusy((b) => ({ ...b, [reportId]: "deleting" }));
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[reportId]; return n; });
    }
  }

  async function handleRelaunch(e, reportId) {
    e.stopPropagation();
    if (!confirm("Relaunch from scratch? All agent results will be wiped and the pipeline will restart.")) return;
    setBusy((b) => ({ ...b, [reportId]: "relaunching" }));
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}/relaunch`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh the list after a brief pause so the server has reset the row
      setTimeout(() => { loadReports(); setBusy((b) => { const n = { ...b }; delete n[reportId]; return n; }); }, 800);
    } catch (err) {
      alert(`Relaunch failed: ${err.message}`);
      setBusy((b) => { const n = { ...b }; delete n[reportId]; return n; });
    }
  }

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
            <Link href="/" style={{ textDecoration: "none" }}>
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
              Pipeline
            </span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(28px,4vw,38px)", fontWeight: 400,
              color: C.paper, margin: "0 0 8px",
            }}>
              Your reports
            </h1>
            <p style={{ fontSize: 13, color: C.warmGrey, margin: 0, lineHeight: 1.6 }}>
              Select a property to manage its agent pipeline — run agents, view results, re-run steps.
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
              {[1, 2, 3].map((i) => <Skeleton key={i} height={80} />)}
            </div>
          )}

          {/* Empty */}
          {reports?.length === 0 && (
            <Card>
              <div style={{ fontSize: 13, color: C.warmGrey, textAlign: "center", padding: "24px 0" }}>
                No reports found.<br />
                <span style={{ fontSize: 11 }}>
                  Use the Chrome extension on a Rightmove listing to create one.
                </span>
              </div>
            </Card>
          )}

          {/* Report list */}
          {reports?.length > 0 && (
            <div>
              <SectionTitle>
                {reports.length} report{reports.length !== 1 ? "s" : ""}
              </SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reports.map((r) => {
                  const listing = r.listing ?? {};
                  const arch = r.results?.classification?.archetype;
                  const imgCount = r.results?.classification?.images?.length ?? 0;
                  const price = listing.askingPrice
                    ? `£${Number(listing.askingPrice).toLocaleString("en-GB")}`
                    : null;

                  return (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/pipeline/${r.id}`)}
                      style={{
                        background: C.darkCard,
                        border: `1px solid ${C.bd}`,
                        borderRadius: 6,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                        opacity: busy[r.id] ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "60")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.bd)}
                    >
                      <div style={{
                        display: "flex", alignItems: "flex-start",
                        justifyContent: "space-between", gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600, color: C.paper, marginBottom: 5,
                          }}>
                            {listing.address ?? `Listing ${listing.listingId ?? r.listing_id}`}
                          </div>
                          <div style={{
                            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
                          }}>
                            {price && (
                              <span style={{ fontSize: 12, color: C.clay, fontWeight: 500 }}>
                                {price}
                              </span>
                            )}
                            {arch && <Badge color={C.accent}>{arch.displayName}</Badge>}
                            {imgCount > 0 && (
                              <span style={{ fontSize: 10, color: C.warmGrey }}>
                                {imgCount} image{imgCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "flex-end", gap: 6, flexShrink: 0,
                        }}>
                          <PipelineProgress results={r.results} />
                          <span style={{ fontSize: 9, color: C.warmGrey + "88" }}>
                            {new Date(r.created_at).toLocaleDateString("en-GB")}
                          </span>
                          {/* Actions */}
                          <div style={{ display: "flex", gap: 6, marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={!!busy[r.id]}
                              onClick={(e) => handleRelaunch(e, r.id)}
                              style={{
                                fontSize: 10, padding: "3px 8px", borderRadius: 3,
                                background: "transparent", border: `1px solid ${C.accent}50`,
                                color: C.accent, cursor: "pointer", letterSpacing: 0.4,
                                opacity: busy[r.id] === "relaunching" ? 0.5 : 1,
                              }}
                            >
                              {busy[r.id] === "relaunching" ? "Relaunching…" : "Relaunch ↺"}
                            </button>
                            <button
                              disabled={!!busy[r.id]}
                              onClick={(e) => handleDelete(e, r.id)}
                              style={{
                                fontSize: 10, padding: "3px 8px", borderRadius: 3,
                                background: "transparent", border: `1px solid ${C.terracotta}40`,
                                color: C.terracotta, cursor: "pointer", letterSpacing: 0.4,
                                opacity: busy[r.id] === "deleting" ? 0.5 : 1,
                              }}
                            >
                              {busy[r.id] === "deleting" ? "Deleting…" : "Delete"}
                            </button>
                          </div>
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
