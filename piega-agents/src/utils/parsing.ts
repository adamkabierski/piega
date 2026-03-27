/**
 * Parsing utilities for structured LLM outputs
 */

import { z, ZodSchema } from "zod";

/**
 * Extract JSON from a string that may contain markdown code blocks
 */
export function extractJson(text: string): string {
  // Try to extract from markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object/array directly
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Return as-is and let JSON.parse fail with a clear error
  return text.trim();
}

/**
 * Parse LLM output as JSON and validate against a Zod schema.
 * An optional `normalise` function can pre-process the parsed object
 * before validation — useful for handling LLM output variations
 * (snake_case keys, comma-separated strings instead of arrays, etc.).
 */
export function parseStructuredOutput<T>(
  text: string,
  schema: ZodSchema<T>,
  normalise?: (raw: Record<string, unknown>) => Record<string, unknown>,
): T {
  const jsonStr = extractJson(text);
  let parsed = JSON.parse(jsonStr);
  if (normalise && typeof parsed === "object" && parsed !== null) {
    parsed = normalise(parsed);
  }
  return schema.parse(parsed);
}

/**
 * Safely parse LLM output, returning null on failure
 */
export function safeParseStructuredOutput<T>(
  text: string,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: Error } {
  try {
    const data = parseStructuredOutput(text, schema);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
