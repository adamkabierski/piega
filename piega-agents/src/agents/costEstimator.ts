/**
 * Cost Estimator Agent
 *
 * Produces a desktop cost appraisal — budget breakdown, value gap,
 * phased costs — for a residential renovation project.
 *
 * Architecture: Single Claude text call (no vision)
 *   CostEstimatorInput → Claude → CostEstimateResult
 *
 * Depends on: Classifier (archetype + architecturalReading) + Design Brief
 * Runs in parallel with: Renovation Visualiser (neither needs the other)
 */

import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createTextModel, validateEnv } from "../utils/llm.js";
import { parseStructuredOutput } from "../utils/parsing.js";
import {
  COST_ESTIMATOR_SYSTEM_PROMPT,
  buildCostEstimatorUserPrompt,
} from "../prompts/costEstimator.js";

import type { CostEstimatorInput, CostEstimateResult } from "../types/agents.js";

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const CostEstimateSchema = z.object({
  budgetBreakdown: z.array(
    z.object({
      category: z.string(),
      low: z.number(),
      high: z.number(),
      percentage: z.number(),
      notes: z.string(),
    }),
  ),
  totalEnvelope: z.object({
    low: z.number(),
    high: z.number(),
  }),
  priceGap: z.object({
    askingPrice: z.number(),
    estimatedPostWorksValue: z.object({
      low: z.number(),
      high: z.number(),
      basis: z.string(),
    }),
    totalInvestment: z.object({
      low: z.number(),
      high: z.number(),
    }),
  }),
  phasedBudget: z.object({
    moveInBasics: z.object({
      low: z.number(),
      high: z.number(),
      description: z.string(),
      timeframe: z.string(),
    }),
    yearOneTwo: z.object({
      low: z.number(),
      high: z.number(),
      description: z.string(),
      timeframe: z.string(),
    }),
    completeVision: z.object({
      low: z.number(),
      high: z.number(),
      description: z.string(),
      timeframe: z.string(),
    }),
  }),
  keyAssumptions: z.array(z.string()),
  confidenceStatement: z.string(),
  costDrivers: z.array(
    z.object({
      factor: z.string(),
      impact: z.string(),
      currentAssumption: z.string(),
    }),
  ),
});

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE NORMALISATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalise LLM output variations before Zod validation.
 */
function normaliseCostEstimate(raw: Record<string, unknown>): Record<string, unknown> {
  const obj = { ...raw };

  // Snake_case aliases for top-level fields
  if (!obj.budgetBreakdown && obj.budget_breakdown) {
    obj.budgetBreakdown = obj.budget_breakdown;
    delete obj.budget_breakdown;
  }
  if (!obj.totalEnvelope && obj.total_envelope) {
    obj.totalEnvelope = obj.total_envelope;
    delete obj.total_envelope;
  }
  if (!obj.priceGap && obj.price_gap) {
    obj.priceGap = obj.price_gap;
    delete obj.price_gap;
  }
  if (!obj.phasedBudget && obj.phased_budget) {
    obj.phasedBudget = obj.phased_budget;
    delete obj.phased_budget;
  }
  if (!obj.keyAssumptions && obj.key_assumptions) {
    obj.keyAssumptions = obj.key_assumptions;
    delete obj.key_assumptions;
  }
  if (!obj.confidenceStatement && obj.confidence_statement) {
    obj.confidenceStatement = obj.confidence_statement;
    delete obj.confidence_statement;
  }
  if (!obj.costDrivers && obj.cost_drivers) {
    obj.costDrivers = obj.cost_drivers;
    delete obj.cost_drivers;
  }

  // Normalise nested priceGap fields
  if (obj.priceGap && typeof obj.priceGap === "object") {
    const pg = { ...(obj.priceGap as Record<string, unknown>) };
    if (!pg.estimatedPostWorksValue && pg.estimated_post_works_value) {
      pg.estimatedPostWorksValue = pg.estimated_post_works_value;
      delete pg.estimated_post_works_value;
    }
    if (!pg.totalInvestment && pg.total_investment) {
      pg.totalInvestment = pg.total_investment;
      delete pg.total_investment;
    }
    if (!pg.askingPrice && pg.asking_price) {
      pg.askingPrice = pg.asking_price;
      delete pg.asking_price;
    }
    obj.priceGap = pg;
  }

  // Normalise nested phasedBudget fields
  if (obj.phasedBudget && typeof obj.phasedBudget === "object") {
    const pb = { ...(obj.phasedBudget as Record<string, unknown>) };
    if (!pb.moveInBasics && pb.move_in_basics) {
      pb.moveInBasics = pb.move_in_basics;
      delete pb.move_in_basics;
    }
    if (!pb.yearOneTwo && pb.year_one_two) {
      pb.yearOneTwo = pb.year_one_two;
      delete pb.year_one_two;
    }
    if (!pb.completeVision && pb.complete_vision) {
      pb.completeVision = pb.complete_vision;
      delete pb.complete_vision;
    }
    obj.phasedBudget = pb;
  }

  // Normalise costDrivers nested fields
  if (Array.isArray(obj.costDrivers)) {
    obj.costDrivers = (obj.costDrivers as Record<string, unknown>[]).map((d) => {
      const driver = { ...d };
      if (!driver.currentAssumption && driver.current_assumption) {
        driver.currentAssumption = driver.current_assumption;
        delete driver.current_assumption;
      }
      return driver;
    });
  }

  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the cost estimator agent.
 *
 * Produces a budget breakdown, value gap analysis, phased costs,
 * and cost driver analysis for a residential renovation project.
 */
export async function runCostEstimator(
  input: CostEstimatorInput,
): Promise<CostEstimateResult> {
  validateEnv();

  console.log(`[cost-estimator] Starting for ${input.address}`);
  console.log(`[cost-estimator] Strategy: ${input.transformationStrategy}`);
  console.log(`[cost-estimator] Asking price: £${input.askingPrice.toLocaleString("en-GB")}`);

  // Build prompts
  const userMessage = buildCostEstimatorUserPrompt(input);

  // Text-only model — higher token budget for detailed breakdown
  const model = createTextModel({ temperature: 0.2, maxTokens: 4096 });

  console.log("[cost-estimator] Sending to Claude...");
  const startTime = Date.now();

  const response = await model.invoke([
    new SystemMessage(COST_ESTIMATOR_SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[cost-estimator] Response received in ${elapsed}s`);

  // Parse response
  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const result = parseStructuredOutput(
    responseText,
    CostEstimateSchema,
    normaliseCostEstimate,
  );

  console.log(
    `[cost-estimator] Total envelope: £${result.totalEnvelope.low.toLocaleString("en-GB")}–£${result.totalEnvelope.high.toLocaleString("en-GB")}`,
  );
  console.log(
    `[cost-estimator] Categories: ${result.budgetBreakdown.length}, ` +
      `Cost drivers: ${result.costDrivers.length}`,
  );

  return result;
}
