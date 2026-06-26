import { BAOutput } from "../types.js";
import { VagueWordMetric, PassiveVoiceMetric, ModalVerbMetric, TerminologyConsistencyMetric, SubordinateClauseMetric } from "./metric-types.js";
import { tokenizeAll, splitSentences, allOutputText, allAcText } from "./text-utils.js";

const VAGUE_WORDS = new Set([
  "easy","fast","quickly","slow","simple","friendly","smooth","reliable",
  "robust","flexible","scalable","efficient","effective","seamlessly",
  "intuitively","user-friendly","appropriate","adequate","reasonable",
  "sufficient","good","bad","nice","better","best","various","several",
  "some","many","few","large","small","high","low","quickly","easily",
  "regularly","often","sometimes","usually","typically","generally",
  "approximately","about","around","roughly","nearly",
]);

const PASSIVE_PATTERN = /\b(is|are|was|were|been|be|being)\s+\w+(?:ed|en)\b/i;

const MANDATORY_MODALS = new Set(["must","shall"]);
const RECOMMENDED_MODALS = new Set(["should"]);
const OPTIONAL_MODALS = new Set(["may","can","could","might"]);

const SUBORDINATE_CONJUNCTIONS = [
  "when","if","because","although","since","while","unless","after","before",
  "until","as","though","even if","even though","so that","in order that",
  "provided that","assuming that","given that","in case","whenever","wherever",
];

const SYNONYM_GROUPS: Array<{ canonical: string; variants: string[] }> = [
  { canonical: "user", variants: ["customer","client","actor","person","member","account holder"] },
  { canonical: "system", variants: ["application","app","platform","service","backend","api"] },
  { canonical: "display", variants: ["show","render","present","view","visualize"] },
  { canonical: "error", variants: ["failure","fault","exception","issue","problem","bug"] },
  { canonical: "create", variants: ["add","generate","make","produce","build","set up"] },
  { canonical: "delete", variants: ["remove","destroy","erase","clear","purge"] },
  { canonical: "update", variants: ["edit","modify","change","alter","revise"] },
  { canonical: "validate", variants: ["verify","check","confirm","authenticate","authorize"] },
  { canonical: "notification", variants: ["alert","message","email","reminder","notice"] },
  { canonical: "login", variants: ["sign in","log in","authenticate","access"] },
];

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
    const variantCounts = group.variants.map((v) => ({
      variant: v,
      count: (text.match(new RegExp(`\\b${v.replace(/\s+/g, "\\s+")}\\b`, "gi")) || []).length,
    })).filter((v) => v.count > 0);
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
