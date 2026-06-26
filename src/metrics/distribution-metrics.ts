import { BAOutput } from "../types.js";
import { SizeDistributionMetric, EdgeCaseRatioMetric, PersonaDiversityMetric } from "./metric-types.js";

export function measureSizeDistribution(output: BAOutput): SizeDistributionMetric {
  const storiesWithPoints = output.userStories.filter((s) => s.storyPoints != null);
  const points = storiesWithPoints.map((s) => s.storyPoints!);
  const distribution: Record<number, number> = {};
  for (const p of points) distribution[p] = (distribution[p] ?? 0) + 1;
  if (points.length < 2)
    return { value: 0, score: 5, label: "Size Distribution", pointsVariance: 0, storiesWithPoints: storiesWithPoints.length, distribution };
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
