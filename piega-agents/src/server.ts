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

import { createReport, getReport, updateReportStatus } from "./db/index.js";
import { generateReport } from "./graph/index.js";
import type { ParsedListing } from "./types/listing.js";
import type { BuyerPurpose } from "./types/common.js";

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
      console.log(`[server] POST /reports    — Create & run report`);
      console.log(`[server] GET  /reports/:id — Get report by ID`);
      console.log(`[server] GET  /health      — Health check`);
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
