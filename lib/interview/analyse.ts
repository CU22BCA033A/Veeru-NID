/** Free, offline feedback on a spoken answer from its transcript and duration. */
export interface SpeechStats {
  words: number;
  wpm: number | null;
  fillers: { word: string; count: number }[];
  fillerRate: number; // per 100 words
  tips: string[];
}

const FILLERS = ["um", "uh", "umm", "basically", "actually", "you know", "i mean", "so yeah", "kind of", "sort of"];

export function analyseSpeech(transcript: string, durationS: number): SpeechStats {
  const text = transcript.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ");
  const words = text.split(/\s+/).filter(Boolean);
  const fillers = FILLERS.map((f) => ({ word: f, count: (` ${text} `.match(new RegExp(`\\s${f}\\s`, "g")) ?? []).length })).filter((f) => f.count > 0);
  const fillerCount = fillers.reduce((s, f) => s + f.count, 0);
  const wpm = durationS >= 5 && words.length ? Math.round(words.length / (durationS / 60)) : null;
  const fillerRate = words.length ? Math.round((fillerCount / words.length) * 1000) / 10 : 0;
  const tips: string[] = [];
  if (durationS < 30) tips.push("Too short: aim for 45–90 seconds with one specific example.");
  if (durationS > 150) tips.push("Long answer: say your main point first, then one example, then stop.");
  if (wpm !== null && wpm > 170) tips.push(`You spoke fast (${wpm} words/min). Slow down and pause between ideas; 120–150 is comfortable.`);
  if (wpm !== null && wpm < 90) tips.push(`Quite slow (${wpm} words/min). Practise the answer twice more so it flows.`);
  if (fillerRate > 4) tips.push(`Many filler words (${fillers.map((f) => `“${f.word}” ×${f.count}`).join(", ")}). Replace them with a short pause.`);
  if (words.length && !/\b(for example|for instance|once|when i|i noticed|i saw|i made)\b/.test(text)) tips.push("Add a concrete example from your own life or work: interviewers remember stories.");
  if (!tips.length && words.length) tips.push("Good pace and clarity. Next time, end with one line that sums up your point.");
  return { words: words.length, wpm, fillers, fillerRate, tips };
}
