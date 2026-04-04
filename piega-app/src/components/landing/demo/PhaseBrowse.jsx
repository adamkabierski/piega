import { C } from "@/lib/theme";
import { RM } from "./constants";

/* ── Browser chrome bar ── */
export function BrowserChrome() {
  return (
    <div style={{ height: 32, background: "#36342F", display: "flex", alignItems: "center", padding: "0 12px", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 5 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
        ))}
      </div>
      <div style={{ flex: 1, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 10px" }}>
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
          rightmove.co.uk/properties/145891267
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ width: 18, height: 18, borderRadius: 4, background: C.terracotta, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 9, fontWeight: 700, color: "#fff" }}>P</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════ PHASE 0 — Rightmove listing ═══════ */
export function PhaseRightmove({ panelBase, hidden, name, demoImage, demoInteriorImage }) {
  return (
    <div style={{ ...panelBase, ...hidden }}>
      <BrowserChrome />
      <div style={{ flex: 1, background: RM.bg, overflow: "hidden", position: "relative" }}>
        <div style={{ height: 6, background: RM.green }} />
        <div style={{ padding: "clamp(10px,2vw,18px) clamp(12px,2.5vw,24px)", display: "flex", gap: "clamp(12px,2vw,20px)" }}>
          {/* Left — Property photos */}
          <div style={{ width: "clamp(130px,35%,240px)", flexShrink: 0 }}>
            <div style={{ aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ flex: 1, height: 28, borderRadius: 2, overflow: "hidden", background: RM.dummy, opacity: i <= 1 ? 1 : 0.5 }}>
                  {i === 0 && <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  {i === 1 && demoInteriorImage && <img src={demoInteriorImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Details + what's missing */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(18px,3.5vw,28px)", fontWeight: 700, color: RM.text, marginBottom: 4, lineHeight: 1.1 }}>{"\u00A3340,000+"}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(11px,1.4vw,14px)", color: RM.textMuted, marginBottom: 10, lineHeight: 1.3 }}>{name}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {["4 bed", "Detached", "Freehold"].map((t) => (
                <span key={t} style={{ fontSize: 10, color: RM.textMuted, padding: "3px 8px", background: RM.bgSoft, borderRadius: 3, fontFamily: "'Inter',sans-serif" }}>{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {[90, 100, 75, 85, 0, 95].map((w, i) =>
                w === 0
                  ? <div key={i} style={{ height: 4 }} />
                  : <div key={i} style={{ height: 7, background: RM.dummy, borderRadius: 3, width: `${w}%` }} />
              )}
            </div>
            <div style={{ borderTop: `1px solid ${RM.dummy}`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {["Renovation cost", "Structural assessment", "What it could look like"].map((label) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, color: "#CC6B5A", fontFamily: "'Inter',sans-serif", lineHeight: 1 }}>{"\u2715"}</span>
                  <span style={{ fontSize: 9, color: RM.textMuted, fontFamily: "'Inter',sans-serif", letterSpacing: "0.01em" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px clamp(12px,2.5vw,24px)", display: "flex", gap: 10, background: `linear-gradient(transparent, ${RM.bgSoft})` }}>
          <div style={{ height: 32, flex: 1, background: RM.dummy, borderRadius: 4 }} />
          <div style={{ height: 32, width: 100, background: RM.dummy, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════ PHASE 1 — Extension popup ═══════ */
export function PhaseExtension({ panelBase, hidden, name, demoImage }) {
  return (
    <div style={{ ...panelBase, ...hidden }}>
      <BrowserChrome />
      <div style={{ flex: 1, background: RM.bg, position: "relative", overflow: "hidden" }}>
        <div style={{ opacity: 0.2, padding: "clamp(10px,2vw,18px) clamp(12px,2.5vw,24px)" }}>
          <div style={{ height: 6, background: RM.green, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ width: "35%", aspectRatio: "4/3", borderRadius: 4, overflow: "hidden", background: "#ddd" }}>
              <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 20, background: RM.dummy, borderRadius: 3, width: 120, marginBottom: 8 }} />
              <div style={{ height: 14, background: RM.dummy, borderRadius: 3, width: 160, marginBottom: 8 }} />
              {[80, 90, 60].map((w, i) => (
                <div key={i} style={{ height: 8, background: RM.dummy, borderRadius: 3, width: `${w}%`, marginBottom: 5 }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{
          position: "absolute", top: 8, right: "clamp(12px,2.5vw,24px)",
          width: "clamp(160px,42%,260px)", background: C.dark,
          border: `1px solid ${C.bd}`, borderRadius: 8,
          padding: "clamp(12px,2vw,18px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}>
          <div style={{ position: "absolute", top: -6, right: 18, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: `6px solid ${C.dark}` }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(12px,1.5vw,15px)", color: C.paper, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>{name}</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1.1vw,11px)", color: C.warmGrey, marginBottom: 10 }}>{"\u00A3340,000+ \u00B7 4 bed \u00B7 Detached"}</div>
          <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 4, overflow: "hidden", marginBottom: 10, background: C.darkMid }}>
            <img src={demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ padding: "clamp(7px,1vw,10px) 12px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(10px,1.3vw,13px)", color: C.paper, letterSpacing: "0.08em" }}>
            {"ANALYSE THIS PROPERTY \u2192"}
          </div>
        </div>
      </div>
    </div>
  );
}
