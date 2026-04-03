"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { C } from "@/lib/theme";
import { AGENTS_URL } from "@/lib/config";

/* ═══════════════════════════════════════════════════════════════════════════
   CARD REVEAL — scroll-triggered fade+rise
   ═══════════════════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function CardReveal({ children, delay = 0 }) {
  const [ref, v] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : "translateY(18px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FALLBACK CARDS — handcrafted demo reports (shown only when no pipeline
   reports are available or as supplements to a thin pipeline)
   ═══════════════════════════════════════════════════════════════════════════ */

const FALLBACK_CARDS = [
  {
    id: "woodbury",
    href: "/reports/woodbury",
    heroImage: "/House_1/slot4.jpg",
    name: "Woodbury",
    tag: "Auction · Split-level detached",
    location: "Woodbury Hill Path, Luton, LU2 7JR · 4 bed · Detached · Freehold",
    price: "£340K+",
    hookLine: "Someone else's unfinished project. Possibly your perfect beginning.",
    publishedAt: "2026-03-27T09:00:00Z",
  },
  {
    id: "cherry-cottage",
    href: "/reports/cherry-cottage",
    heroImage: "/House_2/slot1.jpg",
    name: "Cherry Cottage",
    tag: "Grade II · Thatched cottage",
    location: "Alton Pancras, Dorchester, Dorset, DT2 7RW · 2 bed · Thatched",
    price: "£200K",
    hookLine: "The panelling is Georgian. The damp behind it is older. You are buying both.",
    publishedAt: "2026-03-21T10:00:00Z",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Pick the best hero image: renovated exterior > best listing photo */
function pickHeroImage(report) {
  const r = report.results ?? {};
  const listing = report.listing ?? {};

  // Best: renovated exterior from the visualiser
  const vis = r.renovation_visualisation;
  if (vis?.exteriors?.length) return vis.exteriors[0].renovatedUrl;

  // Good: highest-rated exterior from classifier
  const classified = r.classification?.classifiedImages;
  if (classified?.length) {
    const bestExterior = classified.find(
      (img) => img.type === "exterior" && img.usefulness === "high"
    ) ?? classified.find((img) => img.type === "exterior");
    if (bestExterior) {
      const photos = listing.photos ?? [];
      const photo = photos[bestExterior.imageIndex];
      if (photo?.url) return photo.url;
    }
  }

  // Fallback: first listing photo
  return listing.photos?.[0]?.url ?? null;
}

/** Convert a pipeline report into a card shape */
function reportToCard(report) {
  const r = report.results ?? {};
  const listing = report.listing ?? {};
  const classification = r.classification;
  const archetype = classification?.archetype;
  const narrative = r.narrative;

  const card = r.landing_card;
  if (card) {
    return {
      id: report.id,
      href: `/report/${report.id}`,
      heroImage: card.heroImage ?? pickHeroImage(report),
      name: card.name ?? listing.address?.split(",")[0] ?? "Property",
      tag: card.tag ?? (archetype ? `${archetype.era} · ${archetype.displayName}` : ""),
      location: card.location ?? listing.address,
      price: card.price ?? (listing.askingPrice ? `\u00A3${Math.round(listing.askingPrice / 1000)}K` : ""),
      hookLine: card.hookLine ?? narrative?.openingHook ?? classification?.summary ?? "",
      publishedAt: card.publishedAt ?? report.created_at,
    };
  }

  const addr = listing.address ?? "";
  const firstPart = addr.split(",")[0]?.trim() ?? "Property";
  const priceStr = listing.askingPrice ? `\u00A3${Math.round(listing.askingPrice / 1000)}K` : "";
  const tagStr = archetype
    ? [archetype.era, archetype.displayName].filter(Boolean).join(" \u00B7 ")
    : listing.propertyType ?? "";
  const locStr = [
    addr,
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.propertyType,
  ].filter(Boolean).join(" \u00B7 ");
  const hook = narrative?.openingHook ?? classification?.summary ?? "";

  return {
    id: report.id,
    href: `/report/${report.id}`,
    heroImage: pickHeroImage(report),
    name: firstPart,
    tag: tagStr,
    location: locStr,
    price: priceStr,
    hookLine: hook,
    publishedAt: report.created_at,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROPERTY CARD — photo, tag, name, price, location, hook line. Nothing else.
   ═══════════════════════════════════════════════════════════════════════════ */

function PropertyCard({ card }) {
  const [hovered, setHovered] = useState(false);

  const inner = (
    <>
      {card.heroImage && (
        <img
          src={card.heroImage}
          alt=""
          style={{
            width: "100%", aspectRatio: "2/1", objectFit: "cover", display: "block",
          }}
        />
      )}

      <div style={{ padding: "14px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Tag + Timestamp */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 6,
        }}>
          <span style={{
            fontFamily: "'EB Garamond',serif", fontSize: 8,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: C.terracotta, opacity: 0.55,
          }}>
            {card.tag}
          </span>
          <span style={{
            fontFamily: "'Inter',sans-serif", fontSize: 8,
            color: C.warmGrey, opacity: 0.4,
          }}>
            {relativeTime(card.publishedAt)}
          </span>
        </div>

        {/* Name + Price */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 3,
        }}>
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: "clamp(18px,2.4vw,22px)", fontWeight: 700,
            lineHeight: 1.1, color: C.paper,
          }}>
            {card.name}
          </div>
          {card.price && (
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: "clamp(16px,2vw,20px)",
              letterSpacing: "0.04em",
              color: C.accentDark,
              flexShrink: 0, marginLeft: 12,
            }}>
              {card.price}
            </div>
          )}
        </div>

        {/* Location */}
        <div style={{
          fontFamily: "'EB Garamond',serif", fontSize: 11,
          color: `${C.tertGrey}75`, letterSpacing: "0.04em",
          lineHeight: 1.5, marginBottom: 12,
        }}>
          {card.location}
        </div>

        {/* Hook line */}
        {card.hookLine && (
          <div style={{
            fontFamily: "'Playfair Display',serif", fontStyle: "italic",
            fontSize: 12, lineHeight: 1.6,
            color: C.accent, paddingLeft: 10,
            borderLeft: `2px solid ${C.terracotta}55`,
            opacity: 0.65, flex: 1,
          }}>
            {card.hookLine}
          </div>
        )}
      </div>
    </>
  );

  const shared = {
    display: "flex", flexDirection: "column",
    background: C.darkCard,
    border: `1px solid ${hovered ? C.bdh : C.bd}`,
    overflow: "hidden",
    transition: "border-color .4s, transform .4s",
    transform: hovered ? "translateY(-4px)" : "none",
    textDecoration: "none", color: "inherit",
    cursor: "pointer",
  };

  return (
    <Link href={card.href} style={shared}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {inner}
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pipelineCards, setPipelineCards] = useState(null); // null = loading, [] = loaded empty

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${AGENTS_URL}/reports`);
        if (!res.ok) { setPipelineCards([]); return; }
        const reports = await res.json();
        const cards = reports.map(reportToCard);
        setPipelineCards(cards);
      } catch {
        // Agents server offline — fall back to demo cards
        setPipelineCards(null);
      }
    })();
  }, []);

  // Pipeline reports are the one true source.
  // Fallback demos only appear when the agents server is unreachable.
  const allCards = (() => {
    if (pipelineCards === null) {
      // Server offline — show demos
      return [...FALLBACK_CARDS].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    if (pipelineCards.length === 0) {
      // Server reachable, no reports yet — show demos as placeholder
      return [...FALLBACK_CARDS].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    // Real pipeline reports only
    return [...pipelineCards].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  })();

  // Mid-stream break after card 8 (if we have enough)
  const breakAt = Math.min(8, allCards.length);
  const topCards = allCards.slice(0, breakAt);
  const bottomCards = allCards.slice(breakAt);

  async function submitEmail() {
    if (!email || !email.includes("@")) {
      setError(true);
      setTimeout(() => setError(false), 1400);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${AGENTS_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch {
      setDone(true);
    }
    setSubmitting(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      position: "relative", zIndex: 1,
    }}>

      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <header style={{
        padding: "28px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: 0, animation: "arise .8s ease .2s forwards",
      }}>
        <div style={{
          fontFamily: "'Playfair Display',serif", fontSize: 17,
          fontStyle: "italic", color: C.accentDark, letterSpacing: "0.02em",
        }}>
          Piega
        </div>

      </header>

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 760, margin: "0 auto", padding: "60px 24px 50px",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'EB Garamond',serif", fontSize: 10,
          letterSpacing: "0.3em", textTransform: "uppercase",
          color: `${C.accent}60`, marginBottom: 44,
          opacity: 0, animation: "arise .9s ease .5s forwards",
        }}>
          Property Intelligence · United Kingdom
        </div>
        <div style={{ opacity: 0, animation: "arise 1s ease .7s forwards" }}>
          <h1 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: "clamp(32px,6vw,70px)", fontWeight: 700,
            lineHeight: 1.06, letterSpacing: "-0.02em",
            color: C.paper, margin: 0,
          }}>
            The estate agent<br />told you a story.
          </h1>
          <span style={{
            display: "block", fontFamily: "'Bebas Neue',sans-serif",
            fontSize: "clamp(11px,1.4vw,16px)", letterSpacing: "0.26em",
            color: `${C.tertGrey}45`, margin: "16px 0 20px",
            opacity: 0, animation: "arise .8s ease .9s forwards",
          }}>
            — WE ARE NOT THE ESTATE AGENT —
          </span>
          <h1 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: "clamp(32px,6vw,70px)", fontWeight: 400,
            fontStyle: "italic", lineHeight: 1.06, letterSpacing: "-0.02em",
            color: C.terracotta, margin: 0,
          }}>
            We tell you the building.
          </h1>
        </div>
        <p style={{
          maxWidth: 460, margin: "20px auto 0",
          fontFamily: "'EB Garamond',serif", fontStyle: "italic",
          fontSize: "clamp(15px,1.8vw,19px)", color: `${C.accent}80`,
          lineHeight: 1.65,
          opacity: 0, animation: "arise .9s ease 1.1s forwards",
        }}>
          An honest analysis of any UK property — what it is, where it sits, and what it will actually cost you to own. No flattery. No agenda. Just the fold.
        </p>
      </div>

      {/* ─── THE STREAM ────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: "20px 24px 0",
        width: "100%",
        opacity: 0, animation: "arise .6s ease 1.2s forwards",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{
            fontFamily: "'Playfair Display',serif", fontStyle: "italic",
            fontSize: 13, color: `${C.accent}50`,
          }}>
            Latest from the fold
          </span>
        </div>

        {/* Top 8 cards */}
        <div className="card-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}>
          {topCards.map((card, i) => (
            <CardReveal key={card.id} delay={i * 0.06}>
              <PropertyCard card={card} />
            </CardReveal>
          ))}
        </div>

        {/* Mid-stream break + remaining cards — only when stream is long enough */}
        {bottomCards.length > 0 && (
          <>
            <CardReveal>
              <div style={{
                textAlign: "center", padding: "48px 24px",
                maxWidth: 480, margin: "0 auto",
              }}>
                <span style={{
                  fontFamily: "'Playfair Display',serif", fontStyle: "italic",
                  fontSize: "clamp(15px,2.2vw,19px)", color: `${C.accent}55`,
                  lineHeight: 1.65,
                }}>
                  Every property has a piega — a fold. The moment it stops being someone else's problem and starts being your project.
                </span>
              </div>
            </CardReveal>

            <div className="card-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}>
              {bottomCards.map((card, i) => (
                <CardReveal key={card.id} delay={i * 0.06}>
                  <PropertyCard card={card} />
                </CardReveal>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── EMAIL CAPTURE ────────────────────────────────────────── */}
      <div style={{
        maxWidth: 460, margin: "0 auto", padding: "56px 24px 90px",
        textAlign: "center", width: "100%",
      }}>
        <div style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "clamp(18px,2.6vw,24px)", fontWeight: 700,
          color: C.paper, marginBottom: 5, lineHeight: 1.2,
        }}>
          Get the next reading<br />
          <em style={{ fontWeight: 400, fontStyle: "italic", color: C.terracotta }}>
            before anyone else does.
          </em>
        </div>
        <div style={{
          fontFamily: "'EB Garamond',serif", fontStyle: "italic",
          fontSize: 13.5, color: `${C.accent}66`, marginBottom: 22,
          lineHeight: 1.5,
        }}>
          One property. Laid bare. No pitch, no weekly newsletter noise.
        </div>
        {!done ? (
          <>
            <div style={{ display: "flex", width: "100%" }}>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                placeholder="your@email.com"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.035)",
                  border: `1px solid ${error ? C.terracotta : "rgba(184,169,154,0.32)"}`,
                  borderRight: "none", padding: "15px 20px",
                  fontFamily: "'EB Garamond',serif", fontSize: 17,
                  color: C.paper, outline: "none", transition: "border-color .3s",
                }}
              />
              <button
                onClick={submitEmail}
                disabled={submitting}
                style={{
                  fontFamily: "'Bebas Neue',sans-serif", fontSize: 14,
                  letterSpacing: "0.18em", color: C.dark, background: C.accent,
                  border: "none", padding: "0 26px", cursor: "pointer",
                  flexShrink: 0, opacity: submitting ? 0.5 : 1,
                }}
              >
                SEND IT
              </button>
            </div>
            <div style={{
              marginTop: 11, fontFamily: "'EB Garamond',serif",
              fontSize: 11.5, fontStyle: "italic", color: `${C.tertGrey}4C`,
            }}>
              You'll know when the next building is ready.
            </div>
          </>
        ) : (
          <div style={{ padding: "18px 0", animation: "arise .6s ease both" }}>
            <b style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: "clamp(30px,4.5vw,48px)", letterSpacing: "0.06em",
              color: C.paper, display: "block",
            }}>
              DONE.
            </b>
            <span style={{
              fontFamily: "'EB Garamond',serif", fontStyle: "italic",
              fontSize: 15, color: `${C.accent}80`, marginTop: 5,
              display: "block",
            }}>
              You'll know when the next one is ready.
            </span>
          </div>
        )}
      </div>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{
        padding: "22px 40px",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderTop: `1px solid ${C.bd}`, marginTop: "auto",
      }}>
        <p style={{
          fontFamily: "'EB Garamond',serif", fontSize: 11,
          fontStyle: "italic", color: `${C.tertGrey}40`, margin: 0,
        }}>
          <strong style={{ fontStyle: "normal", fontWeight: 500, color: `${C.tertGrey}60` }}>
            Piega
          </strong>{" "}
          is in private development. Not affiliated with any estate agent. That is the point.
        </p>
      </footer>

      {/* ─── RESPONSIVE ────────────────────────────────────────────── */}
      <style>{`
        .card-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 1024px) {
          .card-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .card-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
