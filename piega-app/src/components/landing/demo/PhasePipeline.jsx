import { C } from "@/lib/theme";
import { PIPE_STEPS } from "./constants";

/* ═══════ PHASE 2 — AI Pipeline Visualization ═══════ */
export default function PhasePipeline({ panelBase, hidden, procMsg, demoImage, demoAfterImage, demoInteriorImage, demoInteriorAfterImage }) {
  const beforeSrc = demoInteriorImage || demoImage;
  const afterSrc = demoInteriorAfterImage || demoAfterImage || demoImage;

  return (
    <div style={{ ...panelBase, ...hidden, background: C.dark }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "clamp(16px,3vw,28px) clamp(20px,4vw,44px)" }}>

        {/* Pipeline node indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "clamp(10px,2vw,20px)" }}>
          {PIPE_STEPS.flatMap((_, i) => {
            const done = i < procMsg;
            const active = i === procMsg;
            const items = [];
            if (i > 0) {
              items.push(
                <div key={`l${i}`} style={{
                  width: "clamp(16px,3vw,32px)", height: 1,
                  background: done || active ? `${C.accent}50` : `${C.warmGrey}18`,
                  transition: "background 0.5s",
                }} />
              );
            }
            items.push(
              <div key={`n${i}`} style={{
                width: "clamp(8px,1.2vw,11px)", height: "clamp(8px,1.2vw,11px)",
                borderRadius: "50%",
                background: active ? C.terracotta : done ? C.accent : `${C.warmGrey}25`,
                transition: "all 0.4s ease",
                boxShadow: active ? `0 0 10px ${C.terracotta}50, 0 0 20px ${C.terracotta}20` : "none",
                animation: active ? "demo-node-pulse 2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }} />
            );
            return items;
          })}
        </div>

        {/* Visual artifact area */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

          {/* Step 0: Reading the building — photo with scan overlay */}
          {procMsg === 0 && (
            <div style={{ textAlign: "center", animation: "demo-fade-in 0.4s ease both" }}>
              <div style={{ position: "relative", width: "clamp(160px,36%,240px)", margin: "0 auto 10px", borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
                <img src={demoImage} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: `linear-gradient(transparent 45%, ${C.terracotta}15 50%, transparent 55%)`,
                  backgroundSize: "100% 300%",
                  animation: "demo-scan 2s linear infinite",
                  pointerEvents: "none",
                }} />
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(11px,1.5vw,15px)", letterSpacing: "0.08em", color: C.terracotta, opacity: 0.9 }}>
                {"INTERWAR SEMI \u00B7 1930\u20131945"}
              </div>
            </div>
          )}

          {/* Step 1: Spotting issues — cards */}
          {procMsg === 1 && (
            <div style={{ width: "clamp(220px,55%,340px)", animation: "demo-fade-in 0.4s ease both" }}>
              {[
                { issue: "Damp staining on chimney breast", sev: "moderate", c: C.clay },
                { issue: "Window seals dated throughout", sev: "minor", c: C.warmGrey },
                { issue: "Roof age unknown", sev: "investigate", c: C.terracotta },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "clamp(6px,1vw,10px) clamp(8px,1.2vw,14px)",
                  background: C.darkMid, border: `1px solid ${C.bd}`,
                  borderRadius: 4, marginBottom: i < 2 ? "clamp(4px,0.6vw,8px)" : 0,
                }}>
                  <span style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(11px,1.3vw,14px)", color: C.paper }}>{item.issue}</span>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(7px,0.8vw,9px)", letterSpacing: "0.06em", textTransform: "uppercase", color: item.c, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{item.sev}</span>
                </div>
              ))}
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(8px,0.9vw,10px)", color: `${C.warmGrey}99`, marginTop: "clamp(6px,1vw,10px)" }}>
                + 5 unknowns flagged for site visit
              </div>
            </div>
          )}

          {/* Step 2: Designing — palette + mood */}
          {procMsg === 2 && (
            <div style={{ width: "clamp(220px,55%,320px)", textAlign: "center", animation: "demo-fade-in 0.4s ease both" }}>
              <div style={{ display: "flex", gap: "clamp(4px,0.6vw,8px)", marginBottom: "clamp(10px,1.5vw,16px)" }}>
                {[
                  { hex: C.accent, name: "Raw linen" },
                  { hex: C.sage, name: "Sage" },
                  { hex: C.terracotta, name: "Terracotta" },
                  { hex: C.clay, name: "Clay" },
                  { hex: C.accentDark, name: "Aged brass" },
                ].map((col, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: "clamp(24px,4vw,40px)", borderRadius: 3, background: col.hex, border: `1px solid ${C.bd}` }} />
                    <div style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(7px,0.8vw,9px)", color: C.warmGrey, marginTop: 4, lineHeight: 1.2 }}>{col.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(13px,1.6vw,17px)", fontStyle: "italic", color: C.accent, lineHeight: 1.5, opacity: 0.8 }}>
                {"\u201Chonest, warm, rooted in place\u201D"}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "clamp(8px,1.2vw,14px)", marginTop: "clamp(8px,1vw,12px)" }}>
                {["Lime plaster", "Engineered oak", "Reclaimed stone"].map((m, i) => (
                  <span key={i} style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(8px,0.9vw,10px)", color: C.warmGrey, letterSpacing: "0.02em" }}>{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Before/After — images merge then slider sweeps */}
          {procMsg === 3 && (
            <div style={{ width: "clamp(260px,65%,400px)", animation: "demo-fade-in 0.4s ease both" }}>
              {/* Container: starts with gap, animates to 0 gap (merging) */}
              <div style={{
                display: "flex", borderRadius: 4, overflow: "hidden",
                animation: "demo-ba-merge 0.5s ease-out 0.1s both",
              }}>
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <img src={beforeSrc} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", filter: "saturate(0.7)" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 8px 4px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(9px,1.1vw,12px)", color: "#fff", opacity: 0.8, letterSpacing: "0.1em" }}>NOW</span>
                  </div>
                </div>
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <img src={afterSrc} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 8px 4px", background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(9px,1.1vw,12px)", color: C.paper, opacity: 0.9, letterSpacing: "0.1em" }}>AFTER</span>
                  </div>
                </div>
              </div>
              {/* Animated slider handle — sweeps back and forth after merge */}
              <div style={{ position: "relative", marginTop: -1 }}>
                <div style={{ position: "absolute", bottom: 0, height: "100%", width: 0, left: "50%" }}>
                  {/* This overlays the images — positioned relative to the merged container */}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Writing — mini report silhouette */}
          {procMsg === 4 && (
            <div style={{ width: "clamp(150px,32%,200px)", animation: "demo-fade-in 0.4s ease both" }}>
              <div style={{ background: C.darkMid, borderRadius: 4, border: `1px solid ${C.bd}`, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
                <div style={{ background: C.dark, padding: "8px 10px 6px" }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 7, fontStyle: "italic", color: C.accent }}>Piega</div>
                  <div style={{ height: 3, background: C.accent, width: "60%", borderRadius: 1, marginTop: 4, opacity: 0.3 }} />
                </div>
                <div style={{ height: 36, position: "relative" }}>
                  <img src={demoAfterImage || demoImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                </div>
                <div style={{ background: "#FAF8F5", padding: "6px 10px 8px" }}>
                  {[1, 2, 3, 4].map((ch) => (
                    <div key={ch} style={{ marginBottom: 4 }}>
                      <div style={{ height: 2, background: "#DFDAD4", borderRadius: 1, width: `${40 + ch * 8}%`, marginBottom: 2 }} />
                      <div style={{ height: 1.5, background: "#ECEAE6", borderRadius: 1, width: "90%" }} />
                      <div style={{ height: 1.5, background: "#ECEAE6", borderRadius: 1, width: "70%", marginTop: 1 }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(10px,1.2vw,13px)", letterSpacing: "0.1em", color: C.sage, textAlign: "center", marginTop: "clamp(8px,1vw,12px)" }}>
                READY.
              </div>
            </div>
          )}
        </div>

        {/* Step label + result */}
        <div style={{ textAlign: "center", marginTop: "clamp(8px,1.5vw,16px)" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(14px,1.8vw,18px)", fontStyle: "italic", color: C.paper }}>
            {PIPE_STEPS[procMsg]?.label}
          </div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(9px,1vw,11px)", color: C.warmGrey, marginTop: 3, letterSpacing: "0.03em" }}>
            {PIPE_STEPS[procMsg]?.result}
          </div>
        </div>
      </div>
    </div>
  );
}
