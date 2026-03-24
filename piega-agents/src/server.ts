/**
 * piega-agents Express Server
 *
 * Endpoints:
 *   POST /reports          — Create a report and kick off the agent pipeline
 *   GET  /reports/:id      — Get a report by ID (polling fallback)
 *   GET  /health           — Health check
 *
 * The pipeline writes results progressively to Supabase.
 * Clients subscribe to Supabase Realtime for live updates.
 */

import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";

import { createReport, getReport, updateReportStatus, mergeAgentResult } from "./db/index.js";
import { generateReport } from "./graph/index.js";
import { runRenovationVisualiser } from "./agents/renovationVisualiser.js";
import type { ParsedListing } from "./types/listing.js";
import type { BuyerPurpose } from "./types/common.js";
import type { ClassificationResult } from "./types/agents.js";

const app: Express = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors({ origin: true })); // Allow all origins for MVP
app.use(express.json({ limit: "2mb" })); // Listing JSON can be big

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /reports — Create report and start pipeline
// ═══════════════════════════════════════════════════════════════════════════

app.post("/reports", async (req, res) => {
  try {
    const { listing, purpose } = req.body as {
      listing: ParsedListing;
      purpose?: BuyerPurpose;
    };

    if (!listing || !listing.listingId) {
      res.status(400).json({ error: "listing with listingId is required" });
      return;
    }

    console.log(`[server] Creating report for listing ${listing.listingId}`);

    // 1. Insert into Supabase
    const report = await createReport(listing, purpose ?? "live_in");
    console.log(`[server] Report created: ${report.id}`);

    // 2. Return immediately with the report ID
    res.status(201).json({
      id: report.id,
      status: report.status,
      created_at: report.created_at,
    });

    // 3. Run pipeline in the background (don't await)
    runPipeline(report.id, listing, purpose ?? "live_in").catch((err) => {
      console.error(`[server] Pipeline failed for ${report.id}:`, err);
    });
  } catch (err) {
    console.error("[server] POST /reports error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /reports/:id — Polling fallback
// ═══════════════════════════════════════════════════════════════════════════

app.get("/reports/:id", async (req, res) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(report);
  } catch (err) {
    console.error("[server] GET /reports/:id error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /reports — List reports that have classification results
// ═══════════════════════════════════════════════════════════════════════════

app.get("/reports", async (_req, res) => {
  try {
    const { getSupabase } = await import("./db/supabase.js");
    const { data, error } = await getSupabase()
      .from("piega_reports")
      .select("id, listing_id, listing, purpose, status, results, created_at")
      .eq("status", "complete")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Only include reports that have classification results
    const classified = (data ?? []).filter(
      (r: Record<string, unknown>) =>
        r.results && typeof r.results === "object" && "classification" in (r.results as object)
    );

    res.json(classified);
  } catch (err) {
    console.error("[server] GET /reports error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /reports/:id/visualise — Run renovation visualiser on existing report
// ═══════════════════════════════════════════════════════════════════════════

app.post("/reports/:id/visualise", async (req, res) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    const classification = report.results?.classification as ClassificationResult | undefined;
    if (!classification) {
      res.status(400).json({ error: "Report has no classification results — run classifier first" });
      return;
    }

    // Check if already running
    if ((report.results as Record<string, unknown>)?.renovation_visualisation_status === "running") {
      res.status(409).json({ error: "Visualiser is already running for this report" });
      return;
    }

    console.log(`[server] Starting renovation visualiser for report ${req.params.id}`);

    // Mark as running immediately
    await mergeAgentResult(req.params.id, "renovation_visualisation_status", "running");

    // Return immediately — work happens in background
    res.status(202).json({
      id: req.params.id,
      message: "Visualiser started — poll GET /reports/:id for progress",
    });

    // Run in background
    runVisualiserPipeline(req.params.id, classification).catch((err) => {
      console.error(`[server] Visualiser pipeline failed for ${req.params.id}:`, err);
    });
  } catch (err) {
    console.error("[server] POST /reports/:id/visualise error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function runPipeline(
  reportId: string,
  listing: ParsedListing,
  purpose: BuyerPurpose
): Promise<void> {
  console.log(`[server] Starting pipeline for report ${reportId}`);

  try {
    await generateReport({
      listing,
      purpose,
      reportId, // Enables Supabase writes inside graph nodes
    });

    console.log(`[server] Pipeline complete for report ${reportId}`);
  } catch (err) {
    console.error(`[server] Pipeline error for ${reportId}:`, err);
    await updateReportStatus(reportId, "error").catch(console.error);
  }
}

/**
 * Run the renovation visualiser pipeline for an existing classified report.
 * Writes progressive results to Supabase so the frontend can poll.
 */
async function runVisualiserPipeline(
  reportId: string,
  classification: ClassificationResult
): Promise<void> {
  console.log(`[server] Starting visualiser pipeline for report ${reportId}`);

  try {
    const output = await runRenovationVisualiser(
      classification.images,
      classification.archetype,
      undefined, // use default config
      async (result, remaining) => {
        // Progressive update: merge partial results on each image completion
        console.log(
          `[server] Visualiser progress for ${reportId}: ${result.depicts} done, ${remaining} remaining`
        );
        // We write partial data so the frontend can show images as they arrive
        const partial = await getReport(reportId);
        const existing = (partial?.results as Record<string, unknown>)?.renovation_visualisation as
          | Record<string, unknown>
          | undefined;
        const currentExteriors = (existing?.exteriors as unknown[]) ?? [];
        const currentInteriors = (existing?.interiors as unknown[]) ?? [];
        await mergeAgentResult(reportId, "renovation_visualisation", {
          ...existing,
          exteriors:
            result.type === "exterior"
              ? [...currentExteriors, result]
              : currentExteriors,
          interiors:
            result.type === "interior"
              ? [...currentInteriors, result]
              : currentInteriors,
          remaining,
        });
      }
    );

    // Final write with complete data
    await mergeAgentResult(reportId, "renovation_visualisation", output);
    await mergeAgentResult(reportId, "renovation_visualisation_status", "complete");

    console.log(
      `[server] Visualiser complete for ${reportId}: ${output.exteriors.length + output.interiors.length} images, $${output.totalCost.toFixed(2)}`
    );
  } catch (err) {
    console.error(`[server] Visualiser pipeline error for ${reportId}:`, err);
    await mergeAgentResult(reportId, "renovation_visualisation_status", "error").catch(console.error);
    const msg = err instanceof Error ? err.message : String(err);
    const { appendReportError } = await import("./db/reports.js");
    await appendReportError(reportId, `Visualiser failed: ${msg}`).catch(console.error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start the server and return the http.Server instance.
 * Useful for programmatic control in tests.
 */
export function startServer(port = PORT): Promise<import("node:http").Server> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[server] piega-agents listening on http://localhost:${port}`);
      console.log(`[server] POST /reports              — Create & run report`);
      console.log(`[server] GET  /reports              — List classified reports`);
      console.log(`[server] GET  /reports/:id          — Get report by ID`);
      console.log(`[server] POST /reports/:id/visualise — Run renovation visualiser`);
      console.log(`[server] GET  /health               — Health check`);
      resolve(server);
    });
  });
}

// Auto-start when run directly (not imported)
const isDirectRun =
  process.argv[1]?.replace(/\\/g, "/").includes("server") ?? false;

if (isDirectRun) {
  startServer();
}

export default app;
