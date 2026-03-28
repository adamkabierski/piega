# Classifier Expansion + Cost Estimator Agent — Copilot Prompt

## Agents in the pipeline

| Agent | Role | File |
|-------|------|------|
| **Classifier** | Reads the building — archetype, image classification, architectural reading | `classifier.ts` |
| **Design Brief** | Creates the renovation vision — palette, materials, scope, image selection | `designBrief.ts` |
| **Renovation Visualiser** | Generates before/after images following the brief | `renovationVisualiser.ts` |
| **Cost Estimator** | Produces budget ranges, value gap, phased costs | `costEstimator.ts` |
| **Narrative Writer** | Writes editorial text for each report chapter | `narrativeWriter.ts` (future) |

---

## PART 1: Expanding the Classifier

### What changes

The Classifier currently produces:
- `archetype` — building type, era, construction ✓ keep
- `images[]` — per-photo classification ✓ keep
- `summary` — 2-3 sentence overview ✓ keep as short version

We're adding a new `architecturalReading` field to the same Classifier output. This is NOT a new agent — it's an expansion of the existing Claude vision call. Same API call, richer structured output.

### Why

The 2-3 sentence summary is a caption, not a report chapter. The architectural reading becomes the "What you're looking at" section — the moment the reader thinks "this tool sees more than I do." It also feeds the Design Brief (better observations → better design decisions) and the Cost Estimator (construction inferences → more grounded cost estimates).

### New type to add

Add this to `ClassificationResult` in `src/types/agents.ts`:

```typescript
interface ClassificationResult {
  // EXISTING — no changes
  archetype: {
    label: string
    displayName: string
    era: string
    constructionType: string
    typicalCharacteristics: string[]
    confidenceScore: number
  }
  images: Array<{
    index: number
    url: string
    classification: ImageClassification
  }>
  summary: string

  // NEW — add this
  architecturalReading: {
    buildingNarrative: string          // 3-4 paragraphs, architect voice
    constructionInferences: {
      wallType: string                 // e.g. "Likely solid stone, 450mm+, lime mortar"
      roofStructure: string            // e.g. "Cut timber rafters, natural slate"
      foundations: string              // e.g. "Likely shallow strip, no visible movement"
      insulation: string               // e.g. "Almost certainly none — pre-1919 solid wall"
      windowsAndDoors: string          // e.g. "Modern uPVC replacements, not original"
      heatingAndServices: string       // e.g. "No visible heating system in photos"
      confidence: "high" | "medium" | "low"
    }
    periodFeatures: Array<{
      feature: string                  // e.g. "Timber stair balustrade"
      status: string                   // e.g. "Visible in photo 4, appears original"
      confidence: "high" | "medium" | "low"
      recommendation: string           // e.g. "Restore — likely original to the building"
    }>
    issuesIdentified: Array<{
      issue: string                    // e.g. "Damp staining on chimney breast"
      severity: "minor" | "moderate" | "significant" | "unknown"
      evidence: string                 // e.g. "Visible staining in photo 6"
      implication: string              // e.g. "Likely failed flashing or pointing — needs investigation"
    }>
    unknowns: string[]                 // things that can't be assessed from photos
  }
}
```

### How to implement

Update the Classifier's system prompt to request the additional fields. The key additions to the existing prompt:

```
ADDITIONAL OUTPUT — ARCHITECTURAL READING:

Beyond the archetype and image classifications, produce a deeper reading of this building.

buildingNarrative: Write 3-4 paragraphs as if you're an experienced architect walking a client through what they're looking at. Not a listing description — a professional reading. Note what the estate agent's photos reveal that the description doesn't mention. Point out what's hidden (suspended ceilings hiding original height, boarding hiding fireplaces, rendering hiding stonework). Be specific about what you can see and honest about what you're inferring.

Tone: knowledgeable, warm, direct. Like someone who has seen a thousand buildings and still finds each one interesting. Not academic, not salesy. Think of how an architect would talk at a site visit — pointing at things, explaining what they mean.

constructionInferences: Based on the archetype, era, visible construction in photos, and your knowledge of UK building stock — infer what's likely behind the walls. A pre-1919 cottage in Wales almost certainly has solid stone walls with lime mortar, no cavity, no insulation. A 1930s semi probably has cavity brick with no insulation. State these inferences and mark your confidence level. This information helps downstream cost estimation.

periodFeatures: List every period feature visible in any photo, plus features that are LIKELY present but hidden based on the archetype. A Victorian terrace probably has original floorboards under the carpet even if you can't see them. A Georgian townhouse probably has original shutters even if they're painted shut. State what's visible vs. inferred and recommend whether to restore, retain, or note.

issuesIdentified: List every visible problem across all photos. Damp staining, cracked render, missing roof tiles, dated electrics (visible cable types), settlement cracks, rotten timber. For each, state the severity, what photo shows it, and what it likely means. Be honest but not alarmist.

unknowns: List 3-5 things that matter but cannot be assessed from listing photos alone. Electrics condition, asbestos presence, drainage, structural integrity behind render, etc.
```

### What changes in the code

1. Update `src/types/agents.ts` — add `architecturalReading` to `ClassificationResult`
2. Update `src/prompts/classifier.ts` — expand system prompt with the sections above
3. Update the Zod schema (or JSON schema) used for structured output parsing to include the new fields
4. No changes to the API call itself — same Claude Sonnet vision call, just requesting more output

### Cost impact

The Classifier call gets slightly more expensive because the output is longer (~800 more tokens). At Claude Sonnet output pricing this adds roughly $0.002-0.004 per report. Negligible.

---

## PART 2: Cost Estimator (new agent)

### What it is

A new agent that produces the financial chapter of the report — budget ranges, value gap, phased costs. It's a single Claude call (no vision, text only) that reasons about costs using the evidence from the Classifier and the scope from the Design Brief.

### What it is NOT

It is NOT a cost database. It does NOT look up material prices. It does NOT produce a bill of quantities. It uses Claude's training knowledge of UK construction costs combined with the specific evidence from the Classifier and the specific scope from the Design Brief to produce reasonable ranges.

This is a desktop appraisal, not a tender. The report will say so explicitly.

### What the Cost Estimator receives

```typescript
interface CostEstimatorInput {
  // From Classifier
  archetype: ClassificationResult["archetype"]
  architecturalReading: ClassificationResult["architecturalReading"]

  // From Design Brief
  transformationStrategy: TransformationStrategy
  designLanguage: DesignBrief["designLanguage"]
  conceptStatement: string

  // From listing
  askingPrice: number
  address: string
  propertyType: string
  bedrooms: number
  bathrooms: number

  // From area enrichment (existing, may be partial)
  comparableSales?: Array<{
    address: string
    price: number
    date: string
    propertyType: string
  }> | null
}
```

### What the Cost Estimator produces

```typescript
interface CostEstimateResult {
  budgetBreakdown: Array<{
    category: string             // "Structural & shell", "M&E", "Finishes", etc.
    low: number
    high: number
    percentage: number           // of total
    notes: string                // what's included, key assumptions
  }>

  totalEnvelope: {
    low: number
    high: number
  }

  priceGap: {
    askingPrice: number
    estimatedPostWorksValue: {
      low: number
      high: number
      basis: string              // "Based on comparable restored properties nearby" or "Based on typical values for restored {archetype} in this region"
    }
    totalInvestment: {           // asking price + refurb
      low: number
      high: number
    }
  }

  phasedBudget: {
    moveInBasics: {
      low: number
      high: number
      description: string        // what this phase covers
      timeframe: string          // e.g. "First 1-2 months"
    }
    yearOneTwo: {
      low: number
      high: number
      description: string
      timeframe: string
    }
    completeVision: {
      low: number
      high: number
      description: string
      timeframe: string
    }
  }

  keyAssumptions: string[]       // what was assumed to reach these numbers

  confidenceStatement: string    // honest disclaimer about reliability

  costDrivers: Array<{          // the 3-4 biggest factors that swing the total
    factor: string               // e.g. "Roof condition"
    impact: string               // e.g. "Partial re-slating: £4-6k. Full replacement: £12-18k."
    currentAssumption: string    // e.g. "Partial — based on visible damage in photos"
  }>
}
```

### System prompt

```
You are a UK quantity surveyor producing a desktop cost appraisal for a residential renovation project. You have NOT visited the site. You are working from:

1. An architect's reading of the building (archetype, era, construction inferences, condition observations, identified issues)
2. A design brief describing the intended renovation scope and specification
3. The asking price and basic listing details
4. Comparable sales data if available (may be absent)

YOUR APPROACH:

Work from the transformation strategy to set the overall scope:
- "full_renovation" → Price a complete refurbishment: strip out, structural repairs, full rewire, re-plumb, re-plaster, new kitchen, new bathroom(s), new heating system, all finishes, external works. Typical range for UK residential: £800-1500/m² depending on specification and region.
- "refresh" → Price a cosmetic/mid-level update: new kitchen doors and worktop (not full kitchen), bathroom refresh, redecoration throughout, new flooring, some electrical updates. Typical range: £200-500/m².
- "staging" → Price soft furnishing and cosmetic only: furniture, paint, accessories, garden tidying. Typical range: £2,000-8,000 total.
- "minimal" → £0-2,000 or state that no significant works are needed.
- "exterior_focus" → Price external works only: render/paint, roof repairs, windows, garden, front door. Typical range: £5,000-20,000.

ADJUSTMENTS based on the Classifier's reading:
- If the Classifier identified roof damage → include roof repair/replacement in structural category
- If the Classifier inferred no insulation → include insulation in M&E (if the brief implies it)
- If the Classifier identified damp → include damp proofing works
- If the property is rural → adjust labour rates (typically 10-20% lower than urban, but access/logistics can add costs)
- If the property is listed or in a conservation area → add 15-25% premium for heritage compliance

ADJUSTMENTS based on the Design Brief:
- If the designLanguage specifies premium materials (e.g. engineered oak herringbone, lime plaster) → use mid-to-upper range
- If the avoidList rules out cheap alternatives → don't price the cheapest option
- Match the specification level to the brief's mood — "honest, warm, rooted" means mid-range natural materials, not builder's white

FOR THE PRICE GAP:
- If comparable sales data is provided, use it directly
- If no comparables, estimate post-works value from: archetype + region + bedrooms + condition after works. State that this is a broad estimate.
- The price gap is the single most important number in the report for agents. Make it clear and defensible.

FOR THE PHASED BUDGET:
- "Move-in basics" = what MUST be done to make the property habitable (if currently uninhabitable) or comfortable (if currently dated). This is the minimum spend before someone can live there.
- "Year 1-2" = the main programme of works once moved in (or the main refurbishment phase for investors)
- "Complete vision" = everything done to the Design Brief's full specification, including aspirational items

HONESTY RULES:
- Always give ranges, never single figures
- State your confidence level on each category
- List key assumptions explicitly — the reader must know what you assumed
- Name the 3-4 "cost drivers" — the factors that most swing the total either way
- Include a confidence statement acknowledging this is a desktop exercise
- If you genuinely cannot estimate something (e.g. structural work where photos show nothing), say so and give a contingency range
- NEVER claim precision you don't have. "£65,000-£95,000" is honest. "£78,450" is fiction.

REGIONAL AWARENESS:
- UK construction costs vary significantly by region
- London and South East: highest rates
- South West, Wales, North: typically 15-30% lower
- Rural areas: lower labour rates but potentially higher material delivery costs
- Infer the region from the address and adjust accordingly

OUTPUT FORMAT: Valid JSON matching the CostEstimateResult schema. No markdown, no explanation, just the JSON.
```

### User prompt template

```
PROPERTY:
Address: {address}
Asking price: {askingPrice} ({priceDisplay})
Type: {propertyType}
Bedrooms: {bedrooms} | Bathrooms: {bathrooms}

CLASSIFIER'S READING:
Archetype: {archetype.displayName} ({archetype.era})
Construction: {archetype.constructionType}

Construction inferences:
- Walls: {architecturalReading.constructionInferences.wallType}
- Roof: {architecturalReading.constructionInferences.roofStructure}
- Foundations: {architecturalReading.constructionInferences.foundations}
- Insulation: {architecturalReading.constructionInferences.insulation}
- Windows: {architecturalReading.constructionInferences.windowsAndDoors}
- Heating: {architecturalReading.constructionInferences.heatingAndServices}
- Inference confidence: {architecturalReading.constructionInferences.confidence}

Issues identified:
{architecturalReading.issuesIdentified.map(i => `- ${i.issue} (${i.severity}) — ${i.evidence}`).join("\n")}

DESIGN BRIEF:
Strategy: {transformationStrategy}
Palette: {designLanguage.palette.join(", ")}
Materials: {designLanguage.materials.join(", ")}
Mood: {designLanguage.mood}
Era guidance: {designLanguage.eraGuidance}
Concept: {conceptStatement}

{comparableSales ? `
COMPARABLE SALES (nearby):
${comparableSales.map(s => `- ${s.address}: £${s.price.toLocaleString()} (${s.date}, ${s.propertyType})`).join("\n")}
` : "No comparable sales data available — estimate post-works value from archetype and region."}

Produce the CostEstimateResult JSON.
```

---

## Updated pipeline

```
Extension → Classifier (expanded) → Design Brief → Visualiser
                  │                      │              │
                  │                      │              ↓
                  │                      └──→ Cost Estimator → (results)
                  │                                              │
                  └──────────────────────────────────────────────┤
                                                                 ↓
                                                          Narrative Writer (future)
                                                                 ↓
                                                          Report Assembly
```

**Execution order:**
1. Extension parses listing (already done, automatic)
2. **Classifier** runs: archetype + image classification + architectural reading (one Claude vision call)
3. **Design Brief** runs: renovation scope, palette, image selection (one Claude text call, needs Classifier output)
4. **Visualiser** and **Cost Estimator** run IN PARALLEL:
   - Visualiser needs: Classifier images + Design Brief
   - Cost Estimator needs: Classifier reading + Design Brief + listing data
   - Neither needs the other's output
5. **Narrative Writer** (future): editorial text for each chapter
6. **Report Assembly**: combines all outputs into the web page

```typescript
// Pipeline execution
const classifier = await runClassifier(listing)                              // Step 2
const designBrief = await runDesignBrief(classifier, listing)                // Step 3
const [visualisation, costEstimate] = await Promise.all([                    // Step 4 parallel
  runVisualiser(classifier.images, classifier.archetype, designBrief),
  runCostEstimator(classifier, designBrief, listing),
])
// const narrative = await runNarrativeWriter(classifier, designBrief, visualisation, costEstimate)  // future
```

---

## Agent function signatures

### Expanded Classifier (update existing)

```typescript
// Same function, richer output
export async function classifierAgent(
  listing: ParsedListing,
): Promise<ClassificationResult>  // now includes architecturalReading
```

### Cost Estimator (new)

```typescript
export async function costEstimatorAgent(
  input: CostEstimatorInput,
): Promise<CostEstimateResult>
```

Where CostEstimatorInput is assembled from previous agent outputs:

```typescript
// In the pipeline orchestrator:
const costInput: CostEstimatorInput = {
  archetype: classifier.archetype,
  architecturalReading: classifier.architecturalReading,
  transformationStrategy: designBrief.transformationStrategy,
  designLanguage: designBrief.designLanguage,
  conceptStatement: designBrief.conceptStatement,
  askingPrice: listing.askingPrice,
  address: listing.address,
  propertyType: listing.propertyType,
  bedrooms: listing.bedrooms,
  bathrooms: listing.bathrooms,
  comparableSales: enrichedArea?.comparableSales ?? null,
}
```

---

## Files to create / update

### New files
```
src/agents/costEstimator.ts          # Cost Estimator agent
src/prompts/costEstimator.ts         # System prompt + user template
test/agents/costEstimator.test.ts    # Tests with Welsh farmhouse fixture
```

### Updated files
```
src/types/agents.ts                  # Add architecturalReading to ClassificationResult
                                     # Add CostEstimateResult type
                                     # Add CostEstimatorInput type
src/prompts/classifier.ts            # Expand system prompt for architectural reading
src/agents/classifier.ts             # Update structured output schema to include new fields
```

---

## Testing

### Classifier expansion test

```typescript
describe("Classifier (expanded)", () => {
  it("produces architectural reading for Welsh farmhouse", async () => {
    const result = await classifierAgent(welshFarmhouseListing)

    // New fields exist
    expect(result.architecturalReading).toBeDefined()
    expect(result.architecturalReading.buildingNarrative.length).toBeGreaterThan(200)
    expect(result.architecturalReading.constructionInferences.wallType).toBeTruthy()
    expect(result.architecturalReading.issuesIdentified.length).toBeGreaterThan(0)
    expect(result.architecturalReading.unknowns.length).toBeGreaterThan(0)

    // Existing fields still work
    expect(result.archetype.label).toBe("period_cottage")
    expect(result.images.length).toBeGreaterThan(0)

    console.log("Building narrative:", result.architecturalReading.buildingNarrative)
    console.log("Issues:", result.architecturalReading.issuesIdentified)
    console.log("Unknowns:", result.architecturalReading.unknowns)
  }, 120_000)
})
```

### Cost Estimator test

```typescript
describe("Cost Estimator", () => {
  it("produces cost estimate for Welsh farmhouse full renovation", async () => {
    const classifier = loadFixture("classifier-output/welsh-farmhouse.json")
    const designBrief = loadFixture("design-brief-output/welsh-farmhouse.json")

    const result = await costEstimatorAgent({
      archetype: classifier.classification.archetype,
      architecturalReading: classifier.classification.architecturalReading,
      transformationStrategy: designBrief.transformationStrategy,
      designLanguage: designBrief.designLanguage,
      conceptStatement: designBrief.conceptStatement,
      askingPrice: 85000,
      address: "Rural farmhouse, Wales",
      propertyType: "Detached House",
      bedrooms: 4,
      bathrooms: 1,
      comparableSales: null,
    })

    // Sanity checks
    expect(result.totalEnvelope.low).toBeGreaterThan(30000)
    expect(result.totalEnvelope.high).toBeLessThan(200000)
    expect(result.totalEnvelope.low).toBeLessThan(result.totalEnvelope.high)
    expect(result.budgetBreakdown.length).toBeGreaterThanOrEqual(4)
    expect(result.priceGap.askingPrice).toBe(85000)
    expect(result.priceGap.estimatedPostWorksValue.low).toBeGreaterThan(85000)
    expect(result.keyAssumptions.length).toBeGreaterThan(0)
    expect(result.costDrivers.length).toBeGreaterThanOrEqual(3)
    expect(result.confidenceStatement).toBeTruthy()

    console.log("Total envelope:", result.totalEnvelope)
    console.log("Price gap:", result.priceGap)
    console.log("Phased budget:", result.phasedBudget)
    console.log("Cost drivers:", result.costDrivers)
  }, 60_000)

  it("produces lower estimates for refresh strategy", async () => {
    const result = await costEstimatorAgent({
      // same property but with strategy: "refresh"
      transformationStrategy: "refresh",
      // ... rest of inputs
    })

    expect(result.totalEnvelope.high).toBeLessThan(40000)
  }, 60_000)
})
```

---

## Cost summary — full pipeline

| Agent | Model | Calls | Approx cost |
|-------|-------|-------|-------------|
| Classifier | Claude Sonnet (vision) | 1 | ~$0.04-0.08 |
| Design Brief | Claude Sonnet (text) | 1 | ~$0.01 |
| Visualiser prompts | Claude Sonnet (text) | 3-5 | ~$0.015 |
| Visualiser images | Nano Banana Pro (fal.ai) | 3-5 | $0.45-0.75 |
| Cost Estimator | Claude Sonnet (text) | 1 | ~$0.01 |
| **Total per report** | | | **~$0.55-0.90** |

At 100 reports/month: $55-90/month. Image generation is ~80% of the cost.

---

## Build order

1. **Expand Classifier first** — update the prompt and types, test with Welsh farmhouse. This is the foundation everything else depends on. No new files, just updates.
2. **Build Cost Estimator** — new agent, test with saved Classifier + Design Brief fixtures. Fast to iterate since it's text-only.
3. **Update Visualiser** to use the expanded Classifier data in prompt crafting (the constructionInferences and periodFeatures make renovation prompts much more specific).
4. **Test the full pipeline** — Extension → Classifier → Design Brief → [Visualiser + Cost Estimator parallel].
5. **Save all intermediate outputs as fixtures** — each agent's output becomes a test fixture for downstream agents. This means you can iterate on the Cost Estimator without re-running the Classifier and Design Brief every time.
