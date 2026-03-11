"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { Reveal, Slab, Verse, Cap, Lab, Photo, BeforeAfterReal } from "@/components/report/Shared";
import { ContextMap, CrossSection, FloorPlans, StreetElevation, SunStudy, ThatchLifecycle, ConditionMatrix, PriceGap, BudgetBars, Scenarios, MaterialPalette } from "@/components/report/Report2Schemas";
import LoadingSpinner from "@/components/LoadingSpinner";

const IMG_SLOT1 = "/images/report2-slot1.svg";
const IMG_SLOT2 = "/images/report2-slot2.svg";
const IMG_SLOT3 = "/images/report2-slot3.svg";
const IMG_SLOT4B = "/images/report2-slot4b.svg";
const IMG_BEFORE_AGA = "/images/report2-before-aga.svg";
const IMG_SLOT5 = "/images/report2-slot5.svg";
const IMG_SLOT6 = "/images/report2-slot6.svg";

export default function CherryReport() {
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
    { v: "£200K", s: "guide", c: C.accentDark },
    { v: "GRADE II", s: "listed", c: C.terracotta },
    { v: "2 BED", s: "+ extension" },
    { v: "0.2 ACRE", s: "garden + woodland" },
    { v: "10 MI", s: "to Dorchester" },
  ];

  const costs = [
    { l: "Purchase (guide)", lo: 200, hi: 220, c: C.accentDark },
    { l: "Stamp + legal + premium", lo: 8, hi: 14, c: C.warmGrey },
    { l: "Essential works", lo: 47, hi: 120, c: C.terracotta },
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
          <Reveal><Lab color={C.terracotta}>AUCTION · DIGBY HALL, SHERBORNE</Lab></Reveal>
          <Reveal delay={0.08}>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(34px,5vw,48px)", fontWeight: 400, color: C.paper, margin: "8px 0 0", lineHeight: 1.08 }}>Cherry Cottage</h1>
          </Reveal>
          <Reveal delay={0.13}>
            <Cap style={{ fontSize: "12px", color: C.warmGrey, marginTop: "8px" }}>Alton Pancras, Dorchester, Dorset, DT2 7RW · 2 bed · Detached · Thatched · Freehold</Cap>
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
          <Photo src={IMG_SLOT1} aspect="2.2/1" tag="THE APPROACH · FROM THE LANE" />
        </Reveal>

        <Reveal>
          <Verse>Three hundred and eighty people live in this valley. The nearest town is ten miles away. The lane is single-track. There is no broadband beyond satellite. There is also a thatched cottage with an inglenook fireplace, Georgian panelling, and a south-facing garden that runs into woodland. That is the trade.</Verse>
        </Reveal>

        <Reveal><ContextMap /></Reveal>
        <Reveal><StreetElevation /></Reveal>

        <Reveal>
          <Verse style={{ color: C.warmGrey, fontSize: "clamp(13px,2vw,16px)" }}>
            Alton Pancras. Population: 380. One church. No pub. The kind of village that people from cities describe as "remote" and people who live there describe as "home." <span style={{ fontFamily: "'Bebas Neue',sans-serif", color: C.terracotta, letterSpacing: "0.08em" }}>THIS IS A LIFE YOU HAVE TO MEAN.</span>
          </Verse>
        </Reveal>

        <Reveal><Slab>The front door.</Slab></Reveal>
        <Reveal>
          <Photo src={IMG_SLOT2} aspect="3/4" tag="ENTRANCE · INGLENOOK · FLAGSTONE" style={{ maxWidth: "440px" }} />
        </Reveal>
        <Reveal>
          <Verse>The flagstones are cold underfoot in the morning. The inglenook is original — 18th century, possibly earlier. The ceilings are low. The beams are exposed. None of this is a problem. All of this is the building.</Verse>
        </Reveal>

        <Reveal><FloorPlans /></Reveal>
        <Reveal><CrossSection /></Reveal>
        <Reveal><SunStudy /></Reveal>

        <Reveal><Slab>The room that matters.</Slab></Reveal>
        <Reveal>
          <Photo src={IMG_SLOT3} aspect="16/9" tag="PANELLED ROOM · GEORGIAN · DAMP VISIBLE" />
        </Reveal>
        <Reveal>
          <Verse>
            The panelling is Georgian. The damp behind it is older. You can see the moisture mark at skirting level in the listing photos — they didn't try to hide it, which is either honesty or oversight.
            <br /><br />
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "12px", color: C.warmGrey, fontStyle: "normal" }}>Listed Building Consent is required before any remedial work can begin. The process takes 8–16 weeks. Budget for lime plaster, not plasterboard.</span>
          </Verse>
        </Reveal>

        <Reveal>
          <BeforeAfterReal label="DRAG · THE PANELLED ROOM" beforeSrc={IMG_SLOT3} afterSrc={IMG_SLOT4B} />
        </Reveal>

        <Reveal><Slab>The room someone actually lived in.</Slab></Reveal>
        <Reveal>
          <BeforeAfterReal label="DRAG · THE AGA KITCHEN" beforeSrc={IMG_BEFORE_AGA} afterSrc={IMG_SLOT3} />
        </Reveal>
        <Reveal>
          <Verse>
            The AGA is original. The kitchen was updated at some point in the 1990s — you can tell by the cabinet doors and the tiles behind the sink. Neither is worth keeping. But the layout is good and the AGA makes the room.
            <br /><br />
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "12px", color: C.warmGrey, fontStyle: "normal" }}>The AGA was recently serviced. Conversion to oil or electric is possible but requires specialist consent given the listed status.</span>
          </Verse>
        </Reveal>

        <Reveal><Slab>Upstairs. Under the thatch.</Slab></Reveal>
        <Reveal>
          <Photo src={IMG_SLOT5} aspect="16/10" tag="BEDROOM · NO HEATING · UNDER THATCH" />
        </Reveal>
        <Reveal>
          <Verse>
            Someone put an electric heater on the floor of the main bedroom. That tells you everything you need to know about the heating situation. There is none. There has never been any. The previous occupants managed with the AGA, the inglenook, and the electric heater on the floor.
            <br /><br />
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", color: C.terracotta, letterSpacing: "0.08em", fontSize: "clamp(12px,2vw,15px)" }}>INSTALLING CENTRAL HEATING IN A LISTED BUILDING REQUIRES CONSENT AND SPECIALIST CONTRACTORS. BUDGET £8,000–£15,000 AND 12 MONTHS.</span>
          </Verse>
        </Reveal>

        <Reveal>
          <Photo src={IMG_SLOT6} aspect="16/9" tag="GARDEN · 0.2 ACRES · WOODLAND" />
        </Reveal>
        <Reveal>
          <Verse>The garden runs south-east. It gets afternoon light until late in the day. Beyond the lawn is a strip of woodland — technically part of the title. There are no rights of way across it. Nobody is going to build behind you.</Verse>
        </Reveal>

        <Reveal><MaterialPalette /></Reveal>

        {/* Divider */}
        <div style={{ width: "40px", height: "1px", background: C.accentDark, opacity: 0.2, margin: "28px 0" }} />

        <Reveal>
          <Slab>Listed Grade II.<br />Everything you want to change, you must first ask permission to change.</Slab>
        </Reveal>

        <Reveal><ThatchLifecycle /></Reveal>
        <Reveal><ConditionMatrix /></Reveal>

        <Reveal>
          <Verse>
            The thatch is the building. Not a feature, not a selling point — the actual structural roof covering. If it fails, the building fails. You need a thatching survey before you bid.
            <br /><br />
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", color: C.terracotta, letterSpacing: "0.08em", fontSize: "clamp(12px,2vw,15px)" }}>A THATCH SURVEY BEFORE AUCTION IS NOT OPTIONAL.</span>
          </Verse>
        </Reveal>

        <Reveal><PriceGap /></Reveal>
        <Reveal><Scenarios /></Reveal>
        <Reveal><BudgetBars /></Reveal>

        {/* Total box */}
        <div style={{ background: C.darkCard, borderRadius: "4px", padding: "16px", margin: "24px 0" }}>
          {costs.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: "9px", color: C.warmGrey }}>{c.l}</span>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "12px", color: c.c }}>£{c.lo}K – £{c.hi}K</span>
            </div>
          ))}
          <div style={{ height: "1px", background: C.bd, margin: "10px 0" }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,32px)", color: C.paper, textAlign: "right" }}>
            £{totalLo}K – £{totalHi}K
          </div>
          <Cap style={{ textAlign: "right" }}>total cost to own and make habitable</Cap>
        </div>

        <Reveal>
          <Verse>A Grade II thatched cottage in an Area of Outstanding Natural Beauty, 10 miles from Dorchester, on a south-facing plot with woodland. At guide. The numbers are not the problem. The commitment is.</Verse>
        </Reveal>

        <Reveal>
          <Verse style={{ color: C.warmGrey, fontSize: "clamp(13px,2vw,16px)" }}>
            The thatch has been here since before the bypass.<br />It does not care about your timeline.
          </Verse>
        </Reveal>

        {/* Divider */}
        <div style={{ width: "40px", height: "1px", background: C.accentDark, opacity: 0.2, margin: "36px auto" }} />

        {/* Gate */}
        <div style={{ textAlign: "center", padding: "14px 0 64px" }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(16px,2.5vw,20px)", color: C.paper, letterSpacing: "0.08em", marginBottom: "10px" }}>You read this far.</div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "13px", color: C.warmGrey, maxWidth: "340px", margin: "0 auto 16px", lineHeight: 1.6 }}>
            This is one building. Yours is different. If you want us to look at the one you're considering, tell us where it is.
          </p>
          <div style={{ display: "flex", maxWidth: "320px", margin: "0 auto" }}>
            <input type="email" placeholder="your@email.com" style={{ flex: 1, height: "38px", background: C.darkMid, border: `1px solid ${C.bd}`, borderRight: "none", padding: "0 12px", fontFamily: "'EB Garamond',serif", fontSize: "13px", color: C.paper, outline: "none" }} />
            <button style={{ background: "transparent", border: `1px solid ${C.accentDark}`, fontFamily: "'Bebas Neue',sans-serif", fontSize: "11px", color: C.accentDark, padding: "0 14px", cursor: "pointer", letterSpacing: "0.1em" }}>SEND IT</button>
          </div>
          <Cap style={{ marginTop: "36px", opacity: 0.28 }}>Not affiliated with any estate agent. That is the point.</Cap>
        </div>

      </div>
    </div>
  );
}
