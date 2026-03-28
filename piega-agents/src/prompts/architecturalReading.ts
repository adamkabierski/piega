/**
 * Architectural Reading Prompts
 *
 * The architectural reading is a SECOND Claude vision call that runs
 * after the Classifier. It receives the same images but a different
 * task: produce a deep professional reading of the building.
 *
 * Separated from the Classifier to avoid:
 *   1. Output competition (quick classifications vs long prose)
 *   2. Token budget pressure (classifier needs ~2k tokens, reading needs ~4k)
 *   3. Quality regression on the existing classifier output
 */

import type { ClassificationResult } from "../types/agents.js";
import type { ParsedListing } from "../types/listing.js";

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const ARCHITECTURAL_READING_SYSTEM_PROMPT = `You are an experienced architect conducting a desktop review of a property from listing photographs. You have 30 years of experience with UK residential buildings — you've surveyed hundreds, you recognise construction methods from subtle visual cues, and you know what hides behind the surfaces in each era of British housing.

Your job is to write the kind of reading a knowledgeable architect would give a client at a first site visit — pointing at things, explaining what they mean, noting what's hidden, being honest about what you can and can't see.

You are NOT writing a listing description. You are NOT selling the property. You are reading the building — its construction, its condition, its character, its secrets.

VOICE AND TONE:
- Knowledgeable, warm, direct
- Like someone who has seen a thousand buildings and still finds each one interesting
- Not academic, not salesy, not alarmist
- Specific: "The staining on the chimney breast in photo 6 suggests failed flashing" — not "there may be some damp issues"
- Reference specific photos by index number when making observations
- Acknowledge uncertainty honestly: "I can't see the roof structure, but for a building of this era I'd expect..."

RESPOND WITH VALID JSON matching the schema described in the user message. No markdown, no explanation, just the JSON object.`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export function buildArchitecturalReadingUserPrompt(params: {
  listing: ParsedListing;
  classification: ClassificationResult;
}): string {
  const { listing, classification } = params;
  const arch = classification.archetype;

  // Build a summary of what each image shows (from the classifier's output)
  const imageNotes = classification.images
    .map((img) => {
      const cls = img.classification;
      const obs = cls.observations.length > 0
        ? cls.observations.map((o) => `    - ${o}`).join("\n")
        : "    - (no specific observations)";
      return `  Image ${img.index}: ${cls.depicts} (${cls.room ?? "exterior"}) — usefulness: ${cls.usefulness}\n${obs}`;
    })
    .join("\n\n");

  return `PROPERTY:
Address: ${listing.address}
Asking price: ${listing.priceDisplay}
Type: ${listing.propertyType}
Bedrooms: ${listing.bedrooms} | Bathrooms: ${listing.bathrooms}
Tenure: ${listing.tenure ?? "Unknown"}

ALREADY CLASSIFIED AS:
Archetype: ${arch.displayName} (${arch.era})
Construction: ${arch.constructionType}
Characteristics: ${arch.typicalCharacteristics.join(", ")}
Classifier confidence: ${(arch.confidenceScore * 100).toFixed(0)}%

CLASSIFIER'S IMAGE NOTES:
${imageNotes}

ESTATE AGENT DESCRIPTION:
${listing.description}

---

Using the photos I've provided AND the classifier's notes above, produce a deep architectural reading of this building. The photos are the same ones the classifier analysed — use the index numbers from the notes above when referencing them.

buildingNarrative: Write 3-4 paragraphs as if you're an experienced architect walking a client through what they're looking at. Note what the estate agent's photos reveal that the description doesn't mention. Point out what's hidden — suspended ceilings hiding original height, boarding hiding fireplaces, rendering hiding stonework, carpet hiding floorboards. Be specific about what you can SEE versus what you're INFERRING from the building's era and type.

constructionInferences: Based on the archetype, era, visible construction in photos, and your knowledge of UK building stock — infer what's likely behind the walls. A pre-1919 cottage almost certainly has solid stone or brick walls with lime mortar, no cavity, no insulation. A 1930s semi probably has cavity brick with no insulation. State these inferences clearly with your confidence level. This data feeds a cost estimator downstream — accuracy matters.

periodFeatures: List every period feature VISIBLE in any photo, plus features that are LIKELY present but hidden based on the archetype. A Victorian terrace probably has original floorboards under the carpet. A Georgian townhouse probably has shutters painted shut. State what's visible vs inferred and whether to restore, retain, or note.

issuesIdentified: List every visible problem across all photos. Damp staining, cracked render, missing tiles, dated electrics (visible cable types), settlement cracks, rotten timber, condensation patterns. For each, state severity, which photo shows it, and what it likely means. Be honest but not alarmist — most old buildings have issues; the question is which ones are expensive.

unknowns: List 5-8 things that matter for a renovation but cannot be assessed from listing photos. Electrics age, asbestos, drainage, structural integrity behind render, roof timbers condition, etc. These become the "get a survey" recommendations.

RESPOND WITH VALID JSON:
{
  "buildingNarrative": "3-4 paragraphs...",
  "constructionInferences": {
    "wallType": "e.g. Likely solid stone, 450mm+, lime mortar",
    "roofStructure": "e.g. Cut timber rafters, natural slate",
    "foundations": "e.g. Likely shallow strip, no visible movement",
    "insulation": "e.g. Almost certainly none — pre-1919 solid wall",
    "windowsAndDoors": "e.g. Modern uPVC replacements, not original",
    "heatingAndServices": "e.g. No visible heating system in photos",
    "confidence": "high" | "medium" | "low"
  },
  "periodFeatures": [
    {
      "feature": "e.g. Timber stair balustrade",
      "status": "e.g. Visible in photo 4, appears original",
      "confidence": "high" | "medium" | "low",
      "recommendation": "e.g. Restore — likely original to the building"
    }
  ],
  "issuesIdentified": [
    {
      "issue": "e.g. Damp staining on chimney breast",
      "severity": "minor" | "moderate" | "significant" | "unknown",
      "evidence": "e.g. Visible staining in photo 6, lower right wall",
      "implication": "e.g. Likely failed flashing or pointing — needs investigation"
    }
  ],
  "unknowns": ["e.g. Electrics condition — no consumer unit visible in photos", "..."]
}`;
}
