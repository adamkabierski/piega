/**
 * Post-Production Agent
 *
 * Takes a generated renovation visualisation and polishes it to look like
 * professional architectural photography — correcting perspective, enhancing
 * light and shadow, adding photographic depth.
 *
 * Architecture:
 *   Generated Renovation Image → Nano Banana (polish) → Final Image
 *
 * Only the generated image is sent. The prompt instructs the model to
 * correct perspective, enhance lighting, and add photographic depth
 * while keeping ALL design details completely untouched.
 *
 * Cost: one additional Nano Banana call per image (~$0.15 pro, ~$0.08 v2).
 * Latency: ~10-30s per image.
 */

import {
  generateRenovatedImage,
  ensureAccessibleUrl,
  type ImageModel,
  type FalEditResult,
} from "../utils/fal.js";
import { buildPostProductionPrompt } from "../prompts/postProduction.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface PostProductionConfig {
  enabled: boolean;
  model: ImageModel;
}

export const DEFAULT_POST_PRODUCTION_CONFIG: PostProductionConfig = {
  enabled: process.env.POST_PRODUCTION !== "false",
  model: (process.env.VISUALISER_MODEL as ImageModel) ?? "nano-banana-pro",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the post-production architectural photography polish on a single image.
 *
 * Sends only the generated renovation image to Nano Banana with instructions
 * to correct perspective, enhance lighting, and add photographic depth —
 * without touching any design details.
 *
 * @param generatedUrl  - URL of the generated renovation image to polish
 * @param isExterior    - whether this is an exterior or interior image
 * @param model         - which Nano Banana model to use
 * @returns             - the polished image result from fal.ai
 */
export async function postProcessImage(
  generatedUrl: string,
  isExterior: boolean,
  model: ImageModel = DEFAULT_POST_PRODUCTION_CONFIG.model,
): Promise<FalEditResult> {
  const prompt = buildPostProductionPrompt(isExterior);

  // Ensure URL is accessible from fal.ai servers
  const accessible = await ensureAccessibleUrl(generatedUrl);

  console.log(
    `[post-production] Polishing ${isExterior ? "exterior" : "interior"} with ${model}`,
  );
  const start = Date.now();

  const result = await generateRenovatedImage(accessible, prompt, model);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[post-production] ✅ Done in ${elapsed}s — ${result.url.slice(0, 80)}…`);

  return result;
}
