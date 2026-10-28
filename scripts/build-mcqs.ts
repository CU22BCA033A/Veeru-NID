/** Builds content/items/mcq-*.json from the authored question lists in scripts/mcq/. npm run content:mcqs */
import { writeFileSync } from "node:fs";
import { colour, drawing } from "./mcq/colour-drawing";
import { design } from "./mcq/design";
import { gk, global, indian } from "./mcq/indian-global-gk";
import { toItem, type Q } from "./mcq/lib";

const sets: [string, string, Q[]][] = [
  ["design", "mq-des", design],
  ["colour", "mq-col", colour],
  ["drawing", "mq-drw", drawing],
  ["indian", "mq-ind", indian],
  ["global", "mq-glb", global],
  ["gk", "mq-gk", gk],
];
let total = 0;
for (const [name, prefix, list] of sets) {
  const items = list.map((q, i) => toItem(prefix, q, i + 1));
  writeFileSync(`content/items/mcq-${name}.json`, JSON.stringify({ items }, null, 1) + "\n");
  total += items.length;
}
console.log(`✓ ${total} authored MCQs`);
