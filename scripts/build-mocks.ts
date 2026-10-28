/**
 * Builds content/mocks/*.json: 12 full mocks in the 2026 drawing-first format (6 questions,
 * 3 hours, 100 marks), 3 mixed-format mocks (objective + drawing) and 4 mini mocks (90 min).
 * Question formats follow the memory-based 2026 Prelims question TYPES; all topics are new.
 *   npm run content:mocks
 */
import { mkdirSync, writeFileSync } from "node:fs";
import type { Mock } from "../lib/content/schemas";

type Q = Mock["questions"][number];
type A = Mock["analysis"][number];
type Maker = (no: number, marks: number, minutes: number) => { q: Q; a: A };

const split = (marks: number, ratio: number) => [Math.round(marks * ratio), marks - Math.round(marks * ratio)] as const;

const storyboard = (situation: string, setting: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.8);
  return {
    q: { no, title: "Storyboard", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `${situation} Setting: ${setting}.`,
      parts: [{ label: "a", prompt: "Draw a 4-frame storyboard of this situation, showing how it unfolds.", marks: m1 }, { label: "b", prompt: "Write a caption of up to 10 words under each frame.", marks: m2 }] },
    a: { no, idealApproach: `Spend 2 minutes planning: write one line per frame (problem → reaction → help → outcome). Use a wide shot to set the scene (${setting}), then move closer for the emotional moment. Show feelings through posture rather than faces, keep characters consistent, and keep captions to the point. Stop drawing at ${minutes - 3} minutes to add captions.` },
  };
};

const itemsFor = (situation: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.65);
  return {
    q: { no, title: "Items for a user", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Think about ${situation}.`,
      parts: [{ label: "a", prompt: "Sketch at least 8 items needed, arranged neatly and labelled.", marks: m1 }, { label: "b", prompt: "Redesign ONE of these items to suit this user better. Show it in use.", marks: m2 }] },
    a: { no, idealApproach: `Walk through the situation hour by hour and list needs under comfort, health, safety, communication and dignity before drawing. Arrange the items in a tidy grid or 'knolling' layout so the sheet looks organised. For the redesign, solve one specific problem of THIS user (not a generic gadget) and show the user actually using it, with 2–3 labels.` },
  };
};

const productLove = (what: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.6);
  return {
    q: { no, title: "Product & write-up", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Choose ${what}.`,
      parts: [{ label: "a", prompt: "Draw it from two angles with one close-up detail.", marks: m1 }, { label: "b", prompt: "Write about 200 words on why you chose it, what makes it well (or badly) designed, and one improvement.", marks: m2 }] },
    a: { no, idealApproach: `Pick something you can draw convincingly from memory. Use one 3/4 view and one side view, with consistent light. In the write-up, cover form, material, use and feeling, and end with a concrete improvement. Count roughly 200 words: examiners notice when limits are ignored.` },
  };
};

const food = (dish: string, twist: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.67);
  return {
    q: { no, title: "Illustration", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Illustrate ${dish}.`,
      parts: [{ label: "a", prompt: "Show the food, its containers and textures, in the setting where it is served. Light from one side.", marks: m1 }, { label: "b", prompt: twist, marks: m2 }] },
    a: { no, idealApproach: `Start with ellipses for plates and bowls at one eye level. Differentiate textures with different marks (crisp, soft, glossy, steaming). A few setting details (a banana leaf, a steel tumbler, a stall counter) make it unmistakably Indian. Keep part (b) quick but clearly labelled.` },
  };
};

const signage = (space: string, message: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.67);
  return {
    q: { no, title: "Signage", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Design signage for ${space}. Message: "${message}".`,
      parts: [{ label: "a", prompt: "Draw the sign with a pictogram that works without words.", marks: m1 }, { label: "b", prompt: "Sketch where and how it is placed so people actually notice it.", marks: m2 }] },
    a: { no, idealApproach: `Decide the one thing people must understand in 2 seconds. Use sign conventions (red circle = prohibition, blue = information, triangle = warning), high contrast, and minimal words, ideally bilingual. The placement sketch should show the viewer's eye level and the direction they approach from: this is where most students lose marks.` },
  };
};

const storyFrames = (story: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.7);
  return {
    q: { no, title: "Story to frames", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Read the story: "${story}"`,
      parts: [{ label: "a", prompt: "Illustrate the 3 key moments of the story in 3 frames.", marks: m1 }, { label: "b", prompt: "Write a caption of up to 20 words for each frame.", marks: m2 }] },
    a: { no, idealApproach: "Underline the three turning points: the problem, the change, the outcome. Each frame should be readable on its own, with a clear focal point. Use details the story gives you (place, objects, weather). Captions add what the drawing can't show, such as time or feeling, and must stay within 20 words." },
  };
};

const threeUses = (object: string, places: [string, string, string]): Maker => (no, marks, minutes) => ({
  q: { no, title: "3 uses in 3 contexts", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
    prompt: `Show three different uses of ${object} other than its normal use: one each in ${places[0]}, ${places[1]} and ${places[2]}.`,
    parts: [{ label: "a", prompt: "Draw each use in its context with a person using it, and label the idea.", marks }] },
  a: { no, idealApproach: `List the object's properties first (shape, material, hollow, light, transparent…) and give each use a DIFFERENT property, so the three ideas don't overlap. Make each context unmistakable with one or two details (a bed for a hospital, a counter for a shop). Divide the sheet into three equal panels before you start.` },
});

const social = (topic: string, para: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.7);
  return {
    q: { no, title: "Social media series", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Read this paragraph on ${topic}: "${para}"`,
      parts: [{ label: "a", prompt: "Design a series of 3 square social-media posts to make young people aware of this issue.", marks: m1 }, { label: "b", prompt: "Write a caption (max 15 words) for each post; the last should end with an action.", marks: m2 }] },
    a: { no, idealApproach: "Plan the series as hook → why it matters → what to do. Keep one layout, palette and type style across all three so they read as a set. Use one strong visual metaphor per post and borrow facts from the paragraph. The final post's call to action should be specific and doable." },
  };
};

const symbols = (objects: string[]): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.8);
  return {
    q: { no, title: "Symbol creation", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `A hand and a bird together can mean 'peace'. Create new symbols by combining each of these objects with something else: ${objects.join(", ")}.`,
      parts: [{ label: "a", prompt: `Draw one symbol for each of the ${objects.length} objects, in black and white.`, marks: m1 }, { label: "b", prompt: "Write the meaning of each symbol in one line.", marks: m2 }] },
    a: { no, idealApproach: "For each object, list what it does (a rope binds, a plant grows, a hammer builds) and find a concept that matches. Merge the forms so they read as one symbol, not two pictures side by side. Keep them bold and simple enough to work at stamp size." },
  };
};

const problemId = (scenario: string): Maker => (no, marks, minutes) => {
  const [m1, m2] = split(marks, 0.35);
  return {
    q: { no, title: "Problem identification", kind: "drawing", marks, suggestedMinutes: minutes, itemIds: [],
      prompt: `Scenario: ${scenario}`,
      parts: [{ label: "a", prompt: "List 5 problems you can identify in this situation.", marks: m1 }, { label: "b", prompt: "Sketch a solution to the most important problem and show it in use, with labels.", marks: m2 }] },
    a: { no, idealApproach: "Look beyond the obvious problem: think of every person involved and every moment of the situation, and use '5 whys' to reach a root cause. Choose the problem with the biggest impact for the solution. A simple, buildable idea, drawn clearly in context with labels, beats an elaborate machine." },
  };
};

const FULL_MARKS = [15, 15, 20, 15, 15, 20];
const FULL_MINUTES = [24, 24, 32, 24, 24, 32];

const fullMocks: Maker[][] = [
  [storyboard("A cyclist is hit by a car door opened suddenly on a busy road, and people around react.", "a city road with parked cars"), itemsFor("a family taking an elderly grandmother to a hospital for a check-up"), productLove("an object used in your home every day"), signage("a narrow market lane where carts and pedestrians collide", "Carts: one way only"), threeUses("a newspaper", ["a train compartment", "a school art room", "a vegetable shop"]), social("plastic in rivers", "Plastic thrown into drains travels to rivers and finally the sea. It breaks into tiny pieces that fish eat, and these particles can end up in the food we eat.")],
  [storyboard("A girl's school bag tears open in the rain on the way to school and a shopkeeper helps.", "a rainy morning street"), symbols(["rope", "plant", "hammer"]), storyFrames("Every evening an old man fed pigeons at the bus stand. One day he did not come. The flower seller noticed, asked around, and found him unwell at home. The next evening, the flower seller fed the pigeons, and the old man's grandson came to help."), food("a plate of hot bajji and chutney at a roadside stall", "Design a better way to serve it so oil does not soak the paper plate."), problemId("Children cross a busy highway every day to reach the village school because the only bridge is 2 km away."), itemsFor("a vegetable vendor who sells from a pushcart all day")],
  [storyboard("A child's kite gets stuck on a tree and a group of strangers work together to free it.", "a park on a windy afternoon"), signage("a hospital entrance where visitors don't know where emergency cases should go", "Emergency this way"), productLove("a traditional Indian object that is still used today"), threeUses("an empty glass bottle", ["a farm", "a classroom", "a festival"]), social("screen addiction", "Many teenagers check their phones over 100 times a day. Endless scrolling is designed to keep attention, leaving less time for sleep, friends and hobbies."), symbols(["key", "seed", "clock"])],
  [storyFrames("Rani's grandmother made pickle every summer for the whole street. When she was too old to lift the heavy jars, Rani and her friends turned it into a summer workshop. Now ten families make pickle together in her courtyard every May."), itemsFor("a student moving to a hostel in a new city for the first time"), storyboard("A water tanker arrives in a colony facing water shortage and people queue with pots.", "a residential colony in summer"), problemId("Elderly people in an apartment block can't use the lift during frequent power cuts and get stuck at home."), food("a South Indian filter coffee being made and served", "Suggest one improvement to the steel tumbler-and-dabara set."), signage("a lake walking path where people throw food for fish", "Don't feed the fish")],
  [storyboard("A boy helps a blind man buy vegetables at a crowded market.", "a crowded market"), threeUses("a bicycle tyre", ["a garden", "a playground", "a shop"]), productLove("a toy or game you loved as a child"), symbols(["ladder", "lamp", "bridge"]), problemId("Patients' families sleep on the floor of hospital corridors because there is no waiting space."), social("water wastage", "A dripping tap can waste many litres of water a day. In summer, many Indian cities depend on water tankers while leaking taps and pipes go unrepaired.")],
  [storyboard("Two children set up a lemonade stall to raise money for a stray-dog shelter.", "an apartment complex gate"), itemsFor("a delivery rider working in heavy rain"), storyFrames("The village bus came only twice a day. Meena, a schoolgirl, started a notice board at the stop with the timings, the conductor's number and news of delays. Soon the whole village used it, and the bus company put up a proper sign."), signage("a temple with many visitors where footwear gets lost", "Leave footwear here, collect token"), food("a mango-season fruit stall", "Design a carry bag for buying 3 kg of mangoes."), problemId("Street dogs and children both get hurt in a lane where garbage is dumped beside a playground.")],
  [itemsFor("a family going on a two-day bus trip to a wildlife sanctuary"), storyboard("A farmer uses a phone app for the first time to check crop prices and is surprised.", "a village and a market"), productLove("a piece of furniture you would redesign"), threeUses("a coconut shell", ["a café", "a garden", "an art class"]), symbols(["umbrella", "thread", "wheel"]), social("road safety for pedestrians", "Pedestrians make up a large share of road deaths in India. Missing footpaths, fast vehicles and phone distraction make crossing roads dangerous.")],
  [storyboard("A power cut hits the night before an exam and the family finds ways to cope.", "a small home at night"), signage("a school with many visitors who can't find the office", "Office, library, toilets, exit"), storyFrames("A carpenter's son wanted to be a painter. His father said painting was not real work. One day the boy painted the old wooden doors of his father's shop with bright patterns. Customers stopped, took photos, and the shop became famous. Now father and son make painted furniture."), problemId("A school bus stops in the middle of the road and children get down into traffic."), food("street-side corn (bhutta) roasted on coal", "Suggest a safer, cleaner way to serve it."), itemsFor("a hospital night-shift nurse")],
  [storyboard("A girl teaches her grandmother to use a smartphone camera.", "a living room"), threeUses("a clay pot", ["a classroom", "a hospital", "a balcony"]), productLove("something you would save from a fire"), symbols(["drop", "footprint", "eye"]), social("disappearing sparrows", "House sparrows were once common in every Indian town. As homes became concrete boxes and gardens vanished, they lost places to nest and feed."), problemId("Vegetable sellers at a weekly market lose a large part of their produce to heat and crushing.")],
  [storyFrames("A lorry driver crossed the ghats every night. At one hairpin bend there was no railing and no light. He tied a strip of reflective tape to a tree there. Other drivers did the same, and the bend began to glow. Finally the highway department built a proper barrier."), storyboard("A schoolboy helps a lost tourist find a heritage site.", "an old town street"), itemsFor("a wheelchair user visiting a crowded festival"), signage("a beach where currents are dangerous at one spot", "No swimming here"), food("a wedding lunch served on a banana leaf", "Design a quicker way to serve 300 guests without wasting food."), threeUses("a cardboard box", ["a railway station", "a pet clinic", "a classroom"])],
  [storyboard("A traffic signal fails at a big junction and a college student helps direct traffic.", "a city junction"), symbols(["compass", "bell", "seed"]), productLove("a tool used by someone in your family for work"), problemId("Farmers wait for hours in long lines with their tractors outside a grain market."), social("e-waste at home", "Old phones, batteries and chargers often sit in drawers or go out with household waste. They contain metals that are harmful if dumped but valuable when properly recycled."), itemsFor("a cricket team travelling for a district tournament")],
  [storyboard("A potter's family prepares diyas for Deepavali and sells them at the market.", "a potter's courtyard and a market"), signage("a library where people keep talking on phones", "Silent zone"), storyFrames("Every summer the lake near Arjun's house dried up. He and his friends cleared the old channels that once brought rain water to it. The next monsoon, the lake filled for the first time in ten years, and the birds came back."), threeUses("a plastic chair", ["a garden", "a shop", "a school sports day"]), food("a thali at a highway dhaba", "Design a tray that stops food from spilling in a moving bus."), problemId("Passengers in a crowded city bus can't see or hear which stop is next.")],
];

const mocks: Mock[] = [];
fullMocks.forEach((makers, i) => {
  const built = makers.map((m, k) => m(k + 1, FULL_MARKS[k]!, FULL_MINUTES[k]!));
  mocks.push({
    id: `mock-full-${String(i + 1).padStart(2, "0")}`,
    title: `Full mock ${i + 1} · 2026 pattern`,
    format: "2026",
    durationMin: 180,
    totalMarks: 100,
    questions: built.map((b) => b.q),
    analysis: built.map((b) => b.a),
  });
});

// Mixed format (in case the objective section returns): Part A objective (40) + 3 drawing (20 each)
const mixedDrawing: Maker[][] = [
  [storyboard("A boy finds a wallet on the road and tries to return it.", "a busy road and a police station"), threeUses("a steel plate", ["a music class", "a garden", "a camping trip"]), signage("a railway platform where the general coach position is unclear", "General coach stops here")],
  [symbols(["leaf", "hand", "lock"]), problemId("Students in a school without a canteen eat lunch on the corridor floor."), food("idli being steamed in a large hotel kitchen", "Suggest one improvement to serving idlis faster at breakfast rush.")],
  [storyFrames("A girl in a hill village walked 4 km to school. She started counting and naming the birds on the way in a notebook. Her teacher shared it with a forest officer, who used it to map the area's birds. The path is now a bird trail."), itemsFor("a family going for a beach holiday with a toddler"), productLove("an object that has not changed for 50 years")],
];
mixedDrawing.forEach((makers, i) => {
  const drawing = makers.map((m, k) => m(k + 2, 20, 36));
  mocks.push({
    id: `mock-mixed-${String(i + 1).padStart(2, "0")}`,
    title: `Mixed-format mock ${i + 1} · objective + drawing`,
    format: "mixed",
    durationMin: 180,
    totalMarks: 100,
    questions: [
      { no: 1, title: "Part A · Objective", kind: "objective", marks: 40, suggestedMinutes: 50, itemIds: [], prompt: "30 objective questions on visual reasoning, design awareness, colour, Indian crafts and general awareness. Answer them on screen.", parts: [] },
      ...drawing.map((b) => b.q),
    ],
    analysis: [
      { no: 1, idealApproach: "Go through the objective section in one fast pass (about 1 minute each), marking doubtful questions. Never spend more than 2 minutes on one item. Return to the marked ones only if time remains: the drawing questions carry more marks." },
      ...drawing.map((b) => b.a),
    ],
  });
});

// Mini mocks for Phase 1 (90 minutes, 50 marks)
const miniMakers: Maker[][] = [
  [storyboard("A boy learns to swim with the help of his elder sister.", "a village pond"), threeUses("a spoon", ["a garden", "a tailoring shop", "a music class"]), signage("a park where cycles and walkers share a path", "Share the path")],
  [itemsFor("a child going on a school picnic"), symbols(["pencil", "drop", "sun"]), food("a glass of sugarcane juice at a roadside stall", "Design a cleaner, faster serving counter.")],
  [storyFrames("A boy built a small shelter of sticks and an old banner for the stray puppies near his school. Other children brought sacks and water bowls. The school watchman now looks after the shelter at night."), problemId("Students forget their water bottles at home and drink from unsafe taps."), threeUses("an old saree", ["a hospital", "a shop", "a classroom"])],
  [storyboard("An auto-rickshaw driver helps a pregnant woman reach the hospital in heavy traffic.", "a city road at peak hour"), productLove("a piece of stationery you use every day"), social("food waste", "A large share of cooked food at big functions is thrown away. Leftover food could reach shelters if it were collected safely and quickly.")],
];
miniMakers.forEach((makers, i) => {
  const marks = [15, 15, 20], minutes = [25, 25, 35];
  const built = makers.map((m, k) => m(k + 1, marks[k]!, minutes[k]!));
  mocks.push({
    id: `mock-mini-${String(i + 1).padStart(2, "0")}`,
    title: `Mini mock ${i + 1} · 90 minutes`,
    format: "mini",
    durationMin: 90,
    totalMarks: 50,
    questions: built.map((b) => b.q),
    analysis: built.map((b) => b.a),
  });
});

mkdirSync("content/mocks", { recursive: true });
writeFileSync("content/mocks/mocks.json", JSON.stringify({ mocks }, null, 1) + "\n");
console.log(`✓ ${mocks.length} mocks (${mocks.filter((m) => m.format === "2026").length} full, ${mocks.filter((m) => m.format === "mixed").length} mixed, ${mocks.filter((m) => m.format === "mini").length} mini)`);
