# Piega — Agent Overview

*Last updated: March 28, 2026*

---

## How it works — end to end

The full user journey runs in six steps:

```
[ Step 1 ]              [ Step 2 ]                    [ Step 3 ]              [ Step 4 + 5 (parallel) ]
  Chrome Extension  →     Classifier              →     Design Brief      →     Renovation Visualiser
  (data collection)       + Architectural Reading       (renovation concept)    + Cost Estimator
  automatic               automatic                    manual trigger          manual trigger
```

After the Design Brief, the **Renovation Visualiser** and **Cost Estimator** can run in parallel — neither depends on the other. Both depend on the Classifier + Design Brief.

Each step hands off to the next via a shared Supabase record. Nothing is coupled directly — the extension just creates a row, the classifier fills it in, the brief interprets it, the visualiser and cost estimator follow it.

---

## Step 1 — Chrome Extension

### What it does

The Chrome extension runs silently in the background whenever you visit a Rightmove property page. It reads all the data Rightmove has embedded in the page — address, price, description, photos, bedrooms, bathrooms, agent, postcode — and makes it available in a small popup. When you click **"Analyse Property"**, it sends that data to the Piega backend and opens the report page.

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
POST /reports  ->  returns report ID  ->  opens /reports/{id} in new tab
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
User clicks "Generate Brief" on /design-brief/{reportId}
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
User clicks "Run Visualiser" on /visualiser/{reportId}
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
User clicks "Run Cost Estimate" on /cost-estimate/{reportId}
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

## How the steps relate

```
[ Step 1 ]                [ Step 2 ]                      [ Step 3 ]               [ Step 4 + 5 ]
Chrome Extension          Classifier                      Design Brief             Parallel agents
----------------          ----------                      ------------             ---------------
Runs on every             Runs automatically               Runs on demand           Runs on demand
Rightmove page            when report is created           user triggers it         user triggers

Reads page data      ->   Call 1: archetype +          ->  Reads archetype,     ->  Visualiser: images
Stores locally            image classification              image observations       + brief → fal.ai
POST /reports             Call 2: architectural reading    Creates unified
Opens report page         Writes:                          renovation concept       Cost Estimator:
                          results.classification           (palette, materials,     reading + brief
                          └── .architecturalReading        mood, strategy)          → budget ranges
                                                           Writes:
                                                           results.design_brief     Both write to
                                                                                    results.* keys
```

The **Classifier** (both calls) is a prerequisite for everything. The **Design Brief** is a prerequisite for the **Cost Estimator** (required) and the **Visualiser** (optional — falls back to standalone mode without it). The **Visualiser** and **Cost Estimator** are independent and can run in parallel.

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

Nano Banana is a Google Gemini image model served via the fal.ai platform. Both variants accept an original photo + a text instruction and return a photo-realistic edited version. The model understands spatial relationships, lighting, and scene structure — it modifies the image rather than replacing it wholesale.

The default production model is `nano-banana-pro`. At 5 images per report (with post-production) that's $1.50 per report for images.

**Total per report**: ~$0.55–0.90 without post-production, ~$1.05–1.65 with post-production.

---

## Storage

All agents write to the same Supabase row. The `results` column is a JSON object where each agent owns a key:

```
piega_reports.results
├── classification                     <- written by Classifier
│   └── architecturalReading           <- written by Architectural Reading (Call 2)
├── design_brief                       <- written by Design Brief
├── renovation_visualisation           <- written by Renovation Visualiser
└── cost_estimate                      <- written by Cost Estimator
```
