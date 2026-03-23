/**
 * Anthropic LLM client setup and model configurations
 */

import { ChatAnthropic } from "@langchain/anthropic";

// Model identifiers
export const MODELS = {
  // Vision-capable model for image analysis (classifier, building reader)
  vision: process.env.CLASSIFIER_MODEL ?? "claude-sonnet-4-20250514",
  // Default model for text-only agents
  default: process.env.DEFAULT_MODEL ?? "claude-sonnet-4-20250514",
} as const;

/**
 * Create an Anthropic chat model with vision capabilities
 * Used by: Classifier, Building Reader
 */
export function createVisionModel(options?: { temperature?: number; maxTokens?: number }) {
  return new ChatAnthropic({
    model: MODELS.vision,
    temperature: options?.temperature ?? 0.2,
    maxTokens: options?.maxTokens ?? 4096,
    // API key from env
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Create an Anthropic chat model for text-only agents
 * Used by: Area Analyst, Renovation Architect, Cost Estimator, Narrative Writer
 */
export function createTextModel(options?: { temperature?: number; maxTokens?: number }) {
  return new ChatAnthropic({
    model: MODELS.default,
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 4096,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Check that required environment variables are set
 */
export function validateEnv(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
}
