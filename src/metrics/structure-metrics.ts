import { BAOutput } from "../types.js";
import { FormatComplianceMetric, AcMeasurabilityMetric, GherkinCoverageMetric, AtomicityMetric, WellFormednessMetric } from "./metric-types.js";
import { tokenize, buildTfVector, cosineSimilarity } from "./text-utils.js";

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

const MULTI_ACTION_PATTERN = /\b(and also|as well as|in addition to|and then|also)\b/i;

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

export function measureAtomicity(output: BAOutput): AtomicityMetric {
  const nonAtomic: string[] = [];
  for (const story of output.userStories) {
    const text = `${story.iWant} ${story.soThat}`;
    if (MULTI_ACTION_PATTERN.test(text)) nonAtomic.push(story.id);
    if (story.acceptanceCriteria.length > 12 && !nonAtomic.includes(story.id)) nonAtomic.push(story.id);
  }
  const total = output.userStories.length;
  const value = total > 0 ? 1 - nonAtomic.length / total : 1;
  return { value, score: Math.round(value * 10 * 10) / 10, label: "Atomicity (QUS)", nonAtomicStories: nonAtomic, totalStories: total };
}

export function measureWellFormedness(output: BAOutput): WellFormednessMetric {
  const violations: string[] = [];
  let wellFormed = 0;
  for (const story of output.userStories) {
    const v: string[] = [];
    if (!story.asA || story.asA.trim().length < 2) v.push(`${story.id}: missing asA role`);
    if (!story.iWant || story.iWant.trim().length < 5) v.push(`${story.id}: iWant too short`);
    if (!story.soThat || story.soThat.trim().length < 5) v.push(`${story.id}: soThat too short`);
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
