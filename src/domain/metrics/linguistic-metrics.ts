import { BAOutput } from "../../types.js";
import { VagueWordMetric, PassiveVoiceMetric, ModalVerbMetric, TerminologyConsistencyMetric, SubordinateClauseMetric } from "./metric-types.js";
import { VAGUE_WORDS, PASSIVE_PATTERN, MANDATORY_MODALS, RECOMMENDED_MODALS, OPTIONAL_MODALS, SUBORDINATE_CONJUNCTIONS, SYNONYM_GROUPS } from "./metric-constants.js";
import { tokenizeAll, splitSentences, allOutputText, allAcText } from "./text-utils.js";

export function measureVagueWordRatio(output: BAOutput): VagueWordMetric {
  const text = allOutputText(output);
  const words = tokenizeAll(text);
  const found = words.filter((w) => VAGUE_WORDS.has(w));
  const uniqueFound = [...new Set(found)];
  const value = words.length > 0 ? found.length / words.length : 0;
  const score = Math.max(0, 10 - value * 200);
  return { value, score: Math.round(score * 10) / 10, label: "Vague Word Ratio", vagueWordCount: found.length, totalWords: words.length, foundWords: uniqueFound.slice(0, 10) };
}

export function measurePassiveVoice(output: BAOutput): PassiveVoiceMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const passive = sentences.filter((s) => PASSIVE_PATTERN.test(s));
  const value = sentences.length > 0 ? passive.length / sentences.length : 0;
  const score = Math.max(0, 10 - value * 50);
  return { value, score: Math.round(score * 10) / 10, label: "Passive Voice Ratio", passiveSentences: passive.length, totalSentences: sentences.length, examples: passive.slice(0, 3) };
}

export function measureModalVerbStrength(output: BAOutput): ModalVerbMetric {
  const words = allOutputText(output).toLowerCase().split(/\s+/);
  let mandatory = 0, recommended = 0, optional = 0;
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (MANDATORY_MODALS.has(clean)) mandatory++;
    else if (RECOMMENDED_MODALS.has(clean)) recommended++;
    else if (OPTIONAL_MODALS.has(clean)) optional++;
  }
  const total = mandatory + recommended + optional;
  const mandatoryRatio = total > 0 ? mandatory / total : 0;
  const score = Math.min(10, mandatoryRatio * 10 + (total === 0 ? 5 : 0));
  return { value: mandatoryRatio, score: Math.round(score * 10) / 10, label: "Modal Verb Strength", mandatory, recommended, optional, mandatoryRatio: Math.round(mandatoryRatio * 100) / 100 };
}

export function measureTerminologyConsistency(output: BAOutput): TerminologyConsistencyMetric {
  const text = allOutputText(output).toLowerCase();
  const result: TerminologyConsistencyMetric["synonymGroups"] = [];
  let inconsistentGroups = 0;
  for (const group of SYNONYM_GROUPS) {
    const variantCounts = group.variants
      .map((v) => ({ variant: v, count: (text.match(new RegExp(`\\b${v.replace(/\s+/g, "\\s+")}\\b`, "gi")) || []).length }))
      .filter((v) => v.count > 0);
    if (variantCounts.length > 0) {
      result.push({ canonical: group.canonical, variants: variantCounts.map((v) => v.variant), count: variantCounts.reduce((s, v) => s + v.count, 0) });
      inconsistentGroups++;
    }
  }
  const score = Math.max(0, 10 - inconsistentGroups * 1.5);
  const value = inconsistentGroups === 0 ? 1 : 1 - inconsistentGroups / SYNONYM_GROUPS.length;
  return { value, score: Math.round(score * 10) / 10, label: "Terminology Consistency", synonymGroups: result, inconsistentGroups };
}

export function measureSubordinateClauseDensity(output: BAOutput): SubordinateClauseMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  let subordinateCount = 0;
  for (const sentence of sentences) {
    const lc = sentence.toLowerCase();
    for (const conj of SUBORDINATE_CONJUNCTIONS) {
      if (lc.includes(conj)) { subordinateCount++; break; }
    }
  }
  const density = sentences.length > 0 ? subordinateCount / sentences.length : 0;
  const score = density <= 0.3 ? 10 : Math.max(0, 10 - (density - 0.3) * 25);
  return { value: density, score: Math.round(score * 10) / 10, label: "Subordinate Clause Density", subordinateClauseCount: subordinateCount, totalSentences: sentences.length, density: Math.round(density * 100) / 100 };
}
