/**
 * Self-contained smoke test
 *
 * Starts the Express server, POSTs the fixture, polls until complete,
 * then shuts down. No second terminal needed.
 *
 * Usage: npx tsx test/smoke.ts
 */

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { startServer } from "../src/server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3099; // Use a different port to avoid conflicts
const SERVER = `http://localhost:${PORT}`;

async function main() {
  // ─── 1. Start server ──────────────────────────────────────────────────
  console.log(`\n🚀 Starting server on port ${PORT}...`);
  const server = await startServer(PORT);

  try {
    // ─── 2. Load fixture ──────────────────────────────────────────────────
    const fixture = await readFile(
      resolve(__dirname, "../fixtures/listings/paignton-bungalow.json"),
      "utf-8"
    );
    const listing = JSON.parse(fixture);

    console.log(`\n📤 Posting listing ${listing.listingId} to ${SERVER}/reports ...`);

    // ─── 3. POST to server ────────────────────────────────────────────────
    const res = await fetch(`${SERVER}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing, purpose: "live_in" }),
    });

    if (!res.ok) {
      console.error(`❌ Error ${res.status}:`, await res.text());
      process.exit(1);
    }

    const data = (await res.json()) as { id: string; status: string; created_at: string };
    console.log("✅ Report created:", JSON.stringify(data, null, 2));

    // ─── 4. Poll until complete (or timeout 180s) ─────────────────────────
    const reportId = data.id;
    const startTime = Date.now();
    const TIMEOUT = 180_000;

    console.log(`\n⏳ Polling ${SERVER}/reports/${reportId} ...`);

    while (Date.now() - startTime < TIMEOUT) {
      await new Promise((r) => setTimeout(r, 3000)); // wait 3s

      const pollRes = await fetch(`${SERVER}/reports/${reportId}`);
      const report = (await pollRes.json()) as {
        status: string;
        results?: Record<string, unknown>;
        errors?: string[];
      };

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const keys = Object.keys(report.results ?? {});
      console.log(
        `  [${elapsed}s] status=${report.status}, results=[${keys.join(", ")}]`
      );

      if (report.status === "complete" || report.status === "error") {
        console.log("\n═══════════════════════════════════════════════════════");
        console.log("  FINAL REPORT");
        console.log("═══════════════════════════════════════════════════════");
        console.log(JSON.stringify(report, null, 2));

        if (report.status === "error") {
          console.error("\n❌ Pipeline finished with errors:", report.errors);
        } else {
          console.log("\n✅ Pipeline completed successfully!");
        }
        break;
      }
    }

    if (Date.now() - startTime >= TIMEOUT) {
      console.error("\n⏰ Timeout! Pipeline did not finish within 180s.");
    }
  } finally {
    // ─── 5. Shut down server ──────────────────────────────────────────────
    console.log("\n🛑 Shutting down server...");
    server.close();
    // Give a moment for cleanup
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
