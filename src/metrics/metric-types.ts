export interface MetricScore {
  value: number;
  score: number;
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
  mandatory: number;
  recommended: number;
  optional: number;
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

export interface HardMetrics {
  formatCompliance: FormatComplianceMetric;
  acMeasurability: AcMeasurabilityMetric;
  gherkinCoverage: GherkinCoverageMetric;
  storyIndependence: StoryIndependenceMetric;
  inputCoverage: InputCoverageMetric;
  inputPrecision: MetricScore;
  readability: ReadabilityMetric;
  sizeDistribution: SizeDistributionMetric;
  edgeCaseRatio: EdgeCaseRatioMetric;
  personaDiversity: PersonaDiversityMetric;
  duplicateAc: DuplicateAcMetric;
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
