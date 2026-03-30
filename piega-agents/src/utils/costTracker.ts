/**
 * Cost Tracker — extracts token usage from LangChain responses
 * and computes exact USD cost using current API pricing.
 *
 * Pricing verified March 30, 2026:
 *   Anthropic Claude Sonnet 4:  $3 / MTok input, $15 / MTok output
 *   fal.ai Nano Banana Pro:     $0.15 / image
 *   fal.ai Nano Banana 2:       $0.08 / image
 */

import type { AIMessage } from "@langchain/core/messages";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentCost {
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD
  model: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICING — verified against live docs March 30, 2026
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Per-million-token rates for Anthropic models.
 * Source: https://platform.claude.com/docs/en/docs/about-claude/models
 */
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-sonnet-4-6":        { input: 3, output: 15 },
  "claude-opus-4-6":          { input: 5, output: 25 },
  "claude-haiku-4-5":         { input: 1, output: 5  },
  // Fallback — use Sonnet 4 rates
  default:                    { input: 3, output: 15 },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract token usage and compute cost from a LangChain AIMessage response.
 *
 * LangChain's ChatAnthropic populates `usage_metadata` with:
 *   { input_tokens, output_tokens, total_tokens }
 *
 * For vision calls, image tokens are already included in input_tokens
 * by the Anthropic API — no special handling needed.
 */
export function extractCost(response: AIMessage, model: string): AgentCost {
  const meta = response.usage_metadata;
  const inputTokens = meta?.input_tokens ?? 0;
  const outputTokens = meta?.output_tokens ?? 0;

  const rates = ANTHROPIC_PRICING[model] ?? ANTHROPIC_PRICING.default;
  const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;

  return { inputTokens, outputTokens, cost, model };
}

/**
 * Sum multiple AgentCost objects into one (for multi-call agents).
 */
export function sumCosts(costs: AgentCost[]): AgentCost {
  if (costs.length === 0) {
    return { inputTokens: 0, outputTokens: 0, cost: 0, model: "" };
  }
  return {
    inputTokens: costs.reduce((s, c) => s + c.inputTokens, 0),
    outputTokens: costs.reduce((s, c) => s + c.outputTokens, 0),
    cost: costs.reduce((s, c) => s + c.cost, 0),
    model: costs[0].model,
  };
}
