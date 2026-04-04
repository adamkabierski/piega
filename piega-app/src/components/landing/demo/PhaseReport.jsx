import { C } from "@/lib/theme";

/* Helper: mini before/after with animated slider — mirrors real report technique.
   AFTER is the base layer; BEFORE is clipped via clip-path from the left. */
function MiniSlider({ beforeSrc, afterSrc, label }) {
  return (
    <div style={{ margin: "0 -6px 6px" }}>
      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 5.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.clay, marginBottom: 2, paddingLeft: 6 }}>{label}</div>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 3, width: "100%", aspectRatio: "16/9" }}>
        {/* Base layer = AFTER (renovated) — full size behind */}
        <img src={afterSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Clipped overlay = BEFORE (original) — clip-path reveals AFTER underneath */}
        <div style={{ position: "absolute", inset: 0, animation: "demo-slider-clip 5s ease-in-out 0.6s infinite" }}>
          <img src={beforeSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.8)" }} />
        </div>
        {/* Labels */}
        <span style={{ position: "absolute", bottom: 3, left: 5, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, color: "#fff", opacity: 0.65, textShadow: "0 1px 2px rgba(0,0,0,0.6)", zIndex: 2 }}>NOW</span>
        <span style={{ position: "absolute", bottom: 3, right: 5, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, color: "#fff", opacity: 0.65, textShadow: "0 1px 2px rgba(0,0,0,0.6)", zIndex: 2 }}>POSSIBLE</span>
        {/* Animated divider line + handle */}
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 1.5, background: "rgba(250,248,245,0.5)", transform: "translateX(-0.75px)", animation: "demo-slider-line 5s ease-in-out 0.6s infinite", zIndex: 3 }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "rgba(30,28,26,0.6)", border: "1px solid rgba(250,248,245,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 5, color: "#FAF8F5" }}>{"\u2194"}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════ PHASE 3 — Scrolling report preview ═══════ */
export default function PhaseReport({ panelBase, hidden, phase, name, cost, demoImage, demoAfterImage, demoInteriorImage, demoInteriorAfterImage }) {
  return (
    <div style={{ ...panelBase, ...hidden, background: C.dark, overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: "clamp(280px, 65%, 390px)",
        height: "clamp(280px, 80%, 360px)",
        overflow: "hidden", borderRadius: 6,
        boxShadow: "0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,169,154,0.08)",
      }}>
        {/* Fade masks */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20, background: `linear-gradient(${C.dark}90, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(transparent, ${C.dark})`, zIndex: 2, pointerEvents: "none" }} />

        {/* Scrolling content */}
        <div style={{ animation: phase === 3 ? "demo-report-scroll 4.6s ease-in-out 0.4s both" : "none" }}>

          {/* ── DARK HERO ── */}
          <div style={{ background: C.dark, padding: "12px 16px 14px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)", fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: "rgba(255,255,255,0.02)", letterSpacing: "0.05em", pointerEvents: "none", whiteSpace: "nowrap" }}>INTERWAR SEMI</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 9, fontStyle: "italic", color: C.accent, marginBottom: 3 }}>Piega</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, letterSpacing: "0.2em", color: C.terracotta, marginBottom: 6 }}>{"RIGHTMOVE \u00B7 LUTON \u00B7 LU2"}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(14px,2.2vw,18px)", color: C.paper, fontWeight: 400, lineHeight: 1.15, marginBottom: 4 }}>{name}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 7.5, color: "rgba(184,169,154,0.5)", marginBottom: 8 }}>{"4 bed \u00B7 Detached \u00B7 Freehold"}</div>
            <div style={{ display: "flex", gap: 14 }}>
              {[{ v: "\u00A3340K+", s: "guide", c: C.clay }, { v: "4 BED", s: "2 bath" }, { v: "DETACHED", s: "Freehold" }, { v: "1930\u20131945", s: "Interwar Semi" }].map((stat, i) => (
                <div key={i}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 10, letterSpacing: "0.04em", color: stat.c ?? C.paper }}>{stat.v}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 5.5, color: "rgba(184,169,154,0.4)" }}>{stat.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── HERO IMAGE ── */}
          <div style={{ lineHeight: 0, position: "relative" }}>
            <img src={demoAfterImage || demoImage} alt="" style={{ width: "100%", height: 75, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", top: 5, left: 8, fontFamily: "'Bebas Neue',sans-serif", fontSize: 6, letterSpacing: "0.2em", color: "rgba(250,248,245,0.35)", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>THE APPROACH</div>
          </div>

          {/* ── BODY — paper ── */}
          <div style={{ background: "#FAF8F5", padding: "0 14px" }}>

            {/* Opening hook */}
            <div style={{ padding: "10px 0 4px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", lineHeight: 1.55, color: "#1E1C1A" }}>
                {"\u201CThe bones are good. The walls tell a straightforward story \u2014 but the numbers tell another.\u201D"}
              </div>
            </div>

            {/* Archetype slab */}
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 9, letterSpacing: "0.04em", color: C.terracotta, margin: "6px 0 8px", textTransform: "uppercase" }}>
              Interwar Semi. 1930{"\u2013"}1945. Cavity brick, concrete tile roof.
            </div>

            {/* Chapter 1 — dimmed */}
            <div style={{ opacity: 0.35, margin: "8px 0" }}>
              <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 1</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A", marginBottom: 6 }}>{"What You\u2019re Looking At"}</div>
              {[92, 100, 78, 88, 60].map((w, i) => (
                <div key={i} style={{ height: 3.5, background: "#DFDAD4", borderRadius: 2, width: `${w}%`, marginBottom: 3 }} />
              ))}
            </div>

            {/* Period features */}
            <div style={{ opacity: 0.6, marginBottom: 6 }}>
              <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 4 }}>Period Features</div>
              {[{ f: "Original sash windows", s: "visible", hidden: false }, { f: "Ceiling cornicing", s: "visible", hidden: false }, { f: "Timber floorboards", s: "likely beneath carpet", hidden: true }, { f: "Cast-iron radiators", s: "visible", hidden: false }, { f: "Fireplaces behind boarding", s: "hidden \u2014 inferred", hidden: true }].map((feat, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0", borderBottom: i < 4 ? "1px solid rgba(30,28,26,0.05)" : "none" }}>
                  <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7, color: feat.hidden ? "#6B6560" : "#1E1C1A", fontStyle: feat.hidden ? "italic" : "normal" }}>{feat.f}</span>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 5, color: "#9B9590", textTransform: "lowercase", flexShrink: 0, marginLeft: 8 }}>{feat.s}</span>
                </div>
              ))}
            </div>

            {/* Construction grid — dimmed */}
            <div style={{ opacity: 0.3, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, margin: "4px 0 10px" }}>
              {["Walls", "Roof", "Found.", "Insul.", "Windows", "Heating"].map((label) => (
                <div key={label} style={{ padding: "3px 4px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff" }}>
                  <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "#9B9590" }}>{label}</div>
                  <div style={{ height: 2.5, background: "#DFDAD4", borderRadius: 1, width: "65%", marginTop: 2 }} />
                </div>
              ))}
            </div>

            <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "0 auto 10px" }} />

            {/* Chapter 2 */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 2</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A" }}>What It Could Become</div>
            </div>

            {/* BEFORE/AFTER with animated slider — exterior */}
            <MiniSlider beforeSrc={demoImage} afterSrc={demoAfterImage} label={"DRAG \u00B7 FRONT EXTERIOR"} />

            {/* BEFORE/AFTER — interior */}
            {(demoInteriorImage || demoInteriorAfterImage) && (
              <MiniSlider
                beforeSrc={demoInteriorImage || demoImage}
                afterSrc={demoInteriorAfterImage || demoAfterImage}
                label={"DRAG \u00B7 LIVING ROOM"}
              />
            )}

            {/* Palette */}
            <div style={{ margin: "8px 0 4px" }}>
              <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Palette</div>
              <div style={{ display: "flex", gap: 3, marginBottom: 3 }}>
                {[{ hex: C.accent, name: "Raw linen" }, { hex: C.sage, name: "Sage" }, { hex: C.terracotta, name: "Terracotta" }, { hex: C.clay, name: "Clay" }, { hex: C.accentDark, name: "Aged brass" }].map((col, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: 14, borderRadius: 2, background: col.hex, border: "1px solid rgba(30,28,26,0.06)" }} />
                    <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 5, color: "#6B6560", marginTop: 2, lineHeight: 1.2 }}>{col.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div style={{ margin: "4px 0" }}>
              <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Materials</div>
              {["Lime plaster", "Engineered oak", "Reclaimed stone", "Aged brass hardware"].map((mat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "2px 0", borderBottom: i < 3 ? "1px solid rgba(30,28,26,0.05)" : "none" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: [C.terracotta, C.clay, C.sage, C.accentDark][i], marginRight: 6, opacity: 0.6, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7, color: "#1E1C1A" }}>{mat}</span>
                </div>
              ))}
            </div>

            {/* Mood + avoid */}
            <div style={{ margin: "4px 0 6px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 7.5, fontStyle: "italic", color: "#B8A99A", marginBottom: 3 }}>
                {"\u201Chonest, warm, rooted in place\u201D"}
              </div>
              <div style={{ opacity: 0.4, fontFamily: "'Inter',sans-serif", fontSize: 5.5, color: "#9B9590" }}>
                {"Avoid: grey composite, chrome fittings, vinyl plank"}
              </div>
            </div>

            <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "8px auto" }} />

            {/* Chapter 3 — issues */}
            <div style={{ margin: "0 0 8px" }}>
              <div style={{ opacity: 0.5 }}>
                <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 3</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A", marginBottom: 4 }}>What to Investigate</div>
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: "#1E1C1A", letterSpacing: "0.03em", marginBottom: 5 }}>
                WHERE THE REAL DECISIONS ARE.
              </div>
              {[{ label: "Damp staining on chimney breast", sev: "moderate", c: C.clay }, { label: "Dated window seals throughout", sev: "minor", c: "#9B9590" }].map((issue, i) => (
                <div key={i} style={{ padding: "4px 6px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff", marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7.5, color: "#1E1C1A" }}>{issue.label}</span>
                  <span style={{ fontSize: 5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: issue.c, fontFamily: "'Inter',sans-serif" }}>{issue.sev}</span>
                </div>
              ))}
              <div style={{ opacity: 0.4, padding: "4px 6px", borderRadius: 2, background: "rgba(30,28,26,0.03)", marginTop: 3 }}>
                <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Cannot be assessed from photos</div>
                {["Electrics age", "Drainage", "Asbestos risk"].map((u, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
                    <div style={{ width: 2, height: 2, borderRadius: "50%", background: "#9B9590" }} />
                    <span style={{ fontSize: 5.5, color: "#6B6560", fontFamily: "'EB Garamond',serif" }}>{u}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "8px auto" }} />

            {/* Chapter 4 — The Numbers */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#9B9590", marginBottom: 2 }}>Chapter 4</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, fontStyle: "italic", color: "#1E1C1A" }}>The Numbers</div>
            </div>

            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 7.5, fontStyle: "italic", color: "#B8A99A", marginBottom: 4, lineHeight: 1.5 }}>
              {"Here\u2019s what all that means in money."}
            </div>

            {/* Cost rows */}
            <div style={{ opacity: 0.65, marginBottom: 6 }}>
              {[{ cat: "Structural & Shell", range: "\u00A38k\u2013\u00A315k" }, { cat: "M&E Services", range: "\u00A35k\u2013\u00A312k" }, { cat: "Kitchen & Bath", range: "\u00A36k\u2013\u00A314k" }, { cat: "Finishes & Decoration", range: "\u00A34k\u2013\u00A38k" }, { cat: "External Works", range: "\u00A33k\u2013\u00A37k" }, { cat: "Contingency (15%)", range: "\u00A34k\u2013\u00A38k" }].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0", borderBottom: i < 5 ? "1px solid rgba(30,28,26,0.05)" : "none" }}>
                  <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 7, color: "#1E1C1A" }}>{row.cat}</span>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 7, fontWeight: 600, color: "#1E1C1A" }}>{row.range}</span>
                </div>
              ))}
            </div>

            {/* BIG NUMBER */}
            <div style={{ textAlign: "center", padding: "10px 0", borderTop: "1px solid rgba(30,28,26,0.06)", borderBottom: "1px solid rgba(30,28,26,0.06)", margin: "2px 0" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,5vw,40px)", letterSpacing: "0.02em", color: "#1E1C1A", lineHeight: 1 }}>{cost}</div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 6.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9B9590", marginTop: 3 }}>
                ten-year cost of ownership beyond purchase
              </div>
            </div>

            {/* Stacked bar */}
            <div style={{ margin: "8px 0 2px" }}>
              <div style={{ display: "flex", height: 8, overflow: "hidden", borderRadius: 1 }}>
                {[{ flex: 3, color: C.terracotta }, { flex: 2.5, color: C.clay }, { flex: 2, color: C.accent }, { flex: 1.5, color: C.sage }, { flex: 1, color: "#8A8580" }].map((seg, i) => (
                  <div key={i} style={{ flex: seg.flex, background: seg.color, height: "100%" }} />
                ))}
              </div>
              <div style={{ display: "flex", marginTop: 2 }}>
                {[{ label: "Structural", flex: 3 }, { label: "M&E", flex: 2.5 }, { label: "Finishes", flex: 2 }, { label: "External", flex: 1.5 }, { label: "Other", flex: 1 }].map((seg, i) => (
                  <div key={i} style={{ flex: seg.flex, fontFamily: "'Bebas Neue',sans-serif", fontSize: 5, letterSpacing: "0.06em", color: "#6B6560", lineHeight: 1.2, paddingRight: 2, overflow: "hidden" }}>{seg.label}</div>
                ))}
              </div>
            </div>

            {/* Price gap */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", opacity: 0.7 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 5, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590" }}>Asking</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: "#1E1C1A" }}>{"\u00A3340K"}</div>
              </div>
              <div style={{ fontSize: 10, color: "#9B9590" }}>{"\u2192"}</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 5, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590" }}>Post-Works</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: C.sage }}>{"\u00A3420K\u2013\u00A3480K"}</div>
              </div>
            </div>

            {/* Phased budget */}
            <div style={{ opacity: 0.6, margin: "5px 0" }}>
              <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Phased Budget</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[{ label: "Move-in Basics", range: "\u00A38k\u2013\u00A312k", desc: "Rewire, boiler, damp treatment", c: C.terracotta }, { label: "Year 1\u20132", range: "\u00A312k\u2013\u00A328k", desc: "Kitchen, bathrooms, flooring", c: C.clay }, { label: "Complete Vision", range: "\u00A34k\u2013\u00A38k", desc: "Garden, external works, finishes", c: C.sage }].map((p, i) => (
                  <div key={i} style={{ padding: "4px 6px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 6, fontWeight: 600, color: p.c }}>{p.label}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, color: "#1E1C1A" }}>{p.range}</span>
                    </div>
                    <div style={{ fontSize: 5, color: "#9B9590", marginTop: 1 }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost drivers */}
            <div style={{ opacity: 0.5, margin: "5px 0" }}>
              <div style={{ fontSize: 5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#9B9590", marginBottom: 3 }}>Key Cost Drivers</div>
              {[{ factor: "Roof condition", impact: "Unknown age \u2014 could add \u00A35\u201312k" }, { factor: "Electrics rewire", impact: "Likely needed \u2014 \u00A34\u20138k" }].map((d, i) => (
                <div key={i} style={{ padding: "3px 5px", borderRadius: 2, border: "1px solid rgba(30,28,26,0.08)", background: "#fff", marginBottom: 2 }}>
                  <div style={{ fontSize: 6, fontWeight: 600, color: "#1E1C1A" }}>{d.factor}</div>
                  <div style={{ fontSize: 5, color: "#6B6560" }}>{d.impact}</div>
                </div>
              ))}
            </div>

            {/* Confidence */}
            <div style={{ opacity: 0.3, padding: "3px 5px", borderRadius: 2, background: "rgba(30,28,26,0.03)", marginBottom: 6 }}>
              <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 5.5, fontStyle: "italic", color: "#6B6560", lineHeight: 1.4 }}>
                Desktop appraisal based on listing photos and public data. Not a survey. Not a tender.
              </div>
            </div>

            <div style={{ width: 24, height: 1, background: "rgba(30,28,26,0.08)", margin: "0 auto 8px" }} />

            {/* Closing gate */}
            <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 8, fontStyle: "italic", color: "#B8A99A", marginBottom: 6, lineHeight: 1.5, maxWidth: 180, margin: "0 auto 6px" }}>
                {"\u201CThis one has warmth. But warmth alone doesn\u2019t fix the roof.\u201D"}
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 8, color: "#1E1C1A", letterSpacing: "0.04em", marginBottom: 2 }}>YOU READ THIS FAR.</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 6.5, fontStyle: "italic", color: "#6B6560" }}>This is one building. Yours is different.</div>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 7, letterSpacing: 3, color: "#9B9590" }}>PIEGA<span style={{ color: C.terracotta }}>.</span></div>
              </div>
            </div>

          </div>{/* end paper */}
        </div>{/* end scroll */}
      </div>{/* end window */}
    </div>
  );
}
