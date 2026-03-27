# Piega — Agent Overview

*Last updated: March 27, 2026*

---

## How it works — end to end

The full user journey runs in four steps:

```
[ Step 1 ]              [ Step 2 ]              [ Step 3 ]              [ Step 4 ]
  Chrome Extension  →     Classifier        →     Design Brief      →     Renovation Visualiser
  (data collection)       (AI analysis)           (renovation concept)    (AI image generation)
  automatic               automatic               manual trigger          manual trigger
```

Each step hands off to the next via a shared Supabase record. Nothing is coupled directly — the extension just creates a row, the classifier fills it in, the brief interprets it, the visualiser follows it.

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

### How it works

```
Listing JSON arrives at POST /reports
    |
    v
Classifier downloads all listing photos
    |
    v
Sends a single multimodal message to Claude:
    - property metadata (text)
    - all photos (vision)
    - menu of 18 archetypes to choose from
    - instructions for image-by-image classification
    |
    v
Claude responds with structured JSON
    |
    v
Response validated and written to:
    results.classification = { archetype, images[], summary }
```

The classifier runs once per report, automatically, the moment a listing is submitted.

### Known limitations

The classifier reads what is visible in listing photos but does not go deeper into:

- **Construction reality** — wall type (solid brick vs cavity vs timber frame), roof structure, foundation, likely insulation spec. The archetype gives a broad hint but not a surveyor-level reading.
- **Site and context** — orientation, aspect, neighbouring buildings, street character, conservation area status, topography. All invisible from listing photos alone.
- **Condition beneath the surface** — electrics age, plumbing, boiler type, window spec — things that don't appear in estate agent photography.
- **Period features granularity** — it can note "cornicing visible" but doesn't distinguish original lime plaster from a modern replica, or assess structural significance.

These gaps matter downstream. A shallow classification produces shallow renovation prompts.

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

The current visualiser has four structural problems that affect output quality.

**1. No design coherence across images**
Each image is prompted independently. The kitchen, living room, and exterior each get a separate Claude prompt with no shared palette, no consistent material language, no unifying concept. The result is a set of individually tweaked photos that don't read as a single renovation. There is no through-line of colour, material, or character.

**2. Prompts lack lift**
The editing prompts are technically correct but aesthetically safe. They describe mid-range materials and sensible interventions but don't reach for a point of view. A good renovation has an opinion — a colour that commits, a material that earns its place. The current prompts produce results that look slightly improved rather than genuinely transformed.

**3. Camera angle is inherited, not corrected**
The visualiser works with whatever photos the estate agent took. If the living room was photographed from a dark corner with a wide-angle lens, the renovated version is still shot from that same dark corner. The composition problem is baked in before the model touches it. A beautifully renovated space can still look underwhelming if the angle was bad to begin with.

**4. Classifier depth limits prompt quality**
The renovation prompt is only as good as the classifier's observations. If the classifier notes "dated kitchen units" but doesn't record that the kitchen faces north, has a low ceiling, original quarry tile floor, and an Aga position — the prompt writer has nothing to work with beyond the obvious. Shallow input produces shallow output.

---

## How the four steps relate

```
[ Step 1 ]                [ Step 2 ]                [ Step 3 ]                [ Step 4 ]
Chrome Extension          Classifier                Design Brief              Renovation Visualiser
----------------          ----------                ------------              ---------------------
Runs on every             Runs automatically        Runs on demand            Runs on demand
Rightmove page            when report is created    when user triggers it     when user triggers it

Reads page data      ->   Identifies archetype  ->  Reads archetype +     ->  Reads brief's palette,
Stores locally            Classifies images         image classifications     materials, mood, and
POST /reports             Writes:                   Creates unified           per-image guidance
Opens report page         results.classification    renovation concept        Crafts renovation
                                                    (palette, materials,      prompts via Claude
                                                    mood, strategy)           Generates images via
                                                    Writes:                   Nano Banana (fal.ai)
                                                    results.design_brief      Writes:
                                                                              results.renovation_
                                                                              visualisation
```

The Classifier is a prerequisite for both the Design Brief and the Visualiser. The Design Brief is optional for the Visualiser — without it, the visualiser falls back to standalone mode with hardcoded image selection. With it, every image is prompted within a shared design language.

---

## Models & APIs

| Step | Purpose | Model | Provider | Cost |
|------|---------|-------|----------|------|
| Classifier | Vision analysis of listing photos | `claude-sonnet-4-20250514` | Anthropic | Per token |
| Design Brief | Creating unified renovation concept | `claude-sonnet-4-20250514` | Anthropic | ~$0.01 / report |
| Renovation Visualiser | Crafting renovation prompts | `claude-sonnet-4-20250514` | Anthropic | Per token |
| Renovation Visualiser | Generating "after" images (production) | `nano-banana-pro` → Gemini 3 Pro Image | fal.ai | $0.15 / image |
| Renovation Visualiser | Generating "after" images (cheaper alt) | `nano-banana-2` → Gemini 3.1 Flash Image | fal.ai | $0.08 / image |

Nano Banana is a Google Gemini image model served via the fal.ai platform. Both variants accept an original photo + a text instruction and return a photo-realistic edited version. The model understands spatial relationships, lighting, and scene structure — it modifies the image rather than replacing it wholesale.

The default production model is `nano-banana-pro`. At 5 images per report that's $0.75 per report.

---

## Storage

Both agents write to the same Supabase row. The `results` column is a JSON object where each agent owns a key:

```
piega_reports.results
├── classification              <- written by Classifier
├── design_brief                <- written by Design Brief
└── renovation_visualisation    <- written by Renovation Visualiser
```
