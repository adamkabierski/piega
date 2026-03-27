/**
 * Design Brief Agent
 *
 * Sits between the Classifier and the Renovation Visualiser.
 * Creates a unified renovation concept — transformation strategy,
 * palette, materials, mood, image selections — so that every
 * generated image reads as part of the same project.
 *
 * Architecture: Single Claude call
 *   ClassificationResult + listing metadata → Claude → DesignBriefResult
 */

import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createTextModel, validateEnv } from "../utils/llm.js";
import { parseStructuredOutput } from "../utils/parsing.js";
import {
  DESIGN_BRIEF_SYSTEM_PROMPT,
  buildDesignBriefUserPrompt,
} from "../prompts/designBrief.js";

import type { ClassificationResult, DesignBriefResult } from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const TransformationStrategySchema = z.enum([
  "full_renovation",
  "refresh",
  "staging",
  "minimal",
  "exterior_focus",
]);

const ImageSelectionSchema = z.object({
  index: z.number(),
  use: z.boolean(),
  type: z.enum(["exterior", "interior"]),
  reason: z.string(),
  promptGuidance: z.string(),
  transformationIntensity: z.enum(["heavy", "moderate", "light"]),
});

const DesignBriefSchema = z.object({
  transformationStrategy: TransformationStrategySchema,
  strategyRationale: z.string(),
  designLanguage: z.object({
    palette: z.array(z.string()),
    materials: z.array(z.string()),
    mood: z.string(),
    eraGuidance: z.string(),
    avoidList: z.array(z.string()),
  }),
  imageSelections: z.array(ImageSelectionSchema),
  recommendedCount: z.object({
    exteriors: z.number(),
    interiors: z.number(),
    total: z.number(),
  }),
  conceptStatement: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT INPUT
// ═══════════════════════════════════════════════════════════════════════════

export interface DesignBriefInput {
  classification: ClassificationResult;
  listing: {
    address: string;
    askingPrice: number;
    priceDisplay: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the design brief agent.
 *
 * Single Claude call: receives classified listing, returns a unified
 * renovation concept that the visualiser follows.
 */
export async function runDesignBrief(
  input: DesignBriefInput,
): Promise<DesignBriefResult> {
  validateEnv();

  const { classification, listing } = input;

  console.log(`[design-brief] Starting for ${listing.address}`);
  console.log(
    `[design-brief] Archetype: ${classification.archetype.displayName} (${classification.archetype.era})`,
  );
  console.log(`[design-brief] Images to assess: ${classification.images.length}`);

  // Build the prompt
  const userMsg = buildDesignBriefUserPrompt({
    classification,
    address: listing.address,
    askingPrice: listing.askingPrice,
    priceDisplay: listing.priceDisplay,
    propertyType: listing.propertyType,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
  });

  // Single Claude call
  const model = createTextModel({ temperature: 0.4, maxTokens: 2048 });
  const startTime = Date.now();

  const response = await model.invoke([
    new SystemMessage(DESIGN_BRIEF_SYSTEM_PROMPT),
    new HumanMessage(userMsg),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[design-brief] Response received in ${elapsed}s`);

  // Parse + validate
  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const brief = parseStructuredOutput(responseText, DesignBriefSchema);

  // Log summary
  const selected = brief.imageSelections.filter((s) => s.use);
  const skipped = brief.imageSelections.filter((s) => !s.use);

  console.log(`[design-brief] Strategy: ${brief.transformationStrategy}`);
  console.log(
    `[design-brief] Palette: ${brief.designLanguage.palette.join(", ")}`,
  );
  console.log(
    `[design-brief] Materials: ${brief.designLanguage.materials.join(", ")}`,
  );
  console.log(`[design-brief] Mood: ${brief.designLanguage.mood}`);
  console.log(
    `[design-brief] Selected ${selected.length} images, skipped ${skipped.length}`,
  );
  console.log(
    `[design-brief] Recommended: ${brief.recommendedCount.exteriors} ext + ${brief.recommendedCount.interiors} int = ${brief.recommendedCount.total} total`,
  );
  console.log(`[design-brief] Concept: ${brief.conceptStatement.slice(0, 120)}…`);

  return brief;
}
