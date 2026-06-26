import { BAOutput } from "../../types.js";
import { MetricScore } from "./metric-types.js";
import { measureFormatCompliance, measureAcMeasurability, measureGherkinCoverage, measureAtomicity, measureWellFormedness } from "./structure-metrics.js";
import { measureInputCoverage, measureInputPrecision } from "./coverage-metrics.js";
import { measureStoryIndependence, measureDuplicateAc } from "./similarity-metrics.js";
import { measureReadability, measureGunningFog, measureSmogIndex, measureTypeTokenRatio } from "./readability-metrics.js";
import { measureVagueWordRatio, measurePassiveVoice, measureModalVerbStrength, measureTerminologyConsistency, measureSubordinateClauseDensity } from "./linguistic-metrics.js";
import { measureSizeDistribution, measureEdgeCaseRatio, measurePersonaDiversity } from "./distribution-metrics.js";

export interface MetricEntry {
  key: string;
  weight: number;
  measure: (output: BAOutput) => MetricScore;
}

export const METRIC_REGISTRY: MetricEntry[] = [
  { key: "formatCompliance",         weight: 1.5, measure: measureFormatCompliance },
  { key: "acMeasurability",          weight: 1.5, measure: measureAcMeasurability },
  { key: "gherkinCoverage",          weight: 1.0, measure: measureGherkinCoverage },
  { key: "storyIndependence",        weight: 1.0, measure: measureStoryIndependence },
  { key: "inputCoverage",            weight: 2.0, measure: measureInputCoverage },
  { key: "inputPrecision",           weight: 1.5, measure: measureInputPrecision },
  { key: "readability",              weight: 0.5, measure: measureReadability },
  { key: "sizeDistribution",         weight: 0.5, measure: measureSizeDistribution },
  { key: "edgeCaseRatio",            weight: 1.0, measure: measureEdgeCaseRatio },
  { key: "personaDiversity",         weight: 0.5, measure: measurePersonaDiversity },
  { key: "duplicateAc",              weight: 1.0, measure: measureDuplicateAc },
  { key: "vagueWordRatio",           weight: 1.5, measure: measureVagueWordRatio },
  { key: "passiveVoiceRatio",        weight: 0.8, measure: measurePassiveVoice },
  { key: "modalVerbStrength",        weight: 1.0, measure: measureModalVerbStrength },
  { key: "gunningFog",               weight: 0.5, measure: measureGunningFog },
  { key: "smogIndex",                weight: 0.5, measure: measureSmogIndex },
  { key: "typeTokenRatio",           weight: 0.8, measure: measureTypeTokenRatio },
  { key: "terminologyConsistency",   weight: 1.5, measure: measureTerminologyConsistency },
  { key: "subordinateClauseDensity", weight: 0.8, measure: measureSubordinateClauseDensity },
  { key: "atomicity",                weight: 1.5, measure: measureAtomicity },
  { key: "wellFormedness",           weight: 1.5, measure: measureWellFormedness },
];
