/**
 * piega-agents Express Server
 *
 * Endpoints:
 *   POST /reports                    — Create a report and kick off the agent pipeline
 *   GET  /reports/:id                — Get a report by ID (polling fallback)
 *   POST /reports/:id/design-brief   — Run design brief on existing classified report
 *   POST /reports/:id/visualise      — Run renovation visualiser on existing report
 *   GET  /health                     — Health check
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
import { runDesignBrief } from "./agents/designBrief.js";
import { runCostEstimator } from "./agents/costEstimator.js";
import type { ParsedListing } from "./types/listing.js";
import type { BuyerPurpose } from "./types/common.js";
import type {
  ClassificationResult,
  DesignBriefResult,
  ArchitecturalReading,
  CostEstimatorInput,
} from "./types/agents.js";

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
// POST /reports/:id/design-brief — Run design brief on existing classified report
// ═══════════════════════════════════════════════════════════════════════════

app.post("/reports/:id/design-brief", async (req, res) => {
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
    if ((report.results as Record<string, unknown>)?.design_brief_status === "running") {
      res.status(409).json({ error: "Design brief is already running for this report" });
      return;
    }

    console.log(`[server] Starting design brief for report ${req.params.id}`);

    // Mark as running
    await mergeAgentResult(req.params.id, "design_brief_status", "running");

    // Return immediately — work happens in background
    res.status(202).json({
      id: req.params.id,
      message: "Design brief started — poll GET /reports/:id for progress",
    });

    // Run in background
    runDesignBriefPipeline(req.params.id, classification, report.listing as ParsedListing).catch(
      (err) => {
        console.error(`[server] Design brief pipeline failed for ${req.params.id}:`, err);
      },
    );
  } catch (err) {
    console.error("[server] POST /reports/:id/design-brief error:", err);
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

    // Check if a design brief exists — pass it to the visualiser if so
    const designBrief = (report.results as Record<string, unknown>)?.design_brief as
      | DesignBriefResult
      | undefined;

    if (designBrief) {
      console.log(`[server] Design brief found — visualiser will follow the brief`);
    } else {
      console.log(`[server] No design brief — visualiser will use standalone mode`);
    }

    // Mark as running immediately
    await mergeAgentResult(req.params.id, "renovation_visualisation_status", "running");

    // Return immediately — work happens in background
    res.status(202).json({
      id: req.params.id,
      message: "Visualiser started — poll GET /reports/:id for progress",
    });

    // Run in background
    runVisualiserPipeline(req.params.id, classification, designBrief).catch((err) => {
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
// POST /reports/:id/cost-estimate — Run cost estimator on existing report
// ═══════════════════════════════════════════════════════════════════════════

app.post("/reports/:id/cost-estimate", async (req, res) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    const results = report.results as Record<string, unknown> | undefined;
    const classification = results?.classification as ClassificationResult | undefined;
    const designBrief = results?.design_brief as DesignBriefResult | undefined;
    const listing = report.listing as ParsedListing;

    if (!classification) {
      res.status(400).json({ error: "Report has no classification — run classifier first" });
      return;
    }

    if (!classification.architecturalReading) {
      res.status(400).json({
        error: "Classification has no architectural reading — re-run classifier to get the expanded output",
      });
      return;
    }

    if (!designBrief) {
      res.status(400).json({ error: "Report has no design brief — run design brief first" });
      return;
    }

    // Check if already running
    if (results?.cost_estimate_status === "running") {
      res.status(409).json({ error: "Cost estimator is already running for this report" });
      return;
    }

    console.log(`[server] Starting cost estimator for report ${req.params.id}`);

    // Mark as running
    await mergeAgentResult(req.params.id, "cost_estimate_status", "running");

    // Return immediately
    res.status(202).json({
      id: req.params.id,
      message: "Cost estimator started — poll GET /reports/:id for progress",
    });

    // Run in background
    runCostEstimatePipeline(
      req.params.id,
      classification,
      designBrief,
      listing,
    ).catch((err) => {
      console.error(`[server] Cost estimator pipeline failed for ${req.params.id}:`, err);
    });
  } catch (err) {
    console.error("[server] POST /reports/:id/cost-estimate error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /pipeline — Static pipeline definition for the canvas UI
// ═══════════════════════════════════════════════════════════════════════════

app.get("/pipeline", (_req, res) => {
  res.json({
    nodes: [
      {
        id: "chrome_extension",
        type: "source",
        label: "Chrome Extension",
        description: "Parses Rightmove listing: address, price, images, description, agent. Sends structured JSON to backend.",
        tier: 0,
        status: "live",
        trigger: "User clicks 'Analyse Property' in popup",
        endpoint: null,
        outputKey: null,
        promptPreview: null,
        tech: ["Chrome MV3", "content_script.js", "popup.js"],
      },
      {
        id: "classifier",
        type: "agent",
        label: "Classifier",
        description: "Determines property archetype (Victorian terrace, 60s bungalow, etc.) and classifies every listing image: what it depicts, usefulness, observations.",
        tier: 1,
        status: "live",
        trigger: "Automatic — runs when report is created",
        endpoint: "POST /reports",
        outputKey: "results.classification",
        model: "claude-sonnet-4-20250514",
        promptPreview: {
          system: "You are an experienced UK property professional with expertise spanning building surveying, architectural history, residential valuation, renovation project management…",
          userTemplate: "Analyse this UK property listing and classify it.\n\n## Property Details\n**Address:** {address}\n**Asking Price:** {price}\n**Images:** {imageCount} photos\n\n## Your Task\n1. Classify the property archetype\n2. Classify each image\n3. Provide a summary",
          outputFormat: "Structured JSON: archetype (label, era, construction, confidence), images[] (depicts, room, usefulness, observations), summary",
        },
        tech: ["Claude Vision", "Zod validation", "LangGraph node"],
      },
      {
        id: "design_brief",
        type: "agent",
        label: "Design Brief",
        description: "Creates a unified renovation concept — transformation strategy, colour palette, materials, mood — so every generated image reads as a single coherent project rather than independent edits.",
        tier: 1.5,
        status: "live",
        trigger: "Manual — user clicks 'Generate Brief'",
        endpoint: "POST /reports/:id/design-brief",
        outputKey: "results.design_brief",
        model: "claude-sonnet-4-20250514",
        promptPreview: {
          system: "You are a renovation design consultant who creates coherent renovation concepts. You assess property condition, select a transformation strategy, define a unified design language…",
          userTemplate: "## Property\n{address} — {priceDisplay}\n{archetype} ({era})\n\n## Classified Images\n{imageList}\n\n## Your Task\n1. Choose transformation strategy\n2. Define design language (palette, materials, mood)\n3. Select images for transformation\n4. Write concept statement",
          outputFormat: "Structured JSON: transformationStrategy, designLanguage{palette, materials, mood, eraGuidance, avoidList}, imageSelections[], recommendedCount, conceptStatement",
        },
        tech: ["Claude text", "Zod validation"],
      },
      {
        id: "renovation_visualiser",
        type: "agent",
        label: "Renovation Visualiser",
        description: "Selects best exterior + interior images from classifier output, crafts renovation prompts via Claude, then generates 'after' images via Nano Banana (fal.ai).",
        tier: 2,
        status: "live",
        trigger: "Manual — user clicks 'Run Visualiser'",
        endpoint: "POST /reports/:id/visualise",
        outputKey: "results.renovation_visualisation",
        model: "claude-sonnet-4-20250514 + nano-banana-pro",
        promptPreview: {
          system: "You are an architectural visualisation prompt writer. You write image editing prompts for an AI model that transforms existing property photos…",
          userTemplate: "Property archetype: {displayName} ({era})\nConstruction: {constructionType}\nImage type: {depicts} — {room}\n\nObservations:\n{observations}\n\nWrite an image editing prompt to show this after a tasteful renovation.",
          outputFormat: "Per image: originalUrl, renovatedUrl, promptUsed, depicts, type. Totals: cost, duration, model",
        },
        tech: ["Claude text", "fal.ai Nano Banana", "Progressive Supabase writes"],
      },
      {
        id: "building_reader",
        type: "agent",
        label: "Building Reader",
        description: "Deep-reads every image for structural condition, period features, issues (damp, cracks, wiring). Produces condition matrix and room-by-room assessment.",
        tier: 1,
        status: "planned",
        trigger: "Automatic — parallel with classifier",
        endpoint: null,
        outputKey: "results.buildingReading",
        model: "claude-sonnet-4-20250514",
        promptPreview: null,
        tech: ["Claude Vision", "LangGraph node"],
      },
      {
        id: "area_analyst",
        type: "agent",
        label: "Area Analyst",
        description: "Combines IMD deprivation, flood risk, crime data with local knowledge to produce an honest location narrative, highlights, and risks.",
        tier: 1,
        status: "planned",
        trigger: "Automatic — parallel with classifier",
        endpoint: null,
        outputKey: "results.areaAnalysis",
        model: "claude-sonnet-4-20250514",
        promptPreview: null,
        tech: ["Claude text", "piega-backend APIs", "LangGraph node"],
      },
      {
        id: "renovation_architect",
        type: "agent",
        label: "Renovation Architect",
        description: "Plans the renovation: room-by-room proposals, structural changes, material palette, phased timeline. Depends on classifier + building reader.",
        tier: 2,
        status: "planned",
        trigger: "Automatic — after Tier 1 completes",
        endpoint: null,
        outputKey: "results.renovationPlan",
        model: "claude-sonnet-4-20250514",
        promptPreview: null,
        tech: ["Claude text", "LangGraph node"],
      },
      {
        id: "cost_estimator",
        type: "agent",
        label: "Cost Estimator",
        description: "Desktop cost appraisal: budget breakdown by category, price-gap analysis, phased budget (move-in basics → year 1-2 → complete vision), key cost drivers.",
        tier: 2,
        status: "live",
        trigger: "Manual — user clicks 'Run Cost Estimate'",
        endpoint: "POST /reports/:id/cost-estimate",
        outputKey: "results.cost_estimate",
        model: "claude-sonnet-4-20250514",
        promptPreview: {
          system: "You are a UK quantity surveyor producing a desktop cost appraisal for a residential renovation project. You have NOT visited the site…",
          userTemplate: "Property: {address}, £{askingPrice}\nArchetype: {archetype} ({era})\nConstruction inferences: walls, roof, insulation…\nIssues: {issuesIdentified}\nDesign brief: {strategy}, {palette}, {materials}\n\nProduce the CostEstimateResult JSON.",
          outputFormat: "Structured JSON: budgetBreakdown[], totalEnvelope, priceGap, phasedBudget, keyAssumptions, confidenceStatement, costDrivers[]",
        },
        tech: ["Claude text", "Zod validation"],
      },
      {
        id: "narrative_writer",
        type: "agent",
        label: "Narrative Writer",
        description: "Final agent — weaves all data into the Piega editorial voice. Opening verse, place narrative, building reading, honest reckoning, final verse.",
        tier: 4,
        status: "planned",
        trigger: "Automatic — after all agents complete",
        endpoint: null,
        outputKey: "results.narrative",
        model: "claude-sonnet-4-20250514",
        promptPreview: null,
        tech: ["Claude text", "LangGraph node"],
      },
    ],
    edges: [
      { from: "chrome_extension", to: "classifier", label: "listing JSON" },
      { from: "classifier", to: "design_brief", label: "classification + architectural reading" },
      { from: "design_brief", to: "renovation_visualiser", label: "design brief" },
      { from: "classifier", to: "renovation_visualiser", label: "classification (fallback)", dashed: true },
      { from: "design_brief", to: "cost_estimator", label: "design brief" },
      { from: "classifier", to: "cost_estimator", label: "archetype + architectural reading" },
      { from: "classifier", to: "building_reader", label: "images + archetype", planned: true },
      { from: "chrome_extension", to: "area_analyst", label: "postcode + enriched area", planned: true },
      { from: "classifier", to: "renovation_architect", label: "archetype", planned: true },
      { from: "building_reader", to: "renovation_architect", label: "condition data", planned: true },
      { from: "renovation_architect", to: "renovation_visualiser", label: "material palette", planned: true },
      { from: "cost_estimator", to: "narrative_writer", label: "cost data", planned: true },
      { from: "area_analyst", to: "narrative_writer", label: "area data", planned: true },
    ],
    tiers: [
      { tier: 0, label: "Source", description: "Data ingestion from Rightmove" },
      { tier: 1, label: "Tier 1 — Analysis", description: "Parallel first-pass analysis agents" },
      { tier: 2, label: "Tier 2 — Planning", description: "Depends on Tier 1 outputs" },
      { tier: 3, label: "Tier 3 — Estimation", description: "Depends on Tier 2 outputs" },
      { tier: 4, label: "Tier 4 — Narrative", description: "Final editorial pass" },
    ],
    storage: {
      type: "Supabase",
      table: "piega_reports",
      resultsColumn: "results JSONB",
      pattern: "Each agent merges into results.{agentKey} via mergeAgentResult()",
    },
  });
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
 * Run the design brief pipeline for an existing classified report.
 * Writes the result to results.design_brief via mergeAgentResult.
 */
async function runDesignBriefPipeline(
  reportId: string,
  classification: ClassificationResult,
  listing: ParsedListing,
): Promise<void> {
  console.log(`[server] Starting design brief pipeline for report ${reportId}`);

  try {
    const brief = await runDesignBrief({
      classification,
      listing: {
        address: listing.address ?? "Unknown address",
        askingPrice: listing.askingPrice ?? 0,
        priceDisplay: listing.priceDisplay ?? "Price unknown",
        propertyType: listing.propertyType ?? "Unknown",
        bedrooms: listing.bedrooms ?? 0,
        bathrooms: listing.bathrooms ?? 0,
      },
    });

    // Write result
    await mergeAgentResult(reportId, "design_brief", brief);
    await mergeAgentResult(reportId, "design_brief_status", "complete");

    console.log(
      `[server] Design brief complete for ${reportId}: strategy=${brief.transformationStrategy}, ` +
        `${brief.imageSelections.filter((s) => s.use).length} images selected`,
    );
  } catch (err) {
    console.error(`[server] Design brief pipeline error for ${reportId}:`, err);
    await mergeAgentResult(reportId, "design_brief_status", "error").catch(console.error);
    const msg = err instanceof Error ? err.message : String(err);
    const { appendReportError } = await import("./db/reports.js");
    await appendReportError(reportId, `Design brief failed: ${msg}`).catch(console.error);
  }
}

/**
 * Run the renovation visualiser pipeline for an existing classified report.
 * Writes progressive results to Supabase so the frontend can poll.
 * When a design brief is provided, the visualiser follows it for image
 * selection and prompt crafting.
 */
async function runVisualiserPipeline(
  reportId: string,
  classification: ClassificationResult,
  designBrief?: DesignBriefResult,
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
      },
      designBrief, // pass design brief when available
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

/**
 * Run the cost estimator pipeline for an existing classified report.
 * Requires classification (with architectural reading) + design brief.
 */
async function runCostEstimatePipeline(
  reportId: string,
  classification: ClassificationResult,
  designBrief: DesignBriefResult,
  listing: ParsedListing,
): Promise<void> {
  console.log(`[server] Starting cost estimator pipeline for report ${reportId}`);

  try {
    const costInput: CostEstimatorInput = {
      archetype: classification.archetype,
      architecturalReading: classification.architecturalReading!,
      transformationStrategy: designBrief.transformationStrategy,
      designLanguage: designBrief.designLanguage,
      conceptStatement: designBrief.conceptStatement,
      askingPrice: listing.askingPrice ?? 0,
      address: listing.address ?? "Unknown address",
      propertyType: listing.propertyType ?? "Unknown",
      bedrooms: listing.bedrooms ?? 0,
      bathrooms: listing.bathrooms ?? 0,
      comparableSales: null, // future: from area enrichment
    };

    const result = await runCostEstimator(costInput);

    // Write result
    await mergeAgentResult(reportId, "cost_estimate", result);
    await mergeAgentResult(reportId, "cost_estimate_status", "complete");

    console.log(
      `[server] Cost estimator complete for ${reportId}: ` +
        `£${result.totalEnvelope.low.toLocaleString("en-GB")}–£${result.totalEnvelope.high.toLocaleString("en-GB")}`,
    );
  } catch (err) {
    console.error(`[server] Cost estimator pipeline error for ${reportId}:`, err);
    await mergeAgentResult(reportId, "cost_estimate_status", "error").catch(console.error);
    const msg = err instanceof Error ? err.message : String(err);
    const { appendReportError } = await import("./db/reports.js");
    await appendReportError(reportId, `Cost estimator failed: ${msg}`).catch(console.error);
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
      console.log(`[server] POST /reports/:id/design-brief — Run design brief`);
      console.log(`[server] POST /reports/:id/visualise — Run renovation visualiser`);
      console.log(`[server] POST /reports/:id/cost-estimate — Run cost estimator`);
      console.log(`[server] GET  /pipeline             — Pipeline definition`);
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
