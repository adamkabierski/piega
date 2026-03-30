"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/theme";

const AGENTS_URL = "http://localhost:4711";
const POLL_MS = 3000;

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE AGENT DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const PIPELINE = [
  {
    id: "extension",
    label: "Chrome Extension",
    icon: "◈",
    brief: "Listing data ingested from Rightmove",
    resultKey: null,
    triggerPath: null,
    detailHref: null,
    deps: [],
    group: "seq",
  },
  {
    id: "classifier",
    label: "Classifier",
    icon: "◉",
    brief: "Archetype identification + image analysis",
    resultKey: "classification",
    triggerPath: null,
    detailHref: (id) => `/agents/classifier/${id}`,
    deps: [],
    auto: true,
    group: "seq",
  },
  {
    id: "design_brief",
    label: "Design Brief",
    icon: "◉",
    brief: "Renovation concept — palette, materials, mood",
    resultKey: "design_brief",
    triggerPath: (id) => `/reports/${id}/design-brief`,
    detailHref: (id) => `/agents/design-brief/${id}`,
    deps: ["classification"],
    group: "seq",
  },
  {
    id: "visualiser",
    label: "Renovation Visualiser",
    icon: "◉",
    brief: "AI-generated renovation photographs",
    resultKey: "renovation_visualisation",
    triggerPath: (id) => `/reports/${id}/visualise`,
    detailHref: (id) => `/agents/visualiser/${id}`,
    deps: ["classification"],
    group: "par",
  },
  {
    id: "cost_estimator",
    label: "Cost Estimator",
    icon: "◉",
    brief: "Budget breakdown + price gap analysis",
    resultKey: "cost_estimate",
    triggerPath: (id) => `/reports/${id}/cost-estimate`,
    detailHref: (id) => `/agents/cost-estimate/${id}`,
    deps: ["classification", "design_brief"],
    group: "par",
  },
  {
    id: "video_facade",
    label: "Video Facade",
    icon: "◉",
    brief: "4-second exterior transformation video",
    resultKey: "video_facade",
    triggerPath: (id) => `/reports/${id}/video-facade`,
    detailHref: null,
    deps: ["renovation_visualisation"],
    group: "par",
  },
  {
    id: "narrative_writer",
    label: "Narrative Writer",
    icon: "◉",
    brief: "Editorial glue — opening hook, honest layer, transitions, closing",
    resultKey: "narrative",
    triggerPath: (id) => `/reports/${id}/narrative`,
    detailHref: (id) => `/agents/narrative/${id}`,
    deps: ["classification", "design_brief", "cost_estimate"],
    group: "post",
  },
];

const SEQ = PIPELINE.filter((a) => a.group === "seq");
const PAR = PIPELINE.filter((a) => a.group === "par");
const POST = PIPELINE.filter((a) => a.group === "post");

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUS = {
  complete: { color: C.sage, bg: C.sage + "14", border: C.sage + "35", label: "Complete", pulse: false },
  running:  { color: C.clay, bg: C.clay + "14", border: C.clay + "35", label: "Running",  pulse: true  },
  idle:     { color: C.accent, bg: C.accent + "14", border: C.accent + "35", label: "Ready", pulse: false },
  locked:   { color: C.warmGrey, bg: "rgba(255,255,255,0.02)", border: C.bd, label: "Waiting", pulse: false },
  loading:  { color: C.warmGrey, bg: "rgba(255,255,255,0.02)", border: C.bd, label: "—",       pulse: false },
};

function getStatus(agent, report, running) {
  if (!report) return "loading";
  if (agent.id === "extension") return "complete";
  if (agent.resultKey && report.results?.[agent.resultKey]) return "complete";
  if (running.has(agent.id)) return "running";
  if (agent.id === "cost_estimator" && report.results?.cost_estimate_status === "running") return "running";
  if (agent.id === "narrative_writer" && report.results?.narrative_status === "running") return "running";
  if (agent.id === "video_facade" && report.results?.video_facade_status === "running") return "running";
  if (agent.auto && ["pending", "running"].includes(report.status) && !report.results?.[agent.resultKey]) return "running";
  if (!agent.deps.every((k) => report.results?.[k])) return "locked";
  return "idle";
}

function getSummary(agent, report) {
  const r = report?.results;
  if (!r) return null;

  switch (agent.id) {
    case "extension":
      return report.listing?.address ?? null;
    case "classifier": {
      const c = r.classification;
      if (!c) return null;
      const n = c.images?.length ?? 0;
      return `${c.archetype?.displayName ?? "Classified"} · ${n} image${n !== 1 ? "s" : ""}`;
    }
    case "design_brief": {
      const b = r.design_brief;
      if (!b?.conceptStatement) return null;
      const s = b.conceptStatement;
      return s.length > 90 ? s.slice(0, 87) + "…" : s;
    }
    case "visualiser": {
      const v = r.renovation_visualisation;
      if (!v) return null;
      const e = v.exteriors?.length ?? 0;
      const i = v.interiors?.length ?? 0;
      return `${e} exterior${e !== 1 ? "s" : ""}, ${i} interior${i !== 1 ? "s" : ""}`;
    }
    case "cost_estimator": {
      const ce = r.cost_estimate;
      if (!ce) return null;
      const { low, high } = ce.totalEnvelope ?? {};
      if (low && high) return `£${Math.round(low / 1000)}k – £${Math.round(high / 1000)}k estimated`;
      return "Estimate complete";
    }
    case "narrative_writer": {
      const n = r.narrative;
      if (!n?.openingHook) return null;
      const s = n.openingHook;
      return s.length > 100 ? s.slice(0, 97) + "…" : s;
    }
    case "video_facade": {
      const vf = r.video_facade;
      if (!vf?.videoUrl) return null;
      return `${vf.durationSeconds ?? 4}s facade video · ${vf.resolution ?? "720p"}`;
    }
    default:
      return null;
  }
}

function getLockedReason(agent, report) {
  if (!report) return "";
  const labels = { classification: "Classifier", design_brief: "Design Brief", cost_estimate: "Cost Estimator", narrative: "Narrative Writer", renovation_visualisation: "Visualiser" };
  return agent.deps
    .filter((k) => !report.results?.[k])
    .map((k) => labels[k] ?? k)
    .join(" + ");
}

/* ── Cost Helpers ── */

const COST_KEYS = {
  classifier: ["classifier", "architectural_reading"],
  design_brief: ["design_brief"],
  visualiser: ["renovation_visualiser"],
  cost_estimator: ["cost_estimator"],
  narrative_writer: ["narrative_writer"],
  video_facade: ["video_facade"],
};

function getAgentCost(agent, report) {
  const costs = report?.results?.pipeline_costs;
  if (!costs) return null;
  const keys = COST_KEYS[agent.id];
  if (!keys) return null;
  let total = 0;
  let found = false;
  for (const k of keys) {
    const c = costs[k];
    if (c?.cost != null) { total += c.cost; found = true; }
  }
  return found ? total : null;
}

function getTotalPipelineCost(report) {
  const costs = report?.results?.pipeline_costs;
  if (!costs) return null;
  let total = 0;
  let found = false;
  for (const v of Object.values(costs)) {
    if (v?.cost != null) { total += v.cost; found = true; }
  }
  return found ? total : null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.loading;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 4,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
      color: s.color, textTransform: "uppercase",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: s.color,
        opacity: status === "locked" ? 0.4 : 1,
        animation: s.pulse ? "pulseDot 1.2s ease-in-out infinite" : "none",
      }} />
      {s.label}
    </span>
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

function CostBadge({ cost }) {
  if (cost == null) return null;
  const fmt = cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
  return (
    <span style={{
      fontSize: 10,
      fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
      color: C.accent,
      opacity: 0.5,
      letterSpacing: -0.3,
    }}>
      {fmt}
    </span>
  );
}

function Connector() {
  return (
    <div style={{
      width: 2, height: 28,
      background: C.accent + "25",
      margin: "0 auto",
      borderRadius: 1,
    }} />
  );
}

function ForkConnector() {
  const line = C.accent + "25";
  return (
    <div style={{ position: "relative", height: 36, margin: "0 40px" }}>
      {/* Center vertical from top */}
      <div style={{
        position: "absolute", left: "50%", top: 0,
        width: 2, height: 14, background: line,
        transform: "translateX(-50%)",
      }} />
      {/* Horizontal bar */}
      <div style={{
        position: "absolute", left: "25%", top: 14,
        width: "50%", height: 2, background: line,
      }} />
      {/* Left vertical drop */}
      <div style={{
        position: "absolute", left: "25%", top: 14,
        width: 2, height: 22, background: line,
      }} />
      {/* Right vertical drop */}
      <div style={{
        position: "absolute", left: "75%", top: 14,
        width: 2, height: 22, background: line,
        transform: "translateX(-2px)",
      }} />
    </div>
  );
}

function Skeleton({ h = 20, w = "100%" }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 4,
      background: "rgba(255,255,255,0.04)",
      animation: "shimmer 1.5s ease-in-out infinite",
    }} />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGENT CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function AgentCard({ agent, report, status, onTrigger, triggerError }) {
  const s = STATUS[status] ?? STATUS.loading;
  const summary = getSummary(agent, report);
  const locked = status === "locked" ? getLockedReason(agent, report) : null;
  const reportId = report?.id;
  const canTrigger = agent.triggerPath && (status === "idle" || status === "complete");
  const detailHref = agent.detailHref && status === "complete" ? agent.detailHref(reportId) : null;
  const agentCost = getAgentCost(agent, report);

  return (
    <div style={{
      background: status === "locked" ? "#1c1a17" : C.darkCard,
      border: `1px solid ${status === "locked" ? C.bd : s.border}`,
      borderRadius: 8,
      padding: "18px 20px",
      opacity: status === "locked" ? 0.65 : 1,
      transition: "opacity 0.2s, border-color 0.2s",
    }}>
      {/* Top row: icon + name + cost badge + status badge */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 16, color: s.color,
            opacity: status === "locked" ? 0.4 : 1,
          }}>
            {agent.icon}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.paper }}>
            {agent.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CostBadge cost={agentCost} />
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12, color: C.warmGrey, lineHeight: 1.5,
        marginBottom: summary || canTrigger || detailHref || locked ? 10 : 0,
      }}>
        {agent.brief}
      </div>

      {/* Summary (when complete) */}
      {summary && status === "complete" && (
        <div style={{
          fontSize: 12, color: C.accent, lineHeight: 1.6,
          padding: "8px 12px", borderRadius: 4,
          background: C.accent + "08",
          marginBottom: canTrigger || detailHref ? 12 : 0,
        }}>
          {summary}
        </div>
      )}

      {/* Locked reason */}
      {locked && (
        <div style={{ fontSize: 11, color: C.warmGrey + "88", marginTop: 2 }}>
          Waiting for {locked}
        </div>
      )}

      {/* Running indicator */}
      {status === "running" && (
        <div style={{
          fontSize: 12, color: C.clay,
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: C.clay,
            animation: "pulseDot 1.2s ease-in-out infinite",
          }} />
          Processing…
        </div>
      )}

      {/* Trigger error */}
      {triggerError && (
        <div style={{
          fontSize: 11, color: C.terracotta, marginTop: 8,
          padding: "6px 10px", borderRadius: 4,
          background: C.terracotta + "10",
          border: `1px solid ${C.terracotta}25`,
        }}>
          {triggerError}
        </div>
      )}

      {/* Action buttons */}
      {(canTrigger || detailHref) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {detailHref && (
            <Link href={detailHref} style={{
              fontSize: 11, fontWeight: 600, color: C.sage,
              padding: "5px 12px", borderRadius: 4,
              background: C.sage + "12", border: `1px solid ${C.sage}25`,
              textDecoration: "none",
              transition: "background 0.15s",
            }}>
              View Results →
            </Link>
          )}
          {canTrigger && (
            <button
              onClick={() => onTrigger(agent)}
              style={{
                fontSize: 11, fontWeight: 600,
                color: status === "complete" ? C.warmGrey : C.accent,
                padding: "5px 12px", borderRadius: 4,
                background: status === "complete" ? "transparent" : C.accent + "12",
                border: `1px solid ${status === "complete" ? C.bd : C.accent + "25"}`,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {status === "complete" ? "Re-run ↻" : "Run ▶"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROPERTY HEADER
   ═══════════════════════════════════════════════════════════════════════════ */

function PropertyHeader({ report }) {
  if (!report) return null;

  const listing = report.listing ?? {};
  const arch = report.results?.classification?.archetype;
  const price = listing.askingPrice
    ? `£${Number(listing.askingPrice).toLocaleString("en-GB")}`
    : null;
  const meta = [
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.propertyType,
  ].filter(Boolean);

  // Pipeline progress
  const total = PIPELINE.filter((a) => a.resultKey).length;
  const done = PIPELINE.filter(
    (a) => a.resultKey && report.results?.[a.resultKey]
  ).length;

  return (
    <div style={{
      background: C.darkCard, border: `1px solid ${C.bd}`,
      borderRadius: 8, padding: "20px 24px", marginBottom: 28,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: 16,
      }}>
        <div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 400,
            color: C.paper, margin: "0 0 6px",
          }}>
            {listing.address ?? `Report ${report.id.slice(0, 8)}…`}
          </h2>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8,
            alignItems: "center",
          }}>
            {price && (
              <span style={{ fontSize: 16, color: C.clay, fontWeight: 600 }}>
                {price}
              </span>
            )}
            {meta.map((v, i) => (
              <span key={i} style={{ fontSize: 13, color: C.warmGrey }}>
                · {v}
              </span>
            ))}
            {arch && <Badge color={C.accent}>{arch.displayName}</Badge>}
          </div>
        </div>

        {/* Progress counter + total cost */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", flexShrink: 0,
        }}>
          <div style={{
            fontSize: 20, fontWeight: 700,
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: 1,
            color: done === total ? C.sage : C.accent,
          }}>
            {done}/{total}
          </div>
          <div style={{
            fontSize: 9, color: C.warmGrey,
            letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            Agents done
          </div>
          {(() => {
            const tc = getTotalPipelineCost(report);
            if (tc == null) return null;
            return (
              <div style={{
                marginTop: 6, fontSize: 10,
                fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                color: C.warmGrey, opacity: 0.6,
                letterSpacing: -0.3,
              }}>
                ${tc < 0.01 ? tc.toFixed(4) : tc.toFixed(2)} total
              </div>
            );
          })()}
        </div>
      </div>

      {/* Report ID */}
      <div style={{ marginTop: 10, fontSize: 10, color: C.warmGrey + "88" }}>
        Report ID: {report.id}
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: 10, height: 3, borderRadius: 2,
        background: "rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${(done / total) * 100}%`,
          height: "100%", borderRadius: 2,
          background: done === total ? C.sage : C.accent,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PipelineHubPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(new Set());
  const [triggerErrors, setTriggerErrors] = useState({});
  const pollRef = useRef(null);

  /* ── Fetch + poll ── */
  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`${AGENTS_URL}/reports/${reportId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);

      // Clear running flags for agents that now have results
      setRunning((prev) => {
        const next = new Set(prev);
        for (const a of PIPELINE) {
          if (a.resultKey && data.results?.[a.resultKey]) next.delete(a.id);
        }
        return next.size === prev.size ? prev : next;
      });
    } catch (err) {
      setError(err.message);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
    pollRef.current = setInterval(fetchReport, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchReport]);

  /* ── Trigger an agent ── */
  const trigger = useCallback(
    async (agent) => {
      if (!agent.triggerPath || !reportId) return;

      // Clear previous error
      setTriggerErrors((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });

      try {
        const url = `${AGENTS_URL}${agent.triggerPath(reportId)}`;
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) {
          const body = await res
            .json()
            .catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setRunning((prev) => new Set(prev).add(agent.id));
      } catch (err) {
        setTriggerErrors((prev) => ({ ...prev, [agent.id]: err.message }));
      }
    },
    [reportId]
  );

  return (
    <>
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes shimmer  { 0%,100%{opacity:.5} 50%{opacity:.9} }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: C.dark, color: C.paper,
        fontFamily: "Inter, system-ui, sans-serif", padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* ── Nav ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 32,
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
              Pipeline Hub
            </span>
            <div style={{ marginLeft: "auto" }}>
              <Link href="/pipeline" style={{
                fontSize: 11, color: C.warmGrey, textDecoration: "none",
                padding: "4px 10px", borderRadius: 3,
                border: `1px solid ${C.bd}`,
              }}>
                ← All Reports
              </Link>
            </div>
          </div>

          {/* ── Error ── */}
          {error && !report && (
            <div style={{
              background: C.darkCard, border: `1px solid ${C.terracotta}40`,
              borderRadius: 6, padding: 20,
            }}>
              <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 6 }}>
                Cannot load report
              </div>
              <div style={{ fontSize: 12, color: C.warmGrey }}>{error}</div>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {!error && !report && (
            <div>
              <Skeleton h={130} />
              <div style={{ marginTop: 20 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <Skeleton h={95} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Report loaded ── */}
          {report && (
            <>
              <PropertyHeader report={report} />

              {/* Pipeline section header */}
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                color: C.warmGrey, textTransform: "uppercase",
                marginBottom: 16,
              }}>
                Agent Pipeline
              </div>

              {/* Sequential agents */}
              {SEQ.map((agent, i) => (
                <div key={agent.id}>
                  {i > 0 && <Connector />}
                  <AgentCard
                    agent={agent}
                    report={report}
                    status={getStatus(agent, report, running)}
                    onTrigger={trigger}
                    triggerError={triggerErrors[agent.id]}
                  />
                </div>
              ))}

              {/* Fork to parallel agents */}
              <ForkConnector />

              {/* Parallel agents */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}>
                {PAR.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    report={report}
                    status={getStatus(agent, report, running)}
                    onTrigger={trigger}
                    triggerError={triggerErrors[agent.id]}
                  />
                ))}
              </div>

              {/* Rejoin connector + post-parallel agents */}
              {POST.length > 0 && (
                <>
                  <Connector />
                  {POST.map((agent, i) => (
                    <div key={agent.id}>
                      {i > 0 && <Connector />}
                      <AgentCard
                        agent={agent}
                        report={report}
                        status={getStatus(agent, report, running)}
                        onTrigger={trigger}
                        triggerError={triggerErrors[agent.id]}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* View Report link (when narrative is done) */}
              {report.results?.narrative && (
                <div style={{ textAlign: "center", marginTop: 24 }}>
                  <Link
                    href={`/report/${report.id}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      fontSize: 14, fontWeight: 600, color: C.paper,
                      padding: "12px 28px", borderRadius: 6,
                      background: C.terracotta,
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                    }}
                  >
                    View Report →
                  </Link>
                </div>
              )}

              {/* Raw JSON debug */}
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
                  {JSON.stringify(report, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      </div>
    </>
  );
}
