/**
 * fal.ai client — wrapper for Nano Banana image generation
 *
 * Supports two models:
 *   - nano-banana-pro  (Gemini 3 Pro Image)  — $0.15/img, max quality
 *   - nano-banana-2    (Gemini 3.1 Flash)    — $0.08/img, fast/cheap
 */

import { fal } from "@fal-ai/client";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ImageModel = "nano-banana-pro" | "nano-banana-2";

export interface FalEditResult {
  url: string;
  width: number;
  height: number;
  content_type: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const MODEL_ENDPOINTS: Record<ImageModel, string> = {
  "nano-banana-pro": "fal-ai/nano-banana-pro/edit",
  "nano-banana-2": "fal-ai/nano-banana-2/edit",
};

export const MODEL_COSTS: Record<ImageModel, number> = {
  "nano-banana-pro": 0.15,
  "nano-banana-2": 0.08,
};

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY environment variable is required");
  fal.config({ credentials: key });
  configured = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a renovated image using Nano Banana via fal.ai
 *
 * @param imageUrl  - URL of the original property photo
 * @param prompt    - Claude-crafted renovation prompt
 * @param model     - Which Nano Banana model to use
 */
export async function generateRenovatedImage(
  imageUrl: string,
  prompt: string,
  model: ImageModel = "nano-banana-pro",
): Promise<FalEditResult> {
  ensureConfigured();

  const endpoint = MODEL_ENDPOINTS[model];
  console.log(`[fal] Generating with ${model} — ${prompt.slice(0, 80)}…`);

  const start = Date.now();

  const result = await fal.subscribe(endpoint, {
    input: {
      prompt,
      image_urls: [imageUrl],
      num_images: 1,
      output_format: "jpeg",
      aspect_ratio: "auto",
      resolution: "1K",
    },
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const images = (result.data as { images: FalEditResult[] }).images;

  if (!images?.[0]) {
    throw new Error(`[fal] No image returned from ${model}`);
  }

  console.log(`[fal] Generated in ${elapsed}s — ${images[0].url.slice(0, 80)}…`);
  return images[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// URL ACCESSIBILITY HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ensure an image URL is accessible from fal.ai servers.
 * If the URL is blocked (e.g. Rightmove CDN), downloads and re-uploads
 * to fal.ai's storage.
 */
export async function ensureAccessibleUrl(url: string): Promise<string> {
  try {
    // Quick HEAD check from our server first
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return url;
  } catch {
    // Fetch failed — probably blocked
  }

  console.log(`[fal] URL not accessible, uploading to fal.ai storage: ${url.slice(0, 60)}…`);

  // Download with browser-like headers
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Cannot fetch image ${url}: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const file = new File([buffer], "photo.jpg", { type: "image/jpeg" });

  ensureConfigured();
  const uploadedUrl = await fal.storage.upload(file);
  console.log(`[fal] Uploaded to: ${uploadedUrl.slice(0, 60)}…`);

  return uploadedUrl;
}
