/**
 * LangGraph State Definition
 *
 * Defines the ReportState that flows through the agent pipeline.
 * Uses LangGraph Annotation channels for proper state management.
 */

import { Annotation } from "@langchain/langgraph";

import type { ParsedListing, EnrichedAreaData } from "../types/listing.js";
import type { BuyerPurpose } from "../types/common.js";
import type {
  ClassificationResult,
  BuildingReadingResult,
  AreaAnalysisResult,
  RenovationPlanResult,
  CostEstimateResult,
  MediaResult,
  NarrativeResult,
} from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// STATE ANNOTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The main state that flows through the report generation graph.
 *
 * Channels:
 * - Input channels: listing, enrichedArea, purpose
 * - Agent output channels: classification, buildingReading, etc.
 * - Control channels: errors, currentStep
 */
export const ReportState = Annotation.Root({
  // ─────────────────────────────────────────────────────────────────────────
  // INPUT CHANNELS (populated before graph execution)
  // ─────────────────────────────────────────────────────────────────────────

  /** The parsed listing from the Chrome extension */
  listing: Annotation<ParsedListing | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  /** Enriched area data from backend APIs (IMD, flood, crime, etc.) */
  enrichedArea: Annotation<EnrichedAreaData | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  /** User's intended purpose for the property */
  purpose: Annotation<BuyerPurpose>({
    reducer: (_, newVal) => newVal,
    default: () => "live_in" as BuyerPurpose,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 1 AGENT OUTPUTS (run in parallel)
  // ─────────────────────────────────────────────────────────────────────────

  /** Output from Classifier agent (archetype + image classifications) */
  classification: Annotation<ClassificationResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  /** Output from Building Reader agent (condition assessment) */
  buildingReading: Annotation<BuildingReadingResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  /** Output from Area Analyst agent (location assessment) */
  areaAnalysis: Annotation<AreaAnalysisResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 2 AGENT OUTPUTS (depend on Tier 1)
  // ─────────────────────────────────────────────────────────────────────────

  /** Output from Renovation Architect agent (improvement recommendations) */
  renovationPlan: Annotation<RenovationPlanResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 3 AGENT OUTPUTS (run in parallel, depend on Tier 2)
  // ─────────────────────────────────────────────────────────────────────────

  /** Output from Cost Estimator agent */
  costEstimate: Annotation<CostEstimateResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  /** Output from Media Generator agent */
  media: Annotation<MediaResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL TIER AGENT OUTPUT
  // ─────────────────────────────────────────────────────────────────────────

  /** Output from Narrative Writer agent (final report) */
  narrative: Annotation<NarrativeResult | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // CONTROL CHANNELS
  // ─────────────────────────────────────────────────────────────────────────

  /** Accumulated errors from any agent */
  errors: Annotation<string[]>({
    reducer: (existing, newErrors) => [...existing, ...newErrors],
    default: () => [],
  }),

  /** Current step name for logging/observability */
  currentStep: Annotation<string>({
    reducer: (_, newVal) => newVal,
    default: () => "init",
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

/** The full state type, inferred from the Annotation */
export type ReportStateType = typeof ReportState.State;

/** Input type when invoking the graph */
export type ReportInput = Pick<ReportStateType, "listing" | "enrichedArea" | "purpose">;

/** Output type from the graph (all channels populated) */
export type ReportOutput = ReportStateType;
