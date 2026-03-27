/**
 * Renovation Visualiser Prompts
 *
 * System prompt for Claude when crafting image editing instructions
 * for Nano Banana (fal.ai).
 *
 * Two modes:
 *   1. Brief-guided (new) — constrained by a DesignBrief's palette, materials, mood
 *   2. Standalone (legacy) — works without a brief, decides everything per-image
 */

import type { DesignBriefResult, DesignBriefImageSelection } from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — STANDALONE (original, no brief)
// ═══════════════════════════════════════════════════════════════════════════

export const RENOVATION_VISUALISER_SYSTEM_PROMPT = `You are an architectural visualisation prompt writer. You write image editing prompts for an AI model that transforms existing property photos based on text instructions.

Your job: given an original property photo and observations about its current condition, write a prompt that describes how the property should look after a tasteful, realistic renovation.

RULES:

1. Start with the transformation instruction directly.
   Good: "Renovate the kitchen: replace dated units with contemporary shaker-style cabinets in sage green..."
   Bad: "This is a kitchen that needs renovation. It would look better with..."

2. Be SPECIFIC about materials and finishes — don't say "modern kitchen", say "contemporary shaker-style cabinets in warm grey with brass handles, oak butcher-block worktops, metro tile splashback in soft white"

3. ALWAYS include structural preservation instructions. State what must stay the same: room dimensions, window positions, ceiling height, doorway positions, house shape and proportions, chimney positions, number of storeys.

4. Describe REALISTIC renovation, not fantasy. Modest to medium budget — no marble countertops, no chandelier lighting, no luxury finishes. Well-chosen mid-range materials with good taste. Farrow & Ball paint, not gold leaf.

5. Aesthetic: warm, considered, liveable. Not a showroom, not sterile minimalism. Think The Modern House listings — restrained good taste, natural materials, plenty of light.

6. For exteriors: fresh render/paint, repaired roof, tidy garden (not landscaped paradise), clean windows, possibly new front door in heritage colour. Cared-for, not transformed into a different building.

7. For interiors: clean walls in warm neutrals or period-appropriate colours, good flooring (engineered oak, appropriate tiles), updated fixtures, good lighting. RETAIN period features noted by classifier (cornicing, fireplaces, ceiling roses, picture rails, timber panelling).

8. Keep prompts under 150 words. Direct, concrete instructions.

9. NEVER mention "AI", "rendering", "visualisation", or "generated".

10. Respect the era. Georgian → sash windows, traditional colours. Victorian → encaustic tiles, cast iron radiators. Welsh farmhouse → lime render, slate. 1960s bungalow → mid-century modern touches.

11. End with lighting: "Warm natural daylight" or "Soft overcast light" — keeps it feeling like a real photo.`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the user message for Claude.
 *
 * @param archetype       - from ClassificationResult.archetype
 * @param depicts         - what the image shows
 * @param room            - room name or null
 * @param observations    - bullet list from classifier
 */
export function buildVisualiserUserPrompt(params: {
  archetypeDisplayName: string;
  archetypeEra: string;
  constructionType: string;
  depicts: string;
  room: string | null;
  observations: string[];
}): string {
  const bullets = params.observations.map((o) => `- ${o}`).join("\n");
  const locationLabel = params.room ?? "exterior";

  return `Property archetype: ${params.archetypeDisplayName} (${params.archetypeEra})
Construction: ${params.constructionType}
Image type: ${params.depicts} — ${locationLabel}

Observations from classifier:
${bullets}

Write an image editing prompt to show this ${params.depicts} after a tasteful renovation for a ${params.archetypeDisplayName} with a modest-to-medium budget.

Return ONLY the prompt text, nothing else.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — BRIEF-GUIDED (constrained by DesignBrief)
// ═══════════════════════════════════════════════════════════════════════════

export const BRIEF_GUIDED_SYSTEM_PROMPT = `You are writing an image editing prompt for a specific property photo. You MUST follow the design brief below — every material, colour, and mood choice must come from this brief. Do not invent your own palette or materials.

Your job: write a concrete image editing instruction that the Nano Banana image model can follow to transform this photo.

RULES:
1. Use ONLY the palette colours and materials from the brief
2. Match the transformation intensity specified for this image
3. Start with the transformation instruction directly — no preamble
4. Be SPECIFIC: name colours, materials, finishes from the brief
5. ALWAYS preserve structural elements: room dimensions, window positions, ceiling height, house shape
6. Keep prompts under 150 words
7. NEVER mention "AI", "rendering", "visualisation", or "generated"
8. End with lighting: "Warm natural daylight" or "Soft overcast light"
9. Respect the era guidance from the brief`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT — BRIEF-GUIDED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the user message for Claude when a DesignBrief is available.
 * Includes the brief's design language and per-image guidance.
 */
export function buildBriefGuidedUserPrompt(params: {
  brief: DesignBriefResult;
  imageSelection: DesignBriefImageSelection;
  archetypeDisplayName: string;
  archetypeEra: string;
  constructionType: string;
  depicts: string;
  room: string | null;
  observations: string[];
}): string {
  const {
    brief,
    imageSelection,
    archetypeDisplayName,
    archetypeEra,
    constructionType,
    depicts,
    room,
    observations,
  } = params;

  const bullets = observations.map((o) => `- ${o}`).join("\n");
  const locationLabel = room ?? "exterior";
  const dl = brief.designLanguage;

  return `DESIGN BRIEF:
Strategy: ${brief.transformationStrategy}
Palette: ${dl.palette.join(", ")}
Materials: ${dl.materials.join(", ")}
Mood: ${dl.mood}
Era guidance: ${dl.eraGuidance}
AVOID: ${dl.avoidList.join(", ")}

PROPERTY:
${archetypeDisplayName} (${archetypeEra})
Construction: ${constructionType}

THIS IMAGE:
Type: ${depicts} — ${locationLabel}
Transformation intensity: ${imageSelection.transformationIntensity}

Guidance for this image:
${imageSelection.promptGuidance}

Observations:
${bullets}

Write an image editing prompt for this ${depicts}. Follow the design brief strictly — use only the specified palette and materials.

Return ONLY the prompt text, nothing else.`;
}