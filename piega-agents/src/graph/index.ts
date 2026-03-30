/**
 * LangGraph Pipeline Definition
 *
 * Phase 1: Classifier only
 *   START → Classifier → END
 *
 * The classifier determines property archetype and classifies all images.
 * Results are written to Supabase progressively.
 */

import { StateGraph, START, END } from "@langchain/langgraph";

import { ReportState, type ReportStateType } from "./state.js";
import { runClassifier, runArchitecturalReading } from "../agents/classifier.js";
import { mergeAgentResult, updateReportStatus, appendReportError, mergePipelineCost } from "../db/index.js";
import { sumCosts } from "../utils/costTracker.js";

// ═══════════════════════════════════════════════════════════════════════════
// NODE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classifier Node
 * Runs the classifier agent to determine property archetype and classify images
 */
async function classifierNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running classifier node...");

  if (!state.listing) {
    const err = "Classifier: No listing provided";
    if (state.reportId) await appendReportError(state.reportId, err).catch(console.error);
    return { errors: [err], currentStep: "classifier_error" };
  }

  const result = await runClassifier({ listing: state.listing });

  if (result.error) {
    if (state.reportId) await appendReportError(state.reportId, result.error).catch(console.error);
    return { errors: [result.error], currentStep: "classifier_error" };
  }

  // Write classification to Supabase immediately (before architectural reading)
  if (state.reportId && result.classification) {
    await mergeAgentResult(state.reportId, "classification", result.classification).catch(console.error);
    if (result.cost) {
      await mergePipelineCost(state.reportId, "classifier", result.cost).catch(console.error);
    }
  }

  return {
    classification: result.classification,
    currentStep: "classifier_done",
  };
}

/**
 * Architectural Reading Node
 * Second vision call — deep professional reading of the building.
 * Runs after classifier, attaches result to classification.architecturalReading.
 */
async function architecturalReadingNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running architectural reading node...");

  if (!state.classification || !state.listing) {
    console.warn("[graph] Skipping architectural reading — no classification or listing");
    // Not an error — mark complete anyway
    if (state.reportId) {
      await updateReportStatus(state.reportId, "complete").catch(console.error);
    }
    return { currentStep: "architectural_reading_skipped" };
  }

  const result = await runArchitecturalReading({
    listing: state.listing,
    classification: state.classification,
  });

  // Attach to existing classification
  const enrichedClassification = {
    ...state.classification,
    architecturalReading: result.architecturalReading ?? undefined,
  };

  // Write enriched classification to Supabase
  if (state.reportId) {
    await mergeAgentResult(state.reportId, "classification", enrichedClassification).catch(console.error);
    if (result.cost) {
      await mergePipelineCost(state.reportId, "architectural_reading", result.cost).catch(console.error);
    }
    await updateReportStatus(state.reportId, "complete").catch(console.error);
  }

  if (result.error) {
    console.warn(`[graph] Architectural reading had error (non-fatal): ${result.error}`);
  }

  return {
    classification: enrichedClassification,
    currentStep: "architectural_reading_done",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the report generation graph
 *
 * Phase 1: Classifier → Architectural Reading
 *   START → Classifier → Architectural Reading → END
 *
 * Future phases will add area analyst, renovation planner etc.
 */
export function buildReportGraph() {
  const graph = new StateGraph(ReportState)
    .addNode("classifier", classifierNode)
    .addNode("architectural_reading", architecturalReadingNode)
    .addEdge(START, "classifier")
    .addEdge("classifier", "architectural_reading")
    .addEdge("architectural_reading", END);

  return graph.compile();
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the full report generation pipeline
 */
export async function generateReport(input: {
  listing: ReportStateType["listing"];
  enrichedArea?: ReportStateType["enrichedArea"];
  purpose?: ReportStateType["purpose"];
  reportId?: string;
}): Promise<ReportStateType> {
  const graph = buildReportGraph();

  // Mark running in Supabase
  if (input.reportId) {
    await updateReportStatus(input.reportId, "running").catch(console.error);
  }

  const result = await graph.invoke({
    listing: input.listing,
    enrichedArea: input.enrichedArea ?? null,
    purpose: input.purpose ?? "live_in",
    reportId: input.reportId ?? null,
  });

  return result;
}
