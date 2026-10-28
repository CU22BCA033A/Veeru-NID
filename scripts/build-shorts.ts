/**
 * Builds content/items/short-*.json: short creative-answer prompts (ideation, empathy, naming,
 * captions, what-ifs, symbols, pictograms, problem finding). Each has a model answer and a
 * keyword rubric for the free auto-score.  npm run content:shorts
 */
import { writeFileSync } from "node:fs";
import type { ItemInput } from "../lib/content/schemas";

const items: ItemInput[] = [];
const add = (prefix: string, sub: string, d: number, stem: string, model: string[], keywords: string[], minIdeas: number, explanation: string, maxWords?: number, source: ItemInput["source"] = "Practice") => {
  items.push({
    id: `${prefix}-${String(items.filter((i) => i.id.startsWith(prefix)).length + 1).padStart(3, "0")}`,
    type: "short", subtopic: sub, difficulty: d, source, stem, imageIds: [],
    explanation, modelAnswer: model.map((m, i) => `${i + 1}. ${m}`).join("\n"),
    rubric: { keywords, minIdeas, ...(maxWords ? { maxWords } : {}) },
    tags: ["creative"], needsReview: false,
  });
};

// 1. Alternative uses: object → user/context, with sample ideas
const altUses: [string, string, string[], string[]][] = [
  ["a clothes-peg", "a farmer", ["Clip seed packets to a fence row as labels", "Hold a plastic sheet over a seedling bed", "Clip a torch to a shed beam at night", "Mark rows planted on the same day", "Keep a cattle-feed sack closed", "Clip a cloth over a water pot against dust", "Hold a tomato vine to its stick", "Pin bills and receipts to a wall string"], ["label", "seed", "sheet", "clip", "hold", "sack", "vine", "mark"]],
  ["a steel tumbler", "a classroom teacher", ["Pen and chalk holder", "Rhythm instrument for a music game", "A measuring cup for a science demo", "Paperweight on a windy day", "Mould for clay or sand models", "A 'question jar' for students' doubts", "Ring a spoon on it as a soft bell for attention", "Stand for a small plant on the desk"], ["holder", "music", "measure", "weight", "mould", "jar", "bell", "plant"]],
  ["a bicycle wheel", "a children's park", ["A spinning bird feeder", "A hanging planter frame", "A wind-chime ring", "A ring-toss target", "A sundial face", "A rotating chalkboard", "A climbing-net anchor", "A water-wheel toy in a sand pit"], ["spin", "feeder", "planter", "chime", "target", "sundial", "board", "water"]],
  ["an old saree", "a hospital", ["Privacy curtain between beds", "Soft sling for an injured arm", "Wall hangings that make wards cheerful", "Cloth bags for patients' belongings", "Shade cloth in the waiting area", "Padded cover for metal bed rails", "Strips to tie and mark visitor queues", "A quilt layered into a blanket"], ["curtain", "sling", "bag", "shade", "cover", "quilt", "privacy", "decor"]],
  ["a plastic bottle", "a street vendor", ["Drip irrigation for a balcony plant", "Coin holder cut in half", "A funnel for pouring oil", "A float to keep a tarpaulin edge visible", "A scoop for grain", "A lamp shade with a phone torch", "A rain gauge", "A sprinkler for cooling the road dust"], ["funnel", "scoop", "coin", "lamp", "drip", "gauge", "sprinkler", "holder"]],
  ["a cardboard box", "a hostel student", ["Under-bed drawer", "Laptop stand", "Shoe rack with dividers", "Noticeboard", "Charging-cable organiser", "Dirty-laundry hamper", "Bedside table", "A light box for tracing drawings"], ["drawer", "stand", "rack", "board", "organiser", "table", "hamper", "storage"]],
  ["a coconut shell", "a garden", ["Planter for succulents", "Bird feeder", "Bird bath", "Scoop for compost", "Mould for garden stepping-stones", "Hanging lamp shell", "Seedling pot that can be buried", "Wind chime"], ["planter", "feeder", "bath", "scoop", "pot", "lamp", "chime", "compost"]],
  ["an old toothbrush", "a cycle-repair shop", ["Cleaning the chain", "Scrubbing grease off gears", "Applying oil to small parts", "Cleaning spoke nipples", "Brushing rust off bolts", "Cleaning tyre treads", "Spreading glue for puncture patches", "Dusting small tools"], ["chain", "clean", "oil", "rust", "gear", "glue", "scrub", "grease"]],
  ["a newspaper", "a painter", ["Floor protection while painting", "Masking edges", "Mixing palette", "Wiping brushes", "Texture stamping with crumpled paper", "Stencils", "Wrapping wet brushes", "Collage material"], ["floor", "mask", "palette", "wipe", "texture", "stencil", "wrap", "collage"]],
  ["a bucket", "a music class", ["Drum", "Resonating chamber for a homemade string instrument", "Shaker with stones inside", "Stand for a speaker", "Seat for a tabla player", "Echo chamber for vocal exercises", "Storage for small instruments", "Rhythm-game target"], ["drum", "shaker", "beat", "rhythm", "seat", "stand", "echo", "sound"]],
  ["a rubber band", "an office worker", ["Cable tie", "Grip on a jar lid", "Phone-stand helper", "Bookmark on a notebook", "Bundle pens", "Non-slip pad on a glass", "Stop a door from closing", "Reminder band on the wrist"], ["cable", "grip", "bookmark", "bundle", "slip", "reminder", "tie", "hold"]],
  ["an egg tray", "a home recording studio", ["Sound-dampening wall panels", "Mic stand cushion", "Cable organiser", "Desk organiser for small items", "Seedling tray for desk plants", "Paint palette for artwork", "Soft protector for fragile gear", "Pin-up board for notes"], ["sound", "panel", "cushion", "organiser", "palette", "tray", "dampen", "board"]],
  ["a PVC pipe", "a balcony", ["Vertical herb garden", "Bird feeder tube", "Shoe rack", "Hanging clothes rail", "Drip-irrigation line", "Umbrella stand", "Wind chime", "Cable/hose guide"], ["garden", "feeder", "rack", "rail", "drip", "stand", "chime", "guide"]],
  ["a matchbox", "a craft class", ["Mini drawer unit", "Stamp for printing patterns", "Puppet theatre stage", "Tiny gift box", "Building blocks for a model city", "Storage for beads", "A pinhole camera body", "Frame for miniature art"], ["drawer", "stamp", "puppet", "gift", "model", "storage", "frame", "box"]],
  ["a broken umbrella", "a fisherman", ["Canopy over a boat seat", "Frame for drying fish", "Ribs as fishing-line spools", "Waterproof cover for nets", "Wind shield for a stove", "Float marker frame", "Spokes as small hooks", "Cloth as a carry bag"], ["canopy", "dry", "cover", "shield", "frame", "hook", "bag", "spool"]],
  ["a wooden ice-cream stick", "a first-aid kit", ["Finger splint", "Tongue depressor", "Ointment spreader", "Labelling medicine bottles", "Stirring a sachet into water", "Holding a bandage while tying", "Marking the date of a wound dressing", "Stiffening a sling"], ["splint", "spread", "label", "stir", "bandage", "support", "mark", "tongue"]],
  ["a glass jar", "a sweet shop", ["Display jars for sweets", "A tip jar", "Lantern with a candle", "A sample-tasting container", "Storage for spices", "A sugar shaker with a punched lid", "Money counter for coins", "Display for a shop's best seller"], ["display", "tip", "lantern", "storage", "sample", "shaker", "coins", "jar"]],
  ["a jute sack", "a sports day", ["Sack race", "Target for bean-bag toss", "Seat mats for spectators", "Finish-line banner", "Goal net", "Equipment carrier", "Shade sheet", "Tug-of-war marker"], ["race", "target", "mat", "banner", "goal", "carry", "shade", "marker"]],
  ["an old school bag", "a village library", ["Mobile book-lending bag", "Wall organiser for magazines", "Rain cover for books", "Donation collection bag", "Children's story-time prop bag", "Hanging storage for stationery", "Cushion stuffed with cloth", "Return box"], ["lending", "organiser", "cover", "donation", "storage", "cushion", "return", "carry"]],
  ["a spoon", "a tailoring shop", ["Smoothing seams", "Pressing buttons", "Measuring small quantities of beads", "Turning collar points", "Scooping pins", "Weight to hold fabric", "Tracing curves", "Holding a thread spool"], ["seam", "press", "measure", "scoop", "weight", "trace", "hold", "collar"]],
  ["a cloth bag", "a hospital bedside", ["Hanging pocket for a patient's phone and specs", "Urine-bag cover for dignity", "Pillow cover", "Medicine organiser with sections", "Hot-water-bottle cover", "Visitor's lunch carrier", "Laundry bag", "Cover for an IV pole hook"], ["pocket", "cover", "organiser", "pillow", "dignity", "laundry", "phone", "medicine"]],
  ["a coconut-leaf broom stick", "a school", ["Pointer for the blackboard", "Garden plant support", "Kite frame", "Model-making skewers", "Stirring paint", "Measuring stick", "Letters for a craft project", "Fence for a sand-pit model"], ["pointer", "support", "kite", "model", "stir", "measure", "craft", "fence"]],
  ["an old tyre", "a playground", ["Swing", "Sandpit border", "Climbing wall steps", "Planter", "Seat", "Obstacle course rings", "Tunnel", "Rolling game"], ["swing", "sandpit", "climb", "planter", "seat", "obstacle", "tunnel", "roll"]],
  ["a steel plate", "a camping trip", ["Signal mirror", "Frying pan over a fire", "Shovel for digging", "Fan for the fire", "Cutting board", "Drum to scare animals", "Lid for a pot", "Tray to carry food"], ["mirror", "pan", "dig", "fan", "board", "drum", "lid", "tray"]],
  ["a paper cup", "a science class", ["String telephone", "Seedling pot", "Measuring water", "Model volcano base", "Pinhole viewer", "Sound amplifier for a phone", "Insulation experiment", "Pendulum weight holder"], ["telephone", "seed", "measure", "volcano", "pinhole", "sound", "insulation", "pendulum"]],
];
altUses.forEach(([obj, user, ideas, kw]) => {
  add("sh-uses", "creative.alt-uses", 2, `List 8 uses of ${obj} for ${user}, other than its normal use. One idea per line.`, ideas, kw, 8, `Strong answers use different properties of ${obj} (its shape, material, size, whether it's hollow, flexible or reflective) and think about ${user}'s real daily needs. Avoid repeating one idea in different words.`);
});
// same objects, different twist: combine uses for a disaster-relief camp
const reliefObjects = ["a plastic bottle", "a cardboard box", "a bicycle wheel", "an old saree", "a jute sack", "a coconut shell", "a bucket", "a newspaper", "a steel plate", "a PVC pipe"];
reliefObjects.forEach((obj) =>
  add("sh-relief", "creative.alt-uses", 3, `A flood-relief camp has hundreds of ${obj.replace(/^an? /, "")}s but little else. Suggest 6 ways they could help people in the camp.`, ["Shelter or shade", "Water collection or storage", "Sanitation or hygiene", "Signals or wayfinding", "Comfort for children or elderly", "Cooking or food handling"], ["shelter", "water", "signal", "store", "clean", "children", "cook", "sleep", "light", "sign"], 6, `Think about the camp's real needs: water, shelter, hygiene, sleeping, cooking, children, finding people. Good answers map ${obj}'s properties onto those needs.`),
);

// 2. User empathy: list problems a user faces in a place
const empathy: [string, string, string[]][] = [
  ["an elderly person", "a bus stop", ["High step into the bus", "Nowhere to sit while waiting", "Can't read small route numbers", "Bus leaves before they're seated", "No shade or rain cover", "Crowd pushing at the door"]],
  ["a wheelchair user", "a railway station", ["Steps to platforms", "Gap between train and platform", "Ticket counters too high", "Toilets not accessible", "Crowds block movement", "Announcements hard to locate"]],
  ["a mother with a baby", "a crowded market", ["No place to feed or change the baby", "Pram can't move between stalls", "Hands full with baby and bags", "Heat and noise upset the baby", "No clean water", "Fear of losing things in the crowd"]],
  ["a blind student", "a school campus", ["No tactile paths", "Notice boards are visual only", "Obstacles in corridors", "Inaccessible textbooks", "Hard to find classrooms", "Classmates move furniture around"]],
  ["a street vendor", "the monsoon", ["Goods get wet", "Customers stay home", "Cart wheels stuck in mud", "Electric wires and water risk", "No place to store stock", "Illness from standing in the rain"]],
  ["a delivery rider", "a heatwave", ["Dehydration", "Hot seat and handlebars", "No place to rest in shade", "Phone overheats", "Food packages get warm", "Sunburn and fatigue"]],
  ["a first-time voter", "a polling booth", ["Doesn't know where the booth is", "Confused by the queue system", "Unsure how the machine works", "Nervous about making a mistake", "Long waiting time", "Unclear which ID to bring"]],
  ["a farmer", "a weekly market", ["Transporting produce", "Crushed or spoiled produce", "Middlemen take profits", "No weighing scale he trusts", "No shade for stock", "Unsold produce at the end"]],
  ["a child", "a hospital waiting room", ["Boredom", "Fear of doctors and needles", "Uncomfortable adult-size chairs", "Can't see over counters", "Exposure to infections", "Parents too busy to explain"]],
  ["a tourist who doesn't speak Kannada", "Bengaluru's city buses", ["Can't read route boards", "Doesn't know fares", "Doesn't know where to get off", "Crowded doors", "Confusing bus stands", "Fear of being overcharged"]],
  ["an elderly person", "an ATM", ["Small screen text", "Too many steps", "Fear of fraud", "Time-out before finishing", "Card slot hard to find", "Queue behind them causes pressure"]],
  ["a pregnant woman", "a city bus", ["No reserved seat available", "Sudden braking", "Crowds pushing", "High steps", "Heat and poor ventilation", "Long standing time"]],
  ["a construction worker", "a building site", ["Heavy lifting", "Heat exposure", "No clean drinking water", "Unsafe scaffolding", "No toilets", "Noise and dust"]],
  ["a student", "online classes on a phone", ["Small screen", "Poor network", "Eye strain", "Distracting notifications", "Can't ask questions easily", "Battery runs out"]],
  ["a cook", "a small hotel kitchen", ["Heat and smoke", "Slippery floors", "Cramped space", "Heavy vessels", "Rushed orders", "Burns from steam"]],
  ["a traffic policeman", "a busy junction", ["Pollution", "Heat and rain", "Standing for hours", "No toilet nearby", "Noise", "Drivers ignore signals"]],
  ["a left-handed student", "a classroom", ["Desks with right-side arm rests", "Smudging ink while writing", "Scissors designed for right hands", "Spiral notebooks hurt the hand", "Bumping elbows with neighbours", "Computer mouse placement"]],
  ["a person carrying a gas cylinder", "an apartment with no lift", ["Heavy weight on stairs", "Narrow staircase", "Risk of dropping it", "Back strain", "Nowhere to rest midway", "Unsafe for children nearby"]],
  ["an elderly couple", "a temple festival", ["Crowds and pushing", "Long queues in the sun", "Steep steps", "Lost footwear", "Losing each other", "No seating"]],
  ["a school bus driver", "the school gate at 8 am", ["Parents' vehicles blocking", "Children running across", "No proper stop", "Time pressure", "Horn noise", "Poor visibility of small children"]],
  ["a girl cycling to school", "a rural road", ["Potholes", "No street lights", "Stray dogs", "Heavy vehicles", "Rain and mud", "Heavy school bag on the cycle"]],
  ["a hospital night-shift nurse", "the ward at night", ["Low light for reading charts", "Waking patients when checking", "Long walking distances", "Fatigue", "Alarms from many machines", "Nowhere to rest"]],
  ["a person with a broken leg", "their own home", ["Toilet hard to use", "Stairs", "Reaching high shelves", "Cooking while standing", "Carrying things on crutches", "Bathing safely"]],
  ["an auto-rickshaw driver", "a rainy evening", ["Water entering from the sides", "Slippery roads", "Passengers bargaining", "Poor visibility", "Engine stalling in water", "Long working hours"]],
  ["a small child", "a public toilet", ["Can't reach the basin", "Seat too large", "Can't lock the door", "Floor is wet and slippery", "Scary hand dryers", "Parent of a different gender can't enter"]],
];
empathy.forEach(([user, place, problems]) =>
  add("sh-empathy", "creative.empathy", 2, `List 6 problems ${user} faces at ${place}. Be specific.`, problems, problems.flatMap((p) => p.toLowerCase().split(/\s+/).filter((w) => w.length > 4)).slice(0, 12), 6, `Walk through the experience step by step from ${user}'s point of view: physical, sensory, information, safety and emotional problems. Specific problems you can picture beat general words like 'difficulty'.`),
);

// 3. Naming & slogans
const naming: [string, string[]][] = [
  ["a bus-stop bench that also collects rainwater for plants", ["RainRest", "Sit & Sprout", "Slogan: 'Wait a while, grow a mile'"]],
  ["a lunchbox that keeps food warm for 6 hours", ["WarmBite", "Dabba Garam", "Slogan: 'Home-hot at noon'"]],
  ["an app that teaches grandparents to use smartphones", ["TapSeekho", "Ajji Online", "Slogan: 'Never too late to tap'"]],
  ["a kit for repairing clothes at home", ["Mend-It Box", "Stitch Saathi", "Slogan: 'Fix it, don't bin it'"]],
  ["a biodegradable plate made from areca leaves", ["Leafware", "Patte Plates", "Slogan: 'Eat. Compost. Repeat.'"]],
  ["a school bag that spreads weight on both shoulders", ["BackBuddy", "Halka Bag", "Slogan: 'Carry more, feel less'"]],
  ["a water filter for villages that needs no electricity", ["PureDrop", "Jal Shuddhi", "Slogan: 'Clean water, no current needed'"]],
  ["a festival lamp made from recycled bottles", ["Re-Diya", "BottleGlow", "Slogan: 'Light that remembers'"]],
  ["a cycle-sharing service for a college campus", ["PedalPool", "CampusCycle", "Slogan: 'Ride, park, share'"]],
  ["a toy made by Channapatna artisans for modern kids", ["Turn & Learn", "LacPlay", "Slogan: 'Old craft, new play'"]],
  ["a helmet for delivery riders with a cooling fan", ["CoolRide", "BreezeGuard", "Slogan: 'Keep your head, keep it cool'"]],
  ["a reading lamp powered by a hand crank", ["CrankLight", "Roshni Ghumao", "Slogan: 'Turn it, learn it'"]],
  ["a millet snack brand for teenagers", ["Milletz", "Ragi Rush", "Slogan: 'Ancient grain, new game'"]],
  ["a raincoat for school children that folds into a pouch", ["PocketPour", "Rain Mitra", "Slogan: 'Rain? Ready.'"]],
  ["a clinic on a bus that visits villages", ["HealthWheels", "Arogya Ratha", "Slogan: 'Care that comes to you'"]],
  ["a weaving cooperative selling online", ["LoomLink", "Nool Bazaar", "Slogan: 'From our loom to your room'"]],
  ["a smart medicine box that reminds elderly people", ["DoseDost", "Pill Pal", "Slogan: 'Never miss a beat'"]],
  ["a community kitchen for students", ["Thali Together", "Common Pot", "Slogan: 'Cook once, feed many'"]],
  ["a bag made from old cement sacks", ["SackChic", "Re-Bag", "Slogan: 'Strong enough for any second life'"]],
  ["a city clean-up volunteer group", ["Clean Squad", "Namma Swachha", "Slogan: 'Our street, our pride'"]],
];
naming.forEach(([product, ideas]) =>
  add("sh-name", "creative.naming", 2, `Suggest 2 names and 1 slogan (max 6 words) for ${product}. Say in one line why your best name works.`, ideas, ["name", "slogan", "because", "short", "memorable"], 3, "Good names are short, easy to say and fit the product's character; local words can add warmth. A slogan states the benefit or feeling in a few words. Saying why shows design thinking.", 50),
);

// 4. Captions
const captions: [string, string][] = [
  ["a boy sharing his umbrella with a stray dog at a bus stop", "Two strangers, one umbrella: the bus can wait a little longer."],
  ["an old woman teaching her granddaughter to make rangoli at dawn", "Every dot she places is a lesson passed on before the sun comes up."],
  ["a delivery rider resting under a tree on a hot afternoon", "Ten minutes of shade before forty more deliveries in the heat."],
  ["a flooded street where children float paper boats", "The street drowned, but their boats still found a way."],
  ["a potter's hands shaping a pot on the wheel", "Mud becomes a pot only when the hands are patient."],
  ["a crowded local train with people helping a man with crutches board", "In the morning rush, twenty hands made room for one."],
  ["a girl studying under a street light", "The street light works the night shift for her dreams."],
  ["a farmer looking at a cracked, dry field", "He waits for the sky while his loan waits for him."],
  ["a family sharing one plate of food during a festival", "One plate, four hands, endless conversation."],
  ["a cleaner sweeping a market after everyone has left", "When the noise is gone, someone stays to clean up our day."],
  ["a traffic jam with an ambulance stuck in the middle", "Somewhere in this crowd, a minute decides a life."],
  ["a lake full of plastic bottles with ducks swimming between them", "The ducks didn't throw it, but they live in it."],
  ["children playing cricket in a narrow lane", "Every window in this lane has seen a six."],
  ["an empty classroom with one chair left on a desk", "The bell rang an hour ago; the questions are still in the room."],
  ["an artisan weaving a sari on a handloom", "Six yards, three weeks, one weaver's patience."],
  ["a grandfather and grandson flying a kite on a terrace", "Seventy years apart, holding the same string."],
  ["a mobile phone shop with a long queue of elderly people", "New phones, old hands, and a lot of patience."],
  ["a vendor covering his fruit cart with plastic sheets in the rain", "The rain came fast; his hands were faster."],
  ["a doctor reading a child's drawing in a hospital", "Some prescriptions start with a crayon."],
  ["a crowded bus stop with no shelter in the rain", "Waiting is easy; waiting in the rain is a design problem."],
];
captions.forEach(([scene, model]) =>
  add("sh-caption", "creative.caption", 2, `Write a caption of no more than 20 words for an illustration of ${scene}. It should add something the picture can't show.`, [model], ["feel", "wait", "time", "one", "every", "still", "only", "because"], 1, "A strong caption adds emotion, time, sound or meaning instead of describing what we can already see. Count your words: 20 is the limit.", 20),
);

// 5. What-if scenarios
const whatIfs: [string, string[]][] = [
  ["all vehicles in your city were banned on Sundays", ["Streets become play and market spaces", "Cycle and walking demand grows", "Ambulances need special routes", "Shops near homes do better", "Air and noise improve", "Weekend deliveries move to Saturday"]],
  ["schools started at 10 am instead of 8 am", ["Students sleep more", "Traffic peaks change", "Parents' work timings clash", "Afternoon heat during sports", "School buses reschedule", "Evening study time shrinks"]],
  ["plastic bags disappeared overnight", ["People carry cloth bags", "Shops need new packaging", "Wet goods are a problem", "Demand for paper and jute rises", "Drains clog less", "Prices change briefly"]],
  ["everyone had to work from home for a year", ["Homes need work corners", "Offices empty", "Internet demand rises", "Loneliness increases", "Less commuting pollution", "Local shops benefit"]],
  ["your town had no electricity from 6 pm to 6 am every day", ["Solar lamps become essential", "Shops close early", "Study habits shift to mornings", "Food storage problems", "Safety at night concerns", "Community gatherings revive"]],
  ["every building had to grow food on its roof", ["New roof structures needed", "Water supply for rooftops", "Neighbours share produce", "Roofs stay cooler", "Jobs for urban farmers", "Birds and insects return"]],
  ["all signs in your city had to work without any words", ["Pictogram systems needed everywhere", "Colour coding matters", "Tourists find it easier", "Non-readers are included", "Shop identity relies on symbols", "Designers must test meanings"]],
  ["phones could only be used for one hour a day", ["People talk face to face more", "Paper maps return", "Payments change", "Emergencies need landlines", "Reading increases", "Businesses rethink apps"]],
  ["it rained every day of the year in your town", ["Roofs and drains redesigned", "Umbrella and raincoat industry grows", "Outdoor markets get covered", "Crops change", "Mould problems indoors", "Streets need better drainage"]],
  ["every school uniform had to be designed by students", ["More comfort and climate-suitable fabrics", "Local identity in designs", "Debates about rules", "Pride in wearing it", "Cost concerns", "Design competitions each year"]],
  ["all lifts in your city stopped working for a month", ["Elderly people stuck at home", "Deliveries become harder", "Stair design matters more", "Neighbours help each other", "Offices move to lower floors", "Fitness improves"]],
  ["your school had no walls, only a roof", ["Natural ventilation and light", "Noise between classes", "Rain and wind problems", "Safety concerns", "Learning outdoors with nature", "Movable partitions needed"]],
];
whatIfs.forEach(([scenario, ideas]) =>
  add("sh-whatif", "creative.what-if", 3, `What if ${scenario}? List 6 consequences, including at least 2 opportunities for designers.`, ideas, ["design", "people", "need", "new", "problem", "opportunity", "change", "safety"], 6, "Think in layers: immediate effects, effects on different people (children, elderly, workers, businesses), and new needs that create design opportunities.", undefined, "Expected-2027"),
);

// 6. Word to visual symbols
const words = ["freedom", "patience", "friendship", "pollution", "hope", "time", "knowledge", "peace", "growth", "balance", "silence", "speed", "trust", "home", "change", "memory", "care", "energy", "connection", "courage", "harmony", "kindness", "progress", "safety", "celebration"];
const wordIdeas: Record<string, string[]> = {
  freedom: ["Open birdcage", "Broken chain turning into birds", "Kite string cut", "Open window with curtains flying", "Footprints leaving a box", "Hands releasing a balloon"],
  patience: ["Seed under soil with a clock", "Snail on a long path", "Potter's wheel", "Candle melting slowly", "Hourglass with a sprout", "Fisherman waiting"],
  friendship: ["Two hands forming a heart", "Shared umbrella", "Two cups clinking", "Tied threads", "Two halves of a broken biscuit", "Interlinked rings"],
  pollution: ["Fish in a bottle", "Lungs made of smoke", "Earth wearing a mask", "Chimney turning into a cigarette", "Tree with plastic leaves", "Grey rainbow"],
  hope: ["Sprout from a crack", "Candle in the dark", "Rainbow after rain", "Open door with light", "Ladder towards a star", "Bird on a broken branch singing"],
  time: ["Melting ice cube", "Hourglass", "Tree rings", "Sun moving across a window", "Footprints fading", "Candle burning down"],
  knowledge: ["Book as a lamp", "Key in a book", "Tree with book leaves", "Light bulb in a head", "Owl", "Open door made of pages"],
  peace: ["Hand releasing a dove", "Olive branch", "Calm lake reflection", "Broken sword with a flower", "Folded hands", "Two flags tied together"],
  growth: ["Sprout", "Stairs made of books", "Rising bar chart as plants", "Child's height marks on a wall", "Tree rings", "Seed to tree sequence"],
  balance: ["Weighing scale", "Stones stacked", "Tightrope walker", "Yin-yang", "Seesaw", "Bird on one leg"],
  silence: ["Finger on lips", "Empty theatre", "Snow falling", "Unplugged speaker", "Closed book", "Still water"],
  speed: ["Motion lines", "Cheetah", "Blurred wheels", "Arrow", "Lightning", "Wind-swept hair"],
  trust: ["Handshake", "Child holding a parent's finger", "Bridge", "Open palm", "Lock and key together", "Safety net"],
  home: ["Roof shape over a family", "Door with a doormat", "Bird's nest", "Kettle on a stove", "Lit window at night", "Rangoli at a doorstep"],
  change: ["Caterpillar to butterfly", "Leaf changing colour", "Arrow turning", "Moon phases", "Ice to water", "Seed to tree"],
  memory: ["Photo album", "Knotted string", "Footprints in sand", "Old key", "Faded photograph", "Fingerprint"],
  care: ["Hands around a sapling", "Bandage on a heart", "Umbrella over someone", "Mother bird feeding", "Watering can", "Blanket"],
  energy: ["Lightning bolt", "Battery", "Sun rays", "Spring", "Running feet", "Windmill"],
  connection: ["Joined puzzle pieces", "Bridge", "Threads tying hands", "Wifi signal between people", "Roots joining under ground", "Plug and socket"],
  courage: ["Small bird facing a storm", "Lion's heart", "Climbing a mountain", "Raised fist", "Candle against wind", "First step on a ladder"],
  harmony: ["Musical notes in a circle", "Different leaves on one tree", "Many hands in a circle", "Instruments together", "Rainbow", "Rhythmic waves"],
  kindness: ["Hand offering water", "Heart-shaped leaf", "Shared umbrella", "Feeding a bird", "Holding a door", "Small gift box"],
  progress: ["Upward arrow", "Steps", "Road towards a sunrise", "Gears turning", "Plant growing in stages", "Footprints going up"],
  safety: ["Helmet", "Shield", "Umbrella", "Lock", "Seatbelt", "Hands cupping a flame"],
  celebration: ["Fireworks", "Confetti", "Diya", "Drums", "Raised hands", "Kite festival"],
};
words.forEach((w) =>
  add("sh-symbol", "creative.association", 2, `List 6 different images or symbols that could represent "${w}" in a poster. Try to avoid the most obvious one.`, wordIdeas[w]!, wordIdeas[w]!.flatMap((x) => x.toLowerCase().split(/\s+/)).filter((x) => x.length > 4).slice(0, 12), 6, "List objects, actions, places, colours and feelings linked to the word, then combine them into visual metaphors. Fresh ideas come after the first two or three obvious ones."),
);

// 7. Pictogram descriptions
const pictos: [string, string][] = [
  ["'No plastic bags'", "A plastic bag silhouette inside a red circle with a diagonal bar; or a cloth bag with a green tick beside a crossed plastic bag."],
  ["'Drinking water'", "A tap with a single drop falling into a cup, in a blue square."],
  ["'Charging point'", "A plug with a lightning bolt, or a phone outline with a bolt inside."],
  ["'Quiet zone'", "A head in profile with a finger on its lips, or a speaker with a cross over its sound waves."],
  ["'Priority seat for elderly'", "A seated figure with a walking stick, plus a seat icon."],
  ["'Wash your hands'", "Two hands under a tap with three water drops."],
  ["'Mind the step'", "A walking figure about to step down, with the step edge highlighted in yellow."],
  ["'Lost and found'", "A question mark inside a bag, or a hand holding a key with a question mark."],
  ["'Feed the birds here'", "A bird pecking at grains in an open palm."],
  ["'Shoes off'", "A pair of shoes with an arrow pointing to a rack and a bare footprint."],
  ["'Breastfeeding room'", "A seated adult figure holding a baby close, inside a door shape."],
  ["'Recycle here'", "Three arrows chasing each other in a triangle above a bin."],
  ["'Emergency exit'", "A running figure moving through an open door, with an arrow."],
  ["'No honking'", "A horn icon inside a red circle with a diagonal bar."],
  ["'Free Wi-Fi'", "Three curved signal arcs over a dot."],
];
pictos.forEach(([meaning, model]) =>
  add("sh-picto", "design.pictograms", 2, `Describe in words a pictogram for ${meaning}: shapes, symbol, colour and why it would be understood without text. (Max 40 words.)`, [model], ["circle", "colour", "simple", "symbol", "figure", "arrow", "red", "green", "blue"], 2, "Good pictograms use one simple figure or object, a recognised convention (red circle with bar = not allowed; green = safe/information) and no fine detail.", 40),
);

// 8. Problem identification in scenarios (text)
const problemScenes: [string, string[]][] = [
  ["Students queue for 20 minutes at a single water tap in school after lunch.", ["Only one tap for many students", "Lunch time is short", "Spillage makes the floor slippery", "No queue system", "Older students push in", "No shade near the tap"]],
  ["Vegetable vendors on a footpath force pedestrians to walk on the road.", ["No designated vending zone", "Pedestrian safety risk", "Vendors have nowhere else to go", "Traffic slows down", "Waste piles up", "Elderly and children are at risk"]],
  ["A hospital's waiting area is always overcrowded and noisy.", ["Poor appointment scheduling", "Not enough seating", "No information display for queue numbers", "Relatives accompany each patient", "Infection risk", "Stress for patients"]],
  ["People keep missing their stop on a city bus at night.", ["No stop announcements", "Dark windows; landmarks not visible", "Route boards not lit", "Crowded bus blocks view", "Tired passengers fall asleep", "Conductor too busy to tell"]],
  ["Children in a village school can't concentrate in the afternoon.", ["Heat in classrooms", "Hunger after a small lunch", "Poor ventilation", "Long periods without breaks", "Glare from tin roofs", "Noise from outside"]],
  ["Tourists at a heritage site keep touching and scratching the carvings.", ["No barriers or guidance", "Curiosity and lack of awareness", "Selfies close to carvings", "No guards at key spots", "Signs only in English", "Crowding pushes people close"]],
  ["Elderly residents in an apartment rarely leave home.", ["No lift or broken lift", "No benches in the compound", "Fear of traffic outside", "Loneliness", "No nearby shops", "Poor lighting in corridors"]],
  ["Food stalls at a festival create piles of plastic waste.", ["Single-use plates and cups", "Too few bins", "No segregation", "No deposit system for reusables", "Visitors unaware", "Vendors find plastic cheaper"]],
  ["Patients often take the wrong dose of medicine at home.", ["Similar-looking strips", "Small print", "Complicated timings", "No reminder", "Doctor's handwriting unclear", "Many medicines at once"]],
  ["Shoppers at a supermarket leave trolleys all over the car park.", ["Trolley bays too far", "No incentive to return", "Bad weather", "Unclear signage", "Parking spaces too tight", "Shoppers carrying children"]],
  ["Students in a hostel keep fighting over the washing area.", ["Too few washing points", "Everyone washes on Sunday", "No drying space", "No booking system", "Water timings limited", "Wet floors"]],
  ["Passengers struggle to board a crowded train with luggage.", ["Narrow doors", "High step", "Short stop time", "Crowd at doors", "Heavy bags", "No help for elderly"]],
];
problemScenes.forEach(([scene, problems]) =>
  add("sh-problem", "creative.problem-id", 3, `${scene} Identify 6 different problems in this situation (think about every person involved).`, problems, problems.flatMap((p) => p.toLowerCase().split(/\s+/).filter((w) => w.length > 4)).slice(0, 12), 6, "Look at the situation from each person's point of view and over time. Separate causes from symptoms. The root cause is what a good design would tackle.", undefined, "PYQ-style"),
);

// 9. Short write-ups (50 words)
const writeups = ["a steel tumbler", "a cycle", "an auto-rickshaw", "a pressure cooker", "a school bench", "a bamboo basket", "a clay water pot (matka)", "a scooter helmet", "a mobile phone charger", "a ceiling fan", "a steel tiffin box", "a broom"];
writeups.forEach((obj) =>
  add("sh-writeup", "creative.writeup", 3, `In about 50 words, explain what makes ${obj} well or badly designed, and suggest one improvement.`, [`Who uses ${obj} and where`, "One strength of its form or material, with a reason", "One weakness you have noticed", "A specific improvement that fixes that weakness"], ["user", "material", "shape", "because", "improve", "problem", "easy", "comfort", "durable"], 3, "Strong write-ups name the user and context, give a specific strength and weakness, and end with a concrete improvement, within the word limit.", 60),
);

writeFileSync("content/items/short-creative.json", JSON.stringify({ items }, null, 1) + "\n");
console.log(`✓ ${items.length} short-answer prompts`);
