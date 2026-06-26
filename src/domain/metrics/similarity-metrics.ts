import { BAOutput } from "../../types.js";
import { StoryIndependenceMetric, DuplicateAcMetric } from "./metric-types.js";
import { tokenize, buildTfVector, cosineSimilarity } from "./text-utils.js";

export function measureStoryIndependence(output: BAOutput): StoryIndependenceMetric {
  const stories = output.userStories;
  if (stories.length < 2)
    return { value: 1, score: 10, label: "Story Independence", avgSimilarity: 0, maxSimilarity: 0, highOverlapPairs: [] };
  const vectors = stories.map((s) =>
    buildTfVector(tokenize([s.title, s.asA, s.iWant, s.soThat, ...s.acceptanceCriteria.map((ac) => ac.description)].join(" ")))
  );
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
    avgSimilarity: Math.round(avgSimilarity * 100) / 100,
    maxSimilarity: Math.round(maxSimilarity * 100) / 100,
    highOverlapPairs,
  };
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
  return {
    value: 1 - dupRatio,
    score: Math.round(Math.max(0, 10 - dupRatio * 50) * 10) / 10,
    label: "Duplicate AC",
    duplicatePairs: duplicatePairs.slice(0, 5),
    maxSimilarity: Math.round(maxSimilarity * 100) / 100,
  };
}
