# Piega — Agent Overview

*Last updated: March 27, 2026*

---

## How it works — end to end

The full user journey runs in three steps:

```
[ Step 1 ]              [ Step 2 ]              [ Step 3 ]
  Chrome Extension  →     Classifier        →     Renovation Visualiser
  (data collection)       (AI analysis)           (AI image generation)
  automatic               automatic               manual trigger
```

Each step hands off to the next via a shared Supabase record. Nothing is coupled directly — the extension just creates a row, the classifier fills it in, the visualiser reads it and extends it.

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

## Step 3 — Renovation Visualiser Agent

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

## How the three steps relate

```
[ Step 1 ]                [ Step 2 ]                [ Step 3 ]
Chrome Extension          Classifier                Renovation Visualiser
----------------          ----------                ---------------------
Runs on every             Runs automatically        Runs on demand
Rightmove page            when report is created    when user triggers it

Reads page data      ->   Identifies archetype  ->  Reads archetype +
Stores locally            Classifies images         image classifications
POST /reports             Writes:                   Crafts renovation
Opens report page         results.classification    prompts via Claude
                                                    Generates images via
                                                    Nano Banana (fal.ai)
                                                    Writes:
                                                    results.renovation_
                                                    visualisation
```

The Classifier is a prerequisite for the Visualiser: it needs to know which images are worth processing and what era and construction type the building is. A report without classification cannot be visualised.

---

## Models & APIs

| Step | Purpose | Model | Provider | Cost |
|------|---------|-------|----------|------|
| Classifier | Vision analysis of listing photos | `claude-sonnet-4-20250514` | Anthropic | Per token |
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
└── renovation_visualisation    <- written by Renovation Visualiser
```
