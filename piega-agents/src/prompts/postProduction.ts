/**
 * Post-Production Prompts
 *
 * The post-production pass takes a generated renovation visualisation and
 * polishes it to look like a professional architectural photograph —
 * enhancing light, shadow, and depth while preserving all design content.
 *
 * Architecture:
 *   Generated Renovation Image → Nano Banana (polish) → Final Image
 *
 * DESIGN PRINCIPLE: Less is more. The renovation image already has the
 * right content — we're just making it look like it was photographed
 * by a professional rather than rendered by a computer. The prompt is
 * deliberately short and focused to avoid the model over-interpreting.
 */

// ═══════════════════════════════════════════════════════════════════════════
// POST-PRODUCTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the Nano Banana prompt for the architectural photography polish pass.
 *
 * Deliberately concise — long prompts with competing instructions cause
 * the model to prioritise unpredictably and risk damaging the renovation.
 */
export function buildPostProductionPrompt(isExterior: boolean): string {
  const lightingNote = isExterior
    ? "Enhance the natural sunlight: add clear directional shadows from one consistent sun angle, let building surfaces show texture through raking light, give the sky natural depth and tonal variation."
    : "Enhance the natural window light: bright near windows with visible fall-off into warmer, darker corners. Add soft contact shadows under furniture and along wall-floor edges. If lamps are present, show warm light pools.";

  return `Re-light and polish this renovation visualisation to look like a professional architectural photograph from The Modern House or Architectural Digest.

${lightingNote}

Add subtle three-dimensionality: soft shadows that give depth, gentle ambient occlusion in recesses, natural light gradients across surfaces. The image should feel like a real space photographed in beautiful light, not a flat computer render.

DO NOT CHANGE: any furniture, colours, materials, fixtures, layout, room proportions, or design choices. Every object and surface must stay exactly as it is. You are only improving the LIGHT and SHADOW.`;
}
