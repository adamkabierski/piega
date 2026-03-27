/**
 * Post-Production Prompts
 *
 * The post-production pass takes a generated renovation visualisation and
 * polishes it to look like a professional architectural photograph —
 * correcting perspective, enhancing light and shadow, and elevating the
 * image to visualisation-standard quality.
 *
 * Architecture:
 *   Generated Renovation Image → Nano Banana (polish) → Final Image
 *
 * The prompt instructs Nano Banana to improve the photographic quality
 * while keeping ALL design details (colours, materials, furniture) intact.
 */

// ═══════════════════════════════════════════════════════════════════════════
// POST-PRODUCTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the Nano Banana prompt for the architectural photography polish pass.
 *
 * Takes only the generated renovation image and upgrades its photographic
 * quality — perspective correction, lighting enhancement, shadow depth.
 */
export function buildPostProductionPrompt(isExterior: boolean): string {
  const lightingNote = isExterior
    ? `LIGHTING for this exterior:
- Natural directional sunlight with clear shadow casting — shadows should fall consistently from one direction
- Gentle ambient fill so shadows have detail, not crushed black
- If overcast, soft diffused light with subtle shadow gradients
- Sky should have natural depth — not flat white or over-saturated blue
- Building surfaces should show material texture through light: brick catches light differently from render or stone`
    : `LIGHTING for this interior:
- Strong natural window light as the primary source — it should spill across floors and walls realistically
- Visible light fall-off: areas near windows brighter, far corners darker and warmer
- Soft secondary bounce light from walls and ceilings filling shadow areas
- If there are lamps or pendants, show warm pools of light with soft edges
- Mixed colour temperature: cooler daylight from windows, warmer tones in shadows and from artificial light`;

  return `You are a professional architectural photographer doing post-production on a renovation visualisation image. Your job is to make this image look like a high-end property photography shot — the kind you see in Architectural Digest, The Modern House listings, or professional estate agent brochures.

PERSPECTIVE AND GEOMETRY:
- Correct converging verticals: vertical lines (walls, door frames, window edges) should be straight and truly vertical, not leaning inward from wide-angle distortion
- Correct horizontal lines: shelves, worktops, window sills should be level
- The image should look like it was shot on a shift lens or corrected in Lightroom — clean, professional architectural perspective
- Keep the same viewpoint and composition — just correct the lens distortion

${lightingNote}

SHADOW AND DEPTH:
- Shadows should be soft but present — they give the image three-dimensionality
- Contact shadows under furniture, along wall-floor junctions, in corners
- Ambient occlusion in recessed areas (alcoves, under cabinets, behind objects)
- Avoid flat, even lighting — real spaces have light gradients

PHOTOGRAPHIC POLISH:
- Subtle depth of field: very slight softness in far corners, sharp in the middle ground
- Natural colour grading: slightly warm overall, not clinical or over-saturated
- Clean highlight roll-off: bright areas (windows, light sources) should bloom gently, not clip harshly
- Overall: the image should feel like a photograph taken in the space, not a computer render

CRITICAL — DO NOT MODIFY ANY OF THESE:
- Furniture, fixtures, appliances, decorative objects, or any items in the scene
- Wall colours, floor materials, ceiling finishes, tile patterns, or any surface treatments
- Kitchen cabinets, worktops, splashbacks, bathroom fittings — all design choices stay exactly as they are
- Room layout, dimensions, proportions, or spatial relationships
- Window and door positions, mouldings, architraves, radiators, fireplaces
- Fabric colours, hardware finishes (brass, chrome, etc.), any material choices

You are correcting the CAMERA and LIGHTING only. Every design element must remain EXACTLY as it is. The room content is final — you are just re-photographing it with a better camera and better light.`;
}
