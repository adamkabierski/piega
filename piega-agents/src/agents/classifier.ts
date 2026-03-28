/**
 * Classifier Agent
 *
 * Analyses listing data and photos to determine:
 * 1. Property archetype (Victorian terrace, 60s bungalow, etc.)
 * 2. Image classifications (what each photo depicts, usefulness, observations)
 */

import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import type { ParsedListing } from "../types/listing.js";
import type { ClassificationResult, ArchitecturalReading, ImageClassification } from "../types/agents.js";
import type { PropertyArchetype, ImageSubject, UsefulnessLevel, ConfidenceLevel } from "../types/common.js";
import { createVisionModel, validateEnv } from "../utils/llm.js";
import { fetchListingImages, type Base64Image } from "../utils/images.js";
import { parseStructuredOutput } from "../utils/parsing.js";
import { CLASSIFIER_SYSTEM_PROMPT, buildClassifierUserMessage } from "../prompts/classifier.js";
import {
  ARCHITECTURAL_READING_SYSTEM_PROMPT,
  buildArchitecturalReadingUserPrompt,
} from "../prompts/architecturalReading.js";

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS for structured output validation
// ═══════════════════════════════════════════════════════════════════════════

const ImageSubjectSchema = z.enum([
  "front_exterior",
  "rear_exterior",
  "side_exterior",
  "kitchen",
  "living_room",
  "dining_room",
  "bedroom",
  "bathroom",
  "wc",
  "hallway",
  "landing",
  "loft",
  "basement",
  "garage",
  "garden_rear",
  "garden_front",
  "driveway",
  "floorplan",
  "street_view",
  "detail_closeup",
  "unknown",
]);

const UsefulnessSchema = z.enum(["high", "medium", "low"]);

const ImageClassificationSchema = z.object({
  depicts: ImageSubjectSchema,
  room: z.string().nullable(),
  usefulness: UsefulnessSchema,
  observations: z.array(z.string()),
  skipReason: z.string().nullable(),
});

const ClassificationResultSchema = z.object({
  archetype: z.object({
    label: z.string(),
    displayName: z.string(),
    era: z.string(),
    constructionType: z.string(),
    typicalCharacteristics: z.array(z.string()),
    confidenceScore: z.number().min(0).max(1),
  }),
  images: z.array(
    z.object({
      index: z.number(),
      url: z.string().optional(), // Claude doesn't know URLs — we inject them after parsing
      classification: ImageClassificationSchema,
    })
  ),
  summary: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export interface ClassifierInput {
  listing: ParsedListing;
}

export interface ClassifierOutput {
  classification: ClassificationResult | null;
  error?: string;
}

/**
 * Run the classifier agent on a parsed listing
 *
 * 1. Fetches all listing images as base64
 * 2. Sends images + listing metadata to Claude
 * 3. Parses the structured response
 */
export async function runClassifier(input: ClassifierInput): Promise<ClassifierOutput> {
  const { listing } = input;

  if (!listing) {
    return {
      classification: null,
      error: "No listing provided",
    };
  }

  validateEnv();

  console.log(`[classifier] Starting classification for listing ${listing.listingId}`);
  console.log(`[classifier] Address: ${listing.address}`);
  console.log(`[classifier] Photos: ${listing.photos.length}, Floorplans: ${listing.floorplans.length}`);

  // 1. Fetch images as base64
  console.log("[classifier] Fetching images...");
  const images = await fetchListingImages(listing, {
    maxImages: 12, // Limit to avoid token explosion
    includeFloorplans: true,
    concurrency: 3,
  });

  if (images.length === 0) {
    console.warn("[classifier] No images fetched — cannot classify");
    return {
      classification: null,
      error: "No images could be fetched from the listing",
    };
  }

  // 2. Build the prompt
  const userMessageText = buildClassifierUserMessage(listing);

  // 3. Build message content with images
  const messageContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  > = [];

  // Add images first (Claude processes them in order)
  for (const img of images) {
    messageContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.base64,
      },
    });
    // Add a caption after each image
    messageContent.push({
      type: "text",
      text: `[Image ${img.index}: ${img.caption}]`,
    });
  }

  // Add the main prompt text at the end
  messageContent.push({
    type: "text",
    text: userMessageText,
  });

  // 4. Create the model and invoke
  const model = createVisionModel({ temperature: 0.2, maxTokens: 4096 });

  console.log("[classifier] Sending to Claude...");
  const startTime = Date.now();

  try {
    const response = await model.invoke([
      new SystemMessage(CLASSIFIER_SYSTEM_PROMPT),
      new HumanMessage({ content: messageContent }),
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[classifier] Response received in ${elapsed}s`);

    // 5. Parse the response
    const responseText = typeof response.content === "string" 
      ? response.content 
      : JSON.stringify(response.content);

    const parsed = parseStructuredOutput(responseText, ClassificationResultSchema);

    // Enrich with image URLs from original listing
    const result: ClassificationResult = {
      archetype: {
        ...parsed.archetype,
        label: parsed.archetype.label as PropertyArchetype,
      },
      images: parsed.images.map((img) => ({
        index: img.index,
        url: images.find((i) => i.index === img.index)?.url ?? "",
        classification: {
          depicts: img.classification.depicts as ImageSubject,
          room: img.classification.room,
          usefulness: img.classification.usefulness as UsefulnessLevel,
          observations: img.classification.observations,
          skipReason: img.classification.skipReason,
        },
      })),
      summary: parsed.summary,
    };

    console.log(`[classifier] Classified as: ${result.archetype.displayName} (${result.archetype.era})`);
    console.log(`[classifier] Confidence: ${(result.archetype.confidenceScore * 100).toFixed(0)}%`);
    console.log(`[classifier] Summary: ${result.summary}`);

    return { classification: result };
  } catch (error) {
    console.error("[classifier] Error:", error);
    return {
      classification: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURAL READING — second vision call
// ═══════════════════════════════════════════════════════════════════════════

const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

const ArchitecturalReadingSchema = z.object({
  buildingNarrative: z.string(),
  constructionInferences: z.object({
    wallType: z.string(),
    roofStructure: z.string(),
    foundations: z.string(),
    insulation: z.string(),
    windowsAndDoors: z.string(),
    heatingAndServices: z.string(),
    confidence: ConfidenceLevelSchema,
  }),
  periodFeatures: z.array(
    z.object({
      feature: z.string(),
      status: z.string(),
      confidence: ConfidenceLevelSchema,
      recommendation: z.string(),
    })
  ),
  issuesIdentified: z.array(
    z.object({
      issue: z.string(),
      severity: z.enum(["minor", "moderate", "significant", "unknown"]),
      evidence: z.string(),
      implication: z.string(),
    })
  ),
  unknowns: z.array(z.string()),
});

export interface ArchitecturalReadingInput {
  listing: ParsedListing;
  classification: ClassificationResult;
}

export interface ArchitecturalReadingOutput {
  architecturalReading: ArchitecturalReading | null;
  error?: string;
}

/**
 * Run the architectural reading — a second vision call that produces
 * a deep professional reading of the building.
 *
 * Requires the existing classification so it can reference the
 * classifier's image notes and archetype in its prompts.
 */
export async function runArchitecturalReading(
  input: ArchitecturalReadingInput,
): Promise<ArchitecturalReadingOutput> {
  const { listing, classification } = input;

  validateEnv();

  console.log(`[architectural-reading] Starting for ${listing.address}`);
  console.log(`[architectural-reading] Archetype: ${classification.archetype.displayName}`);

  // 1. Fetch images (same set as classifier)
  console.log("[architectural-reading] Fetching images...");
  const images = await fetchListingImages(listing, {
    maxImages: 12,
    includeFloorplans: false, // no value for architectural reading
    concurrency: 3,
  });

  if (images.length === 0) {
    console.warn("[architectural-reading] No images — cannot produce reading");
    return {
      architecturalReading: null,
      error: "No images could be fetched from the listing",
    };
  }

  // 2. Build the prompt
  const userMessageText = buildArchitecturalReadingUserPrompt({
    listing,
    classification,
  });

  // 3. Build message content with images
  const messageContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  > = [];

  for (const img of images) {
    messageContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.base64,
      },
    });
    messageContent.push({
      type: "text",
      text: `[Image ${img.index}: ${img.caption}]`,
    });
  }

  messageContent.push({
    type: "text",
    text: userMessageText,
  });

  // 4. Create model — higher token budget for prose output
  const model = createVisionModel({ temperature: 0.3, maxTokens: 6144 });

  console.log("[architectural-reading] Sending to Claude...");
  const startTime = Date.now();

  try {
    const response = await model.invoke([
      new SystemMessage(ARCHITECTURAL_READING_SYSTEM_PROMPT),
      new HumanMessage({ content: messageContent }),
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[architectural-reading] Response received in ${elapsed}s`);

    // 5. Parse
    const responseText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = parseStructuredOutput(responseText, ArchitecturalReadingSchema);

    const reading: ArchitecturalReading = {
      buildingNarrative: parsed.buildingNarrative,
      constructionInferences: {
        ...parsed.constructionInferences,
        confidence: parsed.constructionInferences.confidence as ConfidenceLevel,
      },
      periodFeatures: parsed.periodFeatures.map((pf) => ({
        ...pf,
        confidence: pf.confidence as ConfidenceLevel,
      })),
      issuesIdentified: parsed.issuesIdentified,
      unknowns: parsed.unknowns,
    };

    console.log(
      `[architectural-reading] Complete — ${reading.periodFeatures.length} features, ` +
        `${reading.issuesIdentified.length} issues, ${reading.unknowns.length} unknowns`,
    );

    return { architecturalReading: reading };
  } catch (error) {
    console.error("[architectural-reading] Error:", error);
    return {
      architecturalReading: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
