/**
 * Narrative Writer Agent
 *
 * The final AI step in the pipeline — produces the editorial glue
 * that ties together all other agent outputs into a readable report.
 *
 * Architecture: Single Claude text call (no vision)
 *   NarrativeWriterInput → Claude → NarrativeResult
 *
 * Depends on: Classifier + Design Brief + Cost Estimator
 * Optionally uses: Visualiser output (adjusts language if images exist)
 *
 * ~400–500 words total output. Cost: ~$0.005 per report.
 */

import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createTextModel, validateEnv } from "../utils/llm.js";
import { parseStructuredOutput } from "../utils/parsing.js";
import {
  NARRATIVE_WRITER_SYSTEM_PROMPT,
  buildNarrativeWriterUserPrompt,
} from "../prompts/narrativeWriter.js";

import type { NarrativeWriterInput, NarrativeResult } from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const NarrativeSchema = z.object({
  openingHook: z.string(),
  buildingReadingTransition: z.string(),
  honestLayerNarrative: z.string(),
  numbersTransition: z.string(),
  valueGapNarrative: z.string(),
  closingStatement: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE NORMALISATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalise LLM output variations before Zod validation.
 */
function normaliseNarrative(raw: Record<string, unknown>): Record<string, unknown> {
  const obj = { ...raw };

  // Snake_case aliases
  if (!obj.openingHook && obj.opening_hook) {
    obj.openingHook = obj.opening_hook;
    delete obj.opening_hook;
  }
  if (!obj.buildingReadingTransition && obj.building_reading_transition) {
    obj.buildingReadingTransition = obj.building_reading_transition;
    delete obj.building_reading_transition;
  }
  if (!obj.honestLayerNarrative && obj.honest_layer_narrative) {
    obj.honestLayerNarrative = obj.honest_layer_narrative;
    delete obj.honest_layer_narrative;
  }
  if (!obj.numbersTransition && obj.numbers_transition) {
    obj.numbersTransition = obj.numbers_transition;
    delete obj.numbers_transition;
  }
  if (!obj.valueGapNarrative && obj.value_gap_narrative) {
    obj.valueGapNarrative = obj.value_gap_narrative;
    delete obj.value_gap_narrative;
  }
  if (!obj.closingStatement && obj.closing_statement) {
    obj.closingStatement = obj.closing_statement;
    delete obj.closing_statement;
  }

  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the narrative writer agent.
 *
 * Produces the editorial glue for a property report — opening hook,
 * transitions, honest layer prose, value gap framing, and closing.
 */
export async function runNarrativeWriter(
  input: NarrativeWriterInput,
): Promise<NarrativeResult> {
  validateEnv();

  console.log(`[narrative-writer] Starting for ${input.address}`);

  // Build prompts
  const userMessage = buildNarrativeWriterUserPrompt(input);

  // Text-only, slightly warmer temperature for editorial voice
  const model = createTextModel({ temperature: 0.4, maxTokens: 2048 });

  console.log("[narrative-writer] Sending to Claude...");
  const startTime = Date.now();

  const response = await model.invoke([
    new SystemMessage(NARRATIVE_WRITER_SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[narrative-writer] Response received in ${elapsed}s`);

  // Parse response
  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const result = parseStructuredOutput(
    responseText,
    NarrativeSchema,
    normaliseNarrative,
  );

  // Quick word count for logging
  const totalWords = Object.values(result)
    .join(" ")
    .split(/\s+/).length;

  console.log(`[narrative-writer] Done — ${totalWords} words across 6 sections`);

  return result;
}
