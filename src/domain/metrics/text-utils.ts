import { BAOutput } from "../../types.js";
import { STOP_WORDS } from "./metric-constants.js";

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function tokenizeAll(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 0);
}

export function splitSentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 5);
}

export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function buildTfVector(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return freq;
}

export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (const [term, countA] of a) {
    dot += countA * (b.get(term) ?? 0);
    normA += countA * countA;
  }
  for (const [, countB] of b) normB += countB * countB;
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function allAcText(output: BAOutput): string {
  return output.userStories.flatMap((s) => s.acceptanceCriteria.map((ac) => ac.description)).join(" ");
}

export function allOutputText(output: BAOutput): string {
  return output.userStories
    .map((s) => [s.title, s.asA, s.iWant, s.soThat, ...s.acceptanceCriteria.map((ac) => ac.description)].join(" "))
    .join(" ");
}
