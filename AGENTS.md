# Piega — Agent Overview

*Last updated: April 2, 2026*

---

## How it works — end to end

The full user journey runs in eight steps:

```
[ Step 1 ]              [ Step 2 ]                    [ Step 3 ]              [ Step 4 + 5 (parallel) ]          [ Step 6 ]              [ Step 7 ]              [ Step 8 ]
  Chrome Extension  →     Classifier              →     Design Brief      →     Renovation Visualiser      →     Video Facade       →     Narrative Writer   →     Report Assembly
  (data collection)       + Architectural Reading       (renovation concept)    + Cost Estimator                  (facade video)            (editorial glue)        (rendered page)
  automatic               automatic                    manual trigger          manual trigger                    manual trigger            manual trigger          no AI — just layout
```

After the Design Brief, the **Renovation Visualiser** and **Cost Estimator** can run in parallel — neither depends on the other. Both depend on the Classifier + Design Brief. The **Video Facade** depends on the Visualiser and generates a short morphing video of the exterior transformation. After the parallel agents complete, the **Narrative Writer** writes the editorial glue that holds the report together. Finally, the **Report Assembly** renders all outputs into a single shareable page — no AI, just layout.

Each step hands off to the next via a shared Supabase record. Nothing is coupled directly — the extension just creates a row, the classifier fills it in, the brief interprets it, the visualiser and cost estimator follow it, the narrative writer weaves it into prose, and the report page reads it all.

---

## Step 1 — Chrome Extension

### What it does

The Chrome extension runs silently in the background whenever you visit a Rightmove property page. It reads all the data Rightmove has embedded in the page — address, price, description, photos, bedrooms, bathrooms, agent, postcode — and makes it available in a small popup. When you click **"Analyse Property"**, it sends that data to the Piega backend and opens the pipeline hub for that report.

### What it produces

A structured listing object containing:
- **Address, postcode, price** (cleaned and normalised)
- **Property metadata** — type, bedrooms, bathrooms, tenure, listing agent
- **Full description** — the estate agent's text, unmodified
- **Photos array** — full-resolution URLs for every listing photograph
- **Floorplans array** — separate from photos
- **Coordinates** — latitude / longitude extracted from the page

### How it works

```
User visits rightmove.co.uk/properties/12345678
    |
    |  Page loads
    v
Content script injected automatically by Chrome
    |
    |  Tries multiple data sources in priority order:
    |    1. Embedded React hydration JSON
    |    2. Next.js page data
    |    3. Structured schema markup
    |    4. Meta / Open Graph tags
    |    5. DOM scraping as fallback
    |
    |  Normalises all fields into a single canonical shape
    |
    v
Stored locally in browser (keyed by listing ID)
    |
    |  User opens popup
    v
Popup shows: address, price, bed/bath count, "Analyse Property" button
    |
    |  User clicks "Analyse Property"
    v
POST /reports  ->  returns report ID  ->  opens /pipeline/{id} in new tab
```

The content script runs silently — it does not modify the page, show any UI, or make network requests. The network call only happens when the user explicitly clicks the button.

---

## Step 2 — Classifier Agent

### What it does

The Classifier is the first AI step. It looks at the full listing — address, description, asking price, agent notes, and every photograph — and answers two questions:

1. **What type of building is this?** (the *archetype*)
2. **What does each photograph show, and how useful is it?** (the *image classification*)

### What it produces

**Call 1 — Classification** (unchanged):

**Archetype** — a building type from a vocabulary of 18 UK housing categories (Victorian terrace, interwar semi, 1960s bungalow, period cottage, ex-council, new build, etc.) with:
- Era (e.g. *"1960–1979"*)
- Construction method (e.g. *"Cavity brick walls, concrete tile roof"*)
- Typical characteristics
- A confidence score

**Image classifications** — for every photograph:
- What it depicts (front exterior, kitchen, living room, bedroom, bathroom, garden, etc.)
- Room name where relevant
- Usefulness: **high**, **medium**, or **low**
- Visual observations (e.g. *"Original Victorian cornicing intact"*, *"Visible damp on chimney breast"*)

**Summary** — 2–3 sentences of plain-English architectural reading of the property.

**Call 2 — Architectural Reading** (new):

A second Claude vision call that runs immediately after classification, using the same images. This produces a deep professional reading:

- **Building narrative** — 3–4 paragraphs in an architect's voice, referencing specific photos by index
- **Construction inferences** — wall type, roof structure, foundations, insulation, windows, heating — what's likely behind the walls based on the building's era
- **Period features** — every visible feature plus features likely hidden (original floorboards under carpet, shutters painted shut, fireplaces behind boarding)
- **Issues identified** — damp staining, cracked render, dated electrics, settlement cracks — with severity, evidence, and implications
- **Unknowns** — 5–8 things that matter but cannot be assessed from listing photos (electrics age, asbestos, drainage, etc.)

### Why two calls instead of one

The classification (quick structured categories) and architectural reading (long-form professional prose) have different output characteristics. Putting both in one call creates output competition — the model either rushes the classification to get to the prose, or truncates the reading to stay within token budget. Two separate calls ensure both outputs are high quality with zero regression risk on the existing classification.

### How it works

```
Listing JSON arrives at POST /reports
    |
    v
Classifier downloads all listing photos (max 12)
    |
    v
=== CALL 1: Classification ===
Sends multimodal message to Claude:
    - property metadata (text)
    - all photos (vision)
    - menu of 18 archetypes
    - instructions for image-by-image classification
    |
    v
Claude responds with structured JSON
Response validated → written to results.classification
    |
    v
=== CALL 2: Architectural Reading ===
Sends second multimodal message to Claude:
    - same photos
    - the classifier's archetype + image observations (as context)
    - instructions for deep building reading
    |
    v
Claude responds with structured JSON
Response validated → attached to results.classification.architecturalReading
```

Both calls run automatically when a report is created. The architectural reading is non-fatal — if it fails, the classification still stands.

### Known limitations

- **Site and context** — orientation, aspect, neighbouring buildings, street character, conservation area status, topography. All invisible from listing photos alone.
- **Condition beneath the surface** — electrics age, plumbing, boiler type, window spec — things that don't appear in estate agent photography.
- **Period features granularity** — the reading can note features and infer hidden ones, but cannot distinguish original lime plaster from a modern replica without a site visit.

The architectural reading significantly reduces these gaps compared to the original 2–3 sentence summary. The construction inferences and issues identified feed directly into the Cost Estimator for more grounded estimates.

---

## Step 3 — Design Brief Agent

### What it does

The Design Brief sits between the Classifier and the Renovation Visualiser. It reads the classification — archetype, image observations, property metadata — and creates a **unified renovation concept** so that every generated image reads as part of the same project rather than a set of independent edits.

It answers four questions:
1. **What transformation does this property need?** — full renovation, refresh, staging, minimal, or exterior focus
2. **What design language should unify the images?** — colour palette, materials, mood, era guidance, explicit avoid list
3. **Which images should be transformed, and how?** — per-image selection with prompt guidance and transformation intensity
4. **How many images are worth generating?** — recommended exterior/interior counts

### What it produces

**Transformation strategy** — one of five categories, with a rationale explaining why.

**Design language** — the shared vocabulary every image follows:
- **Palette** — 3–5 named colours (e.g. *"slate grey"*, *"raw linen"*, *"aged brass"*)
- **Materials** — 3–5 materials (e.g. *"lime plaster"*, *"engineered oak"*, *"reclaimed stone"*)
- **Mood** — single sentence (e.g. *"honest, warm, rooted in place"*)
- **Era guidance** — what to respect and what to update for this building's period
- **Avoid list** — explicit things NOT to do (e.g. *"grey composite cladding"*, *"chrome fittings"*)

**Image selections** — for every classified image:
- Whether to transform it or skip it, and why
- Per-image prompt guidance for the visualiser
- Transformation intensity: heavy, moderate, or light

**Concept statement** — 3–4 sentences describing the renovation vision as a coherent whole.

### How it works

```
User clicks "Run" on the Design Brief card in /pipeline/{reportId}
    |
    v
Agent reads results.classification from the report
    |
    v
Sends a single text message to Claude:
    - property metadata (address, price, type, beds/baths)
    - archetype with era, construction, characteristics
    - all classified images with observations
    - instructions for the 4-question structure
    |
    v
Claude responds with structured JSON
    |
    v
Response validated with Zod and written to:
    results.design_brief = { transformationStrategy, designLanguage, imageSelections[], ... }
```

The brief runs once per report, triggered manually. Cost is ~$0.01 per report (single text call, no vision).

### How the Visualiser uses the brief

When a design brief exists, the Renovation Visualiser changes its behaviour:

- **Image selection** — instead of hardcoded rules (skip floorplans, pick best per type), the visualiser uses the brief's `imageSelections` where `use: true`
- **Prompt crafting** — instead of the standalone system prompt, Claude receives the brief's full design language (palette, materials, mood, era guidance, avoid list) plus per-image guidance and transformation intensity
- **Coherence** — every image prompt is constrained by the same palette and material language, producing results that read as one project

The visualiser still works without a brief (legacy/standalone mode) but produces better results when guided by one.

---

## Step 4 — Renovation Visualiser Agent

### What it does

The Renovation Visualiser takes the classifier's output and generates *"after renovation"* versions of selected property photographs — what the property could look like after a realistic, era-appropriate refurbishment.

### What it produces

For each processed image, a before/after pair:
- **Original** — the listing photograph
- **Renovated** — an AI-edited version
- **Prompt used** — the exact instruction sent to the image model

Results are split into up to 3 exteriors and 2 interiors.

### How it works

```
User clicks "Run" on the Renovation Visualiser card in /pipeline/{reportId}
    |
    v
Agent reads results.classification from the report
    |
    v
Image selection:
    - keeps only high/medium usefulness images
    - skips floorplans, street views, WC, garage
    - deduplicates (one image per subject type, best wins)
    - prioritises front exterior -> living room -> kitchen -> others
    |
    v
Per image — two steps:
    1. Claude writes a specific renovation editing prompt
       (informed by archetype, era, construction, observations)
    2. Nano Banana (fal.ai) edits the photo based on the prompt
    |
    v
Each result is written to Supabase as it completes
(UI shows images progressively, not as a batch)
    |
    v
results.renovation_visualisation = { exteriors[], interiors[], cost, model }
```

### Known limitations

The visualiser has four structural challenges. The Design Brief (Step 3) addresses the first two directly.

**1. No design coherence across images** ✅ *Addressed by Design Brief*
Each image is prompted independently in standalone mode. The Design Brief solves this by providing a shared palette, materials, mood, and per-image guidance — every prompt is constrained by the same design language.

**2. Prompts lack lift** ✅ *Addressed by Design Brief*
Standalone prompts are technically correct but aesthetically safe. The Design Brief provides an opinionated concept statement, specific material choices, and transformation intensity per image — giving the prompt writer a real point of view to follow.

**3. Camera angle is inherited, not corrected**
The visualiser works with whatever photos the estate agent took. If the living room was photographed from a dark corner with a wide-angle lens, the renovated version is still shot from that same dark corner. The composition problem is baked in before the model touches it. A beautifully renovated space can still look underwhelming if the angle was bad to begin with.

**4. Classifier depth limits prompt quality** ✅ *Partially addressed by Architectural Reading*
The renovation prompt is only as good as the classifier's observations. The expanded architectural reading now provides construction inferences, period features, and identified issues — giving the prompt writer much more to work with. However, the reading still can't detect what's not visible in photos (orientation, hidden services, structural condition behind render).

---

## Step 5 — Cost Estimator Agent

### What it does

The Cost Estimator is a text-only Claude call that produces the financial chapter of the report — budget ranges, value gap analysis, and phased costs for a residential renovation project. It reasons about UK construction costs using the evidence from the Classifier's architectural reading and the scope from the Design Brief.

This is a **desktop appraisal, not a tender**. The report says so explicitly.

### What it receives

From the **Classifier**: archetype (era, construction type) + full architectural reading (construction inferences, issues identified, period features).
From the **Design Brief**: transformation strategy, design language (palette, materials, mood), concept statement.
From the **listing**: asking price, address, property type, bedrooms, bathrooms.

### What it produces

- **Budget breakdown** — by category (Structural & Shell, M&E, Finishes, Kitchen, Bathrooms, External Works, etc.) with low/high ranges and notes
- **Total envelope** — overall renovation cost range
- **Price gap analysis** — asking price vs estimated post-works value vs total investment (purchase + renovation)
- **Phased budget** — Move-in basics (what must be done first), Year 1–2 (main programme), Complete vision (everything to full spec)
- **Cost drivers** — the 3–4 biggest factors that swing the total (e.g. roof condition, structural unknowns)
- **Key assumptions** — explicitly listed so the reader knows what was assumed
- **Confidence statement** — honest disclaimer about reliability

### How it works

```
User clicks "Run" on the Cost Estimator card in /pipeline/{reportId}
    |
    v
Agent reads results.classification.architecturalReading
         + results.design_brief from the report
    |
    v
Sends a single text message to Claude:
    - property metadata (address, price, type, beds/baths)
    - archetype + construction inferences + issues
    - design brief (strategy, palette, materials, mood)
    |
    v
Claude responds with structured JSON
    |
    v
Response validated with Zod and written to:
    results.cost_estimate = { budgetBreakdown[], totalEnvelope, priceGap, phasedBudget, ... }
```

Cost is ~$0.01 per report (single text call, no vision).

### Regional awareness

The estimator infers the region from the address and adjusts:
- **London and South East**: highest rates
- **South West, Wales, North**: typically 15–30% lower
- **Rural areas**: lower labour rates but potentially higher material delivery costs

### Known limitations

- **No cost database** — uses Claude's training knowledge, not live material prices. Reasonable ranges, not precise quotes.
- **No site visit** — cannot assess structural condition behind render, verify electrics age, or check drainage.
- **Comparable sales** — currently not available (future: from area enrichment). Post-works value is estimated from archetype + region.
- **Specification drift** — the brief's "mood" and "materials" language is interpreted, not priced line-by-line.

---

## Step 6 — Video Facade Agent

### What it does

The Video Facade takes the best before/after exterior pair from the Renovation Visualiser and generates a **4-second morphing video** showing the building gradually transforming from its current state to the renovated version. No Claude call — the prompt is static. Just one Vidu call via fal.ai.

### What it produces

- **Video URL** — a hosted video of the exterior transformation
- **Duration** — 4 seconds
- **Cost** — ~$0.12 per video

### How it works

```
User clicks "Run" on the Video Facade card in /pipeline/{reportId}
    |
    v
Agent reads results.renovation_visualisation.exteriors[0]
    |
    v
Ensures both before and after URLs are accessible from fal.ai servers
(re-uploads if Rightmove CDN blocks access)
    |
    v
Sends to Vidu (fal.ai/vidu/start-end-to-video):
    - start_image_url: original exterior photo
    - end_image_url: renovated exterior photo
    - prompt: "Smooth renovation transformation of a house exterior.
              Camera remains perfectly static. Natural daylight.
              Realistic, steady transformation."
    |
    v
Vidu returns video URL + duration
    |
    v
Written to results.video_facade = { videoUrl, durationSeconds, cost }
```

Cost is ~$0.12 per video. No AI prompt crafting — the prompt is hardcoded.

### Known limitations

- **Single exterior only** — uses the first exterior pair from the visualiser. If the best exterior photo was weak, the video inherits that weakness.
- **No camera movement** — the camera is static by design. The transformation is a morph, not a walkthrough.
- **Depends on Visualiser** — requires at least one completed exterior visualisation.

---

## Step 7 — Narrative Writer

### What it does

The Narrative Writer is the final AI step. It reads every prior agent's output — classification, architectural reading, design brief, cost estimate, and optionally the visualiser's image count — and writes the editorial glue that holds the assembled report together.

It does not repeat or summarise. Each section is a transition, a reframing, or a perspective shift that makes the report read as a single authored document rather than a stack of agent outputs.

### What it produces

Six short prose sections, totalling 400–500 words:

- **Opening hook** — the first thing the reader sees. Establishes place, character, and the central tension of the property in 2–3 sentences.
- **Building reading transition** — bridges from the hook into the architectural analysis. Sets up "here's what we found when we looked closely."
- **Honest layer narrative** — reframes the classifier's issues and unknowns into plain English. Mentions every issue and unknown, with actual severity. Not alarmist, not dismissive.
- **Numbers transition** — bridges from the honest layer into the cost chapter. One sentence that says "here's what all that means in money."
- **Value gap narrative** — interprets the cost estimate's price gap in context. Uses actual £ figures. Says whether the numbers work, barely work, or need caution.
- **Closing statement** — final thought. Forward-looking, honest, grounded. Ends the report.

### How it works

```
User clicks "Run" on the Narrative Writer card in /pipeline/{reportId}
    |
    v
Agent reads:
    results.classification (summary, archetype, architecturalReading)
    results.design_brief (conceptStatement, strategy, rationale)
    results.cost_estimate (totalEnvelope, priceGap, phasedBudget, costDrivers)
    results.renovation_visualisation (image count, optional)
    |
    v
Assembles NarrativeWriterInput from all sources
    |
    v
Sends a single text message to Claude (temperature 0.4):
    - property context (address, price, type, beds/baths)
    - archetype + era + construction
    - classifier summary + issues + unknowns
    - design brief concept + strategy
    - cost estimate numbers (total, price gap, cost drivers)
    - image count from visualiser
    |
    v
Claude responds with structured JSON (6 string fields)
    |
    v
Response validated with Zod and written to:
    results.narrative = { openingHook, buildingReadingTransition, honestLayerNarrative, ... }
```

Cost is ~$0.005 per report (single text call, no vision, low max tokens).

### Voice and tone

- Warm, knowledgeable, direct — like an experienced architect talking to a friend
- British English throughout
- No exclamation marks, no superlatives, no estate agent language
- Refers to the building as "it" or "the house" — never "this property"
- Every issue gets mentioned. Every £ figure is real. Nothing is vague.

### Known limitations

- **Depends on all prior agents** — requires classification, design brief, and cost estimate to be complete. Visualiser is optional but enriches the output.
- **No independent research** — the narrative writer only works with what the other agents produced. If the classifier missed something, the narrative can't catch it.
- **Tone consistency** — at temperature 0.4 the voice is fairly stable, but different properties may get slightly different editorial registers.

---

## Step 8 — Report Assembly

### What it does

The Report Assembly is not an AI agent — it's a server-rendered page that reads all agent outputs and the narrative writer's editorial glue, and renders them into a single scrolling document at `/report/{reportId}`.

This is the shareable output. The thing you'd send to a client, a partner, or yourself.

### What it produces

A single scrolling document with a dark hero, four chapters, and a closing gate:

```
┌─────────────────────────────────────────────────────────────────┐
│  HERO (dark #1A1816 background)                                 │
│                                                                 │
│  Piega wordmark (Playfair italic, top-left)                     │
│  RIGHTMOVE · POSTCODE · AREA (Bebas Neue context tag)           │
│                                                                 │
│  Property Name                                                  │
│  (Playfair Display, 34–48px, cream)                             │
│                                                                 │
│  Full address · 3 bed · Semi-detached · Freehold (Inter, muted) │
│                                                                 │
│  £325K        3 BED       SEMI        1930–1945                 │
│  guide        2 bath      Freehold    Interwar Semi             │
│  (Bebas Neue stats row — discrete data points)                  │
│                                                                 │
│  Ghost watermark: "INTERWAR SEMI" at 200px, 2% opacity          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  HERO MEDIA (breaks out to 900px, full-bleed)                   │
│                                                                 │
│  If Video Facade exists → autoplay muted loop of facade morph   │
│  Else → renovated exterior or best listing photo                │
│  Label: "THE APPROACH" (top-left watermark)                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  OPENING HOOK (Playfair italic, 17–22px — the first editorial   │
│  moment. Narrative writer's openingHook.)                       │
│                                                                 │
│  ARCHETYPE SLAB (Bebas Neue, terracotta, uppercase)             │
│  "INTERWAR SEMI. 1930–1945. CAVITY BRICK, CONCRETE TILE ROOF." │
│                                                                 │
├─── Chapter 1 · WHAT YOU'RE LOOKING AT ──────────────────────────┤
│                                                                 │
│  Narrative transition (Playfair italic Verse)                   │
│  Building narrative (EB Garamond prose, 3–4 paragraphs)         │
│  Period features (vertical inventory — visible normal,          │
│    hidden/inferred italic, status labels right-aligned)         │
│  Construction inferences (2-col grid: walls, roof, foundations, │
│    insulation, windows & doors, heating & services)             │
│                                                                 │
│  ── thin divider ──                                             │
│                                                                 │
├─── Chapter 2 · WHAT IT COULD BECOME ───────────────────────────┤
│                                                                 │
│  Concept statement (EB Garamond prose)                          │
│  Design language:                                               │
│    Palette — colour swatches (48px rectangles + names)          │
│    Materials — specification list with coloured dots            │
│    Mood — "honest, warm, rooted in place" (Playfair italic)    │
│                                                                 │
│  Before / After sliders (draggable, 900px breakout, 16:9)      │
│    Left = NOW (original) / Right = POSSIBLE (renovated)         │
│    One per transformed image, stacked vertically                │
│    Labels: "DRAG · FRONT EXTERIOR", "DRAG · KITCHEN", etc.     │
│                                                                 │
│  Strategy rationale (Inter caption)                             │
│                                                                 │
│  ── thin divider ──                                             │
│                                                                 │
├─── Chapter 3 · WHAT TO INVESTIGATE ────────────────────────────┤
│                                                                 │
│  "WHERE THE REAL DECISIONS ARE." (Bebas Neue slab)              │
│  Honest layer narrative (EB Garamond prose, 2–3 paragraphs)     │
│  Issues identified — expandable cards:                          │
│    [▾ Damp staining on chimney breast          MODERATE ]       │
│    Click to reveal: evidence + implication                      │
│    Severity colours: significant=terracotta,                    │
│      moderate=clay, minor=grey                                  │
│  Unknowns — dimmed card: "Cannot Be Assessed From Photos"      │
│    Bulleted list of 5–8 items                                   │
│                                                                 │
│  ── thin divider ──                                             │
│                                                                 │
├─── Chapter 4 · THE NUMBERS ────────────────────────────────────┤
│  (conditional — only rendered if cost estimate exists)          │
│                                                                 │
│  Numbers transition (Playfair italic Verse)                     │
│  Budget breakdown rows (category + notes + £Xk–£Yk range)      │
│  Stacked proportional bar (coloured segments + labels)          │
│                                                                 │
│  £50k–£75k                                                      │
│  (Bebas Neue, 52–96px — the BIG number)                        │
│  "ten-year cost of ownership beyond purchase"                   │
│                                                                 │
│  Price gap visual: Asking Price → Est. Post-Works Value         │
│  Value gap narrative (Playfair italic Verse with £ figures)     │
│  Phased budget (3 stacked cards):                               │
│    Move-in Basics (terracotta) / Year 1–2 (clay) /             │
│    Complete Vision (sage)                                       │
│  Cost drivers (cards with factor + impact)                      │
│  Confidence + key assumptions (dimmed card, italic)             │
│                                                                 │
│  ── thin divider ──                                             │
│                                                                 │
├─── CLOSING GATE ───────────────────────────────────────────────┤
│                                                                 │
│  Closing statement (Playfair italic, centred)                   │
│  "YOU READ THIS FAR." (Bebas Neue)                              │
│  "This is one building. Yours is different." (Playfair italic)  │
│                                                                 │
├─── FOOTER ─────────────────────────────────────────────────────┤
│  PIEGA.                                                         │
│  Property intelligence · United Kingdom                         │
│  "Not affiliated with any estate agent. That is the point."     │
│  ← Pipeline Hub (link back)                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Design

- 680px max-width content column, warm off-white background (`#FAF8F5`)
- Hero media and before/after sliders break out to 900px for cinematic impact
- Dark hero section (`#1A1816`) — typographic, not image-based
- Serif headings (Playfair Display), editorial body text (EB Garamond), dramatic caps (Bebas Neue), captions (Inter)
- Not a dashboard — a document. Generous whitespace, chapter numbering, thin dividers
- Scroll-triggered reveal animations (fade + rise via IntersectionObserver)
- Interactive elements: draggable before/after sliders (mouse + touch), expandable issue cards
- Graceful degradation: works without visualiser images (shows placeholder text), Chapter 4 only renders if cost estimate exists, video plays only if Video Facade ran

### How it works

```
User clicks "View Report →" on the pipeline hub
    (or navigates directly to /report/{reportId})
    |
    v
Next.js page fetches GET /reports/{reportId}
    |
    v
Reads all result keys:
    results.classification
    results.design_brief
    results.renovation_visualisation (optional)
    results.cost_estimate (optional — Chapter 4 hidden without it)
    results.narrative
    results.video_facade (optional — hero falls back to static image)
    |
    v
Renders chapters in order, weaving narrative sections
between data sections. Missing agents degrade gracefully.
```

Cost: $0 — no AI, no API calls. Just rendering.

---

## How the steps relate

```
[ Step 1 ]                [ Step 2 ]                      [ Step 3 ]               [ Step 4 + 5 ]            [ Step 6 ]             [ Step 7 ]             [ Step 8 ]
Chrome Extension          Classifier                      Design Brief             Parallel agents           Video Facade           Narrative Writer       Report Assembly
----------------          ----------                      ------------             ---------------           ---------------        ----------------       ---------------
Runs on every             Runs automatically               Runs on demand           Runs on demand            Runs on demand         Runs on demand         No AI — layout
Rightmove page            when report is created           user triggers it         user triggers             user triggers          user triggers          user opens page

Reads page data      ->   Call 1: archetype +          ->  Reads archetype,     ->  Visualiser: images    ->  Takes best         ->  Reads all prior    ->  Renders all
Stores locally            image classification              image observations       + brief → fal.ai         exterior pair          agent outputs          outputs into
POST /reports             Call 2: architectural reading    Creates unified                                    Vidu generates         Writes editorial       single scrolling
Opens pipeline hub        Writes:                          renovation concept       Cost Estimator:           4-second morph         glue (6 sections)      document
                          results.classification           (palette, materials,     reading + brief           video                  Writes:                Reads:
                          └── .architecturalReading        mood, strategy)          → budget ranges           Writes:                results.narrative      all results.* keys
                                                           Writes:                                           results.video_facade
                                                           results.design_brief     Both write to
                                                                                    results.* keys
```

The **Classifier** (both calls) is a prerequisite for everything. The **Design Brief** is a prerequisite for the **Cost Estimator** (required) and the **Visualiser** (optional — falls back to standalone mode without it). The **Visualiser** and **Cost Estimator** are independent and can run in parallel. The **Video Facade** depends on the **Visualiser** (requires at least one exterior pair). The **Narrative Writer** requires classification, design brief, and cost estimate — the visualiser is optional but enriches the output. The **Report Assembly** reads everything and renders it — no AI.

---

## Pipeline Hub

All agents are managed from a single **Pipeline Hub** page at `/pipeline/{reportId}`. This is the primary interface after the Chrome extension sends data.

The hub shows:
- **Property header** — address, price, archetype badge, progress counter (X/6 agents done)
- **Sequential agents** — Extension → Classifier → Design Brief, rendered vertically with connector lines
- **Parallel agents** — Visualiser + Cost Estimator + Video Facade, rendered side-by-side after a fork connector
- **Post-parallel agent** — Narrative Writer, rendered after a rejoin connector below the parallel pair
- **Per-agent cards** — status badge (Complete / Running / Ready / Waiting), summary, action buttons (Run ▶, Re-run ↻, View Results →)
- **View Report →** — appears when the Narrative Writer completes, linking to `/report/{reportId}`

Agent status is derived from `report.results`:
- **Complete** — the agent's `resultKey` exists in results
- **Running** — a trigger is in-flight or the report status is pending
- **Ready** — all dependencies met, waiting for user to trigger
- **Waiting** — dependencies not yet complete (shows which agents are blocking)

The hub polls every 3 seconds to reflect background agent progress (e.g. the classifier finishing).

Clicking **View Results →** navigates to the agent's detail page at `/agents/{agent-name}/{reportId}`. Each detail page has a **← Pipeline** back link.

The report picker at `/pipeline` lists all reports with a mini progress bar.

---

## URL structure

| Route | Purpose |
|---|---|
| `/pipeline` | Report picker — lists all reports with pipeline progress |
| `/pipeline/{reportId}` | Pipeline hub — per-report agent control center |
| `/agents/classifier/{reportId}` | Classifier detail (archetype, images, architectural reading) |
| `/agents/design-brief/{reportId}` | Design Brief detail (concept, palette, image selections) |
| `/agents/visualiser/{reportId}` | Renovation Visualiser detail (before/after pairs) |
| `/agents/cost-estimate/{reportId}` | Cost Estimator detail (budget breakdown, phased costs) |
| `/agents/narrative/{reportId}` | Narrative Writer detail (6 editorial sections) |
| `/report/{reportId}` | Assembled report — the shareable, single-page output |

The Video Facade has no detail page — its result (video URL) is shown inline on the pipeline hub.

Old URLs (`/reports/{id}`, `/design-brief/{id}`, `/visualiser/{id}`, `/cost-estimate/{id}`) redirect to their new equivalents.

---

## Models & APIs

| Step | Purpose | Model | Provider | Cost |
|------|---------|-------|----------|------|
| Classifier (Call 1) | Archetype + image classification | `claude-sonnet-4-20250514` | Anthropic | ~$0.03–0.05 / report |
| Classifier (Call 2) | Architectural reading | `claude-sonnet-4-20250514` | Anthropic | ~$0.03–0.05 / report |
| Design Brief | Creating unified renovation concept | `claude-sonnet-4-20250514` | Anthropic | ~$0.01 / report |
| Renovation Visualiser | Crafting renovation prompts | `claude-sonnet-4-20250514` | Anthropic | Per token |
| Renovation Visualiser | Generating "after" images (production) | `nano-banana-pro` → Gemini 3 Pro Image | fal.ai | $0.15 / image |
| Renovation Visualiser | Generating "after" images (cheaper alt) | `nano-banana-2` → Gemini 3.1 Flash Image | fal.ai | $0.08 / image |
| Renovation Visualiser | Post-production polish (optional) | `nano-banana-pro` | fal.ai | $0.15 / image |
| Cost Estimator | Desktop cost appraisal | `claude-sonnet-4-20250514` | Anthropic | ~$0.01 / report |
| Narrative Writer | Editorial glue (6 sections) | `claude-sonnet-4-20250514` | Anthropic | ~$0.005 / report |
| Video Facade | 4-second exterior morph video | `vidu/start-end-to-video` | fal.ai | ~$0.12 / video |

Nano Banana is a Google Gemini image model served via the fal.ai platform. Both variants accept an original photo + a text instruction and return a photo-realistic edited version. The model understands spatial relationships, lighting, and scene structure — it modifies the image rather than replacing it wholesale.

The default production model is `nano-banana-pro`. At 5 images per report (with post-production) that's $1.50 per report for images.

**Total per report**: ~$0.56–0.91 without post-production or video, ~$1.18–1.78 with post-production and video facade.

---

## Storage

All agents write to the same Supabase row. The `results` column is a JSON object where each agent owns a key:

```
piega_reports.results
├── classification                     <- written by Classifier
│   └── architecturalReading           <- written by Architectural Reading (Call 2)
├── design_brief                       <- written by Design Brief
├── renovation_visualisation           <- written by Renovation Visualiser
├── cost_estimate                      <- written by Cost Estimator
├── narrative                          <- written by Narrative Writer
└── video_facade                       <- written by Video Facade
```
