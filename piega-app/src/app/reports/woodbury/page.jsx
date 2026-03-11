"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { Reveal, Slab, Verse, Cap, Lab, Photo, BeforeAfterReal } from "@/components/report/Shared";
import { ContextMap, CrossSection, FloorPlans, StreetElevation, SunStudy, EnergyLoss, ConditionMatrix, PriceGap, BudgetBars, Scenarios, MaterialPalette } from "@/components/report/Report1Schemas";
import LoadingSpinner from "@/components/LoadingSpinner";

const IMG_BEFORE = "/House_1/c9dda2ccfb09120044be4144198a6603.jpeg";
const IMG_SLOT2 = "/House_1/slot2.jpg";
const IMG_SLOT3 = "/House_1/slot3.jpg";
const IMG_SLOT4 = "/House_1/c9dda2ccfb09120044be4144198a6603.jpeg";
const IMG_SLOT5 = "/House_1/slot5.jpg";
const IMG_SLOT6 = "/House_1/slot6.jpg";

export default function WoodburyReport() {
  const [loaded, setLoaded] = useState(false);
  const [spinnerDone, setSpinnerDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!spinnerDone) {
    return <LoadingSpinner onComplete={() => setSpinnerDone(true)} />;
  }

  const stats = [
    { v: "£340K+", s: "guide", c: C.accentDark },
    { v: "109 SQM", s: "1,175 sqft" },
    { v: "4 BED", s: "+ reception" },
    { v: "VACANT", s: "no chain" },
    { v: "25 MIN", s: "to London" },
  ];

  const costs = [
    { l: "Purchase (guide)", lo: 340, hi: 365, c: C.accentDark },
    { l: "Stamp + legal + premium", lo: 14, hi: 20, c: C.warmGrey },
    { l: "Completion works", lo: 22, hi: 62, c: C.terracotta },
  ];
  const totalLo = costs.reduce((a, b) => a + b.lo, 0);
  const totalHi = costs.reduce((a, b) => a + b.hi, 0);

  return (
    <div style={{ background: C.dark, minHeight: "100vh", color: C.paper, overflowX: "hidden" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ padding: "24px 0 0", opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}>
          <Link href="/" style={{ fontFamily: "'Playfair Display',serif", fontSize: "14px", fontStyle: "italic", color: C.accentDark, letterSpacing: "0.02em", textDecoration: "none" }}>Piega</Link>
        </div>

        {/* Hero */}
        <div style={{ padding: "48px 0 0" }}>
          <Reveal><Lab color={C.terracotta}>AUCTION · 18 MARCH 2026 · 09:30</Lab></Reveal>
          <Reveal delay={0.08}>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(34px,5vw,48px)", fontWeight: 400, color: C.paper, margin: "8px 0 0", lineHeight: 1.08 }}>Woodbury</h1>
          </Reveal>
          <Reveal delay={0.13}>
            <Cap style={{ fontSize: "12px", color: C.warmGrey, marginTop: "8px" }}>Woodbury Hill Path, Luton, LU2 7JR · 4 bed · Detached · Split-level · Freehold</Cap>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
              {stats.map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(17px,2.8vw,22px)", letterSpacing: "0.05em", color: s.c || C.paper }}>{s.v}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "9px", color: C.warmGrey, letterSpacing: "0.05em" }}>{s.s}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Main photo */}
        <Reveal style={{ marginTop: "36px" }}>
          <Photo src={IMG_BEFORE} aspect="16/10" tag="THE APPROACH · LISTING PHOTO" />
        </Reveal>

        <Reveal>
          <Verse>It doesn't look like the houses around it. It never did. A white render box set against a hillside, with a glass reception room you can only see if you walk around the back. The listing calls it a four-bedroom detached. That's technically accurate. But it misses the point.</Verse>
        </Reveal>

        <Reveal><ContextMap /></Reveal>
        <Reveal><StreetElevation /></Reveal>

        <Reveal><Slab>The view.</Slab></Reveal>
        <Reveal>
          <Photo src={IMG_SLOT2} aspect="21/9" tag="FROM THE DESK · 147M ELEVATION" />
        </Reveal>
        <Reveal>
          <Verse>One hundred and forty-seven metres above sea level. You can see the whole Luton valley from the lower ground reception room. On a clear day, you can see past the airport. The listing doesn't mention this. It mentions the kitchen.
            <span style={{ display: "block", marginTop: "10px", fontStyle: "normal", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(13px,2vw,16px)", color: C.terracotta, letterSpacing: "0.04em", textTransform: "uppercase" }}>This view is not in the listing price. It should be.</span>
          </Verse>
        </Reveal>

        <Reveal><CrossSection /></Reveal>
        <Reveal><FloorPlans /></Reveal>
        <Reveal><SunStudy /></Reveal>

        <Reveal><Slab>The room below.</Slab></Reveal>
        <Reveal>
          <Photo src={IMG_SLOT3} aspect="3/4" tag="RECEPTION · 16 SQM" style={{ maxWidth: "440px" }} />
        </Reveal>
        <Reveal>
          <Verse>Sixteen square metres. One wall is entirely glass. The floor is polished concrete — poured, not tiled. Bifold doors open onto a terrace that hangs above the hillside. This is the room the estate agent didn't photograph from the right angle. You need to stand in it at 4pm in November.</Verse>
        </Reveal>

        <Reveal>
          <BeforeAfterReal label="DRAG · THE GARDEN QUESTION" beforeSrc={IMG_BEFORE} afterSrc={IMG_SLOT4} />
        </Reveal>

        <Reveal><MaterialPalette /></Reveal>

        <Reveal><Slab>The rooms above.</Slab></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <Reveal><Photo src={IMG_SLOT5} aspect="16/9" tag="KITCHEN · 5.7 × 2.3M" /></Reveal>
          <Reveal delay={0.08}><Photo src={IMG_SLOT6} aspect="4/5" tag="LOUNGE DINER · 5.7 × 4.4M" /></Reveal>
        </div>
        <Reveal>
          <Verse>It's a galley kitchen. Functional, not generous. The lounge diner is better — full-width windows on the south face, the kind of afternoon light that makes a room feel twice its size. Both rooms have been finished but not finished properly. Someone stopped about 80% of the way through.</Verse>
        </Reveal>

        {/* Divider */}
        <div style={{ width: "40px", height: "1px", background: C.accentDark, opacity: 0.2, margin: "28px 0" }} />

        <Reveal><Slab>Someone started something here. The question is why they stopped.</Slab></Reveal>

        <Reveal><EnergyLoss /></Reveal>
        <Reveal><ConditionMatrix /></Reveal>

        <Reveal>
          <Verse>New render, new windows, new roof. The building has been touched but not completed. The lower ground reception is behind a retaining wall — there's no evidence of a damp-proof membrane. The legal pack will tell you more than the photos.
            <span style={{ display: "block", marginTop: "8px", fontStyle: "normal", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(12px,1.8vw,15px)", color: C.terracotta, letterSpacing: "0.04em", textTransform: "uppercase" }}>The legal pack will tell you what the photos cannot.</span>
          </Verse>
        </Reveal>

        <Reveal><PriceGap /></Reveal>
        <Reveal><Scenarios /></Reveal>
        <Reveal><BudgetBars /></Reveal>

        {/* Total box */}
        <Reveal>
          <div style={{ background: C.darkCard, borderRadius: "4px", padding: "16px", margin: "24px 0" }}>
            {costs.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ width: "140px", fontFamily: "'Inter',sans-serif", fontSize: "9px", color: C.warmGrey, flexShrink: 0 }}>{c.l}</div>
                <div style={{ flex: 1 }}><div style={{ height: "3px", background: c.c, opacity: 0.35, borderRadius: "2px", width: `${(c.hi / 450) * 100}%`, minWidth: "4px" }} /></div>
                <div style={{ width: "68px", textAlign: "right", fontFamily: "'Bebas Neue',sans-serif", fontSize: "10px", color: c.c, flexShrink: 0 }}>£{c.lo}–{c.hi}K</div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.warmGrey}10`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Cap>Total envelope</Cap>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,32px)", color: C.paper }}>£{totalLo}K – £{totalHi}K</span>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Verse>The question was never whether you can afford the house. It's whether you can afford the house and what comes next. This one comes with a view, a problem, and a decision. Not in that order.</Verse>
        </Reveal>

        <Reveal>
          <Verse style={{ color: C.warmGrey, fontSize: "clamp(13px,2vw,16px)" }}>Someone else's unfinished project. / Possibly your perfect beginning.</Verse>
        </Reveal>

        {/* Divider */}
        <div style={{ width: "40px", height: "1px", background: C.accentDark, opacity: 0.2, margin: "36px auto" }} />

        {/* Gate */}
        <Reveal>
          <div style={{ textAlign: "center", padding: "14px 0 64px" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(16px,2.8vw,20px)", color: C.paper, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "6px" }}>You read this far.</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "13px", fontStyle: "italic", color: C.warmGrey, maxWidth: "340px", margin: "0 auto 20px", lineHeight: 1.5 }}>This is one building. Yours is different.</div>
            <div style={{ display: "flex", maxWidth: "320px", margin: "0 auto", gap: "6px" }}>
              <input type="email" placeholder="your@email.com" style={{ flex: 1, height: "38px", background: C.darkMid, border: `1px solid ${C.lightGrey}24`, borderRadius: "4px", color: C.paper, fontFamily: "'EB Garamond',serif", fontSize: "13px", padding: "0 12px", outline: "none" }} />
              <button style={{ height: "38px", padding: "0 14px", background: "transparent", border: `1px solid ${C.accentDark}`, borderRadius: "4px", color: C.accentDark, fontFamily: "'Bebas Neue',sans-serif", fontSize: "11px", letterSpacing: "0.08em", cursor: "pointer" }}>SEND IT</button>
            </div>
            <Cap style={{ marginTop: "36px", opacity: 0.28 }}>Not affiliated with any estate agent. That is the point.</Cap>
          </div>
        </Reveal>

      </div>
    </div>
  );
}
