/**
 * Load /content (and generated puzzles) into the database. Idempotent.
 *   npm run content:seed            (skips if nothing changed)
 *   npm run content:seed -- --force
 */
import { syncContent } from "../lib/seed/sync";
import { adminClient } from "./_env";

const force = process.argv.includes("--force");
syncContent(adminClient(), { force })
  .then((r) => console.log(r.changed ? `✓ synced content ${r.version}: ${JSON.stringify(r.counts)}` : `✓ content already up to date (${r.version})`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
