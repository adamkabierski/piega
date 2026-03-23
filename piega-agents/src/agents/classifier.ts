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
import type { ClassificationResult, ImageClassification } from "../types/agents.js";
import type { PropertyArchetype, ImageSubject, UsefulnessLevel } from "../types/common.js";
import { createVisionModel, validateEnv } from "../utils/llm.js";
import { fetchListingImages, type Base64Image } from "../utils/images.js";
import { parseStructuredOutput } from "../utils/parsing.js";
import { CLASSIFIER_SYSTEM_PROMPT, buildClassifierUserMessage } from "../prompts/classifier.js";

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
