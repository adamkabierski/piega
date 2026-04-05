# Piega — Landing Page

*Last updated: April 5, 2026*

Schematic UX description of the landing page at `/`.

---

## Page flow

```
ZONE 1 — HERO
   ↓
ZONE 2 — DEMO ANIMATION
   ↓
ZONE 3 — CONFRONTATION TEXT
   ↓
ZONE 4 — SPLIT: CTA + PROOF GRID  (or fallback CTA if <4 reports)
   ↓
ZONE 5 — EDITORIAL BEATS
   ↓
FOOTER
```

---

## Zone 1 — Hero

Centred typographic promise. No images, no UI — just words.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                     Piega                        │
│                                                  │
│       The estate agent told you a story.         │
│          We tell you the building.               │
│                                                  │
│  Paste any Rightmove link. In 90 seconds, know   │
│  whether the building behind those photos is     │
│  worth your time — what it needs, what it costs, │
│  and what it could become.                       │
│                                                  │
│  Install · Browse Rightmove · Click "Analyse"    │
│  · Full report in 90 seconds                     │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Purpose**: Promise + positioning. You understand what Piega does in 5 seconds.

---

## Zone 2 — Demo Animation

Auto-playing 4-phase animation inside a 16:9 container. Uses real data from
the first available report (falls back to static images if API is slow).

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   Phase 1: BROWSE      A Rightmove listing page  │
│                        with property photo,      │
│                        price, details.           │
│                                                  │
│   Phase 2: CLICK       Extension popup appears   │
│                        over the listing —         │
│                        "Analyse Property" button. │
│                                                  │
│   Phase 3: ANALYSE     Pipeline running — agents │
│                        complete one by one.       │
│                        Before/after preview.      │
│                                                  │
│   Phase 4: REPORT      Mini report scroll —       │
│                        hero image, cost number,  │
│                        before/after slider.       │
│                                                  │
│   ─────────── progress bar ───────────────────   │
│   Browse    Click    Analyse    Report            │
│   ●─────────●────────●─────────●                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Purpose**: "How it works" in 18 seconds without reading anything.
Phases auto-advance. Progress bar and milestones are clickable.

---

## Zone 3 — Confrontation Text

Single editorial beat. Centred, narrow column.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│      EVERY SCROLL PAST A BAD PHOTO               │
│      IS A BET THAT THE BUILDING BEHIND IT        │
│      ISN'T WORTH £150K MORE THAN IT LOOKS.       │
│                                                  │
│      Most people see dated kitchens and keep      │
│      scrolling. We see construction era,          │
│      renovation scope, and a number.              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Purpose**: Emotional hook. Reframes "ugly listing photo" as opportunity.
Creates tension right before the CTA.

---

## Zone 4 — Split: CTA left + Proof Grid right

Two-column layout on desktop. Left panel is sticky. Right panel is a
scrollable grid of real report cards that fades out at the bottom.

If fewer than 4 reports are available, falls back to a centred single-column
CTA (same content, no grid).

While reports are loading from the API, shows a brief "Loading recent
analyses…" placeholder to prevent layout flash.

```
┌──────────────────────┬───────────────────────────┐
│                      │  10 REPORTS from last 7d  │
│  See what your       │                           │
│  building is hiding. │  ┌──────┐ ┌──────┐       │
│                      │  │ NOW/ │ │ NOW/ │       │
│  Piega lives on      │  │POSSIB│ │POSSIB│       │
│  Rightmove. Install  │  │  LE  │ │  LE  │       │
│  the extension.      │  │slider│ │slider│       │
│  Browse any listing. │  │      │ │      │       │
│  Click once.         │  │ Name │ │ Name │       │
│                      │  │ Era  │ │ Era  │       │
│  ┌────────────────┐  │  │ Est. │ │ Est. │       │
│  │ P  Add Piega   │  │  │ £XK  │ │ £XK  │       │
│  │    to Chrome   │  │  │"obs."│ │"obs."│       │
│  │ Free · No sign │  │  │ View │ │ View │       │
│  │ ADD TO CHROME →│  │  └──────┘ └──────┘       │
│  └────────────────┘  │                           │
│                      │  ┌──────┐ ┌──────┐       │
│  — or —              │  │ NOW/ │ │ NOW/ │       │
│                      │  │POSSIB│ │POSSIB│       │
│  Not ready?          │  │  LE  │ │  LE  │       │
│  Leave your email.   │  │slider│ │slider│       │
│  ┌──────────┬─────┐  │  │ ...  │ │ ...  │       │
│  │your@email│NOTIF│  │  └──────┘ └──────┘       │
│  └──────────┴─────┘  │                           │
│                      │  ┌──────┐ ┌──────┐       │
│  No payment.         │  │      │ │      │  fade │
│  No signup.          │  │ fade │ │ fade │   ↓   │
│  Just the building.  │  │  ↓↓  │ │  ↓↓  │       │
│                      │  └──────┘ └──────┘       │
│  (sticky — stays     │                           │
│   while you scroll   │  (bottom fades to dark —  │
│   the cards)         │   implies more reports)   │
│                      │                           │
└──────────────────────┴───────────────────────────┘
```

**Each card** contains:
- Draggable before/after slider (NOW / POSSIBLE labels, room badge)
- Property name + archetype era
- "Est. renovation £XK–£YK"
- Quoted classifier observation (proves Piega read the building)
- "View full report →" link

**Purpose**: Proof + action. The grid shows Piega working on real properties.
The CTA gives two conversion paths: install Chrome extension, or leave email.
The bottom fade implies volume — more reports than fit on screen.

**Mobile (≤900px)**: Stacks vertically — CTA on top, grid below with
max-height 500px. At ≤500px, card grid goes single-column.

---

## Zone 5 — Editorial Beats

Two short text breaks, stacked vertically. Different formats.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│          "IN NEED OF MODERNISATION."             │
│                                                  │
│  The estate agent's way of saying: we don't      │
│  know either. Piega reads the building — era,    │
│  construction, condition — and tells you what    │
│  modernisation actually costs.                   │
│                                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                  │
│  ┃ A surveyor costs £500. A viewing costs a      │
│  ┃ Saturday. Piega doesn't replace either —      │
│  ┃ it tells you which properties are worth       │
│  ┃ spending both on.                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Purpose**: Address two remaining objections:
1. "Modernisation" is meaningless agent-speak — Piega puts a number on it.
2. Piega is triage, not a replacement for surveys or viewings.

---

## Footer

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                    Piega.                         │
│                                                  │
│  Classification. Renovation vision. Cost          │
│  estimate. Narrative. One Rightmove link,        │
│  90 seconds, the full reading.                   │
│                                                  │
│  ┌──────────────────┬────────┐                   │
│  │  your@email.com  │NOTIFY  │                   │
│  └──────────────────┴────────┘                   │
│                                                  │
│  Pipeline Hub · Add to Chrome                    │
│                                                  │
│  Property intelligence · United Kingdom          │
│  Not affiliated with any estate agent.           │
│  That is the point.                              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Purpose**: Second chance CTA for anyone who scrolled past Zone 4.
Pipeline Hub link for returning users. Legal/identity line.

---

## Data flow

- Reports fetched from `AGENTS_URL/reports` on mount
- Demo animation uses first report with exterior visualisation (fallback: static image)
- Grid cards extracted by `reportsToGridCards()` — one card per report with best image pair, cost, classifier observation
- Grid requires ≥4 cards, otherwise falls back to centred CTA
- Email submits to `AGENTS_URL/subscribe`

---

## Responsive behaviour

| Breakpoint | What changes |
|---|---|
| ≤900px | Split layout → single column (CTA above, grid below with max-height 500px) |
| ≤768px | Chrome extension card hidden, "Desktop only" notice shown |
| ≤500px | Card grid → single column |

All typography uses `clamp()` for fluid sizing. No fixed font sizes that
break on mobile.

---

## Loading / edge cases

| Scenario | Behaviour |
|---|---|
| API slow | "Loading recent analyses…" placeholder in Zone 4 |
| API fails or 0 reports | Centred fallback CTA (no grid) |
| 1–3 reports | Centred fallback CTA (grid needs ≥4) |
| Images slow | Cards hold 16:9 space with dark background |
| Images fail | Fade to transparent (dark card background shows) |
| Demo images unavailable | Falls back to local `/House_1/slot4.jpg` |

Both are handcrafted demo reports, not pipeline-generated.
