"use client";
import { useState, useEffect } from "react";
import { C } from "@/lib/theme";
import { AGENTS_URL } from "@/lib/config";
import { STYLES } from "@/components/landing/styles";
import { reportToBlocks, TEXT_BLOCKS } from "@/components/landing/data";
import MosaicBlock from "@/components/landing/MosaicBlocks";
import DemoAnimation from "@/components/landing/DemoAnimation";

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

  /* Build mosaic blocks */
  const dataBlocks = reports.flatMap(reportToBlocks);
  const seen = new Set();
  const uniqueBlocks = dataBlocks.filter((b) => {
    const key = b.image ?? b.afterImage ?? b.videoUrl ?? b.number ?? b.text ?? "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* Interleave hardcoded text blocks every ~5 data blocks */
  const allBlocks = [];
  const texts = [...TEXT_BLOCKS];
  let ti = 0;
  for (let i = 0; i < uniqueBlocks.length; i++) {
    allBlocks.push({ ...uniqueBlocks[i], _key: `d-${i}` });
    if ((i + 1) % 5 === 0 && ti < texts.length) {
      allBlocks.push(texts[ti++]);
    }
  }
  while (ti < texts.length) allBlocks.push(texts[ti++]);

  // If zero data blocks, still show text blocks
  const hasMosaic = allBlocks.length > 0;

  /* Demo animation data — use best pipeline report or fallback */
  const demoReport = reports.find((r) => r.results?.renovation_visualisation?.exteriors?.length);
  const demoImage = demoReport?.results?.renovation_visualisation?.exteriors?.[0]?.originalUrl ?? "/House_1/slot4.jpg";
  const demoAfterImage = demoReport?.results?.renovation_visualisation?.exteriors?.[0]?.renovatedUrl ?? "/House_1/slot4.jpg";
  const demoEnv = demoReport?.results?.cost_estimate?.totalEnvelope;
  const demoCost = demoEnv ? `\u00A3${Math.round((demoEnv.low ?? 0) / 1000)}K \u2013 \u00A3${Math.round((demoEnv.high ?? 0) / 1000)}K` : null;
  const demoName = demoReport?.listing?.address?.split(",")[0]?.trim() ?? null;

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
            ZONE 1 — HERO (compact — mosaic peeks above fold)
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(24px,4vh,40px) 24px clamp(20px,3vh,32px)", textAlign: "center" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {/* Wordmark */}
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent, marginBottom: "clamp(16px,3vh,28px)" }}>Piega</div>

            {/* Headline */}
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, color: C.paper, lineHeight: 1.15, margin: "0 0 6px" }}>
              The estate agent told you a story.
            </h1>

            {/* Italic line */}
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,4.5vw,44px)", fontStyle: "italic", color: C.terracotta, lineHeight: 1.2, margin: "8px 0 16px" }}>
              We tell you the building.
            </div>

            {/* What it actually does — clear product statement */}
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(15px,1.6vw,18px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 auto 12px", maxWidth: 520 }}>
              A Chrome extension that reads any Rightmove listing and gives you the full picture: architectural reading, renovation concept, and cost estimate {"\u2014"} in 90 seconds.
            </p>

            {/* How it works in one line */}
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, letterSpacing: "0.04em", lineHeight: 1.8 }}>
              {"Install · Browse Rightmove · Click \u201CAnalyse\u201D · Full report in 90 seconds"}
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 2 — MOSAIC (no background change — stays dark)
            ──────────────────────────────────────────────────────────── */}
        {hasMosaic && (
          <div style={{ padding: "clamp(16px,3vw,32px) 0" }}>
            <div className="piega-mosaic">
              {allBlocks.map((block, i) => (
                <MosaicBlock key={block._key ?? `b-${i}`} block={block} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────
            ZONE 3 — DEMO ANIMATION
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(20px,3vw,40px) 24px" }}>
          <DemoAnimation
            demoImage={demoImage}
            demoAfterImage={demoAfterImage}
            demoCost={demoCost}
            demoName={demoName}
          />
        </div>

        {/* ────────────────────────────────────────────────────────────
            ZONE 4 — CHROME EXTENSION CTA + EMAIL CAPTURE
            ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: "clamp(32px,5vh,56px) 24px", textAlign: "center", borderTop: `1px solid ${C.bd}` }}>
          <div style={{ maxWidth: 540, margin: "0 auto" }}>

            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,30px)", fontWeight: 700, color: C.paper, margin: "0 0 12px" }}>
              See what your building is hiding.
            </h2>
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: "clamp(15px,1.5vw,17px)", color: C.tertGrey, lineHeight: 1.7, margin: "0 0 24px" }}>
              {"Piega lives on Rightmove. Install the extension. Browse any listing. Click once. The full reading arrives before you\u2019ve finished your tea."}
            </p>

            {/* Desktop — Chrome extension card */}
            <div className="piega-desktop-only" style={{ background: C.darkMid, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "20px 24px", marginBottom: 16, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: C.darkCard, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.bd}`, flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent }}>P</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: C.paper }}>Add Piega to Chrome</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.tertGrey }}>{"Free · No signup · 10 seconds"}</div>
                </div>
              </div>
              <a href="#chrome-store" style={{ display: "block", padding: "10px 16px", background: C.terracotta, borderRadius: 4, textAlign: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: C.paper, letterSpacing: "0.1em", textDecoration: "none", transition: "opacity 0.2s" }}>
                {"ADD TO CHROME →"}
              </a>
            </div>

            {/* Desktop — 4 quiet steps */}
            <div className="piega-desktop-only" style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, lineHeight: 2, marginBottom: 20 }}>
              {"\u2460 Add to Chrome  ·  \u2461 Browse Rightmove  ·  \u2462 Click \u201CAnalyse\u201D  ·  \u2463 Full reading in 90s"}
            </div>

            {/* Mobile — explain desktop-only */}
            <div className="piega-mobile-only" style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.tertGrey, lineHeight: 1.7, margin: "0 0 6px" }}>
                Piega is a Chrome extension that reads any Rightmove listing and shows you what the estate agent left out.
              </p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.warmGrey, margin: "0 0 12px" }}>Currently desktop only.</p>
              <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 15, color: C.paper, margin: "0 0 16px" }}>
                Send yourself the link and try it tonight.
              </p>
            </div>

            {/* Divider */}
            <div className="piega-desktop-only" style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.warmGrey, opacity: 0.5, margin: "0 0 16px" }}>{"\u2014 or \u2014"}</div>

            <p className="piega-desktop-only" style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: C.warmGrey, margin: "0 0 12px" }}>
              Not ready to install? Leave your email.
            </p>

            {/* Email capture */}
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

            {/* Sub-note */}
            <p style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, opacity: 0.5, marginTop: 12 }}>
              No payment. No signup. Just the building.
            </p>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            FOOTER
            ──────────────────────────────────────────────────────────── */}
        <footer style={{ padding: "28px 24px 24px", textAlign: "center", borderTop: `1px solid ${C.bd}` }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontStyle: "italic", color: C.accent, marginBottom: 6 }}>Piega.</div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, marginBottom: 3 }}>
            {"Property intelligence · United Kingdom"}
          </div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 12, color: C.warmGrey, opacity: 0.5 }}>
            Not affiliated with any estate agent. That is the point.
          </div>
        </footer>

      </div>
    </>
  );
}
