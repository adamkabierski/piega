/**
 * Shared types and enums used across agents
 */

export type BuyerPurpose = "live_in" | "rent_out" | "flip";

export type ImageSubject =
  | "front_exterior"
  | "rear_exterior"
  | "side_exterior"
  | "kitchen"
  | "living_room"
  | "dining_room"
  | "bedroom"
  | "bathroom"
  | "wc"
  | "hallway"
  | "landing"
  | "loft"
  | "basement"
  | "garage"
  | "garden_rear"
  | "garden_front"
  | "driveway"
  | "floorplan"
  | "street_view"
  | "detail_closeup" // radiator, boiler, fixture etc.
  | "unknown";

export type ConditionRating = "good" | "fair" | "poor" | "very_poor" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";
export type PriorityLevel = "essential" | "recommended" | "aspirational";
export type UsefulnessLevel = "high" | "medium" | "low";

/**
 * Property archetypes — the set of categories for UK housing stock
 */
export type PropertyArchetype =
  | "victorian_terrace" // 1837-1901, terraced house
  | "victorian_semi" // 1837-1901, semi-detached
  | "edwardian_terrace" // 1901-1914, terraced
  | "edwardian_semi" // 1901-1914, semi-detached
  | "georgian_townhouse" // 1714-1837, townhouse
  | "interwar_semi" // 1918-1939, semi-detached (often "1930s semi")
  | "interwar_terrace" // 1918-1939, terraced
  | "postwar_semi" // 1945-1970, semi-detached
  | "postwar_terrace" // 1945-1970, terraced
  | "60s_70s_detached" // 1960-1979, detached house
  | "60s_70s_bungalow" // 1960-1979, bungalow
  | "80s_90s_estate" // 1980-1999, estate-built house
  | "new_build" // 2000+, any type
  | "period_cottage" // pre-1900, cottage (rural)
  | "converted_building" // former chapel, barn, warehouse, etc.
  | "purpose_built_flat" // any era, flat/apartment
  | "council_ex_council" // social housing origin, any era
  | "other"; // doesn't fit above categories

export const ARCHETYPE_LABELS: Record<PropertyArchetype, { displayName: string; era: string }> = {
  victorian_terrace: { displayName: "Victorian Terrace", era: "1837-1901" },
  victorian_semi: { displayName: "Victorian Semi-Detached", era: "1837-1901" },
  edwardian_terrace: { displayName: "Edwardian Terrace", era: "1901-1914" },
  edwardian_semi: { displayName: "Edwardian Semi-Detached", era: "1901-1914" },
  georgian_townhouse: { displayName: "Georgian Townhouse", era: "1714-1837" },
  interwar_semi: { displayName: "Interwar Semi-Detached", era: "1918-1939" },
  interwar_terrace: { displayName: "Interwar Terrace", era: "1918-1939" },
  postwar_semi: { displayName: "Post-War Semi-Detached", era: "1945-1970" },
  postwar_terrace: { displayName: "Post-War Terrace", era: "1945-1970" },
  "60s_70s_detached": { displayName: "1960s-70s Detached", era: "1960-1979" },
  "60s_70s_bungalow": { displayName: "1960s-70s Bungalow", era: "1960-1979" },
  "80s_90s_estate": { displayName: "1980s-90s Estate", era: "1980-1999" },
  new_build: { displayName: "New Build", era: "2000+" },
  period_cottage: { displayName: "Period Cottage", era: "Pre-1900" },
  converted_building: { displayName: "Converted Building", era: "Various" },
  purpose_built_flat: { displayName: "Purpose-Built Flat", era: "Various" },
  council_ex_council: { displayName: "Ex-Council", era: "Various" },
  other: { displayName: "Other", era: "Unknown" },
};
