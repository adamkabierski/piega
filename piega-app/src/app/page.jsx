"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "@/lib/theme";
import { AGENTS_URL } from "@/lib/config";
import { STYLES } from "@/components/landing/styles";
import { TEXT_BLOCKS, reportsToGridCards } from "@/components/landing/data";
import DemoAnimation from "@/components/landing/DemoAnimation";

/* ---------- Mini slider card (grid) ---------- */

function MiniSliderCard({ card }) {
  const [split, setSplit] = useState(50);
  const sliderRef = useRef(null);
  const dragging = useRef(false);

  const move = useCallback((clientX) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSplit(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    const mv = (e) => { if (dragging.current) move(e.touches ? e.touches[0].clientX : e.clientX); };
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", mv);
    window.addEventListener("touchend", up);
    window.addEventListener("touchmove", mv, { passive: true });
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchmove", mv);
    };
  }, [move]);

  const archLine = [card.era, card.archetypeLabel].filter(Boolean).join(" \u00B7 ");

  return (
    <div className="piega-prop-card">
      {/* Slider */}
      <div
        ref={sliderRef}
        className="piega-card-slider"
        onMouseDown={(e) => { e.preventDefault(); dragging.current = true; move(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}
      >
        <img src={card.originalUrl} alt="" loading="lazy" style={{ zIndex: 1 }} onError={(e) => { e.target.style.display = "none"; }} />
        <img src={card.renovatedUrl} alt="" loading="lazy" style={{ zIndex: 2, clipPath: `inset(0 0 0 ${split}%)` }} onError={(e) => { e.target.style.display = "none"; }} />
        <div className="piega-card-slider-handle" style={{ left: `${split}%` }} />
        {/* Labels */}
        <span className="piega-card-lbl piega-card-lbl-now">NOW</span>
        <span className="piega-card-lbl piega-card-lbl-poss">POSSIBLE</span>
        <span className="piega-card-badge">{card.label.toUpperCase()}</span>
      </div>
      {/* Meta */}
      <a href={card.reportId ? `/report/${card.reportId}` : undefined} style={{ textDecoration: "none", display: "block" }}>
        <div className="piega-card-meta">
          <p className="piega-card-name">{card.name}</p>
          {archLine && <p className="piega-card-arch">{archLine}</p>}
        </div>
        {card.costStr && (
          <div className="piega-card-cost">
            <span className="piega-card-cost-label">Est. renovation</span>
            <span className="piega-card-cost-num">{card.costStr}</span>
          </div>
        )}
        {card.observation && (
          <p className="piega-card-observation">{`\u201C${card.observation}\u201D`}</p>
        )}
        <span className="piega-card-foot">{`View full report \u2192`}</span>
      </a>
    </div>
  );
}

/* ---------- Editorial text break (between report cards) ---------- */

function TextBreak({ block }) {
  const base = {
    maxWidth: 520, margin: "0 auto", padding: "0 24px",
    textAlign: "center",
  };

  if (block.variant === "confrontation") {
    return (
      <div style={base}>
        {block.lines.map((line, i) => (
          <div key={i} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(14px,1.8vw,17px)", color: C.paper, opacity: 0.35, letterSpacing: "0.04em", lineHeight: 1.6 }}>{line}</div>
        ))}
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(16px,2vw,20px)", fontStyle: "italic", color: C.terracotta, marginTop: 14, lineHeight: 1.5, whiteSpace: "pre-line" }}>{block.punchline}</div>
      </div>
    );
  }

  if (block.variant === "time") {
    return (
      <div style={base}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(24px,4.5vw,40px)", color: C.paper, letterSpacing: "0.02em", lineHeight: 1.15 }}>{block.number}</div>
        {block.lines.map((line, i) => (
          <div key={i} style={{ fontFamily: "'EB Garamond',serif", fontSize: 16, fontStyle: "italic", color: C.tertGrey, lineHeight: 1.6, marginTop: i === 0 ? 12 : 0 }}>{line}</div>
        ))}
      </div>
    );
  }

  if (block.variant === "hook") {
    return (
      <div style={{ ...base, maxWidth: 560, textAlign: "left" }}>
        <div style={{
          fontFamily: "'Playfair Display',serif", fontSize: "clamp(16px,2vw,19px)",
          fontStyle: "italic", color: C.paper, opacity: 0.8,
          lineHeight: 1.7, whiteSpace: "pre-line",
          borderLeft: `3px solid ${C.terracotta}`,
          paddingLeft: 20,
        }}>{block.text}</div>
      </div>
    );
  }

  return null;
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AGENTS_URL}/reports`);
        if (!res.ok) return;
        setReports(await res.json());
      } catch {}
    })();
  }, []);

  /* Demo animation data — use best pipeline report or fallback */
  const demoReport = reports.find((r) => r.results?.renovation_visualisation?.exteriors?.length);
  const demoImage = demoReport?.results?.renovation_visualisation?.exteriors?.[0]?.originalUrl ?? "/House_1/slot4.jpg";
  const demoAfterImage = demoReport?.results?.renovation_visualisation?.exteriors?.[0]?.renovatedUrl ?? "/House_1/slot4.jpg";
  const demoInteriorImage = demoReport?.results?.renovation_visualisation?.interiors?.[0]?.originalUrl ?? null;
  const demoInteriorAfterImage = demoReport?.results?.renovation_visualisation?.interiors?.[0]?.renovatedUrl ?? null;
  const demoEnv = demoReport?.results?.cost_estimate?.totalEnvelope;
  const demoCost = demoEnv ? `\u00A3${Math.round((demoEnv.low ?? 0) / 1000)}K \u2013 \u00A3${Math.round((demoEnv.high ?? 0) / 1000)}K` : null;
  const demoName = demoReport?.listing?.address?.split(",")[0]?.trim() ?? null;

  /* Property cards for CTA grid */
  const gridCards = reportsToGridCards(reports);
  const hasGrid = gridCards.length >= 4;

  /* Email submit */
  async function submitEmail() {
    if (!email || !email.includes("@")) {
      setFormError(true);
      setTimeout(() => setFormError(false), 1400);
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${AGENTS_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setDone(true);
    setSubmitting(false);
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="piega-page">

        {/* ────────────────────────────────────────────────────────────
            ZONE 1 — HERO (compact typographic promise)
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(24px,4vh,40px) 24px clamp(20px,3vh,32px)", textAlign: "center" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent, marginBottom: "clamp(16px,3vh,28px)" }}>Piega</div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, color: C.paper, lineHeight: 1.15, margin: "0 0 6px" }}>
              The estate agent told you a story.
            </h1>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,4.5vw,44px)", fontStyle: "italic", color: C.terracotta, lineHeight: 1.2, margin: "8px 0 16px" }}>
              We tell you the building.
            </div>
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(15px,1.6vw,18px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 auto 12px", maxWidth: 520 }}>
              Paste any Rightmove link. In 90 seconds, know whether the building behind those photos is worth your time {"\u2014"} what it needs, what it costs, and what it could become.
            </p>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, letterSpacing: "0.04em", lineHeight: 1.8 }}>
              {"Install \u00B7 Browse Rightmove \u00B7 Click \u201CAnalyse\u201D \u00B7 Full report in 90 seconds"}
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 2 — DEMO ANIMATION (how it works)
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(20px,3vw,40px) 24px" }}>
          <DemoAnimation
            demoImage={demoImage}
            demoAfterImage={demoAfterImage}
            demoInteriorImage={demoInteriorImage}
            demoInteriorAfterImage={demoInteriorAfterImage}
            demoCost={demoCost}
            demoName={demoName}
          />
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 3 — CONFRONTATION TEXT
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(40px,6vh,64px) 24px clamp(32px,4vh,48px)", borderTop: `1px solid ${C.bd}` }}>
          <TextBreak block={TEXT_BLOCKS[0]} />
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 4 — SPLIT: CTA left + slider cards right
            ──────────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.bd}` }}>
          {hasGrid ? (
            <div className="piega-split">
              {/* Left — sticky CTA */}
              <div className="piega-split-cta">
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,3vw,28px)", fontWeight: 700, color: C.paper, margin: "0 0 12px", textAlign: "left" }}>
                  See what your building is hiding.
                </h2>
                <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(14px,1.4vw,16px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 0 24px", textAlign: "left" }}>
                  {"Piega lives on Rightmove. Install the extension. Browse any listing. Click once. The full reading arrives before you\u2019ve finished your tea."}
                </p>

                {/* Chrome extension card */}
                <div className="piega-desktop-only" style={{ background: C.darkMid, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "16px 20px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: C.darkCard, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.bd}`, flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontStyle: "italic", color: C.accent }}>P</span>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: C.paper }}>Add Piega to Chrome</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.tertGrey }}>{"Free \u00B7 No signup \u00B7 10 seconds"}</div>
                    </div>
                  </div>
                  <a href="#chrome-store" style={{ display: "block", padding: "9px 14px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: C.paper, letterSpacing: "0.1em", textDecoration: "none" }}>
                    {"ADD TO CHROME \u2192"}
                  </a>
                </div>

                {/* Mobile */}
                <div className="piega-mobile-only" style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: C.tertGrey, lineHeight: 1.7, margin: "0 0 6px" }}>
                    Chrome extension {"\u00B7"} Desktop only.
                  </p>
                </div>

                {/* Email */}
                <div className="piega-desktop-only" style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.warmGrey, opacity: 0.5, margin: "0 0 10px" }}>{"\u2014 or \u2014"}</div>
                <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 13, color: C.warmGrey, margin: "0 0 10px", textAlign: "left" }}>
                  Not ready? Leave your email.
                </p>
                {done ? (
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.terracotta, letterSpacing: "0.04em" }}>DONE.</div>
                    <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 13, color: C.tertGrey, marginTop: 4 }}>{"We\u2019ll be in touch."}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 0 }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                      placeholder="your@email.com"
                      style={{
                        flex: 1, padding: "9px 12px", border: `1px solid ${formError ? C.terracotta : C.bd}`,
                        borderRight: "none", borderRadius: "4px 0 0 4px",
                        background: C.darkMid, color: C.paper,
                        fontFamily: "'EB Garamond',serif", fontSize: 14,
                        outline: "none", transition: "border-color 0.3s",
                      }}
                    />
                    <button
                      onClick={submitEmail}
                      disabled={submitting}
                      style={{
                        padding: "9px 14px", border: "none", borderRadius: "0 4px 4px 0",
                        background: C.terracotta, color: C.paper, cursor: "pointer",
                        fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, letterSpacing: "0.1em",
                        opacity: submitting ? 0.5 : 1, transition: "opacity 0.2s",
                      }}
                    >
                      {submitting ? "\u2026" : "NOTIFY ME"}
                    </button>
                  </div>
                )}
                <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 11, color: C.warmGrey, opacity: 0.4, marginTop: 10, textAlign: "left" }}>
                  No payment. No signup. Just the building.
                </p>
              </div>

              {/* Right — slider card grid */}
              <div className="piega-split-grid-wrap">
                {/* Freshness line */}
                {(() => {
                  const dates = gridCards.map(c => c.createdAt).filter(Boolean).map(d => new Date(d));
                  if (!dates.length) return null;
                  const newest = Math.max(...dates);
                  const oldest = Math.min(...dates);
                  const spanDays = Math.max(1, Math.round((newest - oldest) / 86400000));
                  return (
                    <div style={{ padding: "0 0 10px", fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.warmGrey, opacity: 0.6, letterSpacing: "0.02em" }}>
                      {gridCards.length} {gridCards.length === 1 ? "report" : "reports"} {"\u00B7"} generated in the last {spanDays} {spanDays === 1 ? "day" : "days"} by Piega users
                    </div>
                  );
                })()}
                <div className="piega-card-grid">
                  {gridCards.map((card, i) => (
                    <MiniSliderCard key={`gc-${i}`} card={card} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Fallback: centred CTA */
            <div style={{ padding: "clamp(32px,5vh,56px) 24px", textAlign: "center" }}>
              <div style={{ maxWidth: 540, margin: "0 auto" }}>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,30px)", fontWeight: 700, color: C.paper, margin: "0 0 12px" }}>
                  See what your building is hiding.
                </h2>
                <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(15px,1.5vw,17px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 0 24px" }}>
                  {"Piega lives on Rightmove. Install the extension. Browse any listing. Click once. The full reading arrives before you\u2019ve finished your tea."}
                </p>
                <div className="piega-desktop-only" style={{ background: C.darkMid, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "20px 24px", marginBottom: 16, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: C.darkCard, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.bd}`, flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent }}>P</span>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: C.paper }}>Add Piega to Chrome</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.tertGrey }}>{"Free \u00B7 No signup \u00B7 10 seconds"}</div>
                    </div>
                  </div>
                  <a href="#chrome-store" style={{ display: "block", padding: "10px 16px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: C.paper, letterSpacing: "0.1em", textDecoration: "none" }}>
                    {"ADD TO CHROME \u2192"}
                  </a>
                </div>
                <div className="piega-mobile-only" style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.tertGrey, lineHeight: 1.7, margin: "0 0 6px" }}>
                    Chrome extension {"\u00B7"} Desktop only.
                  </p>
                </div>
                <div className="piega-desktop-only" style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.warmGrey, opacity: 0.5, margin: "0 0 16px" }}>{"\u2014 or \u2014"}</div>
                <p className="piega-desktop-only" style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: C.warmGrey, margin: "0 0 12px" }}>
                  Not ready? Leave your email.
                </p>
                {done ? (
                  <div style={{ padding: "16px 0" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: C.terracotta, letterSpacing: "0.04em" }}>DONE.</div>
                    <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: C.tertGrey, marginTop: 8 }}>{"We\u2019ll be in touch."}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 0, maxWidth: 380, margin: "0 auto" }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                      placeholder="your@email.com"
                      style={{
                        flex: 1, padding: "10px 14px", border: `1px solid ${formError ? C.terracotta : C.bd}`,
                        borderRight: "none", borderRadius: "4px 0 0 4px",
                        background: C.darkMid, color: C.paper,
                        fontFamily: "'EB Garamond',serif", fontSize: 15,
                        outline: "none", transition: "border-color 0.3s",
                      }}
                    />
                    <button
                      onClick={submitEmail}
                      disabled={submitting}
                      style={{
                        padding: "10px 18px", border: "none", borderRadius: "0 4px 4px 0",
                        background: C.terracotta, color: C.paper, cursor: "pointer",
                        fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: "0.1em",
                        opacity: submitting ? 0.5 : 1, transition: "opacity 0.2s",
                      }}
                    >
                      {submitting ? "\u2026" : "NOTIFY ME"}
                    </button>
                  </div>
                )}
                <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, opacity: 0.5, marginTop: 12 }}>
                  No payment. No signup. Just the building.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 5 — EDITORIAL BEATS (two remaining text breaks)
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(40px,6vh,56px) 24px", display: "flex", flexDirection: "column", gap: "clamp(40px,6vh,56px)", borderTop: `1px solid ${C.bd}` }}>
          <TextBreak block={TEXT_BLOCKS[1]} />
          <TextBreak block={TEXT_BLOCKS[2]} />
        </div>

        {/* ────────────────────────────────────────────────────────────
            FOOTER
            ──────────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${C.bd}`, padding: "clamp(32px,5vh,48px) 24px clamp(24px,3vh,32px)", textAlign: "center" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            {/* Wordmark */}
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontStyle: "italic", color: C.accent, marginBottom: 12 }}>Piega.</div>

            {/* One-line promise */}
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(14px,1.4vw,16px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 0 20px" }}>
              Classification. Renovation vision. Cost estimate. Narrative.{"\n"}One Rightmove link, 90 seconds, the full reading.
            </p>

            {/* Secondary CTA — email for those who scrolled past the main one */}
            {!done && (
              <div style={{ maxWidth: 340, margin: "0 auto 20px" }}>
                <div style={{ display: "flex", gap: 0 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                    placeholder="your@email.com"
                    style={{
                      flex: 1, padding: "9px 12px", border: `1px solid ${formError ? C.terracotta : C.bd}`,
                      borderRight: "none", borderRadius: "4px 0 0 4px",
                      background: C.darkMid, color: C.paper,
                      fontFamily: "'EB Garamond',serif", fontSize: 14,
                      outline: "none", transition: "border-color 0.3s",
                    }}
                  />
                  <button
                    onClick={submitEmail}
                    disabled={submitting}
                    style={{
                      padding: "9px 14px", border: "none", borderRadius: "0 4px 4px 0",
                      background: C.terracotta, color: C.paper, cursor: "pointer",
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, letterSpacing: "0.1em",
                      opacity: submitting ? 0.5 : 1, transition: "opacity 0.2s",
                    }}
                  >
                    NOTIFY ME
                  </button>
                </div>
              </div>
            )}
            {done && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: C.terracotta, letterSpacing: "0.04em" }}>DONE.</span>
                <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 13, color: C.tertGrey, marginLeft: 8 }}>{"We\u2019ll be in touch."}</span>
              </div>
            )}

            {/* Links */}
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.warmGrey, letterSpacing: "0.04em", marginBottom: 16 }}>
              <a href="/pipeline" style={{ color: C.accent, textDecoration: "none", opacity: 0.7 }}>Pipeline Hub</a>
              <span style={{ opacity: 0.3, margin: "0 10px" }}>{"\u00B7"}</span>
              <a href="#chrome-store" className="piega-desktop-only" style={{ color: C.accent, textDecoration: "none", opacity: 0.7 }}>Add to Chrome</a>
            </div>

            {/* Legal line */}
            <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, opacity: 0.4, lineHeight: 1.7 }}>
              {"Property intelligence \u00B7 United Kingdom"}
              <br />
              Not affiliated with any estate agent. That is the point.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
