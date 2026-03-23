/**
 * Agent output types — all agent result interfaces
 */

import type {
  ImageSubject,
  ConditionRating,
  ConfidenceLevel,
  PriorityLevel,
  UsefulnessLevel,
  PropertyArchetype,
} from "./common.js";

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════

export interface ClassificationResult {
  archetype: {
    label: PropertyArchetype;
    displayName: string;
    era: string;
    constructionType: string; // e.g. "Solid brick, slate roof"
    typicalCharacteristics: string[]; // e.g. ["Bay windows", "High ceilings"]
    confidenceScore: number; // 0-1
  };
  images: Array<{
    index: number; // position in listing.photos array
    url: string;
    classification: ImageClassification;
  }>;
  summary: string; // 2-3 sentence architectural reading
}

export interface ImageClassification {
  depicts: ImageSubject;
  room: string | null; // e.g. "kitchen", "master bedroom", null for exteriors
  usefulness: UsefulnessLevel; // for understanding space and condition
  observations: string[]; // e.g. ["Visible damp on ceiling", "Original cornicing"]
  skipReason: string | null; // if usefulness is "low", why
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILDING READER
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildingReadingResult {
  condition: {
    overall: ConditionRating;
    confidence: number;
  };
  rooms: Array<{
    name: string;
    observations: string[];
    condition: ConditionRating;
    periodFeatures: string[]; // e.g. ["Cornicing", "Picture rail", "Fireplace"]
    issues: string[]; // e.g. ["Damp staining visible", "Dated electrics"]
  }>;
  structure: {
    walls: string;
    roof: string;
    windows: string;
    heating: string;
    electrics: string;
    plumbing: string;
  };
  conditionMatrix: Array<{
    element: string;
    status: ConditionRating;
    confidence: ConfidenceLevel; // ● ◐ ○
    notes: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// AREA ANALYST
// ═══════════════════════════════════════════════════════════════════════════

export interface AreaAnalysisResult {
  narrative: string; // editorial paragraph about the location
  highlights: string[]; // key selling points of the area
  risks: string[]; // concerns
  contextMapData: {
    landmarks: Array<{
      name: string;
      type: string;
      distance: string;
      bearing: string;
    }>;
    characterDescription: string;
    conservationArea: boolean | null;
  };
  areaIntelligenceCard: {
    deprivation: { score: number; interpretation: string } | null;
    flood: { zone: number; interpretation: string } | null;
    crime: { level: string; interpretation: string } | null;
    schools: { summary: string } | null;
    transport: { summary: string } | null;
    broadband: { summary: string } | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RENOVATION ARCHITECT
// ═══════════════════════════════════════════════════════════════════════════

export interface RenovationPlanResult {
  approach: string; // overall renovation strategy narrative
  rooms: Array<{
    name: string;
    currentState: string;
    proposedChanges: string[];
    estimatedCostRange: { low: number; high: number };
    priority: PriorityLevel;
  }>;
  structuralChanges: Array<{
    description: string;
    rationale: string;
    estimatedCost: { low: number; high: number };
    requiresPermission: boolean;
  }>;
  materialPalette: Array<{
    item: string; // e.g. "Flooring"
    suggestion: string; // e.g. "Engineered oak, herringbone pattern"
    reasoning: string;
  }>;
  phases: Array<{
    number: number;
    name: string; // e.g. "Strip out and structure"
    duration: string; // e.g. "4-6 weeks"
    description: string;
    keyDecisions: string[];
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COST ESTIMATOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CostEstimateResult {
  budgetBreakdown: Array<{
    category: string; // "Structural", "M&E", "Finishes", "Contingency", "Fees"
    low: number;
    high: number;
    percentage: number; // of total
  }>;
  totalEnvelope: { low: number; high: number };
  priceGap: {
    askingPrice: number;
    estimatedPostWorksValue: { low: number; high: number };
    refurbCost: { low: number; high: number };
    // Purpose-specific:
    netMargin?: { low: number; high: number }; // for flip
    grossYield?: { low: number; high: number }; // for rent_out
    equityGain?: { low: number; high: number }; // for live_in
  };
  phasedBudget: {
    moveInBasics: { low: number; high: number; description: string };
    yearOneTwo: { low: number; high: number; description: string };
    completeVision: { low: number; high: number; description: string };
  };
  scenarios: {
    best: { description: string; totalCost: number; outcome: string };
    worst: { description: string; totalCost: number; outcome: string };
  };
  confidenceNotes: string; // honest disclaimer about estimate reliability
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export interface MediaResult {
  heroImage: { url: string; description: string } | null;
  beforeAfterImages: Array<{
    room: string;
    beforeUrl: string;
    afterUrl: string; // AI-generated
    description: string;
  }>;
  floorplanSvg: string | null; // redrawn clean SVG
  contextMapSvg: string | null;
  budgetBarSvg: string | null;
  priceGapSvg: string | null;
  phaseTimelineSvg: string | null;
  conditionMatrixSvg: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// NARRATIVE WRITER
// ═══════════════════════════════════════════════════════════════════════════

export interface NarrativeResult {
  openingVerse: string;
  placeNarrative: string;
  buildingNarrative: string;
  honestVerse: string;
  reckoningNarrative: string;
  finalVerse: string;
}
