import { BAOutput } from "../types.js";
import { ReadabilityMetric, GunningFogMetric, SmogIndexMetric, TypeTokenMetric } from "./metric-types.js";
import { splitSentences, countSyllables, tokenizeAll, allAcText, allOutputText } from "./text-utils.js";

export function measureReadability(output: BAOutput): ReadabilityMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  if (words.length === 0 || sentences.length === 0)
    return { value: 0, score: 5, label: "Readability (Flesch)", fleschReadingEase: 0, avgSentenceLength: 0, avgWordLength: 0 };
  const asl = words.length / sentences.length;
  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / words.length;
  const fre = 206.835 - 1.015 * asl - 84.6 * (syllables / words.length);
  const flesch = Math.max(0, Math.min(100, fre));
  const score = Math.max(0, 10 - Math.abs(flesch - 60) / 6);
  return { value: flesch, score: Math.round(score * 10) / 10, label: "Readability (Flesch)", fleschReadingEase: Math.round(flesch * 10) / 10, avgSentenceLength: Math.round(asl * 10) / 10, avgWordLength: Math.round(avgWordLength * 10) / 10 };
}

export function measureGunningFog(output: BAOutput): GunningFogMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  if (words.length === 0 || sentences.length === 0)
    return { value: 0, score: 5, label: "Gunning Fog Index", fogIndex: 0, complexWordRatio: 0, avgSentenceLength: 0 };
  const complexWords = words.filter((w) => countSyllables(w) >= 3);
  const asl = words.length / sentences.length;
  const complexRatio = complexWords.length / words.length;
  const fog = 0.4 * (asl + 100 * complexRatio);
  const score = Math.max(0, 10 - Math.abs(fog - 8) * 0.8);
  return { value: fog, score: Math.round(score * 10) / 10, label: "Gunning Fog Index", fogIndex: Math.round(fog * 10) / 10, complexWordRatio: Math.round(complexRatio * 100) / 100, avgSentenceLength: Math.round(asl * 10) / 10 };
}

export function measureSmogIndex(output: BAOutput): SmogIndexMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const polysyllables = words.filter((w) => countSyllables(w) >= 3);
  if (sentences.length === 0)
    return { value: 0, score: 5, label: "SMOG Index", smog: 0, polysyllableCount: 0, sentenceCount: 0 };
  const smog = Math.sqrt(1.043 * (30 * polysyllables.length / sentences.length) + 3.1291);
  const score = Math.max(0, 10 - Math.abs(smog - 10) * 0.8);
  return { value: smog, score: Math.round(score * 10) / 10, label: "SMOG Index", smog: Math.round(smog * 10) / 10, polysyllableCount: polysyllables.length, sentenceCount: sentences.length };
}

export function measureTypeTokenRatio(output: BAOutput): TypeTokenMetric {
  const text = allOutputText(output);
  const words = tokenizeAll(text).filter((w) => w.length > 1);
  const unique = new Set(words);
  const ttr = words.length > 0 ? unique.size / words.length : 0;
  const score = ttr < 0.3 ? 5 : ttr <= 0.6 ? 10 : Math.max(4, 10 - (ttr - 0.6) * 20);
  return { value: ttr, score: Math.round(score * 10) / 10, label: "Type-Token Ratio (Lexical Diversity)", uniqueWords: unique.size, totalWords: words.length, ttr: Math.round(ttr * 100) / 100 };
}
