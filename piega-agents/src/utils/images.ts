/**
 * Image utilities — fetch URLs and convert to base64 for Claude vision API
 */

import type { ParsedListing } from "../types/listing.js";

export interface Base64Image {
  index: number;
  url: string;
  caption: string;
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

/**
 * Detect media type from URL or content
 */
function getMediaType(url: string, contentType?: string): Base64Image["mediaType"] {
  if (contentType?.includes("png")) return "image/png";
  if (contentType?.includes("webp")) return "image/webp";
  if (contentType?.includes("gif")) return "image/gif";
  if (url.endsWith(".png")) return "image/png";
  if (url.endsWith(".webp")) return "image/webp";
  if (url.endsWith(".gif")) return "image/gif";
  return "image/jpeg"; // default for Rightmove
}

/**
 * Fetch a single image and return as base64
 */
export async function fetchImageAsBase64(
  url: string,
  index: number,
  caption: string
): Promise<Base64Image | null> {
  try {
    const response = await fetch(url, {
      headers: {
        // Rightmove requires a browser-like User-Agent
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.warn(`[images] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? undefined;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      index,
      url,
      caption,
      base64,
      mediaType: getMediaType(url, contentType),
    };
  } catch (error) {
    console.warn(`[images] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Fetch all listing photos as base64, with concurrency limit
 */
export async function fetchListingImages(
  listing: ParsedListing,
  options?: {
    maxImages?: number;
    includeFloorplans?: boolean;
    concurrency?: number;
  }
): Promise<Base64Image[]> {
  const { maxImages = 15, includeFloorplans = true, concurrency = 3 } = options ?? {};

  // Collect URLs to fetch
  const toFetch: Array<{ url: string; index: number; caption: string }> = [];

  // Photos (limited)
  for (let i = 0; i < Math.min(listing.photos.length, maxImages); i++) {
    const photo = listing.photos[i];
    toFetch.push({ url: photo.url, index: i, caption: photo.caption });
  }

  // Floorplans (always at the end)
  if (includeFloorplans && listing.floorplans.length > 0) {
    for (let i = 0; i < listing.floorplans.length; i++) {
      const fp = listing.floorplans[i];
      toFetch.push({
        url: fp.url,
        index: listing.photos.length + i,
        caption: `Floorplan ${i + 1}`,
      });
    }
  }

  // Fetch with concurrency limit
  const results: Base64Image[] = [];
  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((item) => fetchImageAsBase64(item.url, item.index, item.caption))
    );
    for (const result of batchResults) {
      if (result) results.push(result);
    }
  }

  console.log(`[images] Fetched ${results.length}/${toFetch.length} images`);
  return results;
}

/**
 * Format images for Claude vision API message content
 */
export function formatImagesForClaude(
  images: Base64Image[]
): Array<{ type: "image"; source: { type: "base64"; media_type: string; data: string } }> {
  return images.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }));
}
