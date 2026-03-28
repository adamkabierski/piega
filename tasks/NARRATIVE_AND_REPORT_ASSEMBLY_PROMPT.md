# Narrative Writer + Report Assembly — Copilot Prompt

## Where this sits in the pipeline

```
Extension → Classifier → Design Brief → [Visualiser + Cost Estimator] → Narrative Writer → Report Assembly
                                              (parallel)                    (Claude call)      (template, no AI)
```

The Narrative Writer is Step 6. Report Assembly is Step 7. Both run after all other agents have completed.

**Narrative Writer** — one Claude text call that produces the editorial glue between existing agent outputs. It does NOT rewrite what other agents already wrote. It writes ONLY the pieces that don't exist yet.

**Report Assembly** — a deterministic template engine (no AI) that takes every agent output + the narrative and renders a web page + PDF. Pure code, no LLM calls.

---

## What already exists as written content

Before designing the Narrative Writer, here's what we already have from other agents:

| Source | Content | Quality | Used in report as |
|--------|---------|---------|-------------------|
| Classifier | `summary` (2-3 sentences) | Good, concise | Hero subtitle |
| Classifier | `architecturalReading.buildingNarrative` (3-4 paragraphs) | Rich, architect voice | Chapter 2 body text |
| Classifier | `architecturalReading.issuesIdentified[]` | Structured data | Input for Honest Layer |
| Classifier | `architecturalReading.unknowns[]` | List of strings | Input for Honest Layer |
| Classifier | `architecturalReading.periodFeatures[]` | Structured data | Embedded in Chapter 3 |
| Design Brief | `conceptStatement` (3-4 sentences) | Editorial, vision-focused | Chapter 3 introduction |
| Design Brief | `strategyRationale` (2-3 sentences) | Explains the approach | Could appear in Chapter 3 |
| Design Brief | `designLanguage.mood` | One sentence | Tone reference |
| Cost Estimator | `confidenceStatement` | Honest disclaimer | Chapter 4 footer |
| Cost Estimator | `keyAssumptions[]` | List of strings | Chapter 4 context |
| Cost Estimator | `costDrivers[]` | Structured with explanations | Chapter 4 callouts |

**What's MISSING — what the Narrative Writer produces:**

1. **Opening hook** — the first thing the reader sees. One sentence that makes them keep reading.
2. **Transition into the building reading** — a line or two connecting the hero to the architectural deep-dive.
3. **Honest layer narrative** — a 2-3 paragraph synthesis of `issuesIdentified` and `unknowns` written as prose, not bullet points. The tone is "here's what you'd want to investigate" not "here's what's wrong."
4. **Transition into the numbers** — connecting the renovation vision to the cost reality.
5. **Value gap narrative** — 2-3 sentences framing the price gap in human terms, not just numbers. Different for each audience: agents get "here's your selling argument," buyers get "here's why the maths works."
6. **Closing statement** — what to do next. For agents: "Share this report with prospective buyers." For buyers: "Book a viewing. Bring a surveyor."

That's ~400-500 words total. One Claude call, ~$0.005.

---

## PART 1: Narrative Writer Agent

### What it receives

```typescript
interface NarrativeWriterInput {
  // From Classifier
  summary: string
  archetype: ClassificationResult["archetype"]
  architecturalReading: ClassificationResult["architecturalReading"]

  // From Design Brief
  transformationStrategy: TransformationStrategy
  conceptStatement: string
  strategyRationale: string

  // From Cost Estimator
  totalEnvelope: CostEstimateResult["totalEnvelope"]
  priceGap: CostEstimateResult["priceGap"]
  phasedBudget: CostEstimateResult["phasedBudget"]
  costDrivers: CostEstimateResult["costDrivers"]
  confidenceStatement: string

  // From Visualiser
  imageCount: {
    exteriors: number
    interiors: number
  }
  hasVisualisation: boolean

  // Context
  address: string
  askingPrice: number
  priceDisplay: string
  propertyType: string
  bedrooms: number
}
```

### What it produces

```typescript
interface NarrativeResult {
  openingHook: string                    // 1-2 sentences, the hero text
  buildingReadingTransition: string      // 1-2 sentences, leads into the architectural chapter
  honestLayerNarrative: string           // 2-3 paragraphs, synthesises issues + unknowns
  numbersTransition: string              // 1-2 sentences, connects vision to costs
  valueGapNarrative: string              // 2-3 sentences, frames the price gap for humans
  closingStatement: string               // 2-3 sentences, what to do next
}
```

### System prompt

```
You are the editorial writer for a UK property report. Your job is to write the connective tissue — the opening, transitions, and closing — that ties together a report about a specific property.

You are NOT writing the full report. Other agents have already produced:
- A detailed architectural reading of the building (3-4 paragraphs, architect's voice)
- A renovation concept statement (3-4 sentences, design vision)
- A cost estimate with budget ranges and value gap analysis
- Before/after renovation images

You are writing ONLY:
1. The opening hook — the first thing someone reads. One or two sentences that make a busy estate agent or cautious buyer keep scrolling. Not a summary — a provocation. What's the most interesting thing about this property that most people would miss?
2. A transition into the building reading — a brief bridge from the hook to the detailed architectural analysis.
3. The honest layer — a 2-3 paragraph narrative that takes the identified issues and unknowns and presents them as "what to investigate," not "what's wrong." Tone: a trusted advisor being straight with you. Not alarmist, not dismissive. The goal is to build trust — this report doesn't hide problems.
4. A transition into the numbers — connecting the renovation vision to the financial reality. One or two sentences.
5. The value gap narrative — frame the price gap numbers in human terms. Not "the estimated post-works value is £165,000-£190,000" but something like "Restored to the standard described above, comparable properties on this street have sold for £165,000-£190,000 in the past two years. Against the asking price, that's a significant gap — even after renovation costs, there's room."
6. A closing statement — what should the reader do next? For an estate agent receiving this report: "Share this with buyers who've been scrolling past — this is the property they haven't seen yet." Keep it direct, not salesy.

VOICE AND TONE:
- Warm, knowledgeable, direct. Not academic, not marketing copy.
- You respect the reader's intelligence. No exclamation marks, no "stunning potential."
- You can be specific — reference rooms, features, costs by name.
- Short sentences mixed with longer ones. Rhythm matters.
- British English. The reader is a UK property professional or buyer.

RULES:
- Total output across all six fields: 400-500 words maximum. This is glue, not a separate essay.
- Never repeat information that already exists in the building narrative or concept statement. Reference it ("as the reading above details") but don't rehash it.
- The opening hook should reference something specific from the classifier's observations — a hidden feature, a price anomaly, a condition insight. Not generic.
- The honest layer must mention EVERY issue from issuesIdentified by name. Don't cherry-pick. But frame each one constructively.
- The value gap narrative must include the actual numbers. Don't be vague.
- The closing must be actionable — tell the reader specifically what to do.

OUTPUT: Valid JSON matching the NarrativeResult schema. No markdown, no explanation, just the JSON.
```

### User prompt template

```
PROPERTY:
{address}
{priceDisplay} | {propertyType} | {bedrooms} bedrooms

ARCHETYPE:
{archetype.displayName} ({archetype.era})

CLASSIFIER SUMMARY:
{summary}

ISSUES IDENTIFIED:
{architecturalReading.issuesIdentified.map(i => `- ${i.issue} (${i.severity}): ${i.implication}`).join("\n")}

UNKNOWNS:
{architecturalReading.unknowns.map(u => `- ${u}`).join("\n")}

DESIGN BRIEF CONCEPT:
{conceptStatement}

TRANSFORMATION STRATEGY: {transformationStrategy}

COST ESTIMATE:
Total envelope: £{totalEnvelope.low.toLocaleString()} – £{totalEnvelope.high.toLocaleString()}
Asking price: {priceDisplay}
Post-works value: £{priceGap.estimatedPostWorksValue.low.toLocaleString()} – £{priceGap.estimatedPostWorksValue.high.toLocaleString()}
Total investment (purchase + works): £{priceGap.totalInvestment.low.toLocaleString()} – £{priceGap.totalInvestment.high.toLocaleString()}

COST DRIVERS:
{costDrivers.map(d => `- ${d.factor}: ${d.impact}`).join("\n")}

IMAGES GENERATED: {imageCount.exteriors} exterior, {imageCount.interiors} interior

Write the NarrativeResult JSON — the editorial glue for this report.
```

### Example output (Welsh farmhouse)

```json
{
  "openingHook": "Behind the overgrown garden and the pile of rubble, there's a four-bedroom stone farmhouse with 2.7-metre ceilings, two fireplaces, and an asking price that barely covers a one-bed flat in most British cities.",

  "buildingReadingTransition": "Before you decide whether the price reflects the condition or the opportunity, it helps to understand what this building actually is — and what it's hiding.",

  "honestLayerNarrative": "This is not a quick project, and the report wouldn't be honest if it pretended otherwise. The slate roof has visible damage on the south elevation — at minimum, partial re-slating, and a full survey may reveal more. Damp staining on the chimney breast in the main living room suggests failed flashing or pointing, which needs investigation before any interior work makes sense. The walls show no signs of settlement, but the render is stained and tired, and without opening up it's impossible to confirm the condition of the stone beneath.\n\nThere are things the photos simply can't tell you. The age and condition of the electrics — if any remain — is unknown. For a property of this era in rural Wales, asbestos in old plasterwork or roof sheets is a real possibility and needs a proper survey. The drainage situation (mains or septic) isn't mentioned in the listing and matters for both budget and planning.\n\nNone of these are reasons to walk away. They're reasons to walk in with a surveyor and a clear list of what to check. The unknowns are manageable — but they need to be known before the budget can be finalised.",

  "numbersTransition": "With that context, here's what the renovation described above would realistically cost — and what the numbers look like on the other side.",

  "valueGapNarrative": "Restored to the standard described in the brief — lime render, slate repairs, a proper farmhouse kitchen, engineered oak floors — comparable properties in this part of Wales have sold for £165,000–£190,000. Against the asking price of £85,000 and a renovation budget of £55,000–£85,000, total investment sits at £140,000–£170,000. That leaves a gap of £20,000–£50,000 — not a fortune, but meaningful, especially if the property is bought to live in rather than flip.",

  "closingStatement": "If you're an agent sitting on this listing, the before-and-after images above are shareable — send them to buyers who've been scrolling past. If you're a buyer, book a viewing and bring a surveyor with experience in pre-1900 stone buildings. The building has substance. The question is whether you do too."
}
```

---

## PART 2: Report Assembly

### What it is

A deterministic template engine — no AI calls. It takes every agent output plus the narrative and renders:
1. A web page at `piega.co/report/{reportId}` (the shareable report)
2. A PDF export (same content, downloadable)

### Report structure (the final page)

The report is a single scrolling page with your editorial design language — 680px max width, warm off-white background, heading serif + body sans-serif, generous whitespace. Not a dashboard, not a chatbot output.

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  HERO                                           │
│  ├── Wordmark (small, top-left)                 │
│  ├── Hero image (best exterior, or renovated)   │
│  ├── Address + price + archetype badge          │
│  └── Opening hook (from Narrative Writer)       │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHAPTER 1: "WHAT YOU'RE LOOKING AT"            │
│  ├── Transition text (from Narrative Writer)    │
│  ├── Building narrative (from Classifier)       │
│  │   └── 3-4 paragraphs, architect voice        │
│  ├── Area context card (from extension data)    │
│  │   └── IMD, flood, crime — compact block      │
│  └── Period features list (from Classifier)     │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHAPTER 2: "WHAT IT COULD BECOME"              │
│  ├── Concept statement (from Design Brief)      │
│  ├── Design language block                      │
│  │   └── Palette swatches + materials           │
│  ├── Before/after pairs (from Visualiser)       │
│  │   └── Up to 3 exterior + 2 interior          │
│  │   └── Each: side-by-side or slider           │
│  └── Strategy rationale (from Design Brief)     │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHAPTER 3: "WHAT TO INVESTIGATE"               │
│  ├── Honest layer narrative                     │
│  │   └── From Narrative Writer — synthesises    │
│  │       issues + unknowns into prose           │
│  └── Condition confidence indicators            │
│      └── From Classifier — ● ◐ ○ per element   │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHAPTER 4: "THE NUMBERS"                       │
│  ├── Numbers transition (from Narrative Writer) │
│  ├── Budget breakdown                           │
│  │   └── Proportional bar (SVG)                 │
│  │   └── Category labels with ranges            │
│  ├── Total envelope                             │
│  │   └── Large typographic number               │
│  ├── Price gap                                  │
│  │   └── Asking → Post-works value visual       │
│  │   └── Value gap narrative (Narrative Writer)  │
│  ├── Phased budget                              │
│  │   └── Three tiers: move-in / year 1-2 / full│
│  ├── Cost drivers                               │
│  │   └── 3-4 key factors with explanations      │
│  └── Confidence statement + assumptions         │
│      └── From Cost Estimator                    │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  CLOSING                                        │
│  ├── Closing statement (from Narrative Writer)  │
│  ├── Share button (copy link)                   │
│  ├── Download PDF button                        │
│  └── Piega wordmark + tagline                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### What each section pulls from

```typescript
interface ReportAssemblyInput {
  // Listing data (Step 1)
  listing: {
    address: string
    priceDisplay: string
    askingPrice: number
    propertyType: string
    bedrooms: number
    bathrooms: number
    photos: Array<{ url: string; caption: string }>
  }

  // Classifier output (Step 2)
  classification: {
    archetype: ClassificationResult["archetype"]
    images: ClassificationResult["images"]
    summary: string
    architecturalReading: ClassificationResult["architecturalReading"]
  }

  // Design Brief output (Step 3)
  designBrief: {
    transformationStrategy: TransformationStrategy
    designLanguage: DesignBrief["designLanguage"]
    conceptStatement: string
    strategyRationale: string
    imageSelections: DesignBrief["imageSelections"]
  }

  // Visualiser output (Step 4)
  visualisation: {
    exteriors: VisualisationResult[]
    interiors: VisualisationResult[]
  }

  // Cost Estimator output (Step 5)
  costEstimate: CostEstimateResult

  // Narrative Writer output (Step 6)
  narrative: NarrativeResult

  // Area enrichment (from extension, partial)
  areaData?: {
    imd: { decile: number; rank: number } | null
    flood: { zone: number; description: string } | null
    crime: { totalIncidents: number; month: string } | null
  }
}
```

### Rendering approach

The report page is a server-rendered HTML page. Not a React SPA — a single HTML document that loads fast, looks good when shared, and can be printed/exported to PDF.

```
GET /report/{reportId}
    |
    v
Server fetches the report row from Supabase
    |
    v
Checks all required results exist:
    - classification ✓
    - design_brief ✓
    - renovation_visualisation (optional — report works without it)
    - cost_estimate ✓
    - narrative ✓
    |
    v
Renders HTML template with all data injected
    |
    v
Returns styled HTML page

GET /report/{reportId}/pdf
    |
    v
Same HTML → Puppeteer/Playwright renders to PDF
    |
    v
Returns downloadable PDF
```

### URL structure addition

| Route | Purpose |
|-------|---------|
| `/report/{reportId}` | **NEW** — The shareable report page (public, no auth) |
| `/report/{reportId}/pdf` | **NEW** — PDF download |
| `/pipeline/{reportId}` | Internal pipeline hub (existing) |

The `/report/` page is the external-facing output — what an agent sends to a buyer. The `/pipeline/` page is the internal workspace where you run agents and inspect outputs. They're different views of the same data.

### Visual components to build

The report page needs these visual components:

**Budget bar** — a single horizontal proportional bar, 680px wide, coloured segments for each cost category. Built as inline SVG, data-driven from `costEstimate.budgetBreakdown`.

**Price gap visual** — two large numbers (asking price → post-works value) with a connecting line and the refurb cost annotated. Inline SVG.

**Phased budget timeline** — three stacked blocks showing move-in / year 1-2 / complete, with cost ranges. Simple HTML, no SVG needed.

**Before/after pairs** — each pair shows original and renovated side by side (desktop) or stacked (mobile). Consider a CSS slider for interactive comparison. Images from `visualisation.exteriors[]` and `visualisation.interiors[]`.

**Area context card** — compact block showing IMD decile, flood zone, crime count. Simple HTML with coloured indicators.

**Condition indicators** — from `architecturalReading.constructionInferences`. Each element (walls, roof, windows, etc.) with a confidence dot: ● high / ◐ medium / ○ low.

All visual components follow the design system from the earlier brand work: warm off-white background, plaster palette, Playfair Display headings, Inter body text, no charts with axes, no dashboard energy.

### Graceful degradation

The report should render even if some agents haven't run:

| Missing agent | Report behaviour |
|---------------|-----------------|
| Visualiser not run | Chapter 2 shows concept statement + design language but no before/after images. Text: "Renovation images not yet generated." |
| Cost Estimator not run | Chapter 4 omitted entirely. Closing statement adjusts. |
| Narrative Writer not run | Transitions are omitted. Chapters still render with their own content (building narrative, concept statement, etc.) but without editorial glue. |
| Area data missing | Area context card omitted from Chapter 1. |

The minimum viable report requires: Classifier + Design Brief + Narrative Writer. Everything else is optional enhancement.

---

## Agent function signatures

### Narrative Writer

```typescript
export async function narrativeWriterAgent(
  input: NarrativeWriterInput,
): Promise<NarrativeResult>
```

### Report Assembly

```typescript
// This is NOT an agent — it's a render function
export function assembleReport(
  input: ReportAssemblyInput,
): string  // returns HTML string

export async function generateReportPdf(
  reportId: string,
): Promise<Buffer>  // returns PDF bytes
```

---

## Updated pipeline execution

```typescript
// Full pipeline
const classifier = await runClassifier(listing)                              // Step 2
const designBrief = await runDesignBrief(classifier, listing)                // Step 3
const [visualisation, costEstimate] = await Promise.all([                    // Step 4+5 parallel
  runVisualiser(classifier.images, classifier.archetype, designBrief),
  runCostEstimator(classifier, designBrief, listing),
])
const narrative = await runNarrativeWriter({                                  // Step 6
  ...classifier, ...designBrief, ...costEstimate, ...visualisation, ...listing
})
const reportHtml = assembleReport({                                           // Step 7
  listing, classification: classifier, designBrief,
  visualisation, costEstimate, narrative, areaData
})
```

---

## Storage addition

```
piega_reports.results
├── classification                     <- Classifier
│   └── architecturalReading           <- Classifier (Call 2)
├── design_brief                       <- Design Brief
├── renovation_visualisation           <- Visualiser
├── cost_estimate                      <- Cost Estimator
└── narrative                          <- Narrative Writer (NEW)
```

The assembled report HTML is NOT stored in the results JSON — it's rendered on demand from the data. This means any agent re-run automatically updates the report without a separate "re-assemble" step.

---

## Files to create

### Narrative Writer
```
src/agents/narrativeWriter.ts          # Agent function
src/prompts/narrativeWriter.ts         # System prompt + user template
src/types/agents.ts                    # Add NarrativeResult + NarrativeWriterInput
test/agents/narrativeWriter.test.ts    # Test with Welsh farmhouse fixtures
```

### Report Assembly
```
src/report/
├── assemble.ts                        # Main assembly function
├── template.ts                        # HTML template with section renderers
├── components/
│   ├── hero.ts                        # Hero section renderer
│   ├── buildingReading.ts             # Chapter 1 renderer
│   ├── renovationVision.ts            # Chapter 2 renderer
│   ├── honestLayer.ts                 # Chapter 3 renderer
│   ├── numbers.ts                     # Chapter 4 renderer
│   ├── closing.ts                     # Closing section renderer
│   ├── budgetBar.ts                   # SVG budget bar generator
│   ├── priceGap.ts                    # SVG price gap visual generator
│   └── areaCard.ts                    # Area context card renderer
├── styles.ts                          # CSS (inline in the HTML)
└── pdf.ts                             # Puppeteer PDF generation

src/routes/
├── report.ts                          # GET /report/{reportId} — renders the page
└── reportPdf.ts                       # GET /report/{reportId}/pdf — PDF download
```

---

## Build order

1. **Narrative Writer first** — it's one Claude call, cheap to iterate. Test with Welsh farmhouse fixtures from all previous agents. Get the tone right.
2. **Report Assembly template** — start with a minimal HTML page that slots in all the data. No fancy components yet — just text sections with the right content in the right order.
3. **Visual components** — add the budget bar SVG, price gap SVG, before/after image pairs, area card. One at a time.
4. **PDF export** — Puppeteer rendering of the same HTML page. Add last.
5. **Route handlers** — `/report/{reportId}` and `/report/{reportId}/pdf`.

### Cost

| Agent | Cost |
|-------|------|
| Narrative Writer | ~$0.005 per report |
| Report Assembly | $0 (no AI, just templating) |
| PDF generation | $0 (local Puppeteer) |

Total pipeline cost including all agents: **~$0.56–0.91 per report**.
