/**
 * Classifier Agent Tests
 *
 * Integration test that runs the classifier against a real fixture.
 * Requires ANTHROPIC_API_KEY to be set.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runClassifier } from "../../src/agents/classifier.js";
import type { ParsedListing } from "../../src/types/listing.js";
import type { PropertyArchetype } from "../../src/types/common.js";

// ═══════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, "../../fixtures/listings");

let paigntonBungalow: ParsedListing;

const VALID_ARCHETYPES: PropertyArchetype[] = [
  "victorian_terrace",
  "victorian_semi",
  "edwardian_terrace",
  "edwardian_semi",
  "georgian_townhouse",
  "interwar_semi",
  "interwar_terrace",
  "postwar_semi",
  "postwar_terrace",
  "60s_70s_detached",
  "60s_70s_bungalow",
  "80s_90s_estate",
  "new_build",
  "period_cottage",
  "converted_building",
  "purpose_built_flat",
  "council_ex_council",
  "other",
];

beforeAll(async () => {
  const fixtureContent = await readFile(
    join(FIXTURES_DIR, "paignton-bungalow.json"),
    "utf-8"
  );
  paigntonBungalow = JSON.parse(fixtureContent);
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Classifier Agent", () => {
  it("should classify the Paignton bungalow fixture", async () => {
    // Skip if no API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("Skipping test: ANTHROPIC_API_KEY not set");
      return;
    }

    // Run the classifier
    const result = await runClassifier({ listing: paigntonBungalow });

    // Log full output for inspection
    console.log("\n════════════════════════════════════════════════════════════");
    console.log("CLASSIFIER RESULT:");
    console.log("════════════════════════════════════════════════════════════\n");
    console.log(JSON.stringify(result, null, 2));

    // Assertions
    expect(result.error).toBeUndefined();
    expect(result.classification).not.toBeNull();

    if (result.classification) {
      // Check archetype
      expect(VALID_ARCHETYPES).toContain(result.classification.archetype.label);
      expect(result.classification.archetype.confidenceScore).toBeGreaterThan(0);
      expect(result.classification.archetype.confidenceScore).toBeLessThanOrEqual(1);

      // Check images were classified
      expect(result.classification.images.length).toBeGreaterThan(0);

      // Check summary exists
      expect(result.classification.summary).toBeTruthy();
      expect(typeof result.classification.summary).toBe("string");

      // Log summary for inspection
      console.log("\n════════════════════════════════════════════════════════════");
      console.log("ARCHETYPE:", result.classification.archetype.displayName);
      console.log("ERA:", result.classification.archetype.era);
      console.log("CONFIDENCE:", `${(result.classification.archetype.confidenceScore * 100).toFixed(0)}%`);
      console.log("════════════════════════════════════════════════════════════\n");
      console.log("SUMMARY:");
      console.log(result.classification.summary);
      console.log("\n════════════════════════════════════════════════════════════\n");

      // Log image classifications
      console.log("IMAGE CLASSIFICATIONS:");
      for (const img of result.classification.images) {
        console.log(`  [${img.index}] ${img.classification.depicts} (${img.classification.usefulness})`);
        if (img.classification.observations.length > 0) {
          console.log(`      → ${img.classification.observations.join(", ")}`);
        }
      }
    }
  }, 120000); // 2 minute timeout for API call

  it("should handle missing listing gracefully", async () => {
    // @ts-expect-error Testing invalid input
    const result = await runClassifier({ listing: null });

    expect(result.classification).toBeNull();
    expect(result.error).toBe("No listing provided");
  });
});
