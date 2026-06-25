import { BAOutput, UserStory, AcceptanceCriterion } from "../types.js";

export interface HardMetrics {
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
  fleschKincaid: number;
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

export interface MetricsSummary {
  overallScore: number;
  passed: string[];
  warnings: string[];
  failures: string[];
}

// ---------------------------------------------------------------------------
// Measurement patterns
// ---------------------------------------------------------------------------

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

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "that", "this", "it", "its", "they", "them", "their", "we", "our",
  "as", "so", "if", "then", "when", "where", "which", "who", "what",
  "how", "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "no", "not", "only", "own", "same", "than", "too",
  "very", "just", "user", "system", "able", "allow", "display", "show",
]);

// ---------------------------------------------------------------------------
// Format compliance
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

  return {
    value,
    score: value * 10,
    label: "Format Compliance",
    storiesWithAllFields: compliant,
    totalStories: total,
    missingFields,
  };
}

// ---------------------------------------------------------------------------
// AC measurability
// ---------------------------------------------------------------------------

export function measureAcMeasurability(output: BAOutput): AcMeasurabilityMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const measurable = allAc.filter((ac) =>
    MEASURABLE_PATTERNS.some((p) => p.test(ac.description))
  );

  const value = allAc.length > 0 ? measurable.length / allAc.length : 0;

  return {
    value,
    score: value * 10,
    label: "AC Measurability",
    measurableAcCount: measurable.length,
    totalAcCount: allAc.length,
    examples: measurable.slice(0, 3).map((ac) => ac.description.slice(0, 80)),
  };
}

// ---------------------------------------------------------------------------
// Gherkin coverage
// ---------------------------------------------------------------------------

export function measureGherkinCoverage(output: BAOutput): GherkinCoverageMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const gherkin = allAc.filter((ac) =>
    GHERKIN_PATTERNS.some((p) => p.test(ac.description))
  );

  const value = allAc.length > 0 ? gherkin.length / allAc.length : 0;

  return {
    value,
    score: value * 10,
    label: "Gherkin Coverage",
    gherkinAcCount: gherkin.length,
    totalAcCount: allAc.length,
  };
}

// ---------------------------------------------------------------------------
// Story independence (cosine similarity on bag-of-words)
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function buildTfVector(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, countA] of a) {
    const countB = b.get(term) ?? 0;
    dot += countA * countB;
    normA += countA * countA;
  }
  for (const [, countB] of b) normB += countB * countB;

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function measureStoryIndependence(output: BAOutput): StoryIndependenceMetric {
  const stories = output.userStories;
  if (stories.length < 2) {
    return { value: 1, score: 10, label: "Story Independence", avgSimilarity: 0, maxSimilarity: 0, highOverlapPairs: [] };
  }

  const vectors = stories.map((s) => {
    const text = [s.title, s.asA, s.iWant, s.soThat, ...s.acceptanceCriteria.map((ac) => ac.description)].join(" ");
    return buildTfVector(tokenize(text));
  });

  const similarities: number[] = [];
  const highOverlapPairs: [string, string][] = [];
  const OVERLAP_THRESHOLD = 0.6;

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      similarities.push(sim);
      if (sim > OVERLAP_THRESHOLD) {
        highOverlapPairs.push([stories[i].id, stories[j].id]);
      }
    }
  }

  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  const maxSimilarity = Math.max(...similarities);

  // Lower avg similarity = more independent = better score
  const value = 1 - avgSimilarity;
  const score = Math.max(0, Math.min(10, value * 10 * 1.5));

  return {
    value,
    score,
    label: "Story Independence",
    avgSimilarity: Math.round(avgSimilarity * 100) / 100,
    maxSimilarity: Math.round(maxSimilarity * 100) / 100,
    highOverlapPairs,
  };
}

// ---------------------------------------------------------------------------
// Input coverage (keyword extraction)
// ---------------------------------------------------------------------------

export function measureInputCoverage(output: BAOutput): InputCoverageMetric {
  const inputTokens = new Set(tokenize(output.rawInput.content));
  const outputText = output.userStories
    .map((s) => [s.title, s.asA, s.iWant, s.soThat, ...s.acceptanceCriteria.map((ac) => ac.description)].join(" "))
    .join(" ");
  const outputTokens = new Set(tokenize(outputText));

  // Only care about "significant" input keywords (length > 4, not stop words)
  const keywords = [...inputTokens].filter((w) => w.length > 4);
  const covered = keywords.filter((w) => outputTokens.has(w));
  const missed = keywords.filter((w) => !outputTokens.has(w));

  const value = keywords.length > 0 ? covered.length / keywords.length : 1;

  return {
    value,
    score: value * 10,
    label: "Input Coverage",
    coveredKeywords: covered,
    missedKeywords: missed.slice(0, 10),
    totalKeywords: keywords.length,
  };
}

// ---------------------------------------------------------------------------
// Readability (Flesch-Kincaid approximation)
// ---------------------------------------------------------------------------

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function measureReadability(output: BAOutput): ReadabilityMetric {
  const allText = output.userStories
    .flatMap((s) => s.acceptanceCriteria.map((ac) => ac.description))
    .join(" ");

  const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = allText.split(/\s+/).filter((w) => w.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  if (words.length === 0 || sentences.length === 0) {
    return { value: 0, score: 5, label: "Readability", fleschKincaid: 0, avgSentenceLength: 0, avgWordLength: 0 };
  }

  const avgSentenceLength = words.length / sentences.length;
  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / words.length;

  // Flesch Reading Ease: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
  const fre = 206.835 - 1.015 * avgSentenceLength - 84.6 * (syllables / words.length);
  const fleschKincaid = Math.max(0, Math.min(100, fre));

  // For BA docs: target 50-70 (professional but readable). Score 10 = 60, degrades away.
  const distanceFrom60 = Math.abs(fleschKincaid - 60);
  const score = Math.max(0, 10 - distanceFrom60 / 6);

  return {
    value: fleschKincaid,
    score: Math.round(score * 10) / 10,
    label: "Readability",
    fleschKincaid: Math.round(fleschKincaid * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Size distribution
// ---------------------------------------------------------------------------

export function measureSizeDistribution(output: BAOutput): SizeDistributionMetric {
  const storiesWithPoints = output.userStories.filter((s) => s.storyPoints != null);
  const points = storiesWithPoints.map((s) => s.storyPoints!);

  const distribution: Record<number, number> = {};
  for (const p of points) distribution[p] = (distribution[p] ?? 0) + 1;

  if (points.length < 2) {
    return {
      value: 0,
      score: 5,
      label: "Size Distribution",
      pointsVariance: 0,
      storiesWithPoints: storiesWithPoints.length,
      distribution,
    };
  }

  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length;

  // Some variance is good (3-10 is healthy). Zero variance = all same = suspect. Very high = poorly split.
  const score = variance < 1 ? 4 : variance <= 12 ? 10 : Math.max(4, 10 - (variance - 12) / 5);

  return {
    value: variance,
    score: Math.round(score * 10) / 10,
    label: "Size Distribution",
    pointsVariance: Math.round(variance * 10) / 10,
    storiesWithPoints: storiesWithPoints.length,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Edge case ratio
// ---------------------------------------------------------------------------

export function measureEdgeCaseRatio(output: BAOutput): EdgeCaseRatioMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const edgeCases = allAc.filter((ac) => ac.type === "edge_case");

  // Also detect edge cases by keywords if type not set
  const keywordEdgeCases = allAc.filter((ac) =>
    /error|fail|invalid|empty|null|timeout|exceed|limit|unauthori[sz]|forbidden|not found|duplicate|conflict/i.test(
      ac.description
    )
  );

  const totalEdge = new Set([...edgeCases.map((_, i) => i), ...keywordEdgeCases.map((_, i) => i)]).size;
  const value = allAc.length > 0 ? totalEdge / allAc.length : 0;

  // Target: 20-35% edge cases. Score 10 = 0.25, degrades away.
  const distanceFrom025 = Math.abs(value - 0.25);
  const score = Math.max(0, 10 - distanceFrom025 * 25);

  return {
    value,
    score: Math.round(score * 10) / 10,
    label: "Edge Case Ratio",
    edgeCaseCount: totalEdge,
    totalAcCount: allAc.length,
  };
}

// ---------------------------------------------------------------------------
// Persona diversity
// ---------------------------------------------------------------------------

export function measurePersonaDiversity(output: BAOutput): PersonaDiversityMetric {
  const personas = output.userStories
    .map((s) => s.asA?.toLowerCase().trim())
    .filter(Boolean) as string[];

  const unique = [...new Set(personas)];
  const total = output.userStories.length;

  // Diversity ratio. 1 persona for all = 0.1, many different = good up to ~0.5 (too fragmented is ok)
  const ratio = total > 0 ? unique.length / total : 0;
  const score = ratio < 0.1 ? 3 : ratio < 0.25 ? 6 : ratio <= 0.6 ? 10 : 8;

  return {
    value: ratio,
    score,
    label: "Persona Diversity",
    uniquePersonas: unique,
    totalStories: total,
  };
}

// ---------------------------------------------------------------------------
// Duplicate AC detection
// ---------------------------------------------------------------------------

export function measureDuplicateAc(output: BAOutput): DuplicateAcMetric {
  const allAc = output.userStories.flatMap((s) => s.acceptanceCriteria);
  const DUPLICATE_THRESHOLD = 0.75;
  const duplicatePairs: [string, string][] = [];
  let maxSimilarity = 0;

  const vectors = allAc.map((ac) => buildTfVector(tokenize(ac.description)));

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      if (sim > maxSimilarity) maxSimilarity = sim;
      if (sim > DUPLICATE_THRESHOLD) {
        duplicatePairs.push([allAc[i].id, allAc[j].id]);
      }
    }
  }

  // Fewer duplicates = better
  const dupRatio = allAc.length > 1 ? duplicatePairs.length / (allAc.length * (allAc.length - 1) / 2) : 0;
  const score = Math.max(0, 10 - dupRatio * 50);

  return {
    value: 1 - dupRatio,
    score: Math.round(score * 10) / 10,
    label: "Duplicate AC",
    duplicatePairs: duplicatePairs.slice(0, 5),
    maxSimilarity: Math.round(maxSimilarity * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const METRIC_WEIGHTS: Record<string, number> = {
  formatCompliance: 1.5,
  acMeasurability: 1.5,
  gherkinCoverage: 1.0,
  storyIndependence: 1.0,
  inputCoverage: 2.0,
  readability: 0.5,
  sizeDistribution: 0.5,
  edgeCaseRatio: 1.0,
  personaDiversity: 0.5,
  duplicateAc: 1.0,
};

function buildSummary(metrics: Omit<HardMetrics, "summary">): MetricsSummary {
  const entries = Object.entries(metrics) as [keyof typeof METRIC_WEIGHTS, MetricScore][];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, metric] of entries) {
    const w = METRIC_WEIGHTS[key] ?? 1;
    weightedSum += metric.score * w;
    totalWeight += w;
  }

  const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  const passed: string[] = [];
  const warnings: string[] = [];
  const failures: string[] = [];

  for (const [, metric] of entries) {
    if (metric.score >= 7) passed.push(metric.label);
    else if (metric.score >= 5) warnings.push(metric.label);
    else failures.push(metric.label);
  }

  return { overallScore, passed, warnings, failures };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function computeHardMetrics(output: BAOutput): HardMetrics {
  const partial = {
    formatCompliance: measureFormatCompliance(output),
    acMeasurability: measureAcMeasurability(output),
    gherkinCoverage: measureGherkinCoverage(output),
    storyIndependence: measureStoryIndependence(output),
    inputCoverage: measureInputCoverage(output),
    readability: measureReadability(output),
    sizeDistribution: measureSizeDistribution(output),
    edgeCaseRatio: measureEdgeCaseRatio(output),
    personaDiversity: measurePersonaDiversity(output),
    duplicateAc: measureDuplicateAc(output),
  };

  return { ...partial, summary: buildSummary(partial) };
}
