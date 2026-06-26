import { BAOutput } from "../../types.js";
import { HardMetrics, MetricScore, MetricsSummary } from "./metric-types.js";
import { METRIC_REGISTRY, MetricEntry } from "./metric-registry.js";

export type {
  HardMetrics, MetricScore, MetricsSummary,
  FormatComplianceMetric, AcMeasurabilityMetric, GherkinCoverageMetric,
  StoryIndependenceMetric, InputCoverageMetric, ReadabilityMetric,
  SizeDistributionMetric, EdgeCaseRatioMetric, PersonaDiversityMetric,
  DuplicateAcMetric, VagueWordMetric, PassiveVoiceMetric, ModalVerbMetric,
  GunningFogMetric, SmogIndexMetric, TypeTokenMetric, TerminologyConsistencyMetric,
  SubordinateClauseMetric, AtomicityMetric, WellFormednessMetric,
} from "./metric-types.js";

function buildSummary(metrics: Record<string, MetricScore>, registry: MetricEntry[]): MetricsSummary {
  const weightMap = Object.fromEntries(registry.map((e) => [e.key, e.weight]));
  let weightedSum = 0, totalWeight = 0;
  for (const [key, metric] of Object.entries(metrics)) {
    const w = weightMap[key] ?? 1;
    weightedSum += metric.score * w;
    totalWeight += w;
  }
  const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  const passed: string[] = [], warnings: string[] = [], failures: string[] = [];
  for (const metric of Object.values(metrics)) {
    if (metric.score >= 7) passed.push(metric.label);
    else if (metric.score >= 5) warnings.push(metric.label);
    else failures.push(metric.label);
  }
  return { overallScore, passed, warnings, failures };
}

export function computeHardMetrics(output: BAOutput): HardMetrics {
  const partial = Object.fromEntries(
    METRIC_REGISTRY.map(({ key, measure }) => [key, measure(output)])
  ) as unknown as Omit<HardMetrics, "summary">;
  return { ...partial, summary: buildSummary(partial as unknown as Record<string, MetricScore>, METRIC_REGISTRY) };
}
