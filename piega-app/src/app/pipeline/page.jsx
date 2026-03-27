"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { C } from "@/lib/theme";

const AGENTS_URL = "http://localhost:4711";

// ─── Layout constants ──────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H_BASE = 72;
const TIER_GAP_X = 60;
const NODE_GAP_Y = 24;
const PAD_LEFT = 100;
const PAD_TOP = 80;
const TIER_LABEL_X = 28;

// ─── Status styles ──────────────────────────────────────────────────────────
const STATUS_STYLE = {
  live:    { color: C.sage,       bg: C.sage + "18",       border: C.sage + "50",       label: "Live" },
  planned: { color: C.warmGrey,   bg: "rgba(255,255,255,0.03)", border: C.bd,           label: "Planned" },
};

const TYPE_ICON = {
  source: "◈",
  agent: "◉",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function estimateNodeHeight(node) {
  let h = NODE_H_BASE;
  if (node.tech?.length > 0) h += 18;
  return h;
}

function layoutNodes(nodes, tiers) {
  const tierGroups = {};
  for (const t of tiers) tierGroups[t.tier] = [];
  for (const n of nodes) {
    if (tierGroups[n.tier]) tierGroups[n.tier].push(n);
  }

  const positions = {};
  let x = PAD_LEFT;

  for (const t of tiers) {
    const group = tierGroups[t.tier] ?? [];
    const totalH = group.reduce((s, n) => s + estimateNodeHeight(n) + NODE_GAP_Y, -NODE_GAP_Y);
    let y = PAD_TOP + Math.max(0, (300 - totalH) / 2); // center vertically

    for (const n of group) {
      const h = estimateNodeHeight(n);
      positions[n.id] = { x, y, w: NODE_W, h };
      y += h + NODE_GAP_Y;
    }
    x += NODE_W + TIER_GAP_X;
  }

  return positions;
}

function curvedPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const cp = Math.min(Math.abs(dx) * 0.5, 60);
  return `M${x1},${y1} C${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
}

// ─── Edge component ─────────────────────────────────────────────────────────

function Edge({ from, to, positions, label, planned }) {
  const pFrom = positions[from];
  const pTo = positions[to];
  if (!pFrom || !pTo) return null;

  const x1 = pFrom.x + pFrom.w;
  const y1 = pFrom.y + pFrom.h / 2;
  const x2 = pTo.x;
  const y2 = pTo.y + pTo.h / 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g>
      <path
        d={curvedPath(x1, y1, x2, y2)}
        fill="none"
        stroke={planned ? C.warmGrey + "30" : C.accent + "50"}
        strokeWidth={planned ? 1 : 1.5}
        strokeDasharray={planned ? "6 4" : "none"}
      />
      {/* Arrow tip */}
      <circle cx={x2} cy={y2} r={3} fill={planned ? C.warmGrey + "40" : C.accent + "70"} />
      {/* Label */}
      {label && (
        <text
          x={mx}
          y={my - 6}
          textAnchor="middle"
          fill={C.warmGrey + "88"}
          fontSize={8}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ─── Node component ─────────────────────────────────────────────────────────

function NodeBox({ node, pos, isSelected, onClick }) {
  const st = STATUS_STYLE[node.status] ?? STATUS_STYLE.planned;
  const icon = TYPE_ICON[node.type] ?? "◉";

  return (
    <g
      onClick={() => onClick(node.id)}
      style={{ cursor: "pointer" }}
    >
      {/* Shadow */}
      <rect
        x={pos.x + 1} y={pos.y + 2}
        width={pos.w} height={pos.h}
        rx={6} fill="rgba(0,0,0,0.15)"
      />
      {/* Card */}
      <rect
        x={pos.x} y={pos.y}
        width={pos.w} height={pos.h}
        rx={6}
        fill={isSelected ? st.bg : "#1e1c19"}
        stroke={isSelected ? st.color : st.border}
        strokeWidth={isSelected ? 1.5 : 1}
      />
      {/* Status dot */}
      <circle
        cx={pos.x + 14} cy={pos.y + 18}
        r={4}
        fill={st.color}
        opacity={node.status === "live" ? 1 : 0.4}
      />
      {/* Icon */}
      <text
        x={pos.x + 28} y={pos.y + 22}
        fill={st.color} fontSize={12}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {icon}
      </text>
      {/* Label */}
      <text
        x={pos.x + 42} y={pos.y + 22}
        fill={C.paper} fontSize={12} fontWeight={600}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {node.label}
      </text>
      {/* Description (truncated) */}
      <foreignObject x={pos.x + 12} y={pos.y + 32} width={pos.w - 24} height={28}>
        <div style={{
          fontSize: 9, color: C.warmGrey, lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          fontFamily: "Inter, system-ui, sans-serif",
        }}>
          {node.description}
        </div>
      </foreignObject>
      {/* Tech tags */}
      {node.tech?.length > 0 && (
        <foreignObject x={pos.x + 10} y={pos.y + pos.h - 22} width={pos.w - 20} height={18}>
          <div style={{
            display: "flex", gap: 4, overflow: "hidden",
            fontFamily: "Inter, system-ui, sans-serif",
          }}>
            {node.tech.slice(0, 3).map((t, i) => (
              <span key={i} style={{
                fontSize: 7, color: st.color, opacity: 0.7,
                background: st.color + "12",
                padding: "1px 5px", borderRadius: 2,
                whiteSpace: "nowrap",
              }}>
                {t}
              </span>
            ))}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// ─── Tier labels ────────────────────────────────────────────────────────────

function TierLabels({ tiers, positions, nodes }) {
  return tiers.map(t => {
    const tierNodes = nodes.filter(n => n.tier === t.tier);
    if (tierNodes.length === 0) return null;
    const firstPos = positions[tierNodes[0].id];
    if (!firstPos) return null;

    return (
      <g key={t.tier}>
        <text
          x={firstPos.x + NODE_W / 2}
          y={PAD_TOP - 30}
          textAnchor="middle"
          fill={C.warmGrey}
          fontSize={9}
          fontWeight={600}
          letterSpacing={1.5}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ textTransform: "uppercase" }}
        >
          {t.label}
        </text>
        <text
          x={firstPos.x + NODE_W / 2}
          y={PAD_TOP - 16}
          textAnchor="middle"
          fill={C.warmGrey + "66"}
          fontSize={8}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {t.description}
        </text>
      </g>
    );
  });
}

// ─── Detail panel ──────────────────────────────────────────────────────────

function DetailPanel({ node, onClose }) {
  if (!node) return null;
  const st = STATUS_STYLE[node.status] ?? STATUS_STYLE.planned;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: 420, maxWidth: "90vw",
      background: C.dark, borderLeft: `1px solid ${C.bd}`,
      padding: "28px 24px", overflowY: "auto",
      zIndex: 100, boxShadow: "-8px 0 30px rgba(0,0,0,0.4)",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: "none", color: C.warmGrey,
          fontSize: 18, cursor: "pointer", padding: 4,
        }}
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 9px", borderRadius: 3,
          background: st.bg, border: `1px solid ${st.border}`,
          fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
          color: st.color, textTransform: "uppercase",
          marginBottom: 10,
        }}>
          {st.label} · Tier {node.tier}
        </span>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 26, fontWeight: 400, color: C.paper,
          margin: "8px 0 0",
        }}>
          {node.label}
        </h2>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: C.warmGrey, lineHeight: 1.7, margin: "0 0 20px" }}>
        {node.description}
      </p>

      {/* Meta fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <MetaField label="Trigger" value={node.trigger} />
        {node.endpoint && <MetaField label="Endpoint" value={node.endpoint} mono />}
        {node.outputKey && <MetaField label="Output key" value={node.outputKey} mono />}
        {node.model && <MetaField label="Model" value={node.model} />}
      </div>

      {/* Tech */}
      {node.tech?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Label>Tech stack</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {node.tech.map((t, i) => (
              <span key={i} style={{
                fontSize: 11, color: st.color,
                background: st.color + "12", border: `1px solid ${st.color}20`,
                padding: "3px 10px", borderRadius: 3,
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prompt preview */}
      {node.promptPreview && (
        <div>
          <Label>Prompt preview</Label>

          <PromptBlock title="System prompt" text={node.promptPreview.system} color={C.sage} />
          <PromptBlock title="User prompt template" text={node.promptPreview.userTemplate} color={C.clay} />
          <PromptBlock title="Output format" text={node.promptPreview.outputFormat} color={C.accent} />
        </div>
      )}

      {/* No prompt */}
      {!node.promptPreview && node.status === "planned" && (
        <div style={{
          padding: "16px 14px", borderRadius: 5,
          border: `1px dashed ${C.bd}`,
          fontSize: 11, color: C.warmGrey + "88",
          textAlign: "center", marginTop: 8,
        }}>
          Prompts not yet designed for this agent
        </div>
      )}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, letterSpacing: 1.2,
      color: C.warmGrey, textTransform: "uppercase",
      marginBottom: 4,
    }}>
      {children}
    </div>
  );
}

function MetaField({ label, value, mono }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{
        fontSize: 12, color: C.paper,
        fontFamily: mono ? "'Fira Code', 'Cascadia Code', monospace" : "inherit",
        lineHeight: 1.5,
      }}>
        {value}
      </div>
    </div>
  );
}

function PromptBlock({ title, text, color }) {
  return (
    <div style={{
      marginTop: 12, padding: "12px 14px",
      background: color + "08",
      border: `1px solid ${color}20`,
      borderRadius: 5,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: 1,
        color: color, textTransform: "uppercase",
        marginBottom: 8,
      }}>
        {title}
      </div>
      <pre style={{
        margin: 0, fontSize: 11, color: C.warmGrey,
        lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
      }}>
        {text}
      </pre>
    </div>
  );
}

// ─── Backdrop overlay for detail panel ──────────────────────────────────────

function Backdrop({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed", inset: 0, zIndex: 99,
        background: "rgba(0,0,0,0.3)",
      }}
    />
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{
      display: "flex", gap: 20, fontSize: 10, color: C.warmGrey,
      padding: "12px 0", borderTop: `1px solid ${C.bd}`,
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage, display: "inline-block" }} />
        Live agent
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.warmGrey, opacity: 0.4, display: "inline-block" }} />
        Planned agent
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 20, height: 0, borderTop: `1.5px solid ${C.accent}50`, display: "inline-block" }} />
        Active edge
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 20, height: 0, borderTop: `1px dashed ${C.warmGrey}30`, display: "inline-block" }} />
        Planned edge
      </span>
      <span style={{ marginLeft: "auto", color: C.warmGrey + "66" }}>
        Click a node for details + prompts
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${AGENTS_URL}/pipeline`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setPipeline)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <PageShell>
        <div style={{
          background: C.darkCard, border: `1px solid ${C.terracotta}40`,
          borderRadius: 6, padding: 20,
        }}>
          <div style={{ color: C.terracotta, fontWeight: 600, marginBottom: 6 }}>
            Cannot load pipeline
          </div>
          <div style={{ fontSize: 12, color: C.warmGrey }}>{error}</div>
        </div>
      </PageShell>
    );
  }

  if (!pipeline) {
    return (
      <PageShell>
        <div style={{
          height: 400, borderRadius: 6,
          background: "rgba(255,255,255,0.03)",
          animation: "shimmer 1.5s ease-in-out infinite",
        }} />
      </PageShell>
    );
  }

  const { nodes, edges, tiers, storage } = pipeline;
  const positions = layoutNodes(nodes, tiers);

  // SVG viewport
  const allPos = Object.values(positions);
  const svgW = Math.max(...allPos.map(p => p.x + p.w)) + 60;
  const svgH = Math.max(...allPos.map(p => p.y + p.h)) + 60;

  const selectedNode = selected ? nodes.find(n => n.id === selected) : null;

  return (
    <PageShell>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:.9} }
      `}</style>

      {/* Title area */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(26px,4vw,36px)", fontWeight: 400,
          color: C.paper, margin: "0 0 6px",
        }}>
          Agent Pipeline
        </h1>
        <p style={{ fontSize: 12, color: C.warmGrey, margin: 0, lineHeight: 1.6 }}>
          {nodes.filter(n => n.status === "live").length} live ·{" "}
          {nodes.filter(n => n.status === "planned").length} planned ·{" "}
          Storage: <span style={{ color: C.accent }}>{storage.table}</span> → <code style={{ fontSize: 11, color: C.clay }}>{storage.resultsColumn}</code>
        </p>
      </div>

      {/* Canvas */}
      <div style={{
        background: C.darkCard,
        border: `1px solid ${C.bd}`,
        borderRadius: 8,
        overflow: "auto",
        marginBottom: 16,
      }}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: "block", minWidth: "100%" }}
        >
          {/* Grid dots */}
          <defs>
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill={C.warmGrey + "15"} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />

          {/* Tier labels */}
          <TierLabels tiers={tiers} positions={positions} nodes={nodes} />

          {/* Edges (behind nodes) */}
          {edges.map((e, i) => (
            <Edge
              key={i}
              from={e.from}
              to={e.to}
              positions={positions}
              label={e.label}
              planned={e.planned}
            />
          ))}

          {/* Nodes */}
          {nodes.map(n => (
            <NodeBox
              key={n.id}
              node={n}
              pos={positions[n.id]}
              isSelected={selected === n.id}
              onClick={setSelected}
            />
          ))}
        </svg>
      </div>

      <Legend />

      {/* Detail slide-out */}
      {selectedNode && (
        <>
          <Backdrop onClick={() => setSelected(null)} />
          <DetailPanel node={selectedNode} onClose={() => setSelected(null)} />
        </>
      )}
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: C.dark, color: C.paper,
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
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
            Pipeline Canvas
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <NavLink href="/visualiser">Visualiser</NavLink>
            <NavLink href="/reports">Reports</NavLink>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, children }) {
  return (
    <a href={href} style={{
      fontSize: 11, color: C.warmGrey, textDecoration: "none",
      padding: "4px 10px", borderRadius: 3,
      border: `1px solid ${C.bd}`,
      transition: "border-color 0.15s",
    }}>
      {children}
    </a>
  );
}
