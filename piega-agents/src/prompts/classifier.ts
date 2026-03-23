/**
 * Classifier agent prompts
 *
 * The classifier analyses listing data and photos to determine:
 * 1. Property archetype (Victorian terrace, 60s bungalow, etc.)
 * 2. Image classifications (what each photo depicts, usefulness, observations)
 */

import type { ParsedListing } from "../types/listing.js";
import type { PropertyArchetype } from "../types/common.js";

/**
 * System prompt establishing Claude as a UK property expert
 */
export const CLASSIFIER_SYSTEM_PROMPT = `You are an experienced UK property professional with expertise spanning:
- Building surveying and structural assessment
- Architectural history of British housing stock
- Residential property valuation
- Renovation project management

You can identify a property's era from subtle visual cues: brickwork patterns, window styles, rooflines, door proportions, room heights, ceiling details. You understand how UK housing has evolved from Georgian terraces through Victorian expansion, Edwardian suburbs, interwar semis, post-war estates, 60s/70s experimentation, and modern new builds.

You read estate agent descriptions critically. You know the euphemisms:
- "Characterful" = old and unrenovated
- "Deceptively spacious" = looks small from outside
- "Requires modernisation" = very dated
- "Original features" = may be period details worth keeping, or may be outdated
- "Well-maintained" = basic repairs done but no upgrades
- "Ideal for improvement" = needs significant work

When analysing photos, you assess:
- Room condition (damp staining, dated finishes, quality of previous work)
- Period features worth preserving (cornicing, fireplaces, original doors)
- Layout efficiency and natural light
- Red flags (cracks, damp, subsidence signs, poor DIY)
- Overall quality of the photography (some photos are useless for assessment)

You provide honest, pragmatic assessments. You don't oversell problems or potential.`;

/**
 * Property archetype options for the classifier to choose from
 */
export const ARCHETYPE_OPTIONS: Array<{ value: PropertyArchetype; description: string }> = [
  { value: "victorian_terrace", description: "Victorian terrace (1837-1901), typically 2-3 storeys, bay windows, high ceilings" },
  { value: "victorian_semi", description: "Victorian semi-detached (1837-1901), similar features to terrace but paired" },
  { value: "edwardian_terrace", description: "Edwardian terrace (1901-1914), often wider plots, more light, Arts & Crafts influence" },
  { value: "edwardian_semi", description: "Edwardian semi-detached (1901-1914), typically larger gardens, decorative details" },
  { value: "georgian_townhouse", description: "Georgian townhouse (1714-1837), formal proportions, sash windows, symmetrical facade" },
  { value: "interwar_semi", description: "Interwar semi (1918-1939), classic '1930s semi', bay windows, pebbledash, curved features" },
  { value: "interwar_terrace", description: "Interwar terrace (1918-1939), similar style but terraced" },
  { value: "postwar_semi", description: "Post-war semi (1945-1970), council-built or private, simpler design, concrete details" },
  { value: "postwar_terrace", description: "Post-war terrace (1945-1970), often council-built, standardised layouts" },
  { value: "60s_70s_detached", description: "1960s-70s detached house, varied styles, flat roofs, large windows, experimental" },
  { value: "60s_70s_bungalow", description: "1960s-70s bungalow, single storey, often with garage, simple construction" },
  { value: "80s_90s_estate", description: "1980s-90s estate house, developer-built, mock-traditional, smaller rooms" },
  { value: "new_build", description: "New build (2000+), modern construction, Part L compliant, compact layouts" },
  { value: "period_cottage", description: "Period cottage (pre-1900), rural, often irregular layout, low ceilings, character" },
  { value: "converted_building", description: "Converted building, former chapel/barn/warehouse/school etc." },
  { value: "purpose_built_flat", description: "Purpose-built flat, any era, designed as apartments" },
  { value: "council_ex_council", description: "Ex-council property, social housing origin, any era" },
  { value: "other", description: "Other - doesn't fit above categories" },
];

/**
 * Build the user message for the classifier
 */
export function buildClassifierUserMessage(listing: ParsedListing): string {
  const archetypeList = ARCHETYPE_OPTIONS.map(
    (a) => `- ${a.value}: ${a.description}`
  ).join("\n");

  return `Analyse this UK property listing and classify it.

## Property Details

**Address:** ${listing.address}
**Postcode:** ${listing.postcode ?? "Unknown"}
**Asking Price:** ${listing.priceDisplay}
**Property Type (from listing):** ${listing.propertyType}
**Bedrooms:** ${listing.bedrooms}
**Bathrooms:** ${listing.bathrooms}
**Tenure:** ${listing.tenure ?? "Unknown"}
**Added/Reduced:** ${listing.addedOrReduced ?? "Unknown"}
**Agent:** ${listing.agent}

## Description

${listing.description}

## Images

The listing has ${listing.photos.length} photos${listing.floorplans.length > 0 ? ` and ${listing.floorplans.length} floorplan(s)` : ""}.

I'm providing all images in order. For each image, note its index (0-based) for your classification.

## Your Task

1. **Classify the property archetype** from this list:
${archetypeList}

2. **Classify each image** with:
   - What it depicts (front_exterior, rear_exterior, side_exterior, kitchen, living_room, dining_room, bedroom, bathroom, wc, hallway, landing, loft, basement, garage, garden_rear, garden_front, driveway, floorplan, street_view, detail_closeup, unknown)
   - The specific room name if interior (e.g. "master bedroom", "kitchen", null for exteriors)
   - Usefulness for understanding the property: "high" (clear room shot), "medium" (partial view), "low" (blurry, redundant, uninformative)
   - Observations visible in the image (list specific things you can see: damp staining, period cornicing, new kitchen, dated bathroom, etc.)
   - If usefulness is "low", explain why (e.g. "Blurry close-up of boiler control panel")

3. **Provide a summary** (2-3 sentences) giving your overall architectural reading of this property.

## Response Format

Respond with valid JSON matching this structure:

\`\`\`json
{
  "archetype": {
    "label": "60s_70s_bungalow",
    "displayName": "1960s-70s Bungalow",
    "era": "1960-1979",
    "constructionType": "Cavity brick walls, concrete tile roof",
    "typicalCharacteristics": ["Single storey", "Attached garage", "uPVC windows"],
    "confidenceScore": 0.85
  },
  "images": [
    {
      "index": 0,
      "url": "https://...",
      "classification": {
        "depicts": "front_exterior",
        "room": null,
        "usefulness": "high",
        "observations": ["Well-maintained front garden", "Original windows replaced with uPVC", "Typical 1960s proportions"],
        "skipReason": null
      }
    }
  ],
  "summary": "A typical 1960s semi-detached bungalow in reasonable condition..."
}
\`\`\``;
}
