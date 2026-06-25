/**
 * Skill-aware metrics — mierzą efekt konkretnych skilali i technik promptowania
 * na jakość outputu. Każda funkcja przyjmuje output + descriptor i zwraca
 * numeryczną ocenę efektu.
 *
 * Nie zastępują hard-metrics — uzupełniają je o pytanie "dlaczego".
 */
import { BAOutput } from "../types.js";
import { AgentDescriptor } from "../agent-descriptor.js";
import { HardMetrics, MetricScore } from "./hard-metrics.js";

export interface SkillMetrics {
  selfCritiqueImpact: SkillMetric;
  structuredOutputQuality: SkillMetric;
  fewShotImpact: SkillMetric;
  toolCoverageBoost: SkillMetric;
  edgeCaseHunterEffect: SkillMetric;
  personaExpanderEffect: SkillMetric;
  chainOfThoughtCoherence: SkillMetric;
  reflectionRefinementScore: SkillMetric;
  agentComplexityRatio: SkillMetric;
  skillUtilizationScore: SkillMetric;
}

export interface SkillMetric {
  label: string;
  score: number;         // 0-10
  applicable: boolean;   // false = skill/tool nie był użyty, metric N/A
  evidence: string;      // co konkretnie zmierzono
  recommendation?: string;
}

// ---------------------------------------------------------------------------
// Self-critique — agent poprawiał własny output
// Proxy: wymagania dobre na wszystkich wymiarach jednocześnie (trudne bez self-critique)
// ---------------------------------------------------------------------------

export function measureSelfCritiqueImpact(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const applicable = descriptor.skills.includes("self-critique") ||
    descriptor.prompt.technique.includes("self-critique") ||
    descriptor.prompt.technique.includes("reflection");

  if (!applicable) {
    return { label: "Self-Critique Impact", score: 0, applicable: false, evidence: "Skill not used" };
  }

  // Proxy: czy metryki które self-critique powinno poprawiać są powyżej 7?
  const targetMetrics: (keyof Omit<HardMetrics, "summary">)[] = [
    "vagueWordRatio", "acMeasurability", "wellFormedness", "atomicity"
  ];
  const scores = targetMetrics.map((k) => (metrics[k] as MetricScore).score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Score = jak dużo powyżej 7 baseline (self-critique powinno popychać te metryki wysoko)
  const score = Math.min(10, (avg / 7) * 8);

  return {
    label: "Self-Critique Impact",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `Target metrics avg: ${avg.toFixed(1)}/10 (vagueWord, measurability, wellFomed, atomicity)`,
    recommendation: avg < 7 ? "Self-critique prompt nie skutecznie poprawia AC measurability i vague words" : undefined,
  };
}

// ---------------------------------------------------------------------------
// Structured output — wymuszony JSON przez tool-use / response_format
// Proxy: format compliance + brak pól null
// ---------------------------------------------------------------------------

export function measureStructuredOutputQuality(
  descriptor: AgentDescriptor,
  output: BAOutput,
  metrics: HardMetrics
): SkillMetric {
  const applicable = descriptor.prompt.technique.includes("structured-output");

  const formatScore = metrics.formatCompliance.score;
  const missingCount = metrics.formatCompliance.missingFields.length;

  // Bez structured-output format compliance < 10 jest normalny
  // Z structured-output brak pól = błąd w implementacji
  const score = applicable
    ? missingCount === 0 ? 10 : Math.max(0, 10 - missingCount * 2)
    : formatScore;

  return {
    label: "Structured Output Quality",
    score: Math.round(score * 10) / 10,
    applicable,
    evidence: `Format compliance: ${formatScore}/10, missing fields: ${missingCount}`,
    recommendation: applicable && missingCount > 0
      ? `Structured output włączony ale ${missingCount} pól brakuje — sprawdź schemat JSON`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Few-shot — przykłady w prompcie
// Proxy: terminologia konsystentna + well-formedness (few-shot uczy formatu)
// ---------------------------------------------------------------------------

export function measureFewShotImpact(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const fewShotCount = descriptor.prompt.fewShotCount ?? 0;
  const applicable = descriptor.prompt.technique.includes("few-shot") || fewShotCount > 0;

  if (!applicable) {
    return { label: "Few-Shot Impact", score: 0, applicable: false, evidence: "Technique not used" };
  }

  // Few-shot przede wszystkim poprawia: well-formedness, terminologyConsistency, gherkinCoverage
  const targets: (keyof Omit<HardMetrics, "summary">)[] = [
    "wellFormedness", "terminologyConsistency", "gherkinCoverage"
  ];
  const avg = targets.map((k) => (metrics[k] as MetricScore).score).reduce((a, b) => a + b, 0) / targets.length;

  // Więcej przykładów = wyższe oczekiwania
  const expectedBaseline = Math.min(9, 6 + fewShotCount * 0.5);
  const score = Math.min(10, (avg / expectedBaseline) * 9);

  return {
    label: "Few-Shot Impact",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `${fewShotCount} examples in prompt. WellFormedness+Consistency+Gherkin avg: ${avg.toFixed(1)}/10`,
    recommendation: avg < 6.5
      ? `${fewShotCount} przykłady nie wystarczą lub są złej jakości — sprawdź format przykładów`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Tool coverage boost — narzędzia zewnętrzne powinny poprawiać input coverage
// ---------------------------------------------------------------------------

export function measureToolCoverageBoost(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const hasContextTools = descriptor.tools.some((t) =>
    ["jira-fetch", "confluence-search", "web-search", "code-scan", "glossary-lookup"].includes(t)
  );
  const applicable = hasContextTools;

  if (!applicable) {
    return { label: "Tool Coverage Boost", score: 0, applicable: false, evidence: "No context-enrichment tools" };
  }

  // Z narzędziami input coverage powinien być wysoki (agent ma więcej kontekstu)
  const coverage = metrics.inputCoverage.score;
  const toolCount = descriptor.tools.length;

  // Więcej toolów = wyższe oczekiwania dla input coverage
  const expected = Math.min(9.5, 7 + toolCount * 0.3);
  const score = Math.min(10, (coverage / expected) * 10);

  return {
    label: "Tool Coverage Boost",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `${toolCount} tools used. Input coverage: ${coverage}/10 (expected ≥${expected.toFixed(1)} with tools)`,
    recommendation: coverage < expected - 1
      ? `Narzędzia dostępne ale input coverage niski — tool retrieval może zwracać nieistotny kontekst`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Edge-case hunter skill
// ---------------------------------------------------------------------------

export function measureEdgeCaseHunterEffect(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const applicable = descriptor.skills.includes("edge-case-hunter");

  if (!applicable) {
    return { label: "Edge Case Hunter Effect", score: 0, applicable: false, evidence: "Skill not used" };
  }

  // Z edge-case-hunter oczekujemy >= 30% edge cases i wysokiej measurability
  const ecRatio = metrics.edgeCaseRatio.value;
  const measurability = metrics.acMeasurability.score;

  // Score oparty o osiągnięcie targetu 30% edge cases
  const ecScore = ecRatio >= 0.3 ? 10 : (ecRatio / 0.3) * 10;
  const score = (ecScore * 0.7 + measurability * 0.3);

  return {
    label: "Edge Case Hunter Effect",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `Edge case ratio: ${(ecRatio * 100).toFixed(0)}% (target ≥30%), AC measurability: ${measurability}/10`,
    recommendation: ecRatio < 0.25
      ? "Edge-case hunter skill włączony ale < 25% AC to edge cases — sprawdź prompt skilla"
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Persona expander skill
// ---------------------------------------------------------------------------

export function measurePersonaExpanderEffect(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const applicable = descriptor.skills.includes("persona-expander");

  if (!applicable) {
    return { label: "Persona Expander Effect", score: 0, applicable: false, evidence: "Skill not used" };
  }

  const diversity = metrics.personaDiversity.score;
  const unique = metrics.personaDiversity.uniquePersonas.length;

  // Z persona-expander oczekujemy >= 3 różnych person
  const score = unique >= 3 ? diversity : (unique / 3) * diversity;

  return {
    label: "Persona Expander Effect",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `${unique} unique personas found. Diversity score: ${diversity}/10`,
    recommendation: unique < 3
      ? `Persona expander włączony ale tylko ${unique} persona(y) — sprawdź czy prompt każe szukać wszystkich ról`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Chain-of-thought coherence
// Proxy: niski passive voice + niski subordinate clause density + wysoka well-formedness
// (CoT poprawia logikę, więc output powinien być bardziej klarowny)
// ---------------------------------------------------------------------------

export function measureChainOfThoughtCoherence(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const applicable = descriptor.prompt.technique.includes("chain-of-thought") ||
    descriptor.prompt.technique.includes("tree-of-thought");

  if (!applicable) {
    return { label: "Chain-of-Thought Coherence", score: 0, applicable: false, evidence: "Technique not used" };
  }

  const targets: (keyof Omit<HardMetrics, "summary">)[] = [
    "passiveVoiceRatio", "subordinateClauseDensity", "wellFormedness", "storyIndependence"
  ];
  const avg = targets.map((k) => (metrics[k] as MetricScore).score).reduce((a, b) => a + b, 0) / targets.length;

  return {
    label: "Chain-of-Thought Coherence",
    score: Math.round(avg * 10) / 10,
    applicable: true,
    evidence: `Clarity indicators avg: ${avg.toFixed(1)}/10 (passive voice, subordinate clauses, well-formedness, independence)`,
  };
}

// ---------------------------------------------------------------------------
// Reflection refinement — ile rund poprawiania
// ---------------------------------------------------------------------------

export function measureReflectionRefinementScore(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const rounds = descriptor.prompt.maxRefinementRounds ?? 0;
  const applicable = descriptor.prompt.technique.includes("reflection") && rounds > 0;

  if (!applicable) {
    return { label: "Reflection Refinement Score", score: 0, applicable: false, evidence: "Reflection not configured" };
  }

  // Im więcej rund tym wyższe oczekiwania dla "polish" metryk
  const polishMetrics: (keyof Omit<HardMetrics, "summary">)[] = [
    "vagueWordRatio", "duplicateAc", "terminologyConsistency", "modalVerbStrength"
  ];
  const avg = polishMetrics.map((k) => (metrics[k] as MetricScore).score).reduce((a, b) => a + b, 0) / polishMetrics.length;
  const expected = Math.min(9.5, 6 + rounds * 1.0);
  const score = Math.min(10, (avg / expected) * 10);

  return {
    label: "Reflection Refinement Score",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `${rounds} refinement rounds. Polish metrics avg: ${avg.toFixed(1)}/10 (expected ≥${expected.toFixed(1)})`,
    recommendation: avg < expected - 1.5
      ? `${rounds} rundy refleksji nie poprawiają wystarczająco polish metryk — sprawdź prompt krytyki`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Agent complexity ratio — koszt konfiguracji vs wynik
// Proxy: czy bardziej złożona konfiguracja daje lepsze wyniki?
// ---------------------------------------------------------------------------

export function measureAgentComplexityRatio(
  descriptor: AgentDescriptor,
  metrics: HardMetrics
): SkillMetric {
  const complexity =
    descriptor.skills.length * 2 +
    descriptor.tools.length * 1.5 +
    descriptor.prompt.technique.length * 1 +
    (descriptor.prompt.fewShotCount ?? 0) * 0.5 +
    (descriptor.prompt.maxRefinementRounds ?? 0) * 2 +
    (descriptor.model.thinking ? 3 : 0);

  const overallScore = metrics.summary.overallScore;

  // Efficiency: score/complexity. Brak complexity = N/A
  if (complexity === 0) {
    return { label: "Agent Complexity Ratio", score: 0, applicable: false, evidence: "Baseline (no enhancements)" };
  }

  // Normalizuj: complexity 10 + score 8 = ratio 0.8 (bardzo efektywny)
  // complexity 20 + score 8 = ratio 0.4 (dużo konfiguracji za mało efektu)
  const ratio = overallScore / complexity;
  const score = Math.min(10, ratio * 12);

  return {
    label: "Agent Complexity Ratio",
    score: Math.round(score * 10) / 10,
    applicable: true,
    evidence: `Complexity index: ${complexity.toFixed(1)}, overall score: ${overallScore}/10, efficiency: ${ratio.toFixed(2)}`,
    recommendation: ratio < 0.5
      ? "Wysokie koszty konfiguracji (skills+tools+rounds) przy słabym wyniku — sprawdź która opcja nie przynosi efektu"
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Skill utilization score — ile skilli faktycznie pomaga
// ---------------------------------------------------------------------------

export function measureSkillUtilizationScore(
  descriptor: AgentDescriptor,
  allSkillMetrics: Omit<SkillMetrics, "skillUtilizationScore">
): SkillMetric {
  const applicable = descriptor.skills.length > 0 || descriptor.tools.length > 0;

  if (!applicable) {
    return { label: "Skill Utilization Score", score: 0, applicable: false, evidence: "No skills or tools configured" };
  }

  const applicableMetrics = Object.values(allSkillMetrics).filter((m) => m.applicable);

  if (applicableMetrics.length === 0) {
    return { label: "Skill Utilization Score", score: 5, applicable: true, evidence: "Skills configured but none measurable" };
  }

  const avg = applicableMetrics.reduce((s, m) => s + m.score, 0) / applicableMetrics.length;
  const failing = applicableMetrics.filter((m) => m.score < 5);

  return {
    label: "Skill Utilization Score",
    score: Math.round(avg * 10) / 10,
    applicable: true,
    evidence: `${applicableMetrics.length} skills measured, ${failing.length} below 5/10`,
    recommendation: failing.length > 0
      ? `Słabo działające skille: ${failing.map((m) => m.label).join(", ")}`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function computeSkillMetrics(
  descriptor: AgentDescriptor,
  output: BAOutput,
  hardMetrics: HardMetrics
): SkillMetrics {
  const partial = {
    selfCritiqueImpact:         measureSelfCritiqueImpact(descriptor, hardMetrics),
    structuredOutputQuality:    measureStructuredOutputQuality(descriptor, output, hardMetrics),
    fewShotImpact:              measureFewShotImpact(descriptor, hardMetrics),
    toolCoverageBoost:          measureToolCoverageBoost(descriptor, hardMetrics),
    edgeCaseHunterEffect:       measureEdgeCaseHunterEffect(descriptor, hardMetrics),
    personaExpanderEffect:      measurePersonaExpanderEffect(descriptor, hardMetrics),
    chainOfThoughtCoherence:    measureChainOfThoughtCoherence(descriptor, hardMetrics),
    reflectionRefinementScore:  measureReflectionRefinementScore(descriptor, hardMetrics),
    agentComplexityRatio:       measureAgentComplexityRatio(descriptor, hardMetrics),
  };

  return {
    ...partial,
    skillUtilizationScore: measureSkillUtilizationScore(descriptor, partial),
  };
}
