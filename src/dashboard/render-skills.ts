import { StoredRun, getVersions, getLatestRunPerVersionPerCase } from "./store.js";
import { SkillMetric, SkillMetrics } from "../metrics/skill-metrics.js";
import { AgentDescriptor, descriptorLabel } from "../agent-descriptor.js";

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m",
  cyan: "\x1b[36m", gray: "\x1b[90m", blue: "\x1b[34m",
};

function sc(score: number): string {
  return score >= 7 ? C.green : score >= 5 ? C.yellow : C.red;
}

function bar(score: number, w = 10): string {
  const f = Math.round((score / 10) * w);
  return "█".repeat(f) + "░".repeat(w - f);
}

const SKILL_METRIC_KEYS: Array<keyof SkillMetrics> = [
  "selfCritiqueImpact",
  "structuredOutputQuality",
  "fewShotImpact",
  "toolCoverageBoost",
  "edgeCaseHunterEffect",
  "personaExpanderEffect",
  "chainOfThoughtCoherence",
  "reflectionRefinementScore",
  "agentComplexityRatio",
  "skillUtilizationScore",
];

// ---------------------------------------------------------------------------
// Dashboard: Skill matrix — wiersze = skill metryki, kolumny = wersje agentów
// Pomija metryki N/A dla wszystkich wersji
// ---------------------------------------------------------------------------

export function renderSkillMatrix(runs: StoredRun[]): string {
  const versions = getVersions({ runs, path: "" });
  const latest = getLatestRunPerVersionPerCase({ runs, path: "" });

  // Sprawdź czy w ogóle mamy skill metrics
  const hasSkills = [...latest.values()].some((r) => r.skillMetrics);
  if (!hasSkills) {
    return `\n${C.yellow}Brak danych skill metrics. Używaj addRunWithDescriptor() lub podaj --descriptor przy add.${C.reset}\n`;
  }

  // Avg skill score per version per metric
  const versionSkillScores = new Map<string, Map<string, { scores: number[]; applicable: boolean }>>();
  for (const [, run] of latest) {
    if (!run.skillMetrics) continue;
    const vid = run.version.id;
    if (!versionSkillScores.has(vid)) versionSkillScores.set(vid, new Map());
    const vmap = versionSkillScores.get(vid)!;
    for (const key of SKILL_METRIC_KEYS) {
      const m = run.skillMetrics[key] as SkillMetric;
      if (!vmap.has(key)) vmap.set(key, { scores: [], applicable: false });
      const entry = vmap.get(key)!;
      if (m.applicable) { entry.scores.push(m.score); entry.applicable = true; }
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const COL = 16;
  const LABEL_COL = 32;
  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ SKILL METRICS MATRIX ══╗${C.reset}`);
  lines.push(`${C.dim}Applicable (◉) vs N/A (○) per version${C.reset}\n`);

  const header = pad("Skill Metric", LABEL_COL) + versions.map((v) => pad(v, COL)).join("");
  lines.push(C.bold + header + C.reset);
  lines.push("─".repeat(header.length));

  for (const key of SKILL_METRIC_KEYS) {
    // Skip if applicable nowhere
    const anyApplicable = versions.some((vid) => versionSkillScores.get(vid)?.get(key)?.applicable);

    const sampleRun = [...latest.values()].find((r) => r.skillMetrics);
    const label = sampleRun ? (sampleRun.skillMetrics![key] as SkillMetric).label : key;

    let row = pad(label, LABEL_COL);
    for (const vid of versions) {
      const entry = versionSkillScores.get(vid)?.get(key);
      if (!entry || !entry.applicable) {
        row += C.gray + pad("○ N/A", COL) + C.reset;
      } else {
        const s = avg(entry.scores)!;
        row += sc(s) + pad(`◉ ${s.toFixed(1)}/10`, COL) + C.reset;
      }
    }
    if (anyApplicable) lines.push(row);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dashboard: Skill profile — dla jednej wersji, szczegółowy widok
// ---------------------------------------------------------------------------

export function renderSkillProfile(runs: StoredRun[], versionId: string): string {
  const vRuns = runs.filter((r) => r.version.id === versionId && r.skillMetrics);
  if (vRuns.length === 0) return `Brak skill metrics dla wersji: ${versionId}`;

  const descriptor = vRuns[0].descriptor;
  const lines: string[] = [];

  lines.push(`\n${C.bold}${C.cyan}╔══ SKILL PROFILE — ${versionId} ══╗${C.reset}`);

  if (descriptor) {
    lines.push(renderDescriptorCard(descriptor));
  }

  lines.push(`\n${C.bold}Skill Metrics (avg ${vRuns.length} runs):${C.reset}\n`);

  // Avg per metric
  for (const key of SKILL_METRIC_KEYS) {
    const applicable = vRuns.filter((r) => (r.skillMetrics![key] as SkillMetric).applicable);
    if (applicable.length === 0) continue;

    const avg = applicable.reduce((s, r) => s + (r.skillMetrics![key] as SkillMetric).score, 0) / applicable.length;
    const label = (vRuns[0].skillMetrics![key] as SkillMetric).label.padEnd(36);
    lines.push(`  ${label} ${sc(avg)}${bar(avg)}${C.reset} ${avg.toFixed(1)}`);

    // Show recommendation from latest run
    const latest = applicable[applicable.length - 1].skillMetrics![key] as SkillMetric;
    if (latest.recommendation) {
      lines.push(`     ${C.yellow}⚠ ${latest.recommendation}${C.reset}`);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dashboard: Descriptor comparison — tabela konfiguracji agentów
// ---------------------------------------------------------------------------

export function renderDescriptorComparison(runs: StoredRun[]): string {
  const versions = getVersions({ runs, path: "" });
  const descriptors = new Map<string, AgentDescriptor>();
  for (const run of runs) {
    if (run.descriptor && !descriptors.has(run.version.id)) {
      descriptors.set(run.version.id, run.descriptor);
    }
  }

  if (descriptors.size === 0) {
    return `\n${C.dim}Brak descriptorów. Wyniki zaimportowane z bench runner nie mają pełnego opisu.${C.reset}\n`;
  }

  const lines: string[] = [];
  lines.push(`\n${C.bold}${C.cyan}╔══ AGENT CONFIGURATION COMPARISON ══╗${C.reset}\n`);

  const ATTR_COL = 22;
  const COL = 28;
  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

  const header = pad("Attribute", ATTR_COL) + [...descriptors.keys()].map((v) => pad(v, COL)).join("");
  lines.push(C.bold + header + C.reset);
  lines.push("─".repeat(header.length));

  const rows: Array<[string, (d: AgentDescriptor) => string]> = [
    ["Provider",       (d) => d.model.provider],
    ["Model",          (d) => d.model.name],
    ["Temperature",    (d) => d.model.temperature?.toString() ?? "default"],
    ["Thinking mode",  (d) => d.model.thinking ? "✓ yes" : "—"],
    ["Prompt version", (d) => d.prompt.version],
    ["Techniques",     (d) => d.prompt.technique.join(", ") || "—"],
    ["Few-shot n",     (d) => d.prompt.fewShotCount?.toString() ?? "0"],
    ["Refinements",    (d) => d.prompt.maxRefinementRounds?.toString() ?? "0"],
    ["Language",       (d) => d.prompt.language ?? "en"],
    ["Skills",         (d) => d.skills.join(", ") || "—"],
    ["Tools",          (d) => d.tools.join(", ") || "—"],
    ["Human",          (d) => d.isHuman ? `✓ ${d.humanExperience ?? ""}` : "—"],
    ["Notes",          (d) => d.notes?.slice(0, 26) ?? "—"],
  ];

  for (const [attr, getter] of rows) {
    let row = pad(attr, ATTR_COL);
    const values = [...descriptors.values()].map((d) => getter(d));
    const allSame = new Set(values).size === 1;
    for (const val of values) {
      const highlight = !allSame && val !== "—" ? C.cyan : C.dim;
      row += highlight + pad(val, COL) + C.reset;
    }
    lines.push(row);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Descriptor card — inline dla skill profile
// ---------------------------------------------------------------------------

function renderDescriptorCard(d: AgentDescriptor): string {
  const lines: string[] = [];
  lines.push(`\n${C.bold}Configuration:${C.reset}`);
  lines.push(`  Model:       ${d.model.provider}/${d.model.name}${d.model.temperature !== undefined ? ` (temp=${d.model.temperature})` : ""}${d.model.thinking ? " [thinking]" : ""}`);
  lines.push(`  Prompt:      ${d.prompt.version} · ${d.prompt.technique.join(", ") || "zero-shot"}`);
  if (d.prompt.fewShotCount) lines.push(`  Few-shot:    ${d.prompt.fewShotCount} examples`);
  if (d.prompt.maxRefinementRounds) lines.push(`  Refinements: ${d.prompt.maxRefinementRounds} rounds`);
  if (d.skills.length) lines.push(`  Skills:      ${d.skills.join(", ")}`);
  if (d.tools.length) lines.push(`  Tools:       ${d.tools.join(", ")}`);
  if (d.notes) lines.push(`  Notes:       ${d.notes}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// HTML skill section — dołączany do głównego HTML
// ---------------------------------------------------------------------------

export function renderSkillHTML(runs: StoredRun[]): string {
  const versions = getVersions({ runs, path: "" });
  const latest = getLatestRunPerVersionPerCase({ runs, path: "" });

  const descriptors = new Map<string, AgentDescriptor>();
  for (const run of runs) {
    if (run.descriptor && !descriptors.has(run.version.id)) {
      descriptors.set(run.version.id, run.descriptor);
    }
  }

  if (descriptors.size === 0) return "";

  const sc = (s: number) => s >= 7 ? "#22c55e" : s >= 5 ? "#eab308" : "#ef4444";

  const avg = (vid: string, key: keyof SkillMetrics): number | null => {
    const applicable = [...latest.values()].filter((r) => r.version.id === vid && r.skillMetrics && (r.skillMetrics[key] as SkillMetric).applicable);
    if (applicable.length === 0) return null;
    return applicable.reduce((s, r) => s + (r.skillMetrics![key] as SkillMetric).score, 0) / applicable.length;
  };

  return `
<h2>Agent configuration</h2>
<table>
<thead><tr><th>Attribute</th>${[...descriptors.keys()].map((v) => `<th>${v}</th>`).join("")}</tr></thead>
<tbody>
${(["Provider","Model","Temperature","Prompt version","Techniques","Few-shot n","Skills","Tools","Notes"] as const).map((attr) => {
  const getter = (d: AgentDescriptor): string => {
    if (attr === "Provider") return d.model.provider;
    if (attr === "Model") return d.model.name;
    if (attr === "Temperature") return d.model.temperature?.toString() ?? "default";
    if (attr === "Prompt version") return d.prompt.version;
    if (attr === "Techniques") return d.prompt.technique.join(", ") || "—";
    if (attr === "Few-shot n") return d.prompt.fewShotCount?.toString() ?? "0";
    if (attr === "Skills") return d.skills.join(", ") || "—";
    if (attr === "Tools") return d.tools.join(", ") || "—";
    if (attr === "Notes") return d.notes ?? "—";
    return "—";
  };
  return `<tr><td>${attr}</td>${[...descriptors.values()].map((d) => `<td>${getter(d)}</td>`).join("")}</tr>`;
}).join("\n")}
</tbody>
</table>

<h2>Skill metrics</h2>
<table>
<thead><tr><th>Skill Metric</th>${versions.map((v) => `<th>${v}</th>`).join("")}</tr></thead>
<tbody>
${SKILL_METRIC_KEYS.map((key) => {
  const anyApplicable = versions.some((vid) => avg(vid, key) !== null);
  if (!anyApplicable) return "";
  const sampleRun = [...latest.values()].find((r) => r.skillMetrics);
  const label = sampleRun ? (sampleRun.skillMetrics![key] as SkillMetric).label : key;
  return `<tr><td>${label}</td>${versions.map((vid) => {
    const s = avg(vid, key);
    if (s === null) return "<td style='color:#334155'>N/A</td>";
    return `<td><span style="color:${sc(s)};font-weight:bold">${s.toFixed(1)}/10</span></td>`;
  }).join("")}</tr>`;
}).filter(Boolean).join("\n")}
</tbody>
</table>`;
}
