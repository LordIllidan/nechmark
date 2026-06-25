import { BAOutput, JudgeResult, JudgeScore } from "../types.js";

export interface SuggestionReport {
  outputId: string;
  overallScore: number;
  passedINVEST: boolean;
  prioritizedSuggestions: PrioritizedSuggestion[];
  dimensionBreakdown: DimensionSummary[];
  verdict: "excellent" | "good" | "needs_improvement" | "poor";
}

export interface PrioritizedSuggestion {
  priority: "high" | "medium" | "low";
  dimension: string;
  suggestion: string;
  impact: string;
}

export interface DimensionSummary {
  dimension: string;
  score: number;
  status: "good" | "ok" | "poor";
  topSuggestion?: string;
}

const SCORE_THRESHOLDS = { excellent: 8.5, good: 7.0, ok: 5.5 };

export function generateSuggestionReport(
  output: BAOutput,
  judgeResult: JudgeResult
): SuggestionReport {
  const dimensionBreakdown = judgeResult.scores.map((s) => buildDimensionSummary(s));
  const prioritizedSuggestions = buildPrioritizedSuggestions(judgeResult.scores, judgeResult.suggestions);
  const verdict = scoreToVerdict(judgeResult.overallScore);

  return {
    outputId: judgeResult.outputId,
    overallScore: judgeResult.overallScore,
    passedINVEST: judgeResult.passedINVEST,
    prioritizedSuggestions,
    dimensionBreakdown,
    verdict,
  };
}

function buildDimensionSummary(score: JudgeScore): DimensionSummary {
  const status =
    score.score >= SCORE_THRESHOLDS.good
      ? "good"
      : score.score >= SCORE_THRESHOLDS.ok
      ? "ok"
      : "poor";

  return {
    dimension: score.dimension,
    score: score.score,
    status,
    topSuggestion: score.suggestions[0],
  };
}

function buildPrioritizedSuggestions(
  scores: JudgeScore[],
  overallSuggestions: string[]
): PrioritizedSuggestion[] {
  const suggestions: PrioritizedSuggestion[] = [];

  const sorted = [...scores].sort((a, b) => a.score - b.score);

  for (const score of sorted) {
    const priority: PrioritizedSuggestion["priority"] =
      score.score < SCORE_THRESHOLDS.ok ? "high" : score.score < SCORE_THRESHOLDS.good ? "medium" : "low";

    for (const suggestion of score.suggestions) {
      suggestions.push({
        priority,
        dimension: score.dimension,
        suggestion,
        impact: priority === "high" ? "Critical quality issue" : priority === "medium" ? "Notable improvement" : "Minor polish",
      });
    }
  }

  for (const s of overallSuggestions) {
    suggestions.push({
      priority: "medium",
      dimension: "Overall",
      suggestion: s,
      impact: "Cross-cutting improvement",
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
}

function scoreToVerdict(score: number): SuggestionReport["verdict"] {
  if (score >= SCORE_THRESHOLDS.excellent) return "excellent";
  if (score >= SCORE_THRESHOLDS.good) return "good";
  if (score >= SCORE_THRESHOLDS.ok) return "needs_improvement";
  return "poor";
}

export function formatSuggestionReport(report: SuggestionReport): string {
  const lines: string[] = [];

  lines.push(`== Quality Report ==`);
  lines.push(`Score: ${report.overallScore}/10 (${report.verdict.toUpperCase()})`);
  lines.push(`INVEST: ${report.passedINVEST ? "PASS" : "FAIL"}`);
  lines.push(``);

  lines.push(`-- Dimensions --`);
  for (const d of report.dimensionBreakdown) {
    const icon = d.status === "good" ? "✓" : d.status === "ok" ? "~" : "✗";
    lines.push(`${icon} ${d.dimension}: ${d.score}/10`);
    if (d.status !== "good" && d.topSuggestion) {
      lines.push(`  → ${d.topSuggestion}`);
    }
  }

  const highPriority = report.prioritizedSuggestions.filter((s) => s.priority === "high");
  const medPriority = report.prioritizedSuggestions.filter((s) => s.priority === "medium");

  if (highPriority.length > 0) {
    lines.push(``);
    lines.push(`-- High Priority --`);
    for (const s of highPriority) {
      lines.push(`[${s.dimension}] ${s.suggestion}`);
    }
  }

  if (medPriority.length > 0) {
    lines.push(``);
    lines.push(`-- Medium Priority --`);
    for (const s of medPriority.slice(0, 3)) {
      lines.push(`[${s.dimension}] ${s.suggestion}`);
    }
  }

  return lines.join("\n");
}
