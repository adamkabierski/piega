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

export const RENOVATION_VISUALISER_SYSTEM_PROMPT = `You are writing image editing prompts for an AI model (Nano Banana / Gemini) that edits existing property photos. The model receives the original photo plus your text instruction.

CRITICAL — SPATIAL PRESERVATION (most important rules):

The image model will try to reimagine the space. You must AGGRESSIVELY prevent this.

1. EVERY prompt must START with a structural anchor sentence:
   "Edit this photo of the SAME room/building, keeping the EXACT camera angle, room dimensions, wall positions, window positions, window COUNT, ceiling height, and overall proportions UNCHANGED."

2. For EXTERIORS, explicitly state:
   - "Keep the same building footprint, roofline, chimney positions, number of storeys, number and position of windows, building materials (brick/render/stone)"
   - "Do NOT add, remove, or reposition any windows or doors"
   - "Do NOT change the building's proportions or mass"
   - The exterior should look CARED FOR, not rebuilt. Fresh pointing, clean windows, a painted front door — not a different house.

3. For INTERIORS, explicitly state:
   - "Keep the exact same room shape, floor area, and ceiling height — do not make the room appear larger or smaller"
   - "Keep all windows in their exact current positions and sizes"
   - "Keep the same camera angle and perspective"
   - The room should feel like the SAME room, just well-renovated — not a different room in a different building.

4. NEVER describe changes that would alter the building's structure: no extensions, no knocked-through walls, no raised ceilings, no widened openings, no added skylights.

DESIGN QUALITY — UK RESIDENTIAL RENOVATION TASTE:

5. Start the actual renovation instruction after the structural anchor. Be SPECIFIC about materials — don't say "modern kitchen", say "painted timber shaker cabinets in muted sage, unlacquered brass knobs, oiled oak worktop, plain white metro tile splashback."

6. ALWAYS root the design in the building's era and UK regional character:
   - Victorian terrace → stripped and waxed floorboards, Farrow & Ball estate emulsion in muted tones (Pointing, Elephant's Breath, Hague Blue for an accent), working shutters or plain linen curtains, cast iron radiators, original fireplaces cleaned up, encaustic hall tiles
   - Edwardian semi → parquet or herringbone oak floors, picture rails kept and used, wider hallways with tiled floors, generous proportions celebrated not cluttered, Arts & Crafts-influenced joinery
   - Interwar semi/detached → warm mid-century character, Crittal-style glazing where existing, terrazzo or geometric floor tiles in hallways, simple plaster coving retained, unfussy joinery
   - 1960s–70s house → honest mid-century approach, cork or polished concrete floors, teak or walnut joinery, simple white walls, original features like room dividers or internal glazing celebrated
   - Georgian/Regency → traditional lime plaster, shuttered sash windows, stone or wide-board timber floors, restrained palette (off-whites, stone, muted blue-green), no modern spotlights
   - Period cottage → exposed beams left alone (not sandblasted bright), lime plaster walls, flagstone or quarry tile floors, Aga or range cooker position respected, low ceilings celebrated not fought
   - New build → honest about what it is, warm it up with better materials: timber not laminate, linen not polyester, ceramic not plastic

7. AVOID these specific UK renovation clichés:
   - Grey everything (grey kitchen, grey carpet, grey sofa)
   - Crushed velvet anything
   - Chrome spotlights / LED strip lighting in period properties
   - Open-plan where the building wasn't designed for it
   - Composite front doors in heritage colours on period buildings
   - Over-landscaped front gardens (gravel parking, decking, architectural planting that doesn't suit the street)
   - Removing original features and replacing with modern substitutes
   - Bi-fold doors on Victorian terraces

8. Budget: modest to medium. Think a considered renovation, not a Grand Designs episode. Farrow & Ball paint, engineered oak, unlacquered brass, reclaimed materials where appropriate. Not marble, not bespoke steel, not imported anything.

9. Aesthetic reference: The Modern House listings, Retrouvius-style material honesty, George Clarke's "Old House New Home" sensibility — respect the building's bones, work with them, add warmth and quality.

10. Keep prompts under 180 words. The structural anchor sentence is mandatory and does not count toward this.

11. NEVER mention "AI", "rendering", "visualisation", or "generated".

12. End with lighting: "Warm natural daylight" or "Soft overcast light" — keeps it feeling like a real photo, not a 3D render.`;

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
  const isExterior = !params.room || ["front_exterior", "rear_exterior", "side_exterior", "garden_rear", "garden_front", "driveway"].includes(params.depicts);

  const spatialReminder = isExterior
    ? `SPATIAL RULE: This is an EDIT of the existing photo. The building must remain the SAME building — same footprint, same roofline, same number of windows in the same positions, same materials (brick/render/stone). Do NOT redesign the building. Show it CARED FOR, not rebuilt.`
    : `SPATIAL RULE: This is an EDIT of the existing photo. The room must remain the SAME size and shape — same walls, same ceiling height, same window positions and sizes, same camera angle. Do NOT make the room appear larger. Show it WELL-RENOVATED, not replaced with a different room.`;

  return `Property archetype: ${params.archetypeDisplayName} (${params.archetypeEra})
Construction: ${params.constructionType}
Image type: ${params.depicts} — ${locationLabel}

${spatialReminder}

Observations from classifier:
${bullets}

Write an image editing prompt for this ${params.depicts} of a ${params.archetypeDisplayName}. Root the design in this building's era and UK character. Modest-to-medium budget.

Return ONLY the prompt text, nothing else.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — BRIEF-GUIDED (constrained by DesignBrief)
// ═══════════════════════════════════════════════════════════════════════════

export const BRIEF_GUIDED_SYSTEM_PROMPT = `You are writing an image editing prompt for an AI model (Nano Banana / Gemini) that edits existing property photos. You MUST follow the design brief — every colour, material, and mood choice comes from the brief.

CRITICAL — SPATIAL PRESERVATION (most important rules):

The image model will try to reimagine the space. You must AGGRESSIVELY prevent this.

1. EVERY prompt must START with a structural anchor sentence:
   "Edit this photo of the SAME room/building, keeping the EXACT camera angle, room dimensions, wall positions, window positions, window COUNT, ceiling height, and overall proportions UNCHANGED."

2. For EXTERIORS:
   - "Keep the same building footprint, roofline, chimney positions, number of storeys, number and position of windows"
   - "Do NOT add, remove, or reposition any windows or doors"
   - The building should look CARED FOR, not rebuilt into a different building.

3. For INTERIORS:
   - "Keep the exact same room shape, floor area, and ceiling height"
   - "Keep all windows in their exact current positions and sizes"
   - The room should feel like the SAME room, well-renovated — not a different, larger room.

4. NEVER describe changes that alter structure: no extensions, no knocked-through walls, no raised ceilings, no widened openings.

DESIGN RULES:
5. Use ONLY the palette colours and materials from the brief
6. Match the transformation intensity: "heavy" = new surfaces/fixtures/furnishing, "moderate" = key surfaces + styling, "light" = cosmetic only
7. Be SPECIFIC: name colours, materials, finishes from the brief
8. Root every choice in the building's era — follow the brief's era guidance
9. Keep prompts under 180 words (structural anchor is mandatory and doesn't count)
10. NEVER mention "AI", "rendering", "visualisation", or "generated"
11. End with lighting: "Warm natural daylight" or "Soft overcast light"`;

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

  const isExterior = !room || ["front_exterior", "rear_exterior", "side_exterior", "garden_rear", "garden_front", "driveway"].includes(depicts);

  const spatialReminder = isExterior
    ? `SPATIAL RULE: This is an EDIT of the existing photo. The building must remain the SAME building — same footprint, roofline, window count and positions, same materials. Show it cared for, not rebuilt.`
    : `SPATIAL RULE: This is an EDIT of the existing photo. The room must remain the SAME size and shape — same walls, ceiling height, window positions. Do NOT make the room appear larger. Same camera angle.`;

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

${spatialReminder}

THIS IMAGE:
Type: ${depicts} — ${locationLabel}
Transformation intensity: ${imageSelection.transformationIntensity}

Guidance for this image:
${imageSelection.promptGuidance}

Observations:
${bullets}

Write an image editing prompt for this ${depicts}. Follow the design brief strictly — use only the specified palette and materials. The building/room must look like the SAME space, just renovated.

Return ONLY the prompt text, nothing else.`;
}