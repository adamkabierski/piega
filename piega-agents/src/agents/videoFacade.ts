/**
 * Video Facade Agent
 *
 * Generates a 4-second morphing video of the exterior facade transformation
 * using Vidu (fal.ai start-end-to-video). Takes the best before/after
 * exterior pair from the Renovation Visualiser output.
 *
 * No Claude call — the prompt is static. No ffmpeg — just one Vidu call.
 * Cost: ~$0.12 per video.
 */

import { fal } from "@fal-ai/client";
import { ensureAccessibleUrl } from "../utils/fal.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface VideoFacadeInput {
  /** Original Rightmove exterior photo */
  beforeUrl: string;
  /** Nano Banana renovated exterior */
  afterUrl: string;
}

export interface VideoFacadeResult {
  videoUrl: string;
  durationSeconds: number;
  cost: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const VIDU_COST_ESTIMATE = 0.12; // ~$0.10–0.15 per clip

const EXTERIOR_PROMPT =
  "Smooth renovation transformation of a house exterior. " +
  "The building gradually transforms from its current state to beautifully restored. " +
  "Camera remains perfectly static. Natural daylight throughout. " +
  "Realistic, steady transformation.";

// ═══════════════════════════════════════════════════════════════════════════
// AGENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a 4-second facade transformation video via Vidu (fal.ai).
 */
export async function runVideoFacade(
  input: VideoFacadeInput,
): Promise<VideoFacadeResult> {
  // Ensure fal.ai is configured
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY environment variable is required");
  fal.config({ credentials: key });

  console.log("[video-facade] Starting Vidu generation");
  console.log(`[video-facade] Before: ${input.beforeUrl.slice(0, 60)}…`);
  console.log(`[video-facade] After:  ${input.afterUrl.slice(0, 60)}…`);

  // Ensure both URLs are accessible from fal.ai servers
  const [startUrl, endUrl] = await Promise.all([
    ensureAccessibleUrl(input.beforeUrl),
    ensureAccessibleUrl(input.afterUrl),
  ]);

  const start = Date.now();

  const result = await fal.subscribe("fal-ai/vidu/start-end-to-video", {
    input: {
      prompt: EXTERIOR_PROMPT,
      start_image_url: startUrl,
      end_image_url: endUrl,
      movement_amplitude: "auto",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log("[video-facade] Vidu generating…");
      }
    },
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const video = (result.data as { video: { url: string; duration?: number } }).video;

  if (!video?.url) {
    throw new Error("[video-facade] No video returned from Vidu");
  }

  console.log(`[video-facade] Generated in ${elapsed}s — ${video.url.slice(0, 80)}…`);

  return {
    videoUrl: video.url,
    durationSeconds: video.duration ?? 4,
    cost: VIDU_COST_ESTIMATE,
  };
}
