import { BAOutput } from "../types.js";
import { HardMetrics, MetricScore, MetricsSummary } from "./metric-types.js";
import { measureFormatCompliance, measureAcMeasurability, measureGherkinCoverage, measureAtomicity, measureWellFormedness } from "./structure-metrics.js";
import { measureInputCoverage, measureInputPrecision } from "./coverage-metrics.js";
import { measureStoryIndependence, measureDuplicateAc } from "./similarity-metrics.js";
import { measureReadability, measureGunningFog, measureSmogIndex, measureTypeTokenRatio } from "./readability-metrics.js";
import { measureVagueWordRatio, measurePassiveVoice, measureModalVerbStrength, measureTerminologyConsistency, measureSubordinateClauseDensity } from "./linguistic-metrics.js";
import { measureSizeDistribution, measureEdgeCaseRatio, measurePersonaDiversity } from "./distribution-metrics.js";

export type {
  HardMetrics, MetricScore, MetricsSummary,
  FormatComplianceMetric, AcMeasurabilityMetric, GherkinCoverageMetric,
  StoryIndependenceMetric, InputCoverageMetric, ReadabilityMetric,
  SizeDistributionMetric, EdgeCaseRatioMetric, PersonaDiversityMetric,
  DuplicateAcMetric, VagueWordMetric, PassiveVoiceMetric, ModalVerbMetric,
  GunningFogMetric, SmogIndexMetric, TypeTokenMetric, TerminologyConsistencyMetric,
  SubordinateClauseMetric, AtomicityMetric, WellFormednessMetric,
} from "./metric-types.js";

const METRIC_WEIGHTS: Record<string, number> = {
  formatCompliance:          1.5,
  acMeasurability:           1.5,
  gherkinCoverage:           1.0,
  storyIndependence:         1.0,
  inputCoverage:             2.0,
  inputPrecision:            1.5,
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

export function computeHardMetrics(output: BAOutput): HardMetrics {
  const partial = {
    formatCompliance:         measureFormatCompliance(output),
    acMeasurability:          measureAcMeasurability(output),
    gherkinCoverage:          measureGherkinCoverage(output),
    storyIndependence:        measureStoryIndependence(output),
    inputCoverage:            measureInputCoverage(output),
    inputPrecision:           measureInputPrecision(output),
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
