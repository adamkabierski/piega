/**
 * Cost Estimator Prompts
 *
 * The Cost Estimator is a text-only Claude call that produces
 * budget ranges, value gap analysis, and phased costs for a
 * residential renovation project.
 *
 * It receives the Classifier's architectural reading + the Design
 * Brief's scope and specification, and reasons about costs using
 * Claude's training knowledge of UK construction pricing.
 *
 * This is a desktop appraisal, not a tender.
 */

import type { CostEstimatorInput } from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const COST_ESTIMATOR_SYSTEM_PROMPT = `You are a UK quantity surveyor producing a desktop cost appraisal for a residential renovation project. You have NOT visited the site. You are working from:

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

OUTPUT FORMAT: Valid JSON matching the CostEstimateResult schema described in the user message. No markdown, no explanation, just the JSON.`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildCostEstimatorUserPrompt(input: CostEstimatorInput): string {
  const { archetype, architecturalReading, designLanguage } = input;
  const ci = architecturalReading.constructionInferences;

  const issues = architecturalReading.issuesIdentified
    .map(
      (i) =>
        `- ${i.issue} (${i.severity}) — ${i.evidence}${i.implication ? ` → ${i.implication}` : ""}`,
    )
    .join("\n");

  const unknowns = architecturalReading.unknowns.map((u) => `- ${u}`).join("\n");

  const comparablesSection = input.comparableSales?.length
    ? `COMPARABLE SALES (nearby):\n${input.comparableSales
        .map(
          (s) =>
            `- ${s.address}: £${s.price.toLocaleString("en-GB")} (${s.date}, ${s.propertyType})`,
        )
        .join("\n")}`
    : "No comparable sales data available — estimate post-works value from archetype and region.";

  return `PROPERTY:
Address: ${input.address}
Asking price: £${input.askingPrice.toLocaleString("en-GB")}
Type: ${input.propertyType}
Bedrooms: ${input.bedrooms} | Bathrooms: ${input.bathrooms}

CLASSIFIER'S READING:
Archetype: ${archetype.displayName} (${archetype.era})
Construction: ${archetype.constructionType}

Construction inferences:
- Walls: ${ci.wallType}
- Roof: ${ci.roofStructure}
- Foundations: ${ci.foundations}
- Insulation: ${ci.insulation}
- Windows: ${ci.windowsAndDoors}
- Heating: ${ci.heatingAndServices}
- Inference confidence: ${ci.confidence}

Issues identified:
${issues || "- None visible in listing photos"}

Unknowns:
${unknowns || "- None noted"}

DESIGN BRIEF:
Strategy: ${input.transformationStrategy}
Palette: ${designLanguage.palette.join(", ")}
Materials: ${designLanguage.materials.join(", ")}
Mood: ${designLanguage.mood}
Era guidance: ${designLanguage.eraGuidance}
Avoid list: ${designLanguage.avoidList.join(", ")}
Concept: ${input.conceptStatement}

${comparablesSection}

Produce the CostEstimateResult JSON:
{
  "budgetBreakdown": [
    { "category": "string", "low": number, "high": number, "percentage": number, "notes": "string" }
  ],
  "totalEnvelope": { "low": number, "high": number },
  "priceGap": {
    "askingPrice": number,
    "estimatedPostWorksValue": { "low": number, "high": number, "basis": "string" },
    "totalInvestment": { "low": number, "high": number }
  },
  "phasedBudget": {
    "moveInBasics": { "low": number, "high": number, "description": "string", "timeframe": "string" },
    "yearOneTwo": { "low": number, "high": number, "description": "string", "timeframe": "string" },
    "completeVision": { "low": number, "high": number, "description": "string", "timeframe": "string" }
  },
  "keyAssumptions": ["string"],
  "confidenceStatement": "string",
  "costDrivers": [
    { "factor": "string", "impact": "string", "currentAssumption": "string" }
  ]
}`;
}
