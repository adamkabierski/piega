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

import { createTextModel, validateEnv, MODELS } from "../utils/llm.js";
import { extractCost, type AgentCost } from "../utils/costTracker.js";
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
  promptGuidance: z.string().default(""),
  transformationIntensity: z.enum(["heavy", "moderate", "light"]).default("light"),
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
// RESPONSE NORMALISATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LLMs sometimes return variations of the expected schema.
 * This function normalises common mismatches before Zod validation.
 */
function normaliseDesignBrief(raw: Record<string, unknown>): Record<string, unknown> {
  const obj = { ...raw };

  // --- Strategy field aliases ---
  if (!obj.transformationStrategy && obj.strategy) {
    obj.transformationStrategy = obj.strategy;
    delete obj.strategy;
  }
  if (!obj.transformationStrategy && obj.transformation_strategy) {
    obj.transformationStrategy = obj.transformation_strategy;
    delete obj.transformation_strategy;
  }
  if (!obj.strategyRationale && obj.rationale) {
    obj.strategyRationale = obj.rationale;
    delete obj.rationale;
  }
  if (!obj.strategyRationale && obj.strategy_rationale) {
    obj.strategyRationale = obj.strategy_rationale;
    delete obj.strategy_rationale;
  }

  // --- Design language ---
  const dl = obj.designLanguage ?? obj.design_language;
  if (dl && typeof dl === "object") {
    const dlObj = { ...(dl as Record<string, unknown>) };

    // Convert comma-separated strings to arrays
    for (const key of ["palette", "materials", "avoidList", "avoid_list"] as const) {
      if (typeof dlObj[key] === "string") {
        dlObj[key] = (dlObj[key] as string).split(/,\s*/).map(s => s.trim()).filter(Boolean);
      }
    }

    // Snake_case → camelCase aliases
    if (!dlObj.eraGuidance && dlObj.era_guidance) {
      dlObj.eraGuidance = dlObj.era_guidance;
      delete dlObj.era_guidance;
    }
    if (!dlObj.avoidList && dlObj.avoid_list) {
      dlObj.avoidList = dlObj.avoid_list;
      delete dlObj.avoid_list;
    }
    if (!dlObj.avoidList && dlObj.avoid) {
      dlObj.avoidList = Array.isArray(dlObj.avoid) ? dlObj.avoid : [];
      delete dlObj.avoid;
    }

    obj.designLanguage = dlObj;
    if (obj.design_language) delete obj.design_language;
  }

  // --- Image selections ---
  const selections = obj.imageSelections ?? obj.image_selections ?? obj.images;
  if (Array.isArray(selections)) {
    obj.imageSelections = selections.map((sel: Record<string, unknown>) => {
      const s = { ...sel };

      // Snake_case aliases
      if (s.prompt_guidance !== undefined && s.promptGuidance === undefined) {
        s.promptGuidance = s.prompt_guidance;
        delete s.prompt_guidance;
      }
      if (s.transformation_intensity !== undefined && s.transformationIntensity === undefined) {
        s.transformationIntensity = s.transformation_intensity;
        delete s.transformation_intensity;
      }

      // Default promptGuidance for skipped images
      if (s.use === false && !s.promptGuidance) {
        s.promptGuidance = "";
      }
      // Default transformationIntensity for skipped images
      if (s.use === false && !s.transformationIntensity) {
        s.transformationIntensity = "light";
      }

      // If 'selected' used instead of 'use'
      if (s.use === undefined && s.selected !== undefined) {
        s.use = s.selected;
        delete s.selected;
      }

      return s;
    });
    if (obj.image_selections) delete obj.image_selections;
    if (obj.images) delete obj.images;
  }

  // --- Recommended count ---
  if (!obj.recommendedCount && obj.recommended_count) {
    obj.recommendedCount = obj.recommended_count;
    delete obj.recommended_count;
  }
  if (!obj.recommendedCount && obj.imageSelections) {
    // Auto-compute from selections if missing
    const sels = obj.imageSelections as Array<{ use?: boolean; type?: string }>;
    const used = sels.filter(s => s.use);
    const ext = used.filter(s => s.type === "exterior").length;
    const int = used.filter(s => s.type === "interior").length;
    obj.recommendedCount = { exteriors: ext, interiors: int, total: ext + int };
  }

  // --- Concept statement ---
  if (!obj.conceptStatement && obj.concept_statement) {
    obj.conceptStatement = obj.concept_statement;
    delete obj.concept_statement;
  }
  if (!obj.conceptStatement && obj.concept) {
    obj.conceptStatement = obj.concept;
    delete obj.concept;
  }

  return obj;
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
): Promise<{ result: DesignBriefResult; cost: AgentCost }> {
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
  const model = createTextModel({ temperature: 0.4, maxTokens: 4096 });
  const startTime = Date.now();

  const response = await model.invoke([
    new SystemMessage(DESIGN_BRIEF_SYSTEM_PROMPT),
    new HumanMessage(userMsg),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const cost = extractCost(response, MODELS.default);
  console.log(`[design-brief] Response received in ${elapsed}s — ${cost.inputTokens} in / ${cost.outputTokens} out · $${cost.cost.toFixed(4)}`);

  // Parse + validate
  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  // Log raw response for debugging
  console.log(`[design-brief] Raw response (first 500 chars): ${responseText.slice(0, 500)}`);

  const brief = parseStructuredOutput(responseText, DesignBriefSchema, normaliseDesignBrief) as unknown as DesignBriefResult;

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

  return { result: brief, cost };
}
