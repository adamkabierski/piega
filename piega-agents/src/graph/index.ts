/**
 * LangGraph Pipeline Definition
 *
 * Defines the StateGraph with all 7 agents:
 * 1. Classifier (parallel tier 1)
 * 2. Building Reader (parallel tier 1)
 * 3. Area Analyst (parallel tier 1)
 * 4. Renovation Architect (tier 2, depends on 1+2)
 * 5. Cost Estimator (parallel tier 3)
 * 6. Media Generator (parallel tier 3)
 * 7. Narrative Writer (final tier)
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

  // Write to Supabase
  if (state.reportId && result.classification) {
    await mergeAgentResult(state.reportId, "classification", result.classification).catch(console.error);
  }

  return {
    classification: result.classification,
    currentStep: "classifier_done",
  };
}

/**
 * Building Reader Node (STUB)
 * TODO: Implement building condition assessment
 */
async function buildingReaderNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running building reader node (stub)...");

  // Stub: return null for now
  return {
    buildingReading: null,
    currentStep: "buildingReader_done",
  };
}

/**
 * Area Analyst Node (STUB)
 * TODO: Implement area analysis from enriched data
 */
async function areaAnalystNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running area analyst node (stub)...");

  // Stub: return null for now
  return {
    areaAnalysis: null,
    currentStep: "areaAnalyst_done",
  };
}

/**
 * Renovation Architect Node (STUB)
 * TODO: Implement renovation planning based on classifier + building reader
 */
async function renovationArchitectNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running renovation architect node (stub)...");

  // Stub: return null for now
  return {
    renovationPlan: null,
    currentStep: "renovationArchitect_done",
  };
}

/**
 * Cost Estimator Node (STUB)
 * TODO: Implement cost estimation based on renovation plan
 */
async function costEstimatorNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running cost estimator node (stub)...");

  // Stub: return null for now
  return {
    costEstimate: null,
    currentStep: "costEstimator_done",
  };
}

/**
 * Media Generator Node (STUB)
 * TODO: Implement hero image selection and media organization
 */
async function mediaGeneratorNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running media generator node (stub)...");

  // Stub: return null for now
  return {
    media: null,
    currentStep: "mediaGenerator_done",
  };
}

/**
 * Narrative Writer Node (STUB)
 * TODO: Implement narrative generation combining all agent outputs
 */
async function narrativeWriterNode(state: ReportStateType): Promise<Partial<ReportStateType>> {
  console.log("[graph] Running narrative writer node (stub)...");

  // Mark report complete in Supabase
  if (state.reportId) {
    await updateReportStatus(state.reportId, "complete").catch(console.error);
  }

  // Stub: return null for now
  return {
    narrative: null,
    currentStep: "narrativeWriter_done",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the report generation graph
 *
 * Topology:
 *
 *         START
 *           │
 *     ┌─────┼─────┐
 *     ▼     ▼     ▼
 *  Classifier  BuildingReader  AreaAnalyst   (Tier 1 - parallel)
 *     │     │     │
 *     └─────┼─────┘
 *           ▼
 *    RenovationArchitect                      (Tier 2 - sequential)
 *           │
 *     ┌─────┴─────┐
 *     ▼           ▼
 *  CostEstimator  MediaGenerator              (Tier 3 - parallel)
 *     │           │
 *     └─────┬─────┘
 *           ▼
 *    NarrativeWriter                          (Final tier)
 *           │
 *           ▼
 *          END
 */
export function buildReportGraph() {
  const graph = new StateGraph(ReportState)
    // Add all nodes
    .addNode("classifier", classifierNode)
    .addNode("buildingReader", buildingReaderNode)
    .addNode("areaAnalyst", areaAnalystNode)
    .addNode("renovationArchitect", renovationArchitectNode)
    .addNode("costEstimator", costEstimatorNode)
    .addNode("mediaGenerator", mediaGeneratorNode)
    .addNode("narrativeWriter", narrativeWriterNode)

    // Tier 1: START -> parallel agents
    .addEdge(START, "classifier")
    .addEdge(START, "buildingReader")
    .addEdge(START, "areaAnalyst")

    // Tier 1 -> Tier 2: All tier 1 agents must complete before renovation architect
    .addEdge("classifier", "renovationArchitect")
    .addEdge("buildingReader", "renovationArchitect")
    .addEdge("areaAnalyst", "renovationArchitect")

    // Tier 2 -> Tier 3: Renovation architect -> parallel cost + media
    .addEdge("renovationArchitect", "costEstimator")
    .addEdge("renovationArchitect", "mediaGenerator")

    // Tier 3 -> Final: Both tier 3 agents must complete before narrative writer
    .addEdge("costEstimator", "narrativeWriter")
    .addEdge("mediaGenerator", "narrativeWriter")

    // Final -> END
    .addEdge("narrativeWriter", END);

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
