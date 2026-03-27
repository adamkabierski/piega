/**
 * Renovation Visualiser Agent
 *
 * Takes classifier output, selects the best images, crafts renovation prompts
 * via Claude, and generates "after renovation" images via Nano Banana (fal.ai).
 *
 * Architecture: Two-step per image
 *   Classified Image → Claude (craft prompt) → Nano Banana (edit image) → Result
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createTextModel } from "../utils/llm.js";
import {
  generateRenovatedImage,
  ensureAccessibleUrl,
  MODEL_COSTS,
  type ImageModel,
} from "../utils/fal.js";
import {
  RENOVATION_VISUALISER_SYSTEM_PROMPT,
  buildVisualiserUserPrompt,
  BRIEF_GUIDED_SYSTEM_PROMPT,
  buildBriefGuidedUserPrompt,
} from "../prompts/renovationVisualiser.js";
import { postProcessImage } from "./postProduction.js";

import type {
  ClassificationResult,
  ImageClassification,
  DesignBriefResult,
  DesignBriefImageSelection,
} from "../types/agents.js";
import type { ImageSubject } from "../types/common.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RenovationVisualiserConfig {
  model: ImageModel;
  maxExteriors: number;
  maxInteriors: number;
  enablePostProduction: boolean;
}

export interface VisualisationRequest {
  imageIndex: number;
  imageUrl: string;
  depicts: ImageSubject;
  room: string | null;
  observations: string[];
  archetype: ClassificationResult["archetype"];
  type: "exterior" | "interior";
  /** When present, prompt crafting follows the brief's design language */
  designBrief?: DesignBriefResult;
  /** Per-image guidance from the brief */
  imageSelection?: DesignBriefImageSelection;
}

export interface VisualisationResult {
  imageIndex: number;
  originalUrl: string;
  renovatedUrl: string;
  depicts: ImageSubject;
  room: string | null;
  type: "exterior" | "interior";
  promptUsed: string;
  model: ImageModel;
}

export interface RenovationVisualisationOutput {
  exteriors: VisualisationResult[];
  interiors: VisualisationResult[];
  totalCost: number;
  totalDurationMs: number;
  model: ImageModel;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: RenovationVisualiserConfig = {
  model: (process.env.VISUALISER_MODEL as ImageModel) ?? "nano-banana-pro",
  maxExteriors: 3,
  maxInteriors: 2,
  enablePostProduction: process.env.POST_PRODUCTION !== "false",
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════

const EXTERIOR_SUBJECTS: ImageSubject[] = [
  "front_exterior",
  "rear_exterior",
  "side_exterior",
  "garden_rear",
  "garden_front",
  "driveway",
];

const INTERIOR_SUBJECTS: ImageSubject[] = [
  "living_room",
  "kitchen",
  "dining_room",
  "bedroom",
  "bathroom",
  "hallway",
  "landing",
];

/** Subjects we never visualise */
const SKIP_SUBJECTS: ImageSubject[] = [
  "floorplan",
  "street_view",
  "detail_closeup",
  "unknown",
  "loft",
  "basement",
  "garage",
  "wc",
];

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE SELECTION
// ═══════════════════════════════════════════════════════════════════════════

interface ClassifiedImage {
  index: number;
  url: string;
  classification: ImageClassification;
}

/**
 * Select the best images for visualisation based on classifier output.
 * Rules:
 *   - Only "high" or "medium" usefulness
 *   - Never floorplan, street_view, detail_closeup, unknown
 *   - Never images with skipReason
 *   - One image per depicts type (deduplicate, pick highest usefulness)
 */
export function selectImagesForVisualisation(
  images: ClassificationResult["images"],
  config: RenovationVisualiserConfig,
): { exteriors: ClassifiedImage[]; interiors: ClassifiedImage[] } {
  const usefulnessRank: Record<string, number> = { high: 2, medium: 1, low: 0 };

  // Filter out unsuitable images
  const candidates = images.filter((img) => {
    const cls = img.classification;
    if (cls.skipReason) return false;
    if (cls.usefulness === "low") return false;
    if (SKIP_SUBJECTS.includes(cls.depicts)) return false;
    return true;
  });

  // Deduplicate by depicts — keep highest usefulness
  const bestByDepicts = new Map<ImageSubject, ClassifiedImage>();
  for (const img of candidates) {
    const existing = bestByDepicts.get(img.classification.depicts);
    if (
      !existing ||
      usefulnessRank[img.classification.usefulness] >
        usefulnessRank[existing.classification.usefulness]
    ) {
      bestByDepicts.set(img.classification.depicts, img);
    }
  }

  // Split into exteriors and interiors
  const exteriors: ClassifiedImage[] = [];
  const interiors: ClassifiedImage[] = [];

  for (const [depicts, img] of bestByDepicts) {
    if (EXTERIOR_SUBJECTS.includes(depicts)) {
      exteriors.push(img);
    } else if (INTERIOR_SUBJECTS.includes(depicts)) {
      interiors.push(img);
    }
  }

  // Prioritise: front_exterior first for exteriors, living_room/kitchen first for interiors
  const exteriorPriority: ImageSubject[] = [
    "front_exterior",
    "rear_exterior",
    "side_exterior",
    "garden_rear",
    "garden_front",
    "driveway",
  ];
  const interiorPriority: ImageSubject[] = [
    "living_room",
    "kitchen",
    "dining_room",
    "bedroom",
    "bathroom",
    "hallway",
    "landing",
  ];

  const sortByPriority = (list: ClassifiedImage[], priority: ImageSubject[]) =>
    list.sort(
      (a, b) =>
        priority.indexOf(a.classification.depicts) -
        priority.indexOf(b.classification.depicts),
    );

  return {
    exteriors: sortByPriority(exteriors, exteriorPriority).slice(0, config.maxExteriors),
    interiors: sortByPriority(interiors, interiorPriority).slice(0, config.maxInteriors),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT CRAFTING (Claude)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ask Claude to craft a specific renovation prompt for one image.
 */
export async function craftRenovationPrompt(
  req: VisualisationRequest,
): Promise<string> {
  const model = createTextModel({ temperature: 0.4, maxTokens: 512 });

  // Use brief-guided prompting when a design brief is available
  const hasBrief = req.designBrief && req.imageSelection;

  const systemPrompt = hasBrief
    ? BRIEF_GUIDED_SYSTEM_PROMPT
    : RENOVATION_VISUALISER_SYSTEM_PROMPT;

  const userMsg = hasBrief
    ? buildBriefGuidedUserPrompt({
        brief: req.designBrief!,
        imageSelection: req.imageSelection!,
        archetypeDisplayName: req.archetype.displayName,
        archetypeEra: req.archetype.era,
        constructionType: req.archetype.constructionType,
        depicts: req.depicts,
        room: req.room,
        observations: req.observations,
      })
    : buildVisualiserUserPrompt({
        archetypeDisplayName: req.archetype.displayName,
        archetypeEra: req.archetype.era,
        constructionType: req.archetype.constructionType,
        depicts: req.depicts,
        room: req.room,
        observations: req.observations,
      });

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userMsg),
  ]);

  const prompt = (response.content as string).trim();
  console.log(
    `[visualiser] Prompt crafted for ${req.depicts} (${req.room ?? "exterior"}): ${prompt.slice(0, 80)}…`,
  );
  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE IMAGE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process one image: craft prompt → generate renovated image
 */
async function processOneImage(
  req: VisualisationRequest,
  model: ImageModel,
  enablePostProduction: boolean = true,
): Promise<VisualisationResult> {
  // Step 1: Claude crafts the prompt
  const prompt = await craftRenovationPrompt(req);

  // Step 2: Ensure the image URL is accessible from fal.ai
  const accessibleUrl = await ensureAccessibleUrl(req.imageUrl);

  // Step 3: Nano Banana generates the renovation
  const generated = await generateRenovatedImage(accessibleUrl, prompt, model);

  // Step 4: Post-production — polish to architectural photography standard
  let finalUrl = generated.url;
  if (enablePostProduction) {
    try {
      const isExterior = req.type === "exterior";
      const polished = await postProcessImage(
        generated.url,
        isExterior,
        model,
      );
      finalUrl = polished.url;
      console.log(`[visualiser] Post-production applied for ${req.depicts}`);
    } catch (err) {
      console.error(
        `[visualiser] Post-production failed for ${req.depicts}, using unprocessed image:`,
        err instanceof Error ? err.message : err,
      );
      // Fall back to the raw generated image
    }
  }

  return {
    imageIndex: req.imageIndex,
    originalUrl: req.imageUrl,
    renovatedUrl: finalUrl,
    depicts: req.depicts,
    room: req.room,
    type: req.type,
    promptUsed: prompt,
    model,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN AGENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the renovation visualiser agent.
 *
 * @param classifiedImages  - from ClassificationResult.images
 * @param archetype         - from ClassificationResult.archetype
 * @param config            - optional overrides
 * @param onImageComplete   - callback for progressive updates
 */
export async function runRenovationVisualiser(
  classifiedImages: ClassificationResult["images"],
  archetype: ClassificationResult["archetype"],
  config?: Partial<RenovationVisualiserConfig>,
  onImageComplete?: (result: VisualisationResult, remaining: number) => void,
  designBrief?: DesignBriefResult,
): Promise<RenovationVisualisationOutput> {
  const cfg: RenovationVisualiserConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  const hasBrief = !!designBrief;
  console.log(`[visualiser] Starting — model: ${cfg.model}, brief: ${hasBrief ? "yes" : "no"}, post-production: ${cfg.enablePostProduction ? "on" : "off"}`);

  // 1. Select images — from brief when available, else fallback to hardcoded rules
  let allRequests: VisualisationRequest[];

  if (designBrief) {
    // Brief-driven selection: use only images the brief marked as use: true
    const selectedByBrief = designBrief.imageSelections.filter((s) => s.use);
    console.log(
      `[visualiser] Brief selected ${selectedByBrief.length} images (strategy: ${designBrief.transformationStrategy})`,
    );

    if (selectedByBrief.length === 0) {
      console.warn("[visualiser] Brief selected 0 images — nothing to generate");
      return {
        exteriors: [],
        interiors: [],
        totalCost: 0,
        totalDurationMs: Date.now() - startTime,
        model: cfg.model,
      };
    }

    allRequests = selectedByBrief
      .map((sel) => {
        const img = classifiedImages.find((i) => i.index === sel.index);
        if (!img) {
          console.warn(`[visualiser] Brief references image index ${sel.index} not found in classified images — skipping`);
          return null;
        }
        return {
          imageIndex: img.index,
          imageUrl: img.url,
          depicts: img.classification.depicts,
          room: img.classification.room,
          observations: img.classification.observations,
          archetype,
          type: sel.type,
          designBrief,
          imageSelection: sel,
        } as VisualisationRequest;
      })
      .filter((r): r is VisualisationRequest => r !== null);
  } else {
    // Legacy path: hardcoded selection rules
    const selected = selectImagesForVisualisation(classifiedImages, cfg);
    const totalSelected = selected.exteriors.length + selected.interiors.length;

    console.log(
      `[visualiser] Selected ${selected.exteriors.length} exterior(s) + ${selected.interiors.length} interior(s) = ${totalSelected} images`,
    );

    if (totalSelected === 0) {
      console.warn("[visualiser] No suitable images for visualisation");
      return {
        exteriors: [],
        interiors: [],
        totalCost: 0,
        totalDurationMs: Date.now() - startTime,
        model: cfg.model,
      };
    }

    allRequests = [
      ...selected.exteriors.map(
        (img): VisualisationRequest => ({
          imageIndex: img.index,
          imageUrl: img.url,
          depicts: img.classification.depicts,
          room: img.classification.room,
          observations: img.classification.observations,
          archetype,
          type: "exterior",
        }),
      ),
      ...selected.interiors.map(
        (img): VisualisationRequest => ({
          imageIndex: img.index,
          imageUrl: img.url,
          depicts: img.classification.depicts,
          room: img.classification.room,
          observations: img.classification.observations,
          archetype,
          type: "interior",
        }),
      ),
    ];
  }

  const totalImages = allRequests.length;

  // 2. Process images (serially to avoid rate limits and for progressive updates)
  const results: VisualisationResult[] = [];
  let remaining = allRequests.length;

  for (const req of allRequests) {
    try {
      const result = await processOneImage(req, cfg.model, cfg.enablePostProduction);
      results.push(result);
      remaining--;
      onImageComplete?.(result, remaining);
      console.log(
        `[visualiser] ✅ ${req.depicts} (${req.room ?? "exterior"}) done — ${remaining} remaining`,
      );
    } catch (err) {
      remaining--;
      console.error(
        `[visualiser] ❌ Failed for ${req.depicts} (${req.room ?? "exterior"}):`,
        err instanceof Error ? err.message : err,
      );
      // Continue with other images — don't let one failure kill the batch
    }
  }

  // 3. Split results
  const exteriors = results.filter((r) => r.type === "exterior");
  const interiors = results.filter((r) => r.type === "interior");

  // Post-production doubles the Nano Banana cost per image
  const costMultiplier = cfg.enablePostProduction ? 2 : 1;
  const output: RenovationVisualisationOutput = {
    exteriors,
    interiors,
    totalCost: results.length * MODEL_COSTS[cfg.model] * costMultiplier,
    totalDurationMs: Date.now() - startTime,
    model: cfg.model,
  };

  const elapsed = (output.totalDurationMs / 1000).toFixed(1);
  console.log(
    `[visualiser] Complete — ${results.length}/${totalImages} images, $${output.totalCost.toFixed(2)}, ${elapsed}s`,
  );

  return output;
}
