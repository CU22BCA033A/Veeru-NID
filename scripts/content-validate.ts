import { loadAuthoredItems, loadImageManifest, SUBTOPICS } from "../lib/content/load";
import { validateContent } from "../lib/content/validate";

const items = loadAuthoredItems();
const images = loadImageManifest();
const { errors, warnings } = validateContent(items, images, SUBTOPICS);
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const e of errors) console.error(`✗ ${e}`);
console.log(`${items.length} items, ${images.length} images, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
