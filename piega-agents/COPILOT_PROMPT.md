# Piega — Agentic Report Pipeline

## What this project is

Piega is a Chrome extension + web platform that generates editorial-quality property reports for UK real estate listings. The Chrome extension reads a Rightmove listing page (DOM parsing — Rightmove blocks scraping, so the extension is the only way to extract data). The extracted listing data flows into a pipeline of AI agents that produce a structured, beautifully designed report showing what a property could become after renovation.

**Primary audience:** Estate agents and landlords who have properties that aren't selling — the listings look bad on first glance (poor condition, ugly photos, rough area) and buyers skip them. Our report reveals hidden potential and becomes a sales tool the agent can share with prospective buyers.

**Secondary audience:** Individual buyers browsing Rightmove who want to understand whether a rough-looking listing is actually a good opportunity.

**The report is not a generic summary.** It's shaped by two dimensions:
- **Property archetype** (Victorian terrace, post-war semi, Georgian townhouse, 60s bungalow, new-build, etc.) — each has different structural characteristics, typical issues, renovation patterns
- **Buyer purpose** — "I want to live here" / "I want to rent it out" / "I want to flip it" — each produces a fundamentally different report angle, different cost framing, different visualisations

---

## Tech stack

- **Runtime:** Node.js + TypeScript (entire stack is TS — extension backend, agents, web server, report rendering)
- **Agent framework:** LangGraph.js (@langchain/langgraph) for pipeline orchestration, LangChain.js (@langchain/core, @langchain/anthropic) for LLM interaction
- **LLM provider:** Anthropic Claude (claude-sonnet-4-20250514 for most agents, claude-sonnet-4-20250514 for vision/image analysis in classifier)
- **Observability:** LangSmith for tracing, evaluation datasets, prompt benchmarking
- **Testing:** Vitest for unit tests, custom eval harness using LangSmith datasets
- **Package manager:** pnpm

---

## Architecture overview

The pipeline has 5 stages:

```
STAGE 1: Chrome Extension (already built)
  Parses Rightmove DOM → structured JSON
  Output: ParsedListing object

STAGE 2: Area Intelligence Enrichment (partially built)
  Calls public APIs in parallel using lat/lng and postcode
  Output: EnrichedAreaData object

STAGE 3: Purpose Selection
  User picks: "live in" | "rent out" | "flip"
  Output: BuyerPurpose enum

STAGE 4: AI Agent Pipeline (THIS PROJECT)
  7 agents in a LangGraph state graph
  Some run in parallel, some sequentially
  Output: all report chapter data

STAGE 5: Report Assembly
  Combines agent outputs into web page + PDF
  Output: piega.co/report/[id] + downloadable PDF
```

### Stage 4 agent pipeline — the graph

```
                    ┌─────────────┐
                    │  START       │
                    └──┬──┬──┬────┘
                       │  │  │
            ┌──────────┘  │  └──────────┐
            ▼             ▼             ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │  Classifier  │ │ Building │ │    Area      │
    │              │ │  Reader  │ │   Analyst    │
    └──────┬───────┘ └────┬─────┘ └──────┬───────┘
           │              │              │
           └──────┬───────┘              │
                  ▼                      │
         ┌────────────────┐              │
         │   Renovation   │              │
         │   Architect    │              │
         └───┬────────┬───┘              │
             │        │                  │
             ▼        ▼                  │
    ┌────────────┐ ┌────────────┐        │
    │    Cost    │ │   Media    │        │
    │  Estimator │ │ Generator  │        │
    └────────┬───┘ └─────┬──────┘        │
             │           │               │
             └─────┬─────┘               │
                   ▼                     │
          ┌─────────────────┐            │
          │    Narrative    │◄───────────┘
          │     Writer      │
          └────────┬────────┘
                   ▼
               ┌───────┐
               │  END  │
               └───────┘
```

**Parallel tier 1:** Classifier + Building Reader + Area Analyst (no dependencies on each other)
**Sequential:** Renovation Architect (needs Classifier archetype + Building Reader condition data)
**Parallel tier 2:** Cost Estimator + Media Generator (both need Renovation plan, don't need each other)
**Final:** Narrative Writer (needs everything)

---

## Data types

### ParsedListing (input from Chrome extension)

This is what the Chrome extension extracts from a Rightmove page:

```typescript
interface ParsedListing {
  listingId: string
  portal: "rightmove" | "zoopla"
  address: string
  postcode: string | null
  askingPrice: number
  priceCurrency: string
  priceDisplay: string
  addedOrReduced: string | null        // e.g. "Reduced on 21/03/2026"
  propertyType: string                  // e.g. "Semi-Detached Bungalow"
  tenure: string | null                 // "FREEHOLD" | "LEASEHOLD" | null
  bedrooms: number
  bathrooms: number
  description: string                   // full HTML description from listing
  latitude: number
  longitude: number
  imageCount: number
  photos: Array<{
    url: string
    caption: string                     // often just "Photo 1", "Photo 2" etc.
  }>
  floorplans: Array<{
    url: string
    thumbnail: string
  }>
  agent: string                         // e.g. "Eric Lloyd & Co, Paignton"
  _parsedAt: string                     // ISO timestamp
  _source: string
}
```

### EnrichedAreaData (from area intelligence APIs)

```typescript
interface EnrichedAreaData {
  imd: {
    decile: number                      // 1-10 (1 = most deprived)
    rank: number
    lsoa: string
  } | null
  flood: {
    zone: 1 | 2 | 3                    // 1 = low, 3 = high
    description: string
  } | null
  crime: {
    totalIncidents: number
    month: string
    breakdown: Record<string, number>   // category → count
  } | null
  boundary: {
    polygon: GeoJSON.Polygon | null
    areaM2: number | null
  } | null
  // TODO: these are not yet implemented
  schools: Array<{
    name: string
    type: string
    distance: number
    rating: string
  }> | null
  transport: Array<{
    name: string
    type: string                        // "rail" | "tube" | "bus"
    distance: number
  }> | null
  comparableSales: Array<{
    address: string
    price: number
    date: string
    propertyType: string
  }> | null
}
```

### BuyerPurpose

```typescript
type BuyerPurpose = "live_in" | "rent_out" | "flip"
```

### ReportState (LangGraph shared state)

This is the state object that flows through the graph. Each agent reads what it needs and writes its output back.

```typescript
interface ReportState {
  // Inputs (set before graph runs)
  listing: ParsedListing
  enrichedArea: EnrichedAreaData
  purpose: BuyerPurpose

  // Agent outputs (set by agents during graph execution)
  classification: ClassificationResult | null
  buildingReading: BuildingReadingResult | null
  areaAnalysis: AreaAnalysisResult | null
  renovationPlan: RenovationPlanResult | null
  costEstimate: CostEstimateResult | null
  media: MediaResult | null
  narrative: NarrativeResult | null
}
```

---

## Agent output types

### ClassificationResult (from Classifier agent)

```typescript
interface ClassificationResult {
  archetype: {
    label: string                       // e.g. "victorian_mid_terrace"
    displayName: string                 // e.g. "Victorian Mid-Terrace"
    era: string                         // e.g. "1870-1900"
    constructionType: string            // e.g. "Solid brick, slate roof"
    typicalCharacteristics: string[]    // e.g. ["Bay windows", "High ceilings", "Rear addition"]
    confidenceScore: number             // 0-1
  }
  images: Array<{
    index: number                       // position in listing.photos array
    url: string
    classification: ImageClassification
  }>
  summary: string                       // 2-3 sentence architectural reading
}

interface ImageClassification {
  depicts: ImageSubject
  room: string | null                   // e.g. "kitchen", "master bedroom", null for exteriors
  usefulness: "high" | "medium" | "low" // for understanding space and condition
  observations: string[]                // e.g. ["Visible damp on ceiling", "Original cornicing intact"]
  skipReason: string | null             // if usefulness is "low", why — e.g. "Blurry close-up of boiler"
}

type ImageSubject =
  | "front_exterior"
  | "rear_exterior"
  | "side_exterior"
  | "kitchen"
  | "living_room"
  | "dining_room"
  | "bedroom"
  | "bathroom"
  | "wc"
  | "hallway"
  | "landing"
  | "loft"
  | "basement"
  | "garage"
  | "garden_rear"
  | "garden_front"
  | "driveway"
  | "floorplan"
  | "street_view"
  | "detail_closeup"                   // radiator, boiler, fixture etc.
  | "unknown"
```

### BuildingReadingResult (from Building Reader agent)

```typescript
interface BuildingReadingResult {
  condition: {
    overall: "good" | "fair" | "poor" | "very_poor"
    confidence: number
  }
  rooms: Array<{
    name: string
    observations: string[]
    condition: "good" | "fair" | "poor" | "unknown"
    periodFeatures: string[]            // e.g. ["Cornicing", "Picture rail", "Fireplace"]
    issues: string[]                    // e.g. ["Damp staining visible", "Dated electrics"]
  }>
  structure: {
    walls: string
    roof: string
    windows: string
    heating: string
    electrics: string
    plumbing: string
  }
  conditionMatrix: Array<{
    element: string
    status: "good" | "fair" | "poor" | "unknown"
    confidence: "high" | "medium" | "low"  // ● ◐ ○
    notes: string
  }>
}
```

### AreaAnalysisResult (from Area Analyst agent)

```typescript
interface AreaAnalysisResult {
  narrative: string                     // editorial paragraph about the location
  highlights: string[]                  // key selling points of the area
  risks: string[]                       // concerns
  contextMapData: {
    landmarks: Array<{ name: string; type: string; distance: string; bearing: string }>
    characterDescription: string
    conservationArea: boolean | null
  }
  areaIntelligenceCard: {
    deprivation: { score: number; interpretation: string } | null
    flood: { zone: number; interpretation: string } | null
    crime: { level: string; interpretation: string } | null
    schools: { summary: string } | null
    transport: { summary: string } | null
    broadband: { summary: string } | null
  }
}
```

### RenovationPlanResult (from Renovation Architect agent)

```typescript
interface RenovationPlanResult {
  approach: string                      // overall renovation strategy narrative
  rooms: Array<{
    name: string
    currentState: string
    proposedChanges: string[]
    estimatedCostRange: { low: number; high: number }
    priority: "essential" | "recommended" | "aspirational"
  }>
  structuralChanges: Array<{
    description: string
    rationale: string
    estimatedCost: { low: number; high: number }
    requiresPermission: boolean
  }>
  materialPalette: Array<{
    item: string                        // e.g. "Flooring"
    suggestion: string                  // e.g. "Engineered oak, herringbone pattern"
    reasoning: string
  }>
  phases: Array<{
    number: number
    name: string                        // e.g. "Strip out and structure"
    duration: string                    // e.g. "4-6 weeks"
    description: string
    keyDecisions: string[]
  }>
}
```

### CostEstimateResult (from Cost Estimator agent)

```typescript
interface CostEstimateResult {
  budgetBreakdown: Array<{
    category: string                    // "Structural", "M&E", "Finishes", "Contingency", "Fees"
    low: number
    high: number
    percentage: number                  // of total
  }>
  totalEnvelope: { low: number; high: number }
  priceGap: {
    askingPrice: number
    estimatedPostWorksValue: { low: number; high: number }
    refurbCost: { low: number; high: number }
    // Purpose-specific:
    netMargin?: { low: number; high: number }           // for flip
    grossYield?: { low: number; high: number }           // for rent_out
    equityGain?: { low: number; high: number }           // for live_in
  }
  phasedBudget: {
    moveInBasics: { low: number; high: number; description: string }
    yearOneTwo: { low: number; high: number; description: string }
    completeVision: { low: number; high: number; description: string }
  }
  scenarios: {
    best: { description: string; totalCost: number; outcome: string }
    worst: { description: string; totalCost: number; outcome: string }
  }
  confidenceNotes: string               // honest disclaimer about estimate reliability
}
```

### MediaResult (from Media Generator agent)

```typescript
interface MediaResult {
  heroImage: { url: string; description: string } | null
  beforeAfterImages: Array<{
    room: string
    beforeUrl: string
    afterUrl: string                    // AI-generated
    description: string
  }>
  floorplanSvg: string | null           // redrawn clean SVG
  contextMapSvg: string | null
  budgetBarSvg: string | null
  priceGapSvg: string | null
  phaseTimelineSvg: string | null
  conditionMatrixSvg: string | null
}
```

### NarrativeResult (from Narrative Writer agent)

```typescript
interface NarrativeResult {
  openingVerse: string
  placeNarrative: string
  buildingNarrative: string
  honestVerse: string
  reckoningNarrative: string
  finalVerse: string
}
```

---

## Report chapters (what the assembled report looks like)

The report is a single scrolling editorial page with 5 chapters:

1. **Hero** — Property name, address, price, hero image, opening verse
2. **The Place** — Context map, area intelligence card, street character, area narrative
3. **The Building** — Floor plans, room-by-room reading with before/after images, material palette, condition matrix
4. **The Honest Layer** — Risks, unknowns, what needs surveying, condition confidence indicators
5. **The Reckoning** — Price gap, budget breakdown bars, phased budget, scenarios, timeline, final verse

Each chapter draws from multiple agents. The narrative writer provides editorial text. The media generator provides visual assets. The data comes from classifier + building reader + area analyst + renovation architect + cost estimator.

---

## External APIs used

### Already integrated (in existing Chrome extension backend)

| API | Purpose | Auth |
|-----|---------|------|
| postcodes.io | Postcode → LSOA lookup | None (free) |
| DLUHC IMD 2019 | Deprivation score by LSOA | None (bundled CSV) |
| Environment Agency ArcGIS | Flood zone by lat/lng | None (free) |
| Police UK API | Crime data by lat/lng | None (free) |
| HM Land Registry INSPIRE WFS | Plot boundary polygon | None (free, intermittent) |

### To integrate

| API | Purpose | Auth |
|-----|---------|------|
| Land Registry Price Paid | Comparable sales | None (bulk download or API) |
| Ofsted / Get Information About Schools | School catchment data | None (free) |
| TfL / National Rail / Traveline | Transport links | API key (free tier) |
| Ofcom Connected Nations | Broadband speed | None (free) |

### LLM API

| Provider | Model | Used by |
|----------|-------|---------|
| Anthropic | claude-sonnet-4-20250514 | Classifier (vision), Building Reader (vision) |
| Anthropic | claude-sonnet-4-20250514 | Renovation Architect, Cost Estimator, Narrative Writer, Area Analyst |

The classifier and building reader use vision capabilities to analyse property photos. All other agents are text-only.

For image generation (before/after visualisations, hero images), we will evaluate options later. For now, the media generator agent is a placeholder that produces structured data for SVG templates only.

---

## Project structure

```
piega-agents/
├── src/
│   ├── agents/
│   │   ├── classifier.ts              # Property archetype + image classification
│   │   ├── buildingReader.ts          # Condition assessment from photos + description
│   │   ├── areaAnalyst.ts             # Area narrative from enriched data
│   │   ├── renovationArchitect.ts     # Room-by-room renovation plan
│   │   ├── costEstimator.ts           # Budget, price gap, scenarios
│   │   ├── mediaGenerator.ts          # SVG templates + image generation
│   │   └── narrativeWriter.ts         # Editorial text for each chapter
│   ├── graph/
│   │   ├── index.ts                   # LangGraph StateGraph definition
│   │   └── state.ts                   # ReportState type + channel definitions
│   ├── types/
│   │   ├── listing.ts                 # ParsedListing, EnrichedAreaData
│   │   ├── agents.ts                  # All agent result types
│   │   └── common.ts                  # Shared enums, utility types
│   ├── prompts/
│   │   ├── classifier.ts              # System + user prompt templates
│   │   ├── buildingReader.ts
│   │   ├── areaAnalyst.ts
│   │   ├── renovationArchitect.ts
│   │   ├── costEstimator.ts
│   │   └── narrativeWriter.ts
│   ├── utils/
│   │   ├── llm.ts                     # Anthropic client setup, model configs
│   │   ├── images.ts                  # Image URL fetching, base64 encoding for vision
│   │   └── parsing.ts                 # Structured output parsing helpers
│   └── server.ts                      # Express/Hono API endpoint (later)
├── fixtures/
│   ├── listings/
│   │   ├── paignton-bungalow.json     # Real parsed listing data
│   │   ├── sheffield-victorian.json
│   │   ├── bath-georgian.json
│   │   └── ...
│   └── enriched/
│       ├── paignton-bungalow.json     # Matching enriched area data
│       └── ...
├── eval/
│   ├── datasets.ts                    # Upload test cases to LangSmith
│   ├── evaluators/
│   │   ├── classifier.ts              # Scoring functions for classifier output
│   │   └── ...
│   └── run.ts                         # Batch evaluation runner
├── test/
│   ├── agents/
│   │   ├── classifier.test.ts         # Individual agent tests
│   │   └── ...
│   └── graph/
│       └── pipeline.test.ts           # Full pipeline integration test
├── .env                               # ANTHROPIC_API_KEY, LANGCHAIN_API_KEY, LANGCHAIN_TRACING_V2=true
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

---

## Environment variables

```env
# LLM
ANTHROPIC_API_KEY=sk-ant-...

# LangSmith observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_PROJECT=piega-agents

# Optional: control which model each agent uses
CLASSIFIER_MODEL=claude-sonnet-4-20250514
DEFAULT_MODEL=claude-sonnet-4-20250514
```

---

## Coding conventions

- Each agent is a standalone async function that can be tested independently
- Agent functions take a `Partial<ReportState>` and return `Partial<ReportState>`
- All LLM calls use structured output (Zod schemas) where possible — avoid parsing free text
- Prompts live in separate files from agent logic (src/prompts/) so they can be iterated without touching code
- Every agent call is automatically traced to LangSmith (via environment variables)
- Image URLs from Rightmove need to be fetched and base64-encoded before sending to Claude vision
- Always handle the case where an agent produces partial or malformed output — return a typed error state, never throw unhandled

---

## CURRENT TASK: Build the Classifier agent

The classifier is the first agent we're implementing. It does two things:

### 1. Property classification
Analyse the listing description, property type, photos, and any other available data to determine:
- The property archetype (from a defined set — see below)
- Estimated construction era
- Construction type and key characteristics
- A confidence score

### 2. Image classification
For each photo in the listing, determine:
- What it depicts (room type, exterior view, detail, etc.)
- How useful it is for understanding the property's space and condition
- Specific observations visible in the image (damp, period features, renovation state, etc.)
- Whether it should be skipped by downstream agents and why

### Property archetypes (initial set)

```
victorian_terrace          — 1837-1901, terraced house
victorian_semi             — 1837-1901, semi-detached
edwardian_terrace          — 1901-1914, terraced
edwardian_semi             — 1901-1914, semi-detached
georgian_townhouse         — 1714-1837, townhouse
interwar_semi              — 1918-1939, semi-detached (often "1930s semi")
interwar_terrace           — 1918-1939, terraced
postwar_semi               — 1945-1970, semi-detached
postwar_terrace            — 1945-1970, terraced
60s_70s_detached           — 1960-1979, detached house
60s_70s_bungalow           — 1960-1979, bungalow
80s_90s_estate             — 1980-1999, estate-built house
new_build                  — 2000+, any type
period_cottage              — pre-1900, cottage (rural)
converted_building         — former chapel, barn, warehouse, etc.
purpose_built_flat         — any era, flat/apartment
council_ex_council         — social housing origin, any era
other                      — doesn't fit above categories
```

### Implementation approach

1. Fetch all listing images as base64 (needed for Claude vision)
2. Send images + listing metadata to Claude in a single call with structured output
3. Parse the response into ClassificationResult type
4. The prompt should instruct Claude to think like an experienced UK building surveyor / architect who can identify era, construction method, and condition indicators from photos

### What to build now

1. `src/types/listing.ts` — ParsedListing and EnrichedAreaData interfaces
2. `src/types/agents.ts` — ClassificationResult and all other agent result types (define them all now even though we only implement classifier)
3. `src/types/common.ts` — BuyerPurpose, ImageSubject, and other shared types
4. `src/utils/llm.ts` — Anthropic client setup with model configuration
5. `src/utils/images.ts` — Fetch image URLs and convert to base64 for Claude vision API
6. `src/prompts/classifier.ts` — System prompt + user message template for the classifier
7. `src/agents/classifier.ts` — The agent function itself
8. `src/graph/state.ts` — ReportState with LangGraph Annotation channels
9. `src/graph/index.ts` — The full graph definition (all nodes declared, but only classifier implemented — others are stubs that pass through)
10. `fixtures/listings/paignton-bungalow.json` — The real listing data we already have
11. `test/agents/classifier.test.ts` — Test that runs classifier against fixture and logs output

### Classifier prompt guidance

The system prompt should establish Claude as an experienced UK property professional who:
- Knows UK housing stock intimately — can identify era from brickwork, window styles, rooflines, proportions
- Understands condition indicators visible in photos — damp staining, dated electrics, quality of previous renovations
- Can read a Rightmove description critically — spots estate agent euphemisms ("characterful" = old and unrenovated, "deceptively spacious" = looks small from outside)
- Classifies images pragmatically — a blurry photo of a boiler is low usefulness, a wide-angle shot of the living room showing ceiling height and natural light is high usefulness

The user message should include:
- All photos as base64 images (with their captions/indices)
- The floorplan image if available
- The listing description (stripped of HTML)
- Property type, bedrooms, bathrooms, price, address
- The full list of archetype options to choose from

The response should be structured JSON matching ClassificationResult.
