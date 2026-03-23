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
import { runClassifier } from "../agents/classifier.js";
import { mergeAgentResult, updateReportStatus, appendReportError } from "../db/index.js";

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

  // Write to Supabase + mark complete
  if (state.reportId && result.classification) {
    await mergeAgentResult(state.reportId, "classification", result.classification).catch(console.error);
    await updateReportStatus(state.reportId, "complete").catch(console.error);
  }

  return {
    classification: result.classification,
    currentStep: "classifier_done",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the report generation graph
 *
 * Phase 1 (current): Classifier only
 *   START → Classifier → END
 *
 * Future phases will add building reader, area analyst, renovation planner etc.
 */
export function buildReportGraph() {
  const graph = new StateGraph(ReportState)
    .addNode("classifier", classifierNode)
    .addEdge(START, "classifier")
    .addEdge("classifier", END);

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
