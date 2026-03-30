/**
 * Report DB Helpers
 *
 * CRUD operations for the piega_reports table.
 * The `results` JSONB column holds all agent outputs as a flat object:
 *   { classification: {...}, buildingReading: {...}, ... }
 *
 * Each agent merges its key into `results` via a shallow spread.
 */

import { getSupabase } from "./supabase.js";
import type { ParsedListing } from "../types/listing.js";
import type { BuyerPurpose } from "../types/common.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ReportStatus = "pending" | "running" | "complete" | "error";

export interface ReportRow {
  id: string;
  listing_id: string;
  listing: ParsedListing;
  purpose: BuyerPurpose;
  status: ReportStatus;
  results: Record<string, unknown>;
  errors: string[];
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════

export async function createReport(
  listing: ParsedListing,
  purpose: BuyerPurpose = "live_in"
): Promise<ReportRow> {
  const { data, error } = await getSupabase()
    .from("piega_reports")
    .insert({
      listing_id: listing.listingId,
      listing,
      purpose,
      status: "pending" as ReportStatus,
      results: {},
      errors: [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create report: ${error.message}`);
  return data as ReportRow;
}

// ═══════════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════════

export async function getReport(id: string): Promise<ReportRow | null> {
  const { data, error } = await getSupabase()
    .from("piega_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Failed to get report: ${error.message}`);
  }
  return data as ReportRow;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE STATUS
// ═══════════════════════════════════════════════════════════════════════════

export async function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<void> {
  const { error } = await getSupabase()
    .from("piega_reports")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`Failed to update status: ${error.message}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGE AGENT RESULT into `results` JSONB
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge a single agent's output into the report's `results` column.
 *
 * 1. Reads current `results`
 * 2. Spreads in the new key
 * 3. Writes back
 *
 * This is safe because each agent writes a unique key and the server
 * processes one report at a time.
 */
export async function mergeAgentResult(
  reportId: string,
  agentKey: string,
  result: unknown
): Promise<void> {
  const db = getSupabase();

  // Read current results
  const { data: current, error: readErr } = await db
    .from("piega_reports")
    .select("results")
    .eq("id", reportId)
    .single();

  if (readErr) throw new Error(`Failed to read results: ${readErr.message}`);

  const merged = {
    ...((current?.results as Record<string, unknown>) ?? {}),
    [agentKey]: result,
  };

  // Write back
  const { error: writeErr } = await db
    .from("piega_reports")
    .update({ results: merged })
    .eq("id", reportId);

  if (writeErr) throw new Error(`Failed to merge result: ${writeErr.message}`);

  console.log(`[db] Merged "${agentKey}" into report ${reportId}`);
}

/**
 * Deep-merge a single agent's cost into results.pipeline_costs.
 *
 * Unlike mergeAgentResult (which does a flat top-level spread),
 * this preserves costs already written by other agents.
 */
export async function mergePipelineCost(
  reportId: string,
  agentName: string,
  cost: unknown
): Promise<void> {
  const db = getSupabase();

  const { data: current, error: readErr } = await db
    .from("piega_reports")
    .select("results")
    .eq("id", reportId)
    .single();

  if (readErr) throw new Error(`Failed to read results: ${readErr.message}`);

  const results = (current?.results as Record<string, unknown>) ?? {};
  const existingCosts = (results.pipeline_costs as Record<string, unknown>) ?? {};

  const merged = {
    ...results,
    pipeline_costs: {
      ...existingCosts,
      [agentName]: cost,
    },
  };

  const { error: writeErr } = await db
    .from("piega_reports")
    .update({ results: merged })
    .eq("id", reportId);

  if (writeErr) throw new Error(`Failed to merge pipeline cost: ${writeErr.message}`);

  console.log(`[db] Merged pipeline cost "${agentName}" into report ${reportId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// APPEND ERROR
// ═══════════════════════════════════════════════════════════════════════════

export async function appendReportError(
  reportId: string,
  errorMsg: string
): Promise<void> {
  const db = getSupabase();

  const { data: current, error: readErr } = await db
    .from("piega_reports")
    .select("errors")
    .eq("id", reportId)
    .single();

  if (readErr) throw new Error(`Failed to read errors: ${readErr.message}`);

  const errors = [...((current?.errors as string[]) ?? []), errorMsg];

  const { error: writeErr } = await db
    .from("piega_reports")
    .update({ errors })
    .eq("id", reportId);

  if (writeErr) throw new Error(`Failed to append error: ${writeErr.message}`);
}
