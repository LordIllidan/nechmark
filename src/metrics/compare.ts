import { BAOutput } from "../types.js";
import { HardMetrics, MetricScore, computeHardMetrics } from "./hard-metrics.js";

export interface ComparisonEntry {
  label: string;
  output: BAOutput;
  metrics: HardMetrics;
}

export interface ComparisonReport {
  entries: ComparisonEntry[];
  winner: string;
  metricWinners: Record<string, string>;
  table: string;
}

export function compare(outputs: Array<{ label: string; output: BAOutput }>): ComparisonReport {
  const entries: ComparisonEntry[] = outputs.map(({ label, output }) => ({
    label,
    output,
    metrics: computeHardMetrics(output),
  }));

  const metricKeys: Array<keyof Omit<HardMetrics, "summary">> = [
    "formatCompliance",
    "acMeasurability",
    "gherkinCoverage",
    "storyIndependence",
    "inputCoverage",
    "readability",
    "sizeDistribution",
    "edgeCaseRatio",
    "personaDiversity",
    "duplicateAc",
  ];

  const metricWinners: Record<string, string> = {};
  for (const key of metricKeys) {
    let bestLabel = "";
    let bestScore = -1;
    for (const entry of entries) {
      const score = (entry.metrics[key] as MetricScore).score;
      if (score > bestScore) {
        bestScore = score;
        bestLabel = entry.label;
      }
    }
    metricWinners[key] = bestLabel;
  }

  // Overall winner by weighted score
  let winner = "";
  let bestOverall = -1;
  for (const entry of entries) {
    if (entry.metrics.summary.overallScore > bestOverall) {
      bestOverall = entry.metrics.summary.overallScore;
      winner = entry.label;
    }
  }

  const table = buildTable(entries, metricKeys);

  return { entries, winner, metricWinners, table };
}

function buildTable(
  entries: ComparisonEntry[],
  metricKeys: Array<keyof Omit<HardMetrics, "summary">>
): string {
  const COL_WIDTH = 14;
  const METRIC_COL = 22;

  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);
  const padL = (s: string, w: number) => s.slice(0, w).padStart(w);

  const header =
    pad("Metric", METRIC_COL) +
    entries.map((e) => pad(e.label, COL_WIDTH)).join("") +
    "  Winner";

  const divider = "-".repeat(header.length);
  const lines = [divider, header, divider];

  for (const key of metricKeys) {
    const winner = entries.reduce(
      (best, e) =>
        (e.metrics[key] as MetricScore).score > (best.metrics[key] as MetricScore).score ? e : best,
      entries[0]
    );

    const metricLabel = (entries[0].metrics[key] as MetricScore).label;
    const row =
      pad(metricLabel, METRIC_COL) +
      entries
        .map((e) => {
          const score = (e.metrics[key] as MetricScore).score;
          const isWinner = e.label === winner.label;
          return pad(`${score.toFixed(1)}${isWinner ? " ◀" : "  "}`, COL_WIDTH);
        })
        .join("") +
      `  ${winner.label}`;

    lines.push(row);
  }

  lines.push(divider);

  const overallRow =
    pad("OVERALL (weighted)", METRIC_COL) +
    entries
      .map((e) => {
        const score = e.metrics.summary.overallScore;
        const isWinner = entries.every(
          (other) => other.label === e.label || other.metrics.summary.overallScore <= score
        );
        return pad(`${score.toFixed(1)}${isWinner ? " ◀" : "  "}`, COL_WIDTH);
      })
      .join("") +
      `  ${entries.reduce((best, e) => (e.metrics.summary.overallScore > best.metrics.summary.overallScore ? e : best), entries[0]).label}`;

  lines.push(overallRow);
  lines.push(divider);

  // Per-entry verdict
  for (const entry of entries) {
    const s = entry.metrics.summary;
    lines.push(`\n${entry.label} — score ${s.overallScore}/10`);
    if (s.failures.length) lines.push(`  Failures: ${s.failures.join(", ")}`);
    if (s.warnings.length) lines.push(`  Warnings: ${s.warnings.join(", ")}`);
    if (s.passed.length) lines.push(`  Passed:   ${s.passed.join(", ")}`);
  }

  return lines.join("\n");
}
