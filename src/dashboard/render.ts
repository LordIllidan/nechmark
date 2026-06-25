import { HardMetrics, MetricScore } from "../metrics/hard-metrics.js";
import { StoredRun, getVersions, getCases, getLatestRunPerVersionPerCase } from "./store.js";

// ANSI colors
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgDark: "\x1b[48;5;234m",
};

function color(score: number): string {
  if (score >= 7) return C.green;
  if (score >= 5) return C.yellow;
  return C.red;
}

function scoreBar(score: number, width = 10): string {
  const filled = Math.round((score / 10) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function trend(current: number, previous?: number): string {
  if (previous === undefined) return "  ";
  const diff = current - previous;
  if (Math.abs(diff) < 0.3) return "→ ";
  return diff > 0 ? `${C.green}↑ ${C.reset}` : `${C.red}↓ ${C.reset}`;
}

const METRIC_KEYS: Array<keyof Omit<HardMetrics, "summary">> = [
  "formatCompliance",
  "wellFormedness",
  "atomicity",
  "acMeasurability",
  "gherkinCoverage",
  "edgeCaseRatio",
  "duplicateAc",
  "vagueWordRatio",
  "modalVerbStrength",
  "passiveVoiceRatio",
  "subordinateClauseDensity",
  "storyIndependence",
  "inputCoverage",
  "terminologyConsistency",
  "typeTokenRatio",
  "readability",
  "gunningFog",
  "smogIndex",
  "sizeDistribution",
  "personaDiversity",
];

// ---------------------------------------------------------------------------
// Dashboard 1: Version comparison matrix (rows = metrics, cols = versions)
// ---------------------------------------------------------------------------

export function renderVersionMatrix(runs: StoredRun[]): string {
  const versions = getVersions({ runs, path: "" });
  const latest = getLatestRunPerVersionPerCase({ runs, path: "" });

  // Aggregate per version: avg score per metric
  const versionScores = new Map<string, Map<string, number[]>>();
  for (const [, run] of latest) {
    const vid = run.version.id;
    if (!versionScores.has(vid)) versionScores.set(vid, new Map());
    const vmap = versionScores.get(vid)!;
    for (const key of METRIC_KEYS) {
      const score = (run.hardMetrics[key] as MetricScore).score;
      if (!vmap.has(key)) vmap.set(key, []);
      vmap.get(key)!.push(score);
    }
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const COL = 14;
  const LABEL_COL = 30;
  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ VERSION COMPARISON MATRIX ══╗${C.reset}`);
  lines.push(`${C.dim}Latest run per version per case, averaged across cases${C.reset}\n`);

  // Header
  const header = pad("Metric", LABEL_COL) + versions.map((v) => pad(v, COL)).join("");
  lines.push(C.bold + header + C.reset);
  lines.push("─".repeat(header.length));

  // Group rows by category
  const groups: Array<{ label: string; keys: typeof METRIC_KEYS }> = [
    { label: "Structure & Format", keys: ["formatCompliance", "wellFormedness", "atomicity"] },
    { label: "Acceptance Criteria", keys: ["acMeasurability", "gherkinCoverage", "edgeCaseRatio", "duplicateAc"] },
    { label: "Language Precision", keys: ["vagueWordRatio", "modalVerbStrength", "passiveVoiceRatio", "subordinateClauseDensity"] },
    { label: "Consistency & Coverage", keys: ["storyIndependence", "inputCoverage", "terminologyConsistency", "typeTokenRatio"] },
    { label: "Readability", keys: ["readability", "gunningFog", "smogIndex"] },
    { label: "Planning", keys: ["sizeDistribution", "personaDiversity"] },
  ];

  for (const group of groups) {
    lines.push(`\n${C.dim}── ${group.label} ──${C.reset}`);
    for (const key of group.keys) {
      const label = (runs[0]?.hardMetrics[key] as MetricScore | undefined)?.label ?? key;
      let row = pad(label, LABEL_COL);
      for (const vid of versions) {
        const scores = versionScores.get(vid)?.get(key) ?? [];
        if (scores.length === 0) {
          row += pad("—", COL);
        } else {
          const s = avg(scores);
          row += color(s) + pad(`${s.toFixed(1)}/10`, COL) + C.reset;
        }
      }
      lines.push(row);
    }
  }

  // Overall row
  lines.push("\n" + "═".repeat(header.length));
  let overallRow = C.bold + pad("OVERALL (weighted)", LABEL_COL);
  let bestScore = -1;
  const overallScores: number[] = [];
  for (const vid of versions) {
    const vRuns = [...latest.values()].filter((r) => r.version.id === vid);
    const s = vRuns.length > 0 ? avg(vRuns.map((r) => r.hardMetrics.summary.overallScore)) : 0;
    overallScores.push(s);
    if (s > bestScore) bestScore = s;
  }
  for (let i = 0; i < versions.length; i++) {
    const s = overallScores[i];
    const isWinner = s === bestScore && versions.length > 1;
    overallRow += color(s) + pad(`${s.toFixed(1)}/10${isWinner ? " ◀" : "  "}`, COL) + C.reset;
  }
  lines.push(overallRow + C.reset);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dashboard 2: Per-case breakdown (rows = versions, cols = cases)
// ---------------------------------------------------------------------------

export function renderCaseMatrix(runs: StoredRun[]): string {
  const versions = getVersions({ runs, path: "" });
  const cases = getCases({ runs, path: "" });
  const latest = getLatestRunPerVersionPerCase({ runs, path: "" });

  const COL = 12;
  const LABEL_COL = 24;
  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ CASE BREAKDOWN — Overall Score per Version per Case ══╗${C.reset}\n`);

  const header = pad("Version", LABEL_COL) + cases.map((c) => pad(c, COL)).join("") + pad("AVG", COL);
  lines.push(C.bold + header + C.reset);
  lines.push("─".repeat(header.length));

  for (const vid of versions) {
    let row = pad(vid, LABEL_COL);
    const scores: number[] = [];
    for (const caseId of cases) {
      const run = latest.get(`${vid}::${caseId}`);
      if (!run) { row += pad("—", COL); continue; }
      const s = run.hardMetrics.summary.overallScore;
      scores.push(s);
      row += color(s) + pad(`${s.toFixed(1)}`, COL) + C.reset;
    }
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    row += C.bold + color(avg) + pad(`${avg.toFixed(1)}`, COL) + C.reset;
    lines.push(row);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dashboard 3: Trend over time for a single version
// ---------------------------------------------------------------------------

export function renderTrend(runs: StoredRun[], versionId: string): string {
  const vRuns = runs.filter((r) => r.version.id === versionId).sort((a, b) => a.runAt.localeCompare(b.runAt));
  if (vRuns.length === 0) return `No runs found for version: ${versionId}`;

  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ TREND — ${versionId} (${vRuns.length} runs) ══╗${C.reset}\n`);

  const LABEL_COL = 30;
  const COL = 10;
  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

  lines.push(C.bold + pad("Metric", LABEL_COL) + vRuns.map((_, i) => pad(`Run ${i + 1}`, COL)).join("") + C.reset);
  lines.push("─".repeat(LABEL_COL + vRuns.length * COL));

  for (const key of METRIC_KEYS) {
    const label = (vRuns[0].hardMetrics[key] as MetricScore).label;
    let row = pad(label, LABEL_COL);
    for (let i = 0; i < vRuns.length; i++) {
      const s = (vRuns[i].hardMetrics[key] as MetricScore).score;
      const prev = i > 0 ? (vRuns[i - 1].hardMetrics[key] as MetricScore).score : undefined;
      row += color(s) + trend(s, prev) + pad(`${s.toFixed(1)}`, COL - 2) + C.reset;
    }
    lines.push(row);
  }

  lines.push("\n" + "─".repeat(LABEL_COL + vRuns.length * COL));
  let overallRow = C.bold + pad("OVERALL", LABEL_COL);
  for (let i = 0; i < vRuns.length; i++) {
    const s = vRuns[i].hardMetrics.summary.overallScore;
    const prev = i > 0 ? vRuns[i - 1].hardMetrics.summary.overallScore : undefined;
    overallRow += color(s) + trend(s, prev) + pad(`${s.toFixed(1)}`, COL - 2) + C.reset;
  }
  lines.push(overallRow + C.reset);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dashboard 4: Failures & warnings summary
// ---------------------------------------------------------------------------

export function renderFailureSummary(runs: StoredRun[]): string {
  const latest = getLatestRunPerVersionPerCase({ runs, path: "" });
  const versions = getVersions({ runs, path: "" });

  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ FAILURE SUMMARY ══╗${C.reset}\n`);

  for (const vid of versions) {
    const vRuns = [...latest.values()].filter((r) => r.version.id === vid);
    if (vRuns.length === 0) continue;

    // Collect all failures and warnings across runs
    const failureCounts = new Map<string, number>();
    const warningCounts = new Map<string, number>();
    for (const run of vRuns) {
      for (const f of run.hardMetrics.summary.failures) failureCounts.set(f, (failureCounts.get(f) ?? 0) + 1);
      for (const w of run.hardMetrics.summary.warnings) warningCounts.set(w, (warningCounts.get(w) ?? 0) + 1);
    }

    const avgScore = vRuns.reduce((s, r) => s + r.hardMetrics.summary.overallScore, 0) / vRuns.length;
    lines.push(`${C.bold}${vid}${C.reset} — avg ${color(avgScore)}${avgScore.toFixed(1)}/10${C.reset} (${vRuns.length} cases)`);

    if (failureCounts.size > 0) {
      const sorted = [...failureCounts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [metric, count] of sorted) {
        const pct = Math.round((count / vRuns.length) * 100);
        lines.push(`  ${C.red}✗${C.reset} ${metric} (${pct}% of cases)`);
      }
    }
    if (warningCounts.size > 0) {
      const sorted = [...warningCounts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [metric, count] of sorted) {
        const pct = Math.round((count / vRuns.length) * 100);
        lines.push(`  ${C.yellow}~${C.reset} ${metric} (${pct}% of cases)`);
      }
    }
    if (failureCounts.size === 0 && warningCounts.size === 0) {
      lines.push(`  ${C.green}✓ All metrics passed${C.reset}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dashboard 5: Score bars — quick visual overview
// ---------------------------------------------------------------------------

export function renderScoreBars(runs: StoredRun[], versionId?: string): string {
  const filtered = versionId ? runs.filter((r) => r.version.id === versionId) : runs;
  const latest = getLatestRunPerVersionPerCase({ runs: filtered, path: "" });
  const allRuns = [...latest.values()];

  if (allRuns.length === 0) return "No runs to display.";

  const avg = (key: keyof Omit<HardMetrics, "summary">) => {
    const scores = allRuns.map((r) => (r.hardMetrics[key] as MetricScore).score);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const title = versionId ? `SCORE BARS — ${versionId}` : "SCORE BARS — All Versions (avg)";
  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ ${title} ══╗${C.reset}\n`);

  const groups: Array<{ label: string; keys: typeof METRIC_KEYS }> = [
    { label: "Structure", keys: ["formatCompliance", "wellFormedness", "atomicity"] },
    { label: "AC Quality", keys: ["acMeasurability", "gherkinCoverage", "edgeCaseRatio", "duplicateAc"] },
    { label: "Language", keys: ["vagueWordRatio", "modalVerbStrength", "passiveVoiceRatio", "subordinateClauseDensity"] },
    { label: "Consistency", keys: ["storyIndependence", "inputCoverage", "terminologyConsistency", "typeTokenRatio"] },
    { label: "Readability", keys: ["readability", "gunningFog", "smogIndex"] },
    { label: "Planning", keys: ["sizeDistribution", "personaDiversity"] },
  ];

  for (const group of groups) {
    lines.push(`${C.dim}${group.label}${C.reset}`);
    for (const key of group.keys) {
      const s = avg(key);
      const label = (allRuns[0].hardMetrics[key] as MetricScore).label.padEnd(34);
      lines.push(`  ${label} ${color(s)}${scoreBar(s)}${C.reset} ${s.toFixed(1)}`);
    }
    lines.push("");
  }

  const overallAvg = allRuns.reduce((s, r) => s + r.hardMetrics.summary.overallScore, 0) / allRuns.length;
  lines.push(`${"OVERALL".padEnd(36)} ${color(overallAvg)}${scoreBar(overallAvg)}${C.reset} ${C.bold}${overallAvg.toFixed(1)}${C.reset}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// HTML export
// ---------------------------------------------------------------------------

export function renderHTML(runs: StoredRun[]): string {
  const versions = getVersions({ runs, path: "" });
  const cases = getCases({ runs, path: "" });
  const latest = getLatestRunPerVersionPerCase({ runs, path: "" });

  const scoreColor = (s: number) => s >= 7 ? "#22c55e" : s >= 5 ? "#eab308" : "#ef4444";
  const scoreStyle = (s: number) => `background:${scoreColor(s)}22;color:${scoreColor(s)};font-weight:bold;`;

  const avgRunScores = (vid: string) => {
    const vRuns = [...latest.values()].filter((r) => r.version.id === vid);
    return vRuns.length > 0 ? vRuns.reduce((s, r) => s + r.hardMetrics.summary.overallScore, 0) / vRuns.length : 0;
  };

  const metricAvg = (vid: string, key: keyof Omit<HardMetrics, "summary">) => {
    const vRuns = [...latest.values()].filter((r) => r.version.id === vid);
    if (vRuns.length === 0) return null;
    return vRuns.reduce((s, r) => s + (r.hardMetrics[key] as MetricScore).score, 0) / vRuns.length;
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>nechmark dashboard</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 24px; }
  h1 { color: #38bdf8; margin-bottom: 4px; }
  .subtitle { color: #64748b; margin-bottom: 32px; font-size: 0.9rem; }
  h2 { color: #94a3b8; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 40px; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
  th { background: #1e293b; color: #94a3b8; padding: 8px 12px; text-align: left; font-size: 0.8rem; }
  td { padding: 7px 12px; border-bottom: 1px solid #1e293b; font-size: 0.85rem; }
  tr:hover td { background: #1e293b44; }
  .score { border-radius: 4px; padding: 2px 8px; font-size: 0.85rem; }
  .bar-wrap { display: flex; align-items: center; gap: 8px; }
  .bar { height: 8px; border-radius: 4px; }
  .winner { font-size: 0.75rem; margin-left: 4px; }
  .group-header td { background: #1e293b; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 12px; }
  .overall td { background: #0f172a; font-weight: bold; border-top: 2px solid #334155; }
  .card { background: #1e293b; border-radius: 8px; padding: 16px 20px; display: inline-block; margin: 0 12px 12px 0; min-width: 140px; }
  .card-label { color: #64748b; font-size: 0.75rem; margin-bottom: 4px; }
  .card-value { font-size: 1.6rem; font-weight: bold; }
</style>
</head>
<body>
<h1>nechmark dashboard</h1>
<div class="subtitle">Generated ${new Date().toISOString()} · ${runs.length} total runs · ${versions.length} versions · ${cases.length} cases</div>

<h2>Overall scores per version</h2>
<div>
${versions.map((vid) => {
  const s = avgRunScores(vid);
  return `<div class="card"><div class="card-label">${vid}</div><div class="card-value" style="color:${scoreColor(s)}">${s.toFixed(1)}<span style="font-size:1rem;color:#64748b">/10</span></div></div>`;
}).join("\n")}
</div>

<h2>Metric breakdown by version</h2>
<table>
<thead><tr><th>Metric</th>${versions.map((v) => `<th>${v}</th>`).join("")}</tr></thead>
<tbody>
${[
  { label: "── Structure & Format ──", keys: [] as typeof METRIC_KEYS },
  { label: null, keys: ["formatCompliance", "wellFormedness", "atomicity"] as typeof METRIC_KEYS },
  { label: "── Acceptance Criteria ──", keys: [] },
  { label: null, keys: ["acMeasurability", "gherkinCoverage", "edgeCaseRatio", "duplicateAc"] as typeof METRIC_KEYS },
  { label: "── Language Precision ──", keys: [] },
  { label: null, keys: ["vagueWordRatio", "modalVerbStrength", "passiveVoiceRatio", "subordinateClauseDensity"] as typeof METRIC_KEYS },
  { label: "── Consistency & Coverage ──", keys: [] },
  { label: null, keys: ["storyIndependence", "inputCoverage", "terminologyConsistency", "typeTokenRatio"] as typeof METRIC_KEYS },
  { label: "── Readability ──", keys: [] },
  { label: null, keys: ["readability", "gunningFog", "smogIndex"] as typeof METRIC_KEYS },
  { label: "── Planning ──", keys: [] },
  { label: null, keys: ["sizeDistribution", "personaDiversity"] as typeof METRIC_KEYS },
].map((group) => {
  if (group.label !== null && group.keys.length === 0) {
    return `<tr class="group-header"><td colspan="${versions.length + 1}">${group.label}</td></tr>`;
  }
  return group.keys.map((key) => {
    const label = (runs[0]?.hardMetrics[key] as MetricScore | undefined)?.label ?? key;
    const scores = versions.map((vid) => metricAvg(vid, key));
    const max = Math.max(...scores.filter((s) => s !== null) as number[]);
    return `<tr><td>${label}</td>${scores.map((s) => {
      if (s === null) return "<td>—</td>";
      const isMax = s === max && versions.length > 1;
      return `<td><div class="bar-wrap"><div class="bar" style="width:${s * 6}px;background:${scoreColor(s)}"></div><span class="score" style="${scoreStyle(s)}">${s.toFixed(1)}</span>${isMax ? '<span class="winner">◀</span>' : ''}</div></td>`;
    }).join("")}</tr>`;
  }).join("\n");
}).join("\n")}
<tr class="overall"><td>OVERALL (weighted avg)</td>${versions.map((vid) => {
  const s = avgRunScores(vid);
  const allAvgs = versions.map(avgRunScores);
  const isMax = s === Math.max(...allAvgs) && versions.length > 1;
  return `<td><span class="score" style="${scoreStyle(s)}">${s.toFixed(1)}</span>${isMax ? ' ◀' : ''}</td>`;
}).join("")}</tr>
</tbody>
</table>

<h2>Case breakdown</h2>
<table>
<thead><tr><th>Version</th>${cases.map((c) => `<th>${c}</th>`).join("")}<th>AVG</th></tr></thead>
<tbody>
${versions.map((vid) => {
  const scores = cases.map((caseId) => {
    const run = latest.get(`${vid}::${caseId}`);
    return run ? run.hardMetrics.summary.overallScore : null;
  });
  const valid = scores.filter((s) => s !== null) as number[];
  const avg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
  return `<tr><td><strong>${vid}</strong></td>${scores.map((s) =>
    s === null ? "<td>—</td>" : `<td><span class="score" style="${scoreStyle(s)}">${s.toFixed(1)}</span></td>`
  ).join("")}<td><span class="score" style="${scoreStyle(avg)}">${avg.toFixed(1)}</span></td></tr>`;
}).join("\n")}
</tbody>
</table>

</body></html>`;

  return html;
}
