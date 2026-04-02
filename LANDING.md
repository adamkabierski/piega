# Piega — Landing Page

*Last updated: April 2, 2026*

Schematic description of the live landing page at `/` (piega-app).

---

## Layout

Dark background, centred content, staggered entrance animations (`arise` keyframes with progressive delays). Single-column flow, max-width varies per section.

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (760px)                                        0.2s     │
│                                                                 │
│  Piega                                  Pipeline → │ Early …    │
│  (Playfair italic, 17px)          (EB Garamond links, right)    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  HERO (760px, centred)                                 0.7s     │
│                                                                 │
│   PROPERTY INTELLIGENCE · UNITED KINGDOM                        │
│   (EB Garamond, 10px, spaced caps, accent at 60% opacity)      │
│                                                                 │
│   The estate agent                                              │
│   told you a story.                                             │
│   (Playfair Display, 32–70px, bold, cream)                      │
│                                                                 │
│   — WE ARE NOT THE ESTATE AGENT —                               │
│   (Bebas Neue, 11–16px, spaced caps, very faint)                │
│                                                                 │
│   We tell you the building.                                     │
│   (Playfair Display, 32–70px, italic, terracotta)               │
│                                                                 │
│   An honest analysis of any UK property — what it is,           │
│   where it sits, and what it will actually cost you to own.     │
│   No flattery. No agenda. Just the fold.                        │
│   (EB Garamond italic, 15–19px, muted accent)                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  RECENT ANALYSES (840px, 2-column grid)                1.3s     │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  [property photo]   │  │  [property photo]   │              │
│  │  2.2:1 aspect       │  │  2.2:1 aspect       │              │
│  │                     │  │                     │              │
│  │  Auction · 18 Mar…  │  │  Auction · Digby…   │              │
│  │  Woodbury           │  │  Cherry Cottage     │              │
│  │  (Playfair, bold)   │  │  (Playfair, bold)   │              │
│  │                     │  │                     │              │
│  │  Woodbury Hill Path │  │  Alton Pancras,     │              │
│  │  Luton, LU2 7JR    │  │  Dorset, DT2 7RW    │              │
│  │  4 bed · Detached   │  │  2 bed · Thatched   │              │
│  │  Split-level        │  │  Grade II Listed    │              │
│  │                     │  │                     │              │
│  │  ┌──────────────┐   │  │  ┌──────────────┐   │              │
│  │  │ £340K+ │109m²│   │  │  │ £200K │GR.II │   │              │
│  │  │ guide  │area │   │  │  │ guide │listed│   │              │
│  │  │ 25min  │£126K│   │  │  │ 0.2ac │£150K+│   │              │
│  │  │ London │upside│  │  │  │ land  │upside│   │              │
│  │  └──────────────┘   │  │  └──────────────┘   │              │
│  │  (Bebas Neue stats) │  │  (Bebas Neue stats) │              │
│  │                     │  │                     │              │
│  │  "Someone else's    │  │  "The panelling is  │              │
│  │   unfinished project│  │   Georgian. The damp │              │
│  │   Possibly your     │  │   behind it is older.│              │
│  │   perfect beginning"│  │   You are buying     │              │
│  │  (Playfair italic,  │  │   both."             │              │
│  │   terracotta border)│  │  (Playfair italic)   │              │
│  │                     │  │                     │              │
│  │  READ THE FULL →    │  │  READ THE FULL →    │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  Card hover: lift -4px + brighter border                        │
│  Links to: /reports/woodbury    /reports/cherry-cottage          │
│                                                                 │
├───────────── thin divider (40px line) ──────────────────────────┤
│                                                                 │
│  PROPOSITION (520px, centred)                          1.55s    │
│                                                                 │
│  Every property has a piega.                                    │
│  (Playfair, 20–30px, bold — "piega" italic in terracotta)       │
│                                                                 │
│  A fold. A turning point. The moment it stops being             │
│  someone else's problem and starts being your project.          │
│  We find that moment — with architectural reading,              │
│  honest numbers, and no agenda. If the numbers                  │
│  don't work, we'll tell you to fold.                            │
│  (EB Garamond italic, 14–17px, muted)                           │
│                                                                 │
├───────────── thin divider (40px line) ──────────────────────────┤
│                                                                 │
│  WHAT YOU GET (600px, 3-column grid)                   1.7s     │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │ 01        │  │ 02        │  │ 03        │                   │
│  │ (Bebas,   │  │           │  │           │                   │
│  │  28px,    │  │           │  │           │                   │
│  │  v.faint) │  │           │  │           │                   │
│  │           │  │           │  │           │                   │
│  │ The Place │  │The Build- │  │The Number │                   │
│  │ (Playfair,│  │  ing      │  │ (Playfair,│                   │
│  │  bold)    │  │ (Playfair,│  │  bold)    │                   │
│  │           │  │  bold)    │  │           │                   │
│  │ Context   │  │           │  │ Total cost│                   │
│  │ map, com- │  │ Room-by-  │  │ envelope  │                   │
│  │ mute, …   │  │ room read │  │ — not just│                   │
│  │ (EB Gara- │  │ ing. Plan │  │ asking    │                   │
│  │  mond     │  │ s, cross  │  │ price.    │                   │
│  │  italic)  │  │ sections… │  │ Remedial… │                   │
│  └───────────┘  └───────────┘  └───────────┘                   │
│                                                                 │
│  Cards: dark background, 1px border, equal flex                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  EMAIL CAPTURE (460px, centred)                        1.85s    │
│                                                                 │
│  Get the next analysis                                          │
│  before anyone else does.                                       │
│  (Playfair, 18–24px, bold — second line italic terracotta)      │
│                                                                 │
│  One property. Laid bare. No pitch, no weekly newsletter.       │
│  (EB Garamond italic, muted)                                    │
│                                                                 │
│  ┌──────────────────────────────┬────────────┐                  │
│  │ your@email.com               │  SEND IT   │                  │
│  │ (EB Garamond, 17px)          │ (Bebas Neue│                  │
│  │                              │  on accent │                  │
│  │                              │  background│                  │
│  └──────────────────────────────┴────────────┘                  │
│  Early access. We'll tell you when the next building is ready.  │
│                                                                 │
│  After submit → "DONE." (Bebas Neue, big) +                     │
│  "You'll know when the next one is ready."                      │
│  (No actual backend — email state is local only)                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  FOOTER                                                2.0s     │
│                                                                 │
│  Piega is in private development.                               │
│  Not affiliated with any estate agent. That is the point.       │
│  (EB Garamond italic, very faint, centred)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| Wordmark | Playfair Display, italic | "Piega" in header |
| Headlines | Playfair Display, bold | Hero headlines, property names, section titles |
| Editorial | Playfair Display, italic | Subheadlines, verse quotes on cards |
| Dramatic caps | Bebas Neue | Stats, numbers, CTAs, ghost numerals |
| Body | EB Garamond, italic | Descriptions, proposition text, captions |
| UI | Inter | Implied via theme, used in stat sub-labels |

---

## Colour Palette

All colours sourced from the shared `C` theme object:

- **Background** — `C.dark` (dark charcoal, ~#141210)
- **Card backgrounds** — `C.darkCard` (slightly lighter)
- **Primary text** — `C.paper` (warm off-white)
- **Accent text** — `C.accent` / `C.accentDark` (warm grey-beige)
- **Highlight** — `C.terracotta` (muted orange — headlines, borders, stat accents)
- **Sage** — `C.sage` (muted green — used in SVG card graphic)
- **Borders** — `C.bd` (very low opacity separators)
- **Muted text** — `C.tertGrey` at 40–75% opacity

---

## Animations

All sections use a staggered `arise` CSS keyframe animation (fade + translateY) with progressive delays from 0.2s (header) to 2.0s (footer). No scroll-triggered reveals on this page — everything animates on page load.

---

## Interactive Elements

- **Property cards** — hover lifts card -4px and brightens border (`C.bdh`)
- **Email input** — turns border terracotta on invalid submit (1.4s flash)
- **Enter key** submits email form
- **Pipeline → link** in header navigates to `/pipeline`
- **No actual email backend** — `done` state is local React state only

---

## Content (hardcoded)

Two showcase property cards with static data:

1. **Woodbury** — Woodbury Hill Path, Luton, LU2 7JR. £340K+ guide. 4 bed, detached, split-level, freehold. 109m², 25min London, £126K upside. Links to `/reports/woodbury`.
2. **Cherry Cottage** — Alton Pancras, Dorchester, Dorset, DT2 7RW. £200K guide. 2 bed, thatched, Grade II listed. 0.2 acre, £150K+ upside. Links to `/reports/cherry-cottage`.

Both are handcrafted demo reports, not pipeline-generated.
