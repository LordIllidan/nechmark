import { BAOutput, AcceptanceCriterion } from "../types.js";

export interface HardMetrics {
  // --- Existing ---
  formatCompliance: FormatComplianceMetric;
  acMeasurability: AcMeasurabilityMetric;
  gherkinCoverage: GherkinCoverageMetric;
  storyIndependence: StoryIndependenceMetric;
  inputCoverage: InputCoverageMetric;
  readability: ReadabilityMetric;
  sizeDistribution: SizeDistributionMetric;
  edgeCaseRatio: EdgeCaseRatioMetric;
  personaDiversity: PersonaDiversityMetric;
  duplicateAc: DuplicateAcMetric;
  // --- New ---
  vagueWordRatio: VagueWordMetric;
  passiveVoiceRatio: PassiveVoiceMetric;
  modalVerbStrength: ModalVerbMetric;
  gunningFog: GunningFogMetric;
  smogIndex: SmogIndexMetric;
  typeTokenRatio: TypeTokenMetric;
  terminologyConsistency: TerminologyConsistencyMetric;
  subordinateClauseDensity: SubordinateClauseMetric;
  atomicity: AtomicityMetric;
  wellFormedness: WellFormednessMetric;
  summary: MetricsSummary;
}

export interface MetricScore {
  value: number;
  score: number; // normalized 0-10
  label: string;
}

export interface FormatComplianceMetric extends MetricScore {
  storiesWithAllFields: number;
  totalStories: number;
  missingFields: string[];
}
export interface AcMeasurabilityMetric extends MetricScore {
  measurableAcCount: number;
  totalAcCount: number;
  examples: string[];
}
export interface GherkinCoverageMetric extends MetricScore {
  gherkinAcCount: number;
  totalAcCount: number;
}
export interface StoryIndependenceMetric extends MetricScore {
  avgSimilarity: number;
  maxSimilarity: number;
  highOverlapPairs: [string, string][];
}
export interface InputCoverageMetric extends MetricScore {
  coveredKeywords: string[];
  missedKeywords: string[];
  totalKeywords: number;
}
export interface ReadabilityMetric extends MetricScore {
  fleschReadingEase: number;
  avgSentenceLength: number;
  avgWordLength: number;
}
export interface SizeDistributionMetric extends MetricScore {
  pointsVariance: number;
  storiesWithPoints: number;
  distribution: Record<number, number>;
}
export interface EdgeCaseRatioMetric extends MetricScore {
  edgeCaseCount: number;
  totalAcCount: number;
}
export interface PersonaDiversityMetric extends MetricScore {
  uniquePersonas: string[];
  totalStories: number;
}
export interface DuplicateAcMetric extends MetricScore {
  duplicatePairs: [string, string][];
  maxSimilarity: number;
}
export interface VagueWordMetric extends MetricScore {
  vagueWordCount: number;
  totalWords: number;
  foundWords: string[];
}
export interface PassiveVoiceMetric extends MetricScore {
  passiveSentences: number;
  totalSentences: number;
  examples: string[];
}
export interface ModalVerbMetric extends MetricScore {
  mandatory: number;   // must, shall
  recommended: number; // should
  optional: number;    // may, can, could
  mandatoryRatio: number;
}
export interface GunningFogMetric extends MetricScore {
  fogIndex: number;
  complexWordRatio: number;
  avgSentenceLength: number;
}
export interface SmogIndexMetric extends MetricScore {
  smog: number;
  polysyllableCount: number;
  sentenceCount: number;
}
export interface TypeTokenMetric extends MetricScore {
  uniqueWords: number;
  totalWords: number;
  ttr: number;
}
export interface TerminologyConsistencyMetric extends MetricScore {
  synonymGroups: Array<{ canonical: string; variants: string[]; count: number }>;
  inconsistentGroups: number;
}
export interface SubordinateClauseMetric extends MetricScore {
  subordinateClauseCount: number;
  totalSentences: number;
  density: number;
}
export interface AtomicityMetric extends MetricScore {
  nonAtomicStories: string[];
  totalStories: number;
}
export interface WellFormednessMetric extends MetricScore {
  wellFormedCount: number;
  totalStories: number;
  violations: string[];
}

export interface MetricsSummary {
  overallScore: number;
  passed: string[];
  warnings: string[];
  failures: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","must","shall",
  "can","need","that","this","it","its","they","them","their","we","our",
  "as","so","if","then","when","where","which","who","what","how","all","any",
  "both","each","few","more","most","other","some","such","no","not","only",
  "own","same","than","too","very","just","user","system","able","allow",
  "display","show",
]);

const VAGUE_WORDS = new Set([
  "easy","fast","quickly","slow","simple","friendly","smooth","reliable",
  "robust","flexible","scalable","efficient","effective","seamlessly",
  "intuitively","user-friendly","appropriate","adequate","reasonable",
  "sufficient","good","bad","nice","better","best","various","several",
  "some","many","few","large","small","high","low","quickly","easily",
  "regularly","often","sometimes","usually","typically","generally",
  "approximately","about","around","roughly","nearly",
]);

const SUBORDINATE_CONJUNCTIONS = [
  "when","if","because","although","since","while","unless","after","before",
  "until","as","though","even if","even though","so that","in order that",
  "provided that","assuming that","given that","in case","whenever","wherever",
];

const MANDATORY_MODALS = new Set(["must","shall"]);
const RECOMMENDED_MODALS = new Set(["should"]);
const OPTIONAL_MODALS = new Set(["may","can","could","might"]);

const MEASURABLE_PATTERNS = [
  /\d+\s*(ms|sec|s|min|hour|h|day|%|kb|mb|gb|px|rpm|rps)/i,
  /[<>≤≥]=?\s*\d+/,
  /\d+\s*(attempt|try|tries|request|item|result|character|char)/i,
  /within\s+\d+/i,
  /at least\s+\d+/i,
  /no more than\s+\d+/i,
  /maximum\s+\d+/i,
  /minimum\s+\d+/i,
  /exactly\s+\d+/i,
  /\d+\s*(concurrent|simultaneous)/i,
];

const GHERKIN_PATTERNS = [
  /\bgiven\b.*\bwhen\b.*\bthen\b/is,
  /^given\b/im,
  /^when\b/im,
  /^then\b/im,
];

// Passive voice: "is/are/was/were/been/be + past participle"
// Simple heuristic: auxiliary + word ending in -ed/-en (irregular handled partially)
const PASSIVE_PATTERN = /\b(is|are|was|were|been|be|being)\s+\w+(?:ed|en)\b/i;

// Non-atomic signals: multiple actions in iWant (conjunctions between verb phrases)
const MULTI_ACTION_PATTERN = /\b(and also|as well as|in addition to|and then|also)\b/i;

// Synonym groups for terminology consistency (domain-common conflations)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function tokenizeAll(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 0);
}

function splitSentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 5);
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function buildTfVector(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (const [term, countA] of a) {
    dot += countA * (b.get(term) ?? 0);
    normA += countA * countA;
  }
  for (const [, countB] of b) normB += countB * countB;
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function allAcText(output: BAOutput): string {
  return output.userStories.flatMap((s) => s.acceptanceCriteria.map((ac) => ac.description)).join(" ");
}

function allOutputText(output: BAOutput): string {
  return output.userStories
    .map((s) => [s.title, s.asA, s.iWant, s.soThat, ...s.acceptanceCriteria.map((ac) => ac.description)].join(" "))
    .join(" ");
}

// ---------------------------------------------------------------------------
// EXISTING METRICS
// ---------------------------------------------------------------------------

export function measureFormatCompliance(output: BAOutput): FormatComplianceMetric {
  const missingFields: string[] = [];
  let compliant = 0;
  for (const story of output.userStories) {
    const missing: string[] = [];
    if (!story.asA?.trim()) missing.push(`${story.id}.asA`);
    if (!story.iWant?.trim()) missing.push(`${story.id}.iWant`);
    if (!story.soThat?.trim()) missing.push(`${story.id}.soThat`);
    if (!story.title?.trim()) missing.push(`${story.id}.title`);
    if (!story.acceptanceCriteria?.length) missing.push(`${story.id}.acceptanceCriteria`);
    if (missing.length === 0) compliant++;
    missingFields.push(...missing);
  }
  const total = output.userStories.length;
  const value = total > 0 ? compliant / total : 0;
  return { value, score: value * 10, label: "Format Compliance", storiesWithAllFields: compliant, totalStories: total, missingFields };
}

export function measureAcMeasurability(output: BAOutput): AcMeasurabilityMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const measurable = allAc.filter((ac) => MEASURABLE_PATTERNS.some((p) => p.test(ac.description)));
  const value = allAc.length > 0 ? measurable.length / allAc.length : 0;
  return {
    value, score: value * 10, label: "AC Measurability",
    measurableAcCount: measurable.length, totalAcCount: allAc.length,
    examples: measurable.slice(0, 3).map((ac) => ac.description.slice(0, 80)),
  };
}

export function measureGherkinCoverage(output: BAOutput): GherkinCoverageMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const gherkin = allAc.filter((ac) => GHERKIN_PATTERNS.some((p) => p.test(ac.description)));
  const value = allAc.length > 0 ? gherkin.length / allAc.length : 0;
  return { value, score: value * 10, label: "Gherkin Coverage", gherkinAcCount: gherkin.length, totalAcCount: allAc.length };
}

export function measureStoryIndependence(output: BAOutput): StoryIndependenceMetric {
  const stories = output.userStories;
  if (stories.length < 2) return { value: 1, score: 10, label: "Story Independence", avgSimilarity: 0, maxSimilarity: 0, highOverlapPairs: [] };
  const vectors = stories.map((s) => buildTfVector(tokenize([s.title, s.asA, s.iWant, s.soThat, ...s.acceptanceCriteria.map((ac) => ac.description)].join(" "))));
  const sims: number[] = [];
  const highOverlapPairs: [string, string][] = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      sims.push(sim);
      if (sim > 0.6) highOverlapPairs.push([stories[i].id, stories[j].id]);
    }
  }
  const avgSimilarity = sims.reduce((a, b) => a + b, 0) / sims.length;
  const maxSimilarity = Math.max(...sims);
  const value = 1 - avgSimilarity;
  return {
    value, score: Math.max(0, Math.min(10, value * 15)), label: "Story Independence",
    avgSimilarity: Math.round(avgSimilarity * 100) / 100, maxSimilarity: Math.round(maxSimilarity * 100) / 100, highOverlapPairs,
  };
}

export function measureInputCoverage(output: BAOutput): InputCoverageMetric {
  const inputTokens = new Set(tokenize(output.rawInput.content));
  const outputTokens = new Set(tokenize(allOutputText(output)));
  const keywords = [...inputTokens].filter((w) => w.length > 4);
  const covered = keywords.filter((w) => outputTokens.has(w));
  const missed = keywords.filter((w) => !outputTokens.has(w));
  const value = keywords.length > 0 ? covered.length / keywords.length : 1;
  return { value, score: value * 10, label: "Input Coverage", coveredKeywords: covered, missedKeywords: missed.slice(0, 10), totalKeywords: keywords.length };
}

export function measureReadability(output: BAOutput): ReadabilityMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  if (words.length === 0 || sentences.length === 0) return { value: 0, score: 5, label: "Readability (Flesch)", fleschReadingEase: 0, avgSentenceLength: 0, avgWordLength: 0 };
  const asl = words.length / sentences.length;
  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / words.length;
  const fre = 206.835 - 1.015 * asl - 84.6 * (syllables / words.length);
  const flesch = Math.max(0, Math.min(100, fre));
  // Target 50-70 for BA docs
  const score = Math.max(0, 10 - Math.abs(flesch - 60) / 6);
  return { value: flesch, score: Math.round(score * 10) / 10, label: "Readability (Flesch)", fleschReadingEase: Math.round(flesch * 10) / 10, avgSentenceLength: Math.round(asl * 10) / 10, avgWordLength: Math.round(avgWordLength * 10) / 10 };
}

export function measureSizeDistribution(output: BAOutput): SizeDistributionMetric {
  const storiesWithPoints = output.userStories.filter((s) => s.storyPoints != null);
  const points = storiesWithPoints.map((s) => s.storyPoints!);
  const distribution: Record<number, number> = {};
  for (const p of points) distribution[p] = (distribution[p] ?? 0) + 1;
  if (points.length < 2) return { value: 0, score: 5, label: "Size Distribution", pointsVariance: 0, storiesWithPoints: storiesWithPoints.length, distribution };
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;
  const score = variance < 1 ? 4 : variance <= 12 ? 10 : Math.max(4, 10 - (variance - 12) / 5);
  return { value: variance, score: Math.round(score * 10) / 10, label: "Size Distribution", pointsVariance: Math.round(variance * 10) / 10, storiesWithPoints: storiesWithPoints.length, distribution };
}

export function measureEdgeCaseRatio(output: BAOutput): EdgeCaseRatioMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const edgeCases = allAc.filter((ac) =>
    ac.type === "edge_case" ||
    /error|fail|invalid|empty|null|timeout|exceed|limit|unauthori[sz]|forbidden|not found|duplicate|conflict/i.test(ac.description)
  );
  const value = allAc.length > 0 ? edgeCases.length / allAc.length : 0;
  const score = Math.max(0, 10 - Math.abs(value - 0.25) * 25);
  return { value, score: Math.round(score * 10) / 10, label: "Edge Case Ratio", edgeCaseCount: edgeCases.length, totalAcCount: allAc.length };
}

export function measurePersonaDiversity(output: BAOutput): PersonaDiversityMetric {
  const personas = output.userStories.map((s) => s.asA?.toLowerCase().trim()).filter(Boolean) as string[];
  const unique = [...new Set(personas)];
  const total = output.userStories.length;
  const ratio = total > 0 ? unique.length / total : 0;
  const score = ratio < 0.1 ? 3 : ratio < 0.25 ? 6 : ratio <= 0.6 ? 10 : 8;
  return { value: ratio, score, label: "Persona Diversity", uniquePersonas: unique, totalStories: total };
}

export function measureDuplicateAc(output: BAOutput): DuplicateAcMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const duplicatePairs: [string, string][] = [];
  let maxSimilarity = 0;
  const vectors = allAc.map((ac) => buildTfVector(tokenize(ac.description)));
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      if (sim > maxSimilarity) maxSimilarity = sim;
      if (sim > 0.75) duplicatePairs.push([allAc[i].id, allAc[j].id]);
    }
  }
  const dupRatio = allAc.length > 1 ? duplicatePairs.length / (allAc.length * (allAc.length - 1) / 2) : 0;
  return { value: 1 - dupRatio, score: Math.round(Math.max(0, 10 - dupRatio * 50) * 10) / 10, label: "Duplicate AC", duplicatePairs: duplicatePairs.slice(0, 5), maxSimilarity: Math.round(maxSimilarity * 100) / 100 };
}

// ---------------------------------------------------------------------------
// NEW METRICS
// ---------------------------------------------------------------------------

export function measureVagueWordRatio(output: BAOutput): VagueWordMetric {
  const text = allOutputText(output);
  const words = tokenizeAll(text);
  const found = words.filter((w) => VAGUE_WORDS.has(w));
  const uniqueFound = [...new Set(found)];
  const value = words.length > 0 ? found.length / words.length : 0;
  // Target: 0%. Score degrades linearly: 0% = 10, 5%+ = 0
  const score = Math.max(0, 10 - value * 200);
  return { value, score: Math.round(score * 10) / 10, label: "Vague Word Ratio", vagueWordCount: found.length, totalWords: words.length, foundWords: uniqueFound.slice(0, 10) };
}

export function measurePassiveVoice(output: BAOutput): PassiveVoiceMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const passive = sentences.filter((s) => PASSIVE_PATTERN.test(s));
  const value = sentences.length > 0 ? passive.length / sentences.length : 0;
  // Target <10% passive. Score: 0%=10, 20%+=0
  const score = Math.max(0, 10 - value * 50);
  return { value, score: Math.round(score * 10) / 10, label: "Passive Voice Ratio", passiveSentences: passive.length, totalSentences: sentences.length, examples: passive.slice(0, 3) };
}

export function measureModalVerbStrength(output: BAOutput): ModalVerbMetric {
  const text = allOutputText(output).toLowerCase();
  const words = text.split(/\s+/);
  let mandatory = 0, recommended = 0, optional = 0;
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (MANDATORY_MODALS.has(clean)) mandatory++;
    else if (RECOMMENDED_MODALS.has(clean)) recommended++;
    else if (OPTIONAL_MODALS.has(clean)) optional++;
  }
  const total = mandatory + recommended + optional;
  const mandatoryRatio = total > 0 ? mandatory / total : 0;
  // Target: majority mandatory (must/shall). Score: mandatoryRatio * 10
  const score = Math.min(10, mandatoryRatio * 10 + (total === 0 ? 5 : 0));
  return { value: mandatoryRatio, score: Math.round(score * 10) / 10, label: "Modal Verb Strength", mandatory, recommended, optional, mandatoryRatio: Math.round(mandatoryRatio * 100) / 100 };
}

export function measureGunningFog(output: BAOutput): GunningFogMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  if (words.length === 0 || sentences.length === 0) return { value: 0, score: 5, label: "Gunning Fog Index", fogIndex: 0, complexWordRatio: 0, avgSentenceLength: 0 };
  const complexWords = words.filter((w) => countSyllables(w) >= 3);
  const asl = words.length / sentences.length;
  const complexRatio = complexWords.length / words.length;
  // Gunning Fog = 0.4 * (ASL + 100 * complexWordRatio)
  const fog = 0.4 * (asl + 100 * complexRatio);
  // Target: 6-10 for BA docs. Score 10 = 8, degrades away
  const score = Math.max(0, 10 - Math.abs(fog - 8) * 0.8);
  return { value: fog, score: Math.round(score * 10) / 10, label: "Gunning Fog Index", fogIndex: Math.round(fog * 10) / 10, complexWordRatio: Math.round(complexRatio * 100) / 100, avgSentenceLength: Math.round(asl * 10) / 10 };
}

export function measureSmogIndex(output: BAOutput): SmogIndexMetric {
  const text = allAcText(output);
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const polysyllables = words.filter((w) => countSyllables(w) >= 3);
  if (sentences.length === 0) return { value: 0, score: 5, label: "SMOG Index", smog: 0, polysyllableCount: 0, sentenceCount: 0 };
  // SMOG = sqrt(1.043 * (30 * polysyllables / sentences) + 3.1291)
  const smog = Math.sqrt(1.043 * (30 * polysyllables.length / sentences.length) + 3.1291);
  // Target: 8-12. Score 10 = 10, degrades away
  const score = Math.max(0, 10 - Math.abs(smog - 10) * 0.8);
  return { value: smog, score: Math.round(score * 10) / 10, label: "SMOG Index", smog: Math.round(smog * 10) / 10, polysyllableCount: polysyllables.length, sentenceCount: sentences.length };
}

export function measureTypeTokenRatio(output: BAOutput): TypeTokenMetric {
  const text = allOutputText(output);
  const words = tokenizeAll(text).filter((w) => w.length > 1);
  const unique = new Set(words);
  const ttr = words.length > 0 ? unique.size / words.length : 0;
  // Target: 0.4-0.6. Too low = repetitive, too high = inconsistent terminology
  const score = ttr < 0.3 ? 5 : ttr <= 0.6 ? 10 : Math.max(4, 10 - (ttr - 0.6) * 20);
  return { value: ttr, score: Math.round(score * 10) / 10, label: "Type-Token Ratio (Lexical Diversity)", uniqueWords: unique.size, totalWords: words.length, ttr: Math.round(ttr * 100) / 100 };
}

export function measureTerminologyConsistency(output: BAOutput): TerminologyConsistencyMetric {
  const text = allOutputText(output).toLowerCase();
  const result: TerminologyConsistencyMetric["synonymGroups"] = [];
  let inconsistentGroups = 0;

  for (const group of SYNONYM_GROUPS) {
    const canonicalCount = (text.match(new RegExp(`\\b${group.canonical}\\b`, "gi")) || []).length;
    const variantCounts = group.variants.map((v) => ({
      variant: v,
      count: (text.match(new RegExp(`\\b${v.replace(/\s+/g, "\\s+")}\\b`, "gi")) || []).length,
    })).filter((v) => v.count > 0);

    if (variantCounts.length > 0) {
      result.push({ canonical: group.canonical, variants: variantCounts.map((v) => v.variant), count: variantCounts.reduce((s, v) => s + v.count, 0) });
      inconsistentGroups++;
    }
  }

  // Score: 0 inconsistent groups = 10, each group -1.5
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
  // Target: <30% subordinate clauses. Score degrades above 30%
  const score = density <= 0.3 ? 10 : Math.max(0, 10 - (density - 0.3) * 25);
  return { value: density, score: Math.round(score * 10) / 10, label: "Subordinate Clause Density", subordinateClauseCount: subordinateCount, totalSentences: sentences.length, density: Math.round(density * 100) / 100 };
}

export function measureAtomicity(output: BAOutput): AtomicityMetric {
  const nonAtomic: string[] = [];
  for (const story of output.userStories) {
    const text = `${story.iWant} ${story.soThat}`;
    if (MULTI_ACTION_PATTERN.test(text)) {
      nonAtomic.push(story.id);
    }
    // Also flag stories with very high AC count (likely too broad)
    if (story.acceptanceCriteria.length > 12) {
      if (!nonAtomic.includes(story.id)) nonAtomic.push(story.id);
    }
  }
  const total = output.userStories.length;
  const value = total > 0 ? 1 - nonAtomic.length / total : 1;
  const score = value * 10;
  return { value, score: Math.round(score * 10) / 10, label: "Atomicity (QUS)", nonAtomicStories: nonAtomic, totalStories: total };
}

export function measureWellFormedness(output: BAOutput): WellFormednessMetric {
  const violations: string[] = [];
  let wellFormed = 0;
  for (const story of output.userStories) {
    const v: string[] = [];
    if (!story.asA || story.asA.trim().length < 2) v.push(`${story.id}: missing asA role`);
    if (!story.iWant || story.iWant.trim().length < 5) v.push(`${story.id}: iWant too short`);
    if (!story.soThat || story.soThat.trim().length < 5) v.push(`${story.id}: soThat too short`);
    // soThat should express business value, not just repeat iWant
    if (story.soThat && story.iWant) {
      const sim = cosineSimilarity(buildTfVector(tokenize(story.soThat)), buildTfVector(tokenize(story.iWant)));
      if (sim > 0.8) v.push(`${story.id}: soThat mirrors iWant (no distinct business value)`);
    }
    if (v.length === 0) wellFormed++;
    violations.push(...v);
  }
  const total = output.userStories.length;
  const value = total > 0 ? wellFormed / total : 1;
  return { value, score: Math.round(value * 10 * 10) / 10, label: "Well-Formedness (QUS)", wellFormedCount: wellFormed, totalStories: total, violations };
}

// ---------------------------------------------------------------------------
// Weighted summary
// ---------------------------------------------------------------------------

const METRIC_WEIGHTS: Record<string, number> = {
  formatCompliance:          1.5,
  acMeasurability:           1.5,
  gherkinCoverage:           1.0,
  storyIndependence:         1.0,
  inputCoverage:             2.0,
  readability:               0.5,
  sizeDistribution:          0.5,
  edgeCaseRatio:             1.0,
  personaDiversity:          0.5,
  duplicateAc:               1.0,
  vagueWordRatio:            1.5,
  passiveVoiceRatio:         0.8,
  modalVerbStrength:         1.0,
  gunningFog:                0.5,
  smogIndex:                 0.5,
  typeTokenRatio:            0.8,
  terminologyConsistency:    1.5,
  subordinateClauseDensity:  0.8,
  atomicity:                 1.5,
  wellFormedness:            1.5,
};

function buildSummary(metrics: Omit<HardMetrics, "summary">): MetricsSummary {
  const entries = Object.entries(metrics) as [string, MetricScore][];
  let weightedSum = 0, totalWeight = 0;
  for (const [key, metric] of entries) {
    const w = METRIC_WEIGHTS[key] ?? 1;
    weightedSum += metric.score * w;
    totalWeight += w;
  }
  const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  const passed: string[] = [], warnings: string[] = [], failures: string[] = [];
  for (const [, metric] of entries) {
    if (metric.score >= 7) passed.push(metric.label);
    else if (metric.score >= 5) warnings.push(metric.label);
    else failures.push(metric.label);
  }
  return { overallScore, passed, warnings, failures };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function computeHardMetrics(output: BAOutput): HardMetrics {
  const partial = {
    formatCompliance:         measureFormatCompliance(output),
    acMeasurability:          measureAcMeasurability(output),
    gherkinCoverage:          measureGherkinCoverage(output),
    storyIndependence:        measureStoryIndependence(output),
    inputCoverage:            measureInputCoverage(output),
    readability:              measureReadability(output),
    sizeDistribution:         measureSizeDistribution(output),
    edgeCaseRatio:            measureEdgeCaseRatio(output),
    personaDiversity:         measurePersonaDiversity(output),
    duplicateAc:              measureDuplicateAc(output),
    vagueWordRatio:           measureVagueWordRatio(output),
    passiveVoiceRatio:        measurePassiveVoice(output),
    modalVerbStrength:        measureModalVerbStrength(output),
    gunningFog:               measureGunningFog(output),
    smogIndex:                measureSmogIndex(output),
    typeTokenRatio:           measureTypeTokenRatio(output),
    terminologyConsistency:   measureTerminologyConsistency(output),
    subordinateClauseDensity: measureSubordinateClauseDensity(output),
    atomicity:                measureAtomicity(output),
    wellFormedness:           measureWellFormedness(output),
  };
  return { ...partial, summary: buildSummary(partial) };
}
