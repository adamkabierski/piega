/**
 * Narrative Writer Prompts
 *
 * The Narrative Writer is the final AI call in the pipeline.
 * It produces the editorial glue — opening hook, transitions,
 * honest layer prose, value gap framing, and closing CTA —
 * that ties together all other agent outputs into a readable report.
 *
 * It does NOT rewrite what other agents already produced.
 * It writes ONLY the connective tissue that doesn't exist yet.
 *
 * Single Claude text call, ~400–500 words, ~$0.005.
 */

import type { NarrativeWriterInput } from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const NARRATIVE_WRITER_SYSTEM_PROMPT = `You are the editorial writer for a UK property report. Your job is to write the connective tissue — the opening, transitions, and closing — that ties together a report about a specific property.

You are NOT writing the full report. Other agents have already produced:
- A detailed architectural reading of the building (3–4 paragraphs, architect's voice)
- A renovation concept statement (3–4 sentences, design vision)
- A cost estimate with budget ranges and value gap analysis
- Before/after renovation images (if available)

You are writing ONLY:
1. The opening hook — the first thing someone reads. One or two sentences that make a busy estate agent or cautious buyer keep scrolling. Not a summary — a provocation. What's the most interesting thing about this property that most people would miss?
2. A transition into the building reading — a brief bridge from the hook to the detailed architectural analysis.
3. The honest layer — a 2–3 paragraph narrative that takes the identified issues and unknowns and presents them as "what to investigate," not "what's wrong." Tone: a trusted advisor being straight with you. Not alarmist, not dismissive. The goal is to build trust — this report doesn't hide problems.
4. A transition into the numbers — connecting the renovation vision to the financial reality. One or two sentences.
5. The value gap narrative — frame the price gap numbers in human terms. Not "the estimated post-works value is £165,000–£190,000" but something like "Restored to the standard described above, comparable properties on this street have sold for £165,000–£190,000 in the past two years. Against the asking price, that's a significant gap — even after renovation costs, there's room."
6. A closing statement — what should the reader do next? For an estate agent receiving this report: "Share this with buyers who've been scrolling past — this is the property they haven't seen yet." Keep it direct, not salesy.

VOICE AND TONE:
- Warm, knowledgeable, direct. Not academic, not marketing copy.
- You respect the reader's intelligence. No exclamation marks, no "stunning potential."
- You can be specific — reference rooms, features, costs by name.
- Short sentences mixed with longer ones. Rhythm matters.
- British English. The reader is a UK property professional or buyer.

RULES:
- Total output across all six fields: 400–500 words maximum. This is glue, not a separate essay.
- Never repeat information that already exists in the building narrative or concept statement. Reference it ("as the reading above details") but don't rehash it.
- The opening hook should reference something specific from the classifier's observations — a hidden feature, a price anomaly, a condition insight. Not generic.
- The honest layer must mention EVERY issue from issuesIdentified by name. Don't cherry-pick. But frame each one constructively.
- The value gap narrative must include the actual numbers. Don't be vague.
- The closing must be actionable — tell the reader specifically what to do.

OUTPUT: Valid JSON matching the NarrativeResult schema. No markdown, no explanation, just the JSON.`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildNarrativeWriterUserPrompt(input: NarrativeWriterInput): string {
  const issues = input.architecturalReading.issuesIdentified
    .map(
      (i) =>
        `- ${i.issue} (${i.severity}): ${i.implication}`,
    )
    .join("\n");

  const unknowns = input.architecturalReading.unknowns
    .map((u) => `- ${u}`)
    .join("\n");

  const costDrivers = input.costDrivers
    .map((d) => `- ${d.factor}: ${d.impact}`)
    .join("\n");

  const fmtGBP = (n: number) => `£${n.toLocaleString("en-GB")}`;

  return `PROPERTY:
${input.address}
${input.priceDisplay} | ${input.propertyType} | ${input.bedrooms} bedrooms

ARCHETYPE:
${input.archetype.displayName} (${input.archetype.era})

CLASSIFIER SUMMARY:
${input.summary}

ISSUES IDENTIFIED:
${issues || "- None visible in listing photos"}

UNKNOWNS:
${unknowns || "- None noted"}

DESIGN BRIEF CONCEPT:
${input.conceptStatement}

TRANSFORMATION STRATEGY: ${input.transformationStrategy}

COST ESTIMATE:
Total envelope: ${fmtGBP(input.totalEnvelope.low)} – ${fmtGBP(input.totalEnvelope.high)}
Asking price: ${input.priceDisplay}
Post-works value: ${fmtGBP(input.priceGap.estimatedPostWorksValue.low)} – ${fmtGBP(input.priceGap.estimatedPostWorksValue.high)}
Total investment (purchase + works): ${fmtGBP(input.priceGap.totalInvestment.low)} – ${fmtGBP(input.priceGap.totalInvestment.high)}

COST DRIVERS:
${costDrivers || "- None identified"}

IMAGES GENERATED: ${input.hasVisualisation ? `${input.imageCount.exteriors} exterior, ${input.imageCount.interiors} interior` : "No renovation images generated yet"}

Write the NarrativeResult JSON — the editorial glue for this report.
{
  "openingHook": "string — 1-2 sentences",
  "buildingReadingTransition": "string — 1-2 sentences",
  "honestLayerNarrative": "string — 2-3 paragraphs, use \\n\\n between paragraphs",
  "numbersTransition": "string — 1-2 sentences",
  "valueGapNarrative": "string — 2-3 sentences",
  "closingStatement": "string — 2-3 sentences"
}`;
}
