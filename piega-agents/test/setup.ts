/**
 * Vitest global setup — loads .env file before all tests
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setup() {
  config({ path: resolve(__dirname, "../.env") });
}
