/**
 * Builds content/studio/*.json from hand-written task formats × curated topic lists.
 * Each format's brief, checklist and hints are written once with care; the topic lists are
 * hand-picked Indian-context scenarios. Re-run after editing:  npm run content:studio
 */
import { writeFileSync, mkdirSync } from "node:fs";
import type { StudioTask } from "../lib/content/schemas";

type Phase = "P1" | "P2" | "P3" | "P4" | "P5";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const tasks: StudioTask[] = [];
const add = (t: Omit<StudioTask, "sheet" | "materials" | "hints" | "difficulty" | "source"> & Partial<StudioTask>) => {
  tasks.push({ sheet: "A4", materials: ["pencil"], hints: [], difficulty: 3, source: "Practice", ...t });
};

// ───────────── 1. Storyboards (PYQ-style: helping an elderly person who falls) ─────────────
const storyboards: [string, string][] = [
  ["An elderly man slips on a wet temple step and a school girl helps him", "temple steps after rain"],
  ["A street dog is stuck in an open drain and children rescue it", "a lane after heavy rain"],
  ["A boy forgets his tiffin and his younger sister runs to the bus stop with it", "morning school rush"],
  ["A vegetable vendor's cart tips over and shoppers help collect the vegetables", "a busy market"],
  ["A grandmother learns to make a video call to her grandson abroad", "a small living room"],
  ["A girl teaches her father to ride her bicycle", "a quiet colony road"],
  ["A power cut during an exam-night study session at home", "a family home at night"],
  ["A lost child is reunited with his mother at a crowded fair (jatra)", "a village fair"],
  ["A farmer protects his crop from sudden hailstorm", "a field in North Karnataka"],
  ["A blind man crosses a busy road with the help of a stranger", "a city junction"],
  ["A cricket ball breaks a neighbour's window and the kids own up", "an apartment courtyard"],
  ["A school bus breaks down and students find a way to reach on time", "a highway stretch"],
  ["Making rangoli together on the morning of a festival", "the front of a house"],
  ["A kite gets stuck on an electric pole and the children decide what to do", "a terrace during Sankranti"],
  ["A tailor finishes a school uniform just in time for the first day", "a small tailoring shop"],
  ["A plastic bag blocks a storm drain and the street floods", "a residential road"],
  ["A new student finds a friend on the first day at school", "a classroom and playground"],
  ["An auto-rickshaw driver returns a phone left in his auto", "an auto stand"],
  ["A mother juggles cooking, a crying baby and a ringing phone", "a kitchen at 8 am"],
  ["A team of volunteers cleans a lake shore", "a lake on a Sunday morning"],
  ["An elderly woman struggles with a heavy shopping bag on a bus", "a crowded city bus"],
  ["A boy waits for the monsoon's first rain and the moment it arrives", "a village home"],
  ["A potter's wheel: from lump of clay to finished pot", "a potter's courtyard"],
  ["A girl wins a running race after falling once", "a school sports day"],
  ["A family packs for a train journey and nearly misses the train", "home to railway platform"],
  ["A shopkeeper helps a foreign tourist who doesn't speak Kannada", "a small provision store"],
  ["A cyclist's chain breaks on a hill and a mechanic helps", "a hilly road in Malnad"],
  ["A grandfather teaches his grandchild to plant a sapling", "a backyard garden"],
  ["A traffic policeman manages a junction when the signals fail", "a city junction at peak hour"],
  ["Getting ready for a school annual-day performance backstage", "backstage of a school hall"],
];
storyboards.forEach(([story, place], i) =>
  add({
    id: `st-storyboard-${String(i + 1).padStart(2, "0")}-${slug(story)}`,
    kind: "test",
    category: "Storyboard",
    subtopic: "studio.storyboard",
    title: `Storyboard: ${story}`,
    brief: `Draw a ${i % 3 === 0 ? "4" : i % 3 === 1 ? "5" : "6"}-frame storyboard of this real-life situation: "${story}". Setting: ${place}.\n\nEach frame must show one clear moment. Show emotions through posture, and add a short caption (max 10 words) under each frame.`,
    minutes: 20 + (i % 3) * 5,
    hints: ["Write one line per frame before drawing.", "Vary the shots: one wide, one medium, one close-up.", "Give each character one recognisable feature (a cap, a stick, a saree border)."],
    checklist: ["Correct number of frames, in a clear order", "The story is understandable without reading the captions", "Characters are consistent across frames", "At least one change of camera angle or distance", "Captions within the word limit", "The setting is recognisable"],
    phases: i < 20 ? ["P2", "P3"] : ["P1", "P2"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 2. One object, 3 uses in 3 contexts (PYQ-style) ─────────────
const uses: [string, [string, string, string]][] = [
  ["a small plastic bottle", ["a hospital ward", "a home gathering", "a roadside restaurant"]],
  ["a steel tumbler", ["a classroom", "a farm", "a festival"]],
  ["a coconut shell", ["a kitchen", "a garden", "a children's play area"]],
  ["an old bicycle tyre", ["a school", "a shop", "a terrace"]],
  ["a cardboard box", ["a railway station", "a hostel room", "a pet shelter"]],
  ["a bamboo pole", ["a wedding", "a flood relief camp", "a village school"]],
  ["a clothes peg", ["a farmer's field", "an office desk", "a kitchen"]],
  ["a banana leaf", ["a temple", "a street-food stall", "a craft class"]],
  ["a used ballpoint pen", ["a hospital", "a classroom", "a home repair kit"]],
  ["a jute sack", ["a sports day", "a shop", "a monsoon doorstep"]],
  ["a glass jar", ["a science lab", "a balcony garden", "a sweet shop"]],
  ["an umbrella", ["a bus stop", "a beach", "a market stall"]],
  ["a newspaper", ["a painter's workshop", "a train journey", "a kindergarten"]],
  ["a bucket", ["a construction site", "a music class", "a cattle shed"]],
  ["a rubber band", ["an office", "a kitchen", "a tailoring shop"]],
  ["a matchbox", ["a craft fair", "a classroom", "a camping trip"]],
  ["a broken plastic chair", ["a garden", "a school playground", "a roadside shop"]],
  ["an old saree", ["a hospital", "a shop", "a home for the elderly"]],
  ["a mobile phone box", ["a desk", "a kitchen", "a toy shop"]],
  ["a PVC pipe", ["a balcony", "a school lab", "a cattle farm"]],
  ["an egg tray", ["a recording studio", "an art class", "a nursery"]],
  ["a wooden ice-cream stick", ["a model-making class", "a garden", "a first-aid kit"]],
  ["a metal spoon", ["a camping trip", "a music performance", "a plant nursery"]],
  ["an old toothbrush", ["a cycle repair shop", "a jewellery shop", "a painter's studio"]],
  ["a cloth bag", ["a library", "a vegetable market", "a hospital bedside"]],
];
uses.forEach(([obj, [a, b, c]], i) =>
  add({
    id: `st-uses-${String(i + 1).padStart(2, "0")}-${slug(obj)}`,
    kind: "test",
    category: "3 uses, 3 contexts",
    subtopic: "studio.uses",
    title: `${obj[0]!.toUpperCase()}${obj.slice(1)}: 3 uses in 3 places`,
    brief: `Show three DIFFERENT uses of ${obj} (other than its normal use), one each in: (1) ${a}, (2) ${b}, (3) ${c}.\n\nDraw each use in its context with a person using it. Add a label explaining the idea (max 15 words each).`,
    minutes: 20,
    hints: ["List 8 properties of the object first (shape, material, hollow, light…).", "Each use should exploit a different property.", "Draw the context so the place is obvious: a bed for hospital, a stall for a shop."],
    checklist: ["Exactly three uses, each clearly different", "Each use is placed in the context asked", "The object is recognisable in every drawing", "A person is shown using it", "Labels explain why it works"],
    phases: ["P2", "P3"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 3. Symbol fusion (PYQ-style: hand + bird = peace) ─────────────
const symbols: [string, string][] = [
  ["rope", "unity"], ["plant", "hope"], ["hammer", "justice"], ["clock", "patience"], ["key", "education"],
  ["book", "freedom"], ["eye", "awareness"], ["drop of water", "life"], ["ladder", "ambition"], ["bridge", "friendship"],
  ["lamp (diya)", "knowledge"], ["umbrella", "protection"], ["seed", "growth"], ["wheel", "progress"], ["feather", "lightness"],
  ["lock", "privacy"], ["footprint", "journey"], ["thread", "connection"], ["leaf", "climate action"], ["pencil", "creativity"],
  ["heart", "care for the elderly"], ["hand", "volunteering"], ["compass", "direction"], ["bell", "warning"], ["sun", "renewable energy"],
];
symbols.forEach(([obj, idea], i) =>
  add({
    id: `st-symbol-${String(i + 1).padStart(2, "0")}-${slug(obj + "-" + idea)}`,
    kind: "test",
    category: "Symbol",
    subtopic: "studio.symbol",
    title: `Symbol for "${idea}" using a ${obj}`,
    brief: `A hand combined with a bird can mean "peace". In the same way, combine a ${obj} with ONE other object or shape to create a new symbol that means "${idea}".\n\nDraw 4 quick thumbnail ideas, then your best one large in black and white. Write one line explaining it.`,
    minutes: 15,
    hints: ["List what each object suggests (a rope ties, holds, pulls…).", "Merge the shapes: let one form become part of the other.", "Test it: would it still read at the size of a stamp?"],
    checklist: ["Four different thumbnail ideas", "The final symbol combines the two objects into one form", "It reads clearly in black and white", "It would still work very small", "The explanation is one clear line"],
    phases: i % 2 ? ["P2", "P3"] : ["P1", "P2"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 4. Signage for constrained spaces (PYQ-style) ─────────────
const signage: [string, string][] = [
  ["a narrow lane where two-wheelers keep blocking a house gate", "No parking in front of the gate"],
  ["a crowded railway platform where people don't know which end the ladies' coach stops at", "Ladies coach stops here"],
  ["a hospital corridor with many departments and visitors who can't read English", "Way to the X-ray room"],
  ["a temple with steep steps where elderly visitors slip", "Use the side rail, steps are steep"],
  ["a school gate where parents' vehicles block the bus", "Bus bay: keep clear 7–9 am"],
  ["a public toilet in a market used by people who speak different languages", "Women / men / accessible toilet"],
  ["a lake path where people throw waste into the water", "Don't feed the lake plastic"],
  ["a bus stand where people don't know which bus goes where", "Route numbers and directions"],
  ["a narrow staircase in an old apartment with no lights", "Watch your step + light switch location"],
  ["a busy junction near a school with no zebra crossing", "School zone: slow down"],
  ["a forest trail where tourists wander off the path", "Stay on the trail: wildlife zone"],
  ["a crowded flower market where carts and people collide", "One-way for carts"],
  ["a library reading room where phones disturb others", "Silent zone, phones off"],
  ["a beach with dangerous currents at one spot", "No swimming: strong currents"],
  ["a vegetable shop with no space for a big board", "Shop name and opening hours"],
  ["an apartment lift that often gets overloaded", "Max 6 people"],
  ["a college canteen where people don't separate waste", "Wet / dry / recyclable"],
  ["a highway petrol pump at night", "Air, water, toilet: which way"],
  ["a park where cycles and walkers share a narrow path", "Share the path"],
  ["a cinema hall exit during a power cut", "Emergency exit"],
];
signage.forEach(([space, message], i) =>
  add({
    id: `st-sign-${String(i + 1).padStart(2, "0")}-${slug(space)}`,
    kind: "test",
    category: "Signage",
    subtopic: "studio.signage",
    title: `Signage: ${message}`,
    brief: `Design a sign for ${space}. The message: "${message}".\n\nDraw (1) the sign itself, large, with a pictogram, and (2) a small sketch of WHERE it will be placed in the space so people actually see it. Consider people who can't read English.`,
    minutes: 18,
    hints: ["Decide the ONE thing a person must understand in 2 seconds.", "Use shape and colour conventions: red for prohibition, blue for information.", "Show eye level and the direction people come from."],
    checklist: ["A clear pictogram that works without words", "Strong contrast and readable lettering", "Placement sketch shows where and at what height", "Considers the specific constraint of the space", "No more text than needed"],
    phases: ["P2", "P3"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 5. Social media awareness series (PYQ-style) ─────────────
const issues: [string, string][] = [
  ["e-waste", "Old phones and chargers dumped with household waste leak lead and mercury into soil and water. Only a small share of India's e-waste reaches proper recyclers; much is broken down by hand in unsafe conditions."],
  ["the water cost of fast fashion", "Making one cotton T-shirt can use thousands of litres of water, much of it for growing cotton. Many clothes are worn only a few times before being thrown away."],
  ["screen time and sleep", "Using phones late at night delays sleep, and blue light and constant notifications keep the brain alert. Teenagers who sleep less find it harder to concentrate and remember what they study."],
  ["single-use plastic at festivals", "Festival celebrations produce mountains of plastic plates, cups and decorations that end up in lakes and drains, choking animals and blocking water flow."],
  ["road safety for two-wheeler riders", "Many two-wheeler accident deaths involve riders without helmets. A properly strapped helmet greatly reduces the risk of a fatal head injury."],
  ["the energy cost of AI and data centres", "Every AI query and video stream is processed in data centres that use large amounts of electricity and water for cooling. Demand is growing rapidly as AI tools spread."],
  ["food waste at weddings", "Large weddings often cook far more food than guests eat. The leftover food is thrown away while many people nearby go hungry."],
  ["loneliness among the elderly", "As young people move to cities, many elderly parents live alone. Loneliness affects their health as much as some physical illnesses."],
  ["air pollution from burning waste", "Burning garbage releases toxic smoke with fine particles that damage lungs, especially for children and the elderly living nearby."],
  ["saving sparrows and urban birds", "House sparrows have declined in many Indian cities as old houses with nesting gaps are replaced and gardens disappear."],
  ["mental health during exams", "Board-exam pressure leaves many students anxious and sleep-deprived. Talking about stress and taking breaks helps, but many students hide what they feel."],
  ["water harvesting in cities", "Rainwater that falls on roofs and roads mostly runs into drains, while the same cities face water shortages in summer. Simple rooftop harvesting can recharge groundwater."],
  ["cyberbullying", "Hurtful comments and shared photos online can follow a teenager everywhere. Many victims don't tell adults, and bystanders often stay silent."],
  ["disappearing handloom crafts", "Many handloom weavers are leaving the craft because machine-made imitations are cheaper, even though handloom is more sustainable and unique."],
  ["the cost of fast delivery", "Ten-minute deliveries make riders rush through traffic and create more packaging waste with every small order."],
  ["respecting garbage collectors", "Waste pickers and sanitation workers keep cities clean, often without gloves, masks or respect from the people they serve."],
  ["antibiotic misuse", "Taking antibiotics for viral colds or stopping courses midway helps bacteria become resistant, so medicines stop working when they're really needed."],
  ["drowning in lakes and quarries", "Every summer, young people drown swimming in unfamiliar lakes and abandoned quarries with hidden depths and cold underwater currents."],
  ["digital payments for elderly people", "Many elderly people are left out as shops go cashless; they also face online fraud because nobody taught them how to stay safe."],
  ["noise pollution", "Constant honking and loudspeakers raise stress and harm hearing. Many drivers honk out of habit rather than need."],
];
issues.forEach(([topic, para], i) =>
  add({
    id: `st-social-${String(i + 1).padStart(2, "0")}-${slug(topic)}`,
    kind: "test",
    category: "Social media series",
    subtopic: "studio.poster",
    title: `3-post awareness series: ${topic}`,
    brief: `Read this:\n"${para}"\n\nDesign a series of 3 square social-media posts that make young people aware of this issue and end with an action. For each post: a sketch plus a caption (max 15 words).`,
    minutes: 25,
    hints: ["Plan the series: post 1 = hook (surprise), post 2 = why it matters, post 3 = what you can do.", "Keep the layout and colours consistent across all three.", "Use one strong visual metaphor per post."],
    checklist: ["Three square posts that clearly belong to one series", "Each post has one strong idea", "The last post ends with a clear action", "Captions within 15 words", "Uses information from the paragraph"],
    phases: ["P2", "P3"],
    difficulty: 4,
    source: "PYQ-style",
  }),
);

// ───────────── 6. Read a story → 3 key frames + 20-word captions (PYQ-style) ─────────────
const stories: [string, string][] = [
  ["The last bus", "Ravi missed the last bus home from the town library. It was dark and starting to rain. A tea-shop owner who was closing up noticed him waiting alone, shared his umbrella and his phone, and stayed with him until Ravi's father arrived on his scooter. Years later, Ravi opened a library of his own next to that tea shop."],
  ["The mango tree", "An old mango tree stood in the middle of the village school ground. The new headmaster wanted to cut it down to make space for a basketball court. The children drew pictures of everything that happened under the tree — lunches, stories, rain shelters — and stuck them on its trunk. The court was built around the tree instead."],
  ["Grandmother's recipe", "Meera's grandmother never wrote down her famous bisi bele bath recipe; she cooked by smell and memory. When her eyesight began to fail, Meera cooked beside her every Sunday, sketching each step in a notebook. The notebook is now the family's most precious book."],
  ["The broken flute", "A boy in a hill village made flutes from bamboo and sold them to tourists. One day a tourist's child dropped and cracked a flute and began to cry. The boy sat down, cut a new flute right there, and taught the child to play one note before the bus left."],
  ["Lost in the market", "Five-year-old Anu let go of her mother's hand in the crowded Sunday market. Frightened, she remembered her mother's advice: stand still near something tall and bright. She stood by the balloon seller, who lifted her onto his stool so she could be seen. Her mother spotted her within minutes."],
  ["The flood", "When the river rose overnight, a fisherman took his small boat through the flooded streets, carrying elderly neighbours to the school on the hill. He made eleven trips before dawn. In the morning he went back once more — for a goat that was bleating from a rooftop."],
  ["The new girl", "Zoya joined the school in the middle of the year and didn't speak Kannada. At lunch she sat alone. One day she drew everyone in her class on the blackboard during the break. The next day, three girls asked her to draw them — and taught her Kannada words for every colour."],
  ["The cycle repair shop", "Old Kumar's cycle repair shop had no customers since the city became full of scooters. Then the school started a 'cycle to school' week. Kumar fixed thirty old cycles for free in three days. By the end of the month his shop had a queue."],
  ["The stray dog's friend", "Every morning a stray dog waited outside the bakery. The baker's daughter, Priya, saved the broken biscuits for him. When Priya was ill for a week, the dog lay outside her house instead. On the day she came back, he walked her all the way to school."],
  ["The silent musician", "A deaf boy loved the temple drums because he could feel their beat through the floor. He started tapping rhythms on his desk at school. His teacher noticed and found him a drum. At the annual day, he played on stage, watching the dancers' feet for the timing."],
  ["The lamp seller", "Before Deepavali, a potter's family made hundreds of clay diyas but the market was full of cheap plastic lights. The potter's daughter painted the diyas with simple patterns and wrote 'made by hand, made to return to earth' on a small board. They sold out by evening."],
  ["The water carrier", "In a village, Lakshmi walked two kilometres every morning to fetch water. Her son, an engineering student, built a simple rain-collecting roof and tank for their house during his holidays. Next monsoon, three neighbours asked him to build one for them too."],
  ["The kite", "Two brothers who had been fighting all week were forced to fly a kite together on Sankranti because there was only one. When the string got tangled in a tree, one climbed while the other guided him from below. They came home holding the torn kite and laughing."],
  ["The ticket checker", "A ticket checker on a night train found a teenage boy travelling without a ticket. The boy had run away after failing an exam. Instead of fining him, the checker bought him tea, listened to him, and called his parents from the next station."],
  ["The library on wheels", "A retired teacher turned her old car into a moving library and drove to villages every Saturday. Children who had never owned a book waited at the bus stop for her. One girl began writing her own stories and gave them to the teacher to add to the shelves."],
];
stories.forEach(([title, story], i) =>
  add({
    id: `st-storyframes-${String(i + 1).padStart(2, "0")}-${slug(title)}`,
    kind: "test",
    category: "Story to frames",
    subtopic: "studio.storyboard",
    title: `Illustrate a story: ${title}`,
    brief: `Read the story:\n"${story}"\n\nIllustrate the 3 KEY moments of this story in 3 frames. Under each frame write a caption of no more than 20 words.`,
    minutes: 22,
    hints: ["Choose: the problem, the turning point, the result.", "Show the main character's emotion through posture.", "Use the setting details the story gives you."],
    checklist: ["Three frames showing the three most important moments", "The sequence makes sense even without the text", "Captions are 20 words or fewer", "Characters are recognisable across frames", "Settings match the story"],
    phases: ["P2", "P3"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 7. Items needed for a user + context (PYQ-style) ─────────────
const userContexts: [string, string][] = [
  ["travelling with a grandparent by overnight train", "the journey"],
  ["a first-time cricket coaching camp for 10-year-olds", "a day at the camp"],
  ["a blind student's first week in a new college", "moving around campus"],
  ["a street-food vendor during the monsoon", "a working evening"],
  ["a new mother returning to her office job", "the working day"],
  ["a family going on a pilgrimage trek", "a two-day trek"],
  ["a delivery rider working in a heatwave", "a working afternoon"],
  ["a farmer selling vegetables at a weekly market", "market day"],
  ["a wheelchair user visiting a heritage site", "a day out"],
  ["a school teacher taking 40 children on a zoo trip", "the trip"],
  ["a tailor working from home", "a day of work"],
  ["a small child's first day at kindergarten", "the first day"],
  ["an elderly person living alone in a flat", "a normal day"],
  ["a traffic policeman on a summer day", "a long shift"],
  ["a student shifting to a hostel in a new city", "the first week"],
  ["a family evacuating during a cyclone warning", "the evacuation"],
  ["a mountaineer on a three-day camping trip", "the camp"],
  ["a hospital night-shift nurse", "the night shift"],
  ["a fisherman going out to sea at dawn", "a fishing trip"],
  ["a school sports team travelling to a district tournament", "the bus journey"],
];
userContexts.forEach(([situation, scope], i) =>
  add({
    id: `st-items-${String(i + 1).padStart(2, "0")}-${slug(situation)}`,
    kind: "test",
    category: "Items for a user",
    subtopic: "studio.context",
    title: `What's needed: ${situation}`,
    brief: `Think about ${situation}. Sketch at least 8 items this person (or group) needs during ${scope}, arranged in a clear composition. Mark the 2 items that are most often forgotten, and redesign ONE item to suit this user better, with labels.`,
    minutes: 20,
    hints: ["Walk through the situation hour by hour.", "Think of comfort, safety, health, communication and dignity.", "The redesigned item should solve a specific problem of THIS user."],
    checklist: ["At least 8 relevant items, each recognisable", "A clear, organised composition (not scattered)", "The 2 easily forgotten items are marked", "One item is redesigned for this specific user", "Labels explain the redesign"],
    phases: ["P2", "P3"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 8. Problem → solution sketch (PYQ-style problem identification) ─────────────
const problems: string[] = [
  "school children standing in a bus fall forward when the driver brakes suddenly",
  "elderly people can't read the small print on medicine strips",
  "street vendors' goods get wet when it suddenly rains",
  "people spill water while filling bottles at public taps",
  "students carry very heavy school bags every day",
  "two-wheeler riders get drenched at traffic signals in the monsoon",
  "children can't reach the wash basins in a school toilet",
  "patients' relatives have nowhere to rest in hospital corridors",
  "flowers wilt quickly for flower sellers in summer",
  "people with walking sticks drop them when they need both hands",
  "cyclists can't carry milk cans safely on bicycles",
  "shoppers carry many separate bags from a market",
  "tea vendors spill tea while carrying cups on trains",
  "auto-rickshaw passengers get wet from the open sides in rain",
  "people forget their keys inside when the door locks automatically",
  "bus passengers can't see which stop is next",
  "farmers' harvested grain gets spoiled by rain on the threshing floor",
  "elderly people find it hard to get up from a floor-level seat",
  "children's slippers get lost in temple and mosque shoe areas",
  "small shops have no place to keep a customer's baby",
  "rice and dal get spilled when serving food at a crowded wedding",
  "people slip on wet bathroom floors",
  "students can't keep their notebooks dry in leaking classrooms",
  "people standing in long queues at government offices get tired",
  "pet dogs get lost during festival fireworks",
];
problems.forEach((p, i) =>
  add({
    id: `st-problem-${String(i + 1).padStart(2, "0")}-${slug(p)}`,
    kind: "test",
    category: "Problem → solution",
    subtopic: "studio.problem-solution",
    title: `Problem: ${p}`,
    brief: `Problem: ${p}.\n\n(1) Draw the situation showing the problem clearly. (2) List 3 other problems you notice in the same situation. (3) Sketch ONE design solution in use, with labels showing how it works.`,
    minutes: 22,
    hints: ["Ask '5 whys' to find the root cause.", "Think of who else is affected: the driver, the vendor, a parent.", "A simple, cheap fix that is clearly drawn beats a complicated gadget."],
    checklist: ["The problem drawing makes the issue obvious", "Three further problems are identified", "The solution addresses the root cause", "The solution is shown being used by the right user", "Labels explain how it works"],
    phases: i % 3 === 0 ? ["P1", "P2"] : ["P2", "P3"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 9. Product redesign for a user ─────────────
const redesigns: [string, string][] = [
  ["a school bench", "a left-handed student"], ["a pressure cooker", "a person with arthritis"], ["a bus ticket machine", "a first-time user"],
  ["a water bottle", "a cyclist"], ["a tiffin box", "a construction worker"], ["a walking stick", "a pilgrim on a trek"],
  ["a street-light pole", "a vendor who sets up beneath it"], ["an umbrella", "a two-wheeler rider"], ["a mobile phone", "an elderly person"],
  ["a broom", "a sanitation worker"], ["a school bag", "a child who walks 3 km"], ["a plastic chair", "a hospital waiting room"],
  ["a ration card holder", "a farmer"], ["a bucket", "a person who carries water upstairs"], ["a wall clock", "a visually impaired person"],
  ["a vegetable cart", "a vendor in the monsoon"], ["a geometry box", "a student who keeps losing things"], ["a door handle", "a child"],
  ["a medicine box", "an elderly couple who forget doses"], ["a cradle", "a working mother in a small flat"],
];
redesigns.forEach(([product, user], i) =>
  add({
    id: `st-redesign-${String(i + 1).padStart(2, "0")}-${slug(product + "-" + user)}`,
    kind: "test",
    category: "Product redesign",
    subtopic: "studio.redesign",
    title: `Redesign ${product} for ${user}`,
    brief: `Redesign ${product} for ${user}.\n\nShow: (1) a quick sketch of the problem with the current product, (2) your redesigned product from 2 views, (3) the user using it. Label 3 key features.`,
    minutes: 25,
    hints: ["Imagine a full day of this user with this product.", "Change one or two important things, not everything.", "Two views: one 3/4 view and one close-up of the key feature."],
    checklist: ["The current problem is clearly shown", "The redesign clearly suits this specific user", "Two views of the product", "The user is shown using it", "Three labelled features"],
    phases: ["P2", "P3"],
    difficulty: 4,
    source: "Practice",
  }),
);

// ───────────── 10. Posters ─────────────
const posters: [string, string][] = [
  ["a district-level science fair for school students", "Science Fair 2027"], ["a blood donation camp at a college", "Donate blood"],
  ["a handloom exhibition of Karnataka weaves", "Handloom Mela"], ["a 'cycle to school' week", "Cycle Week"], ["a lake clean-up drive", "Save our lake"],
  ["a local folk-music festival", "Janapada Utsava"], ["a stray-animal adoption camp", "Adopt, don't shop"], ["a free eye check-up camp for the elderly", "Free eye camp"],
  ["a children's book fair", "Book Fair"], ["a 'no honking day' in the city", "No honking day"], ["a millet food festival", "Millet Mela"],
  ["a kite festival", "Kite Fest"], ["a 'switch off for an hour' energy campaign", "Earth Hour"], ["a school annual day", "Annual Day"], ["a women's self-defence workshop", "Be safe, be strong"],
];
posters.forEach(([event, headline], i) =>
  add({
    id: `st-poster-${String(i + 1).padStart(2, "0")}-${slug(event)}`,
    kind: i % 2 ? "test" : "daily",
    category: "Poster",
    subtopic: "studio.poster",
    title: `Poster: ${headline}`,
    brief: `Design a poster for ${event}. Headline: "${headline}". Include the date, place and one line inviting people.\n\nUse ONE strong visual idea and a clear hierarchy. Colour is allowed (maximum 3 colours).`,
    minutes: i % 2 ? 20 : 35,
    materials: ["pencil", "colour pencils or sketch pens"],
    hints: ["Make thumbnails of 3 layouts first.", "Headline biggest, image strong, details smallest.", "Leave margins and breathing space."],
    checklist: ["One strong central visual idea", "Clear hierarchy: headline → image → details", "Date, place and invitation line included", "Maximum 3 colours used deliberately", "Margins and white space used well"],
    phases: ["P1", "P2"],
    difficulty: 3,
    source: "Practice",
  }),
);

// ───────────── 11. Product I love + 200 words (PYQ-style) ─────────────
const loved = ["a product you use every day", "something in your kitchen", "a toy you loved as a child", "a tool used by someone in your family", "a piece of traditional Indian craft", "an object you would save in a fire", "a product that has not changed in 50 years", "something you own that is badly designed but you still love", "a gift you received", "a piece of furniture at home"];
loved.forEach((what, i) =>
  add({
    id: `st-love-${String(i + 1).padStart(2, "0")}-${slug(what)}`,
    kind: "test",
    category: "Product write-up",
    subtopic: "creative.writeup",
    title: `Draw and describe: ${what}`,
    brief: `Choose ${what}. Draw it well from two angles, with one close-up detail. Then write about 200 words: why you love it, what makes it well designed (or not), and one thing you would improve.`,
    minutes: 25,
    hints: ["Choose something you can draw convincingly.", "In the writing, talk about form, material, use and feeling.", "End with a specific improvement, not a vague wish."],
    checklist: ["Two angles plus a close-up detail", "Proportions and materials are convincing", "The writing explains form, function and feeling", "About 200 words (not much more)", "A specific improvement is suggested"],
    phases: ["P1", "P2"],
    difficulty: 3,
    source: "PYQ-style",
  }),
);

// ───────────── 12. Indian food & drink illustration (PYQ-style) ─────────────
const foods = ["a South Indian breakfast plate (idli, vada, chutney, sambar)", "a cutting chai at a tea stall", "a street pani-puri setup", "a banana-leaf meal (oota) at a wedding", "a mango and a glass of mango lassi", "a steel tiffin carrier, opened", "a plate of Mysore pak and other sweets", "a tender coconut with a straw, being cut", "a dosa being made on a tawa", "a bowl of ragi mudde with saaru", "a jalebi being fried in a kadai", "filter coffee in a dabara set"];
foods.forEach((f, i) =>
  add({
    id: `st-food-${String(i + 1).padStart(2, "0")}-${slug(f)}`,
    kind: i % 2 ? "test" : "daily",
    category: "Food illustration",
    subtopic: "studio.indian",
    title: `Illustrate: ${f}`,
    brief: `Illustrate ${f}. Show textures (crisp, soft, glossy, steaming), the containers, and the setting in which it is eaten or served. Light comes from one side.`,
    minutes: i % 2 ? 15 : 30,
    materials: ["pencil", "colour pencils (optional)"],
    hints: ["Start with ellipses for plates and bowls.", "Render textures with different marks: dots for rava, smooth tone for chutney.", "Steam or condensation makes food feel fresh."],
    checklist: ["Foods are recognisable", "Textures are differentiated", "Ellipses of plates and cups are convincing", "Consistent light direction", "The setting adds context"],
    phases: ["P1", "P2"],
    difficulty: 2,
    source: "PYQ-style",
  }),
);

// ───────────── 13. Memory drawing (P1/P4 foundations) ─────────────
const memoryPlaces = ["your school gate at 8 am", "your kitchen", "a bus stop near your house", "a temple courtyard during a festival", "your classroom from the teacher's desk", "a busy vegetable market", "your bedroom", "a railway platform", "a barber shop", "the view from your terrace", "a stationery shop", "a wedding hall during lunch", "a cricket match in a gully", "a hospital waiting area", "a petrol pump", "a medical shop counter"];
memoryPlaces.forEach((p, i) =>
  add({
    id: `st-memory-${String(i + 1).padStart(2, "0")}-${slug(p)}`,
    kind: i % 2 ? "test" : "daily",
    category: "Memory drawing",
    subtopic: "studio.memory",
    title: `From memory: ${p}`,
    brief: `Without looking at any photo, draw ${p} from memory. Include at least 3 people doing different things and at least 5 small details that make it specific (signs, objects, textures).`,
    minutes: i % 2 ? 15 : 30,
    hints: ["Fix the horizon and one vanishing point first.", "Big shapes first, people second, details last.", "Details like a calendar, a broken tile or a sticker make memory drawings believable."],
    checklist: ["A clear perspective framework", "At least 3 people doing different actions", "At least 5 specific details", "Overlap and size create depth", "The place is recognisable"],
    phases: i % 2 ? ["P1", "P2"] : ["P1", "P4"],
    difficulty: 3,
    source: "Practice",
  }),
);

// ───────────── 14. Observation drawing (daily) ─────────────
const observe = ["your own hand holding 5 different objects", "a pair of shoes from 3 angles", "a crumpled paper bag in strong light", "a corner of your kitchen", "a potted plant", "your school bag, open, with things spilling out", "a bicycle or scooter", "people waiting in a queue (quick gesture sketches)", "a chair from 3 angles", "folds of a hanging cloth or towel", "a bunch of keys", "a glass of water with a spoon in it", "a pressure cooker", "a tree outside your window", "your family members watching TV (gesture sketches)", "a set of steel vessels stacked together", "a bucket and mug in the bathroom", "the view through a window, including the window frame"];
observe.forEach((o, i) =>
  add({
    id: `st-observe-${String(i + 1).padStart(2, "0")}-${slug(o)}`,
    kind: "daily",
    category: "Observation drawing",
    subtopic: "studio.observation",
    title: `Observe and draw: ${o}`,
    brief: `Draw ${o} from direct observation. Spend the first 3 minutes only looking. Then draw, checking proportions by measuring with your pencil at arm's length. Show light and shade with at least 3 tones.`,
    minutes: 30,
    materials: ["pencil HB", "pencil 2B/4B"],
    hints: ["Squint to see the big light and dark shapes.", "Measure one unit (e.g. a shoe's height) and compare everything to it.", "Edges: crisp where light meets dark, soft where they blend."],
    checklist: ["Proportions are checked and convincing", "At least 3 tones (light, mid, dark)", "One consistent light source", "Texture and material are suggested", "The drawing fills the page well"],
    phases: i % 3 === 0 ? ["P1", "P4"] : i % 3 === 1 ? ["P1", "P2"] : ["P4", "P5"],
    difficulty: 2,
    source: "Practice",
  }),
);

// ───────────── 15. Perspective scenes ─────────────
const scenes = ["a street with shops on both sides (one-point)", "a classroom from the back of the room (one-point)", "a market corner (two-point)", "a bus stand with a shelter and people (two-point)", "a temple courtyard with pillars (one-point)", "a railway platform with a train arriving (one-point)", "a staircase seen from the bottom (three-point)", "a tall apartment block seen from the street (three-point)", "a narrow lane in an old town (one-point)", "a school corridor (one-point)", "a busy junction from a bird's-eye view", "a room seen through a doorway (one-point)"];
scenes.forEach((s, i) =>
  add({
    id: `st-perspective-${String(i + 1).padStart(2, "0")}-${slug(s)}`,
    kind: i % 2 ? "test" : "daily",
    category: "Perspective scene",
    subtopic: "studio.perspective-scene",
    title: `Perspective: ${s}`,
    brief: `Draw ${s}. Mark your horizon line and vanishing point(s) lightly. Add at least 4 people at different distances, with their heads at eye level if they're standing on flat ground.`,
    minutes: i % 2 ? 20 : 35,
    hints: ["Horizon first, then vanishing points, then big boxes.", "Standing people's heads on the horizon line.", "Add detail where the eye should go; simplify the rest."],
    checklist: ["Horizon and vanishing point(s) correctly used", "Receding lines converge consistently", "People are scaled correctly with distance", "Depth through overlap and detail", "The scene is lively and believable"],
    phases: ["P1", "P2"],
    difficulty: i > 5 ? 4 : 3,
    source: "Practice",
  }),
);

// ───────────── 16. Emotion & expression ─────────────
const emotions = ["joy at getting exam results", "fear during a thunderstorm", "anger in a traffic jam", "boredom in a long queue", "pride after finishing a marathon", "nervousness before a stage performance", "relief after finding a lost wallet", "loneliness at a crowded party", "excitement at the first rain", "tiredness after a long day of work", "embarrassment after slipping in public", "surprise at a birthday party"];
emotions.forEach((e, i) =>
  add({
    id: `st-emotion-${String(i + 1).padStart(2, "0")}-${slug(e)}`,
    kind: "test",
    category: "Emotion",
    subtopic: "studio.emotion",
    title: `Show the emotion: ${e}`,
    brief: `Show ${e} in TWO ways: (1) one person, full figure, where posture alone tells the emotion (no face details), and (2) a small scene where the setting and other people strengthen the feeling.`,
    minutes: 15,
    hints: ["Start with the line of action of the spine.", "Exaggerate the pose a little.", "Use weather, light or empty space to add feeling."],
    checklist: ["Posture alone communicates the emotion", "Figure proportions are believable", "The scene adds context that strengthens the feeling", "Clear silhouette", "Not relying on facial details"],
    phases: ["P1", "P2"],
    difficulty: 3,
    source: "Practice",
  }),
);

// ───────────── 17. Pattern & motif ─────────────
const motifs = ["a peacock", "a lotus", "a coconut tree", "a temple bell", "a parrot", "a mango", "an auto-rickshaw", "a Channapatna toy", "rangoli dots", "a fish", "an elephant", "a kite"];
motifs.forEach((m, i) =>
  add({
    id: `st-pattern-${String(i + 1).padStart(2, "0")}-${slug(m)}`,
    kind: i % 2 ? "test" : "daily",
    category: "Pattern & motif",
    subtopic: "studio.pattern",
    title: `Motif and pattern from ${m}`,
    brief: `Simplify ${m} into a motif in 3 stages (realistic → simplified → geometric). Then use your geometric motif to make a border pattern AND an all-over repeat pattern, as if for a textile.`,
    minutes: i % 2 ? 20 : 35,
    materials: ["pencil", "fine-liner", "colours optional"],
    hints: ["Keep the most recognisable feature (a peacock's crest, a mango's curve).", "Use a grid to repeat the motif accurately.", "Alternate direction or colour to create rhythm."],
    checklist: ["Three clear stages of simplification", "The final motif is still recognisable", "Border pattern repeats accurately", "All-over pattern has rhythm and balance", "Suitable for a textile"],
    phases: ["P1", "P2", "P4"],
    difficulty: 3,
    source: "Practice",
  }),
);

// ───────────── 18. Composition with given shapes ─────────────
const shapeSets = ["3 circles and 2 triangles", "5 squares of different sizes", "1 large circle and 7 small dots", "4 straight lines and 1 curve", "2 rectangles and 3 semicircles", "a triangle, a square, a circle and a star", "6 identical squares", "3 spirals and 2 lines", "1 big triangle and many small triangles", "2 circles, 2 squares and 2 triangles"];
shapeSets.forEach((s, i) =>
  add({
    id: `st-composition-${String(i + 1).padStart(2, "0")}-${slug(s)}`,
    kind: "test",
    category: "Composition",
    subtopic: "studio.composition",
    title: `Compose with ${s}`,
    brief: `Using only ${s} (any size, may overlap, may be cut by the frame), make TWO compositions in two 12 × 12 cm boxes: (1) one that feels calm and (2) one that feels energetic. Use only black and one other colour.`,
    minutes: 15,
    materials: ["pencil", "black sketch pen", "one colour"],
    hints: ["Calm: horizontals, symmetry, space. Energetic: diagonals, tension, crowding.", "Let one element dominate.", "Use the edge of the frame on purpose."],
    checklist: ["Only the given shapes are used", "The two compositions feel clearly different", "Each has a clear focal point", "Colour is used deliberately", "Good use of positive and negative space"],
    phases: ["P1", "P2"],
    difficulty: 2,
    source: "Practice",
  }),
);

// ───────────── 19. Mains: model making, materials, AV perception, presentation ─────────────
const models: [string, string, string[]][] = [
  ["a chair for a doll that can hold a 200 g weight", "paper or card only, with glue", ["paper/card", "glue", "scissors"]],
  ["a bridge spanning 30 cm that holds a full water bottle", "ice-cream sticks and thread", ["ice-cream sticks", "thread", "glue"]],
  ["a container that protects a raw egg dropped from 2 metres", "newspaper and tape only", ["newspaper", "tape"]],
  ["a lamp shade that throws an interesting pattern on the wall", "card and a phone torch", ["card", "cutter", "phone torch"]],
  ["a toy that moves when you blow on it", "paper, straws and pins", ["paper", "straws", "pins"]],
  ["a model of your dream bus shelter at 1:50 scale", "card, sticks and found objects", ["card", "sticks", "found objects"]],
  ["a wearable object (bangle or headband) inspired by nature", "wire and leaves", ["wire", "leaves", "thread"]],
  ["a pen stand that shows your personality", "clay", ["clay"]],
  ["a tall tower that stands on its own", "20 sheets of newspaper and tape", ["newspaper", "tape"]],
  ["a game for two players using only found objects", "anything from your house", ["found objects"]],
  ["an animal made from one folded sheet without cutting", "one A4 sheet", ["paper"]],
  ["a musical instrument that plays at least 3 notes", "bottles, rubber bands, tins", ["found objects"]],
  ["a mobile (hanging sculpture) that balances", "wire, thread and card", ["wire", "thread", "card"]],
  ["a model of a seat for an elderly person at a bus stop, 1:10 scale", "card and clay", ["card", "clay"]],
  ["a package for 6 eggs without plastic", "card and paper", ["card", "paper"]],
  ["a relief tile showing a festival", "clay", ["clay"]],
  ["a kinetic toy for a toddler", "card, thread and a straw", ["card", "thread", "straw"]],
  ["a model of a playground for a small space, 1:50 scale", "card and wire", ["card", "wire"]],
  ["a face mask expressing an emotion", "paper plate and found materials", ["paper plate", "found materials"]],
  ["a structure that holds a book 10 cm above the table", "drinking straws and pins", ["straws", "pins"]],
];
models.forEach(([what, using, materials], i) =>
  add({
    id: `st-model-${String(i + 1).padStart(2, "0")}-${slug(what)}`,
    kind: i < 6 ? "daily" : "mains",
    category: "Model making",
    subtopic: "mains.model",
    title: `Make: ${what}`,
    brief: `Build ${what}, using ${using}.\n\nPhotograph your model from 3 angles and add a page with 3 quick concept sketches you made before building, plus 3 lines on what you'd change in version 2.`,
    minutes: i < 6 ? 45 : 60,
    sheet: "A4 + model",
    materials,
    hints: ["Sketch 3 ideas before you cut anything.", "Test the weakest joint first.", "Triangles and folds add strength to paper and card."],
    checklist: ["The model meets the brief (it actually works)", "Concept sketches show 3 different ideas", "Clean craftsmanship: joints and edges", "Creative use of the given material", "Clear reflection on version 2"],
    phases: i < 6 ? ["P4", "P5"] : ["P5"],
    difficulty: 3,
    source: "Practice",
  }),
);
const materialsExplore: [string, string][] = [
  ["paper", "Make 12 different textures or forms from plain paper: fold, crumple, tear, roll, cut, pleat, weave. Arrange them on a board and name each technique."],
  ["clay", "Make 10 small clay tiles, each with a different texture made from things around you (a leaf, a comb, a bottle cap, fabric). Label what made each texture."],
  ["wire", "Use one long piece of wire to make a continuous-line figure of a person doing an action. Then make a second version that is more abstract."],
  ["found objects", "Collect 15 small objects from your house. Arrange them into a face, then into an animal, then into a landscape. Photograph all three arrangements."],
  ["thread and nails", "On a board with nails or pins, use thread to create a pattern that suggests movement."],
  ["leaves and flowers", "Make a colour gradient from leaves and petals collected in one walk, from lightest to darkest, and photograph it."],
  ["cardboard", "Make a self-supporting structure using only slot joints (no glue, no tape)."],
  ["fabric scraps", "Create a small collage showing a place you love, using only fabric scraps and thread."],
  ["newspaper", "Make a 3D letter (the first letter of your name) that can stand on its own."],
  ["light and shadow", "Using a torch and cut-paper shapes, create a shadow scene that tells a tiny story. Photograph it."],
];
materialsExplore.forEach(([m, brief], i) =>
  add({
    id: `st-material-${String(i + 1).padStart(2, "0")}-${slug(m)}`,
    kind: "mains",
    category: "Material exploration",
    subtopic: "mains.material",
    title: `Explore material: ${m}`,
    brief: `${brief}\n\nPhotograph the result and write 3 lines on what you discovered about the material.`,
    minutes: 40,
    sheet: "A4 + objects",
    materials: [m],
    hints: ["Play first; judge later.", "Push the material until it does something unexpected.", "Good photos: plain background, side light."],
    checklist: ["A real range of experiments, not repeats", "At least one surprising result", "Careful presentation and photos", "Clear written reflection"],
    phases: i % 2 ? ["P4", "P5"] : ["P5"],
    difficulty: 2,
    source: "Practice",
  }),
);
const av: [string, string][] = [
  ["Listen to rain on a tin roof (or play rain sounds). Draw what the sound looks like without drawing rain itself: only lines, marks and textures.", "Sound to marks"],
  ["Stand at a busy road for 3 minutes with your eyes closed and list every sound you hear. Then make a 'sound map' drawing that places each sound around you.", "Sound map"],
  ["Watch any 30-second scene from a window. Look away and draw everything you remember. Then look again and add in another colour what you missed.", "Observe and recall"],
  ["Listen to a piece of classical music (any raga) for 2 minutes. Draw the changes in mood as a colour strip from left to right.", "Music to colour"],
  ["Listen to a crowded market for 2 minutes. Draw 5 small vignettes of the sounds you heard: who or what made them.", "Sound vignettes"],
  ["Close your eyes, touch 5 objects in your room and draw each from touch alone. Then open your eyes and compare.", "Touch drawing"],
  ["Watch someone cooking for 5 minutes. Draw a storyboard of the sequence from memory, focusing on hand movements.", "Action recall"],
  ["Look at a photo of a crowded scene for 20 seconds, then hide it and draw it. Repeat with a new photo; see if you improve.", "Memory sprint"],
  ["Smell 4 spices (cardamom, clove, cumin, pepper). Create an abstract shape and colour for each smell.", "Smell to form"],
  ["Record 1 minute of sound in your house. Listen back and design a set of 4 pictograms for the sounds.", "Sound pictograms"],
];
av.forEach(([brief, title], i) =>
  add({
    id: `st-av-${String(i + 1).padStart(2, "0")}-${slug(title)}`,
    kind: "mains",
    category: "Audio-visual perception",
    subtopic: "mains.av",
    title: `Perception: ${title}`,
    brief,
    minutes: 25,
    hints: ["Translate qualities (fast/slow, sharp/soft, loud/quiet) into marks and colour.", "Don't draw the literal object unless asked.", "Note your first impressions quickly."],
    checklist: ["Responds to the sensory input, not a cliché", "Varied marks, textures or colours", "Clear link between what was sensed and what was drawn", "A short written note explains the choices"],
    phases: ["P4", "P5"],
    difficulty: 3,
    source: "Practice",
  }),
);
const presentations = ["the model you are proudest of", "your best studio sheet this month", "a craft from your region", "a problem in your town and your solution", "your favourite designed object", "how you would improve your school", "a designer you admire", "your sketchbook", "a mistake that taught you something", "why you want to study at NID"];
presentations.forEach((p, i) =>
  add({
    id: `st-present-${String(i + 1).padStart(2, "0")}-${slug(p)}`,
    kind: "mains",
    category: "Presentation",
    subtopic: "mains.presentation",
    title: `Present: ${p}`,
    brief: `Prepare a 2-minute explanation of ${p}. Make ONE A4 sheet that supports what you say (sketches, key words, a simple diagram). Record yourself explaining it with the sheet in the Interview section, then upload the sheet here.`,
    minutes: 30,
    hints: ["Structure: what → why → how → what next.", "One sheet, big visuals, few words.", "Practise out loud twice before recording."],
    checklist: ["A clear structure", "The sheet supports the talk (not a copy of it)", "Specific examples", "Ends with a reflection or next step"],
    phases: ["P5"],
    difficulty: 3,
    source: "Practice",
  }),
);

// ───────────── 20. Sketchbook challenges (daily habit builders) ─────────────
const sketchbook: [string, string][] = [
  ["20 hands", "Fill a page with 20 hands: holding, pointing, gripping, resting, waving. Use your own hand and family members' hands."],
  ["30 gesture figures", "Sit somewhere with people (a bus stop, a park, a shop) and draw 30 people in 30–60 seconds each. Capture only the action."],
  ["one object, 10 angles", "Choose a simple object (a mug, a shoe, a scissors) and draw it from 10 different angles on one page."],
  ["the same street, 3 times", "Draw the same street view in the morning, afternoon and evening. Notice how light and shadows change."],
  ["a page of ellipses", "Draw 40 ellipses of cups, plates, wheels and bottles at different eye levels. Keep them smooth and symmetrical."],
  ["faces of your family", "Draw quick portraits of 4 family members without them posing. Focus on the shape of the head and one characteristic feature."],
  ["textures page", "Divide a page into 12 boxes and render 12 different textures you find at home: wood, cloth, metal, stone, plastic, leather…"],
  ["animals in motion", "Draw a cat, dog, cow or crow from life in at least 15 quick poses."],
  ["your morning in 9 frames", "Draw your morning routine as a 9-frame comic strip, with no words."],
  ["inside your bag", "Empty your school bag and draw everything in it as a carefully arranged 'knolling' layout (objects laid out at right angles)."],
  ["shadows only", "Draw a scene using only the shapes of shadows: no outlines."],
  ["from above", "Draw your dinner table from directly above (plan view), with every dish and hand."],
  ["window view, 5 minutes", "Draw the view from your window in 5 minutes, then again in 1 minute. Compare what you chose to keep."],
  ["vehicles", "Draw 10 different vehicles you see on the road in side view, each in under 2 minutes."],
  ["trees", "Draw 6 different trees, focusing on their overall silhouettes and how their branches grow."],
  ["drapery", "Hang a dupatta or towel over a chair and draw its folds carefully in light and shade."],
  ["a person working", "Draw a person at work (a cook, a tailor, a shopkeeper) in 3 drawings: full figure, hands at work, tools."],
  ["containers", "Draw 12 different containers from your kitchen in correct perspective, from the same eye level."],
  ["lettering", "Write your full name in 8 different lettering styles, each expressing a different mood."],
  ["crowd", "Draw a crowd of at least 25 people at different distances in one scene, keeping heads on the horizon line."],
  ["footwear", "Draw 8 pairs of footwear at the door of a house or temple, as they lie, in perspective."],
  ["night", "Draw a night scene lit by a single street light or lamp. Pay attention to where the light falls and fades."],
  ["your hand holding a pencil, 5 ways", "Draw your hand holding a pencil in 5 different grips, observing the foreshortening."],
  ["plants", "Draw a plant from 3 views and then one leaf in great detail."],
  ["one-line drawings", "Draw 10 everyday objects without lifting your pen from the paper."],
  ["reflections", "Draw 4 shiny objects (a steel plate, a spoon, a mirror, a glass) and the reflections in them."],
  ["a person sleeping", "Draw a family member resting or sleeping, from 3 angles."],
  ["street details", "Draw 12 small street details you normally ignore: a drain cover, a meter box, a sign, a broken tile…"],
  ["silhouettes", "Draw 15 everyday objects as solid black silhouettes. Which are recognisable and which aren't? Why?"],
  ["a corner of a shop", "Draw one corner of a small shop with all its products, signs and the shopkeeper."],
];
sketchbook.forEach(([title, brief], i) =>
  add({
    id: `st-sketchbook-${String(i + 1).padStart(2, "0")}-${slug(title)}`,
    kind: "daily",
    category: "Sketchbook challenge",
    subtopic: "studio.observation",
    title: `Sketchbook: ${title}`,
    brief: `${brief}\n\nWork in your sketchbook. Speed and quantity matter more than perfection today.`,
    minutes: 30,
    materials: ["pencil", "pen"],
    hints: ["Set a timer for each drawing.", "Keep your wrist loose; draw from the shoulder.", "Don't erase: draw a new line instead."],
    checklist: ["The full quantity is completed", "Drawings show observation, not memory or cliché", "Confident, varied line quality", "The page is well filled"],
    phases: i % 2 ? ["P1", "P2", "P4"] : ["P4", "P5"],
    difficulty: 2,
    source: "Practice",
  }),
);

// ───────────── 21. Mini design projects (daily) ─────────────
const projects: [string, string][] = [
  ["a better bus-stop bench for your town", "Observe the nearest bus stop for 10 minutes first. Then design a bench and shelter that suit the people you saw."],
  ["packaging for local jaggery", "Design packaging for jaggery sold by a farmer's cooperative: shape, material, label and how it is carried."],
  ["a logo for your school's eco-club", "Make 10 thumbnail logo ideas, develop 3, and finalise 1 in black and white and in colour."],
  ["a toy from waste", "Design a toy for 5-year-olds made from household waste. Draw how it's made in 4 steps and the child playing with it."],
  ["a stall for a pani-puri vendor", "Redesign a pani-puri cart for hygiene, monsoon protection and faster serving. Show the vendor using it."],
  ["a reading corner for a village school", "Design a corner that makes children want to read. Plan view, a 3D sketch, and the furniture details."],
  ["wayfinding for your school", "Design a set of 5 signs (pictograms and colours) that help visitors find the office, toilets, library, ground and exit."],
  ["a bag for carrying vegetables on a scooter", "Design a bag that hangs safely on a scooter and keeps vegetables from getting crushed."],
  ["a festival greeting card that becomes something useful", "Design a card that can be turned into something useful after the festival (a bookmark, a seed paper pot…)."],
  ["a tiffin for a construction worker", "Design a tiffin that keeps food warm until lunch, is easy to carry and easy to clean."],
  ["a pill organiser for grandparents", "Design a weekly pill organiser that an elderly person with poor eyesight can use without help."],
  ["a classroom chair for long exams", "Design a classroom chair and desk that are comfortable for 3-hour exams and can be stacked."],
  ["a shoe rack for a temple entrance", "Design a system for storing and returning hundreds of pairs of footwear quickly at a temple."],
  ["an alarm clock for a heavy sleeper", "Design an alarm clock that makes it really hard to oversleep, without disturbing the whole house."],
  ["a water dispenser for street animals", "Design a simple water bowl that stays clean and full for stray animals in summer."],
  ["a poster series about your town", "Design 3 posters that celebrate 3 things your town is known for, in one consistent style."],
  ["a ticket for a heritage site", "Design an entry ticket that people would want to keep as a souvenir."],
  ["a public drinking water point", "Design a drinking water point for a busy market: for adults, children and wheelchair users."],
  ["a menu card for a small eatery", "Design a menu card for a darshini (self-service eatery): easy to read from a distance, bilingual, with pictograms."],
  ["a cycle stand for a college", "Design a cycle stand that is cheap, secure, and fits many cycles in a small space."],
];
projects.forEach(([title, brief], i) =>
  add({
    id: `st-project-${String(i + 1).padStart(2, "0")}-${slug(title)}`,
    kind: "daily",
    category: "Mini design project",
    subtopic: "studio.redesign",
    title: `Mini project: ${title}`,
    brief: `${brief}\n\nShow: research notes (who, where, problems), 3 concept thumbnails, the final design with labels, and the user using it.`,
    minutes: 45,
    hints: ["Spend 10 minutes on observation/research before sketching.", "Thumbnails should be really different ideas, not small variations.", "Show the design in its real context."],
    checklist: ["Research notes identify the users and their problems", "Three clearly different concepts", "The final design is well drawn with clear labels", "Shown in use by the intended user", "Practical: could really be made"],
    phases: i % 2 ? ["P1", "P2"] : ["P4", "P5"],
    difficulty: 3,
    source: "Practice",
  }),
);

// ───────────── write ─────────────
const ids = new Set<string>();
for (const t of tasks) {
  if (ids.has(t.id)) throw new Error(`duplicate ${t.id}`);
  ids.add(t.id);
}
mkdirSync("content/studio", { recursive: true });
const groups = new Map<string, StudioTask[]>();
for (const t of tasks) groups.set(t.subtopic!.split(".")[0]!, [...(groups.get(t.subtopic!.split(".")[0]!) ?? []), t]);
for (const [g, list] of groups) writeFileSync(`content/studio/${g}.json`, JSON.stringify({ tasks: list }, null, 1) + "\n");
console.log(`✓ ${tasks.length} studio tasks → content/studio/ (${[...groups.keys()].join(", ")})`);
const byKind = tasks.reduce<Record<string, number>>((m, t) => ((m[t.kind] = (m[t.kind] ?? 0) + 1), m), {});
console.log(byKind);
const byPhase: Record<Phase, { test: number; daily: number; mains: number }> = { P1: { test: 0, daily: 0, mains: 0 }, P2: { test: 0, daily: 0, mains: 0 }, P3: { test: 0, daily: 0, mains: 0 }, P4: { test: 0, daily: 0, mains: 0 }, P5: { test: 0, daily: 0, mains: 0 } };
for (const t of tasks) for (const p of t.phases) byPhase[p as Phase][t.kind]++;
console.log(byPhase);
