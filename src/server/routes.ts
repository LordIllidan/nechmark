import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { BAOutput } from "../types";
import { AgentDescriptor } from "../agent-descriptor";
import { computeHardMetrics } from "../metrics/hard-metrics";
import { computeSkillMetrics } from "../metrics/skill-metrics";
import {
  createExperiment, listExperiments, getExperiment, deleteExperiment,
  upsertDescriptor, listDescriptors,
  insertRun, listRuns, getRun, deleteRun, getRunStats,
  RunRow,
} from "./db";

export const router = Router();

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

router.get("/experiments", (_req, res) => {
  const experiments = listExperiments().map((e) => {
    const stats = getRunStats(e.id);
    return { ...e, tags: JSON.parse(e.tags), ...stats };
  });
  res.json(experiments);
});

router.post("/experiments", (req: Request, res: Response) => {
  const { name, description, tags } = req.body as { name: string; description?: string; tags?: string[] };
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const exp = createExperiment(randomUUID(), name, description, tags);
  res.status(201).json({ ...exp, tags: JSON.parse(exp.tags) });
});

router.delete("/experiments/:id", (req, res) => {
  const exp = getExperiment(req.params.id);
  if (!exp) { res.status(404).json({ error: "not found" }); return; }
  deleteExperiment(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

router.get("/descriptors", (_req, res) => {
  res.json(listDescriptors().map((d) => ({ ...d, descriptor: JSON.parse(d.descriptor_json) })));
});

router.post("/descriptors", (req: Request, res: Response) => {
  const descriptor = req.body as AgentDescriptor;
  if (!descriptor.id || !descriptor.model) { res.status(400).json({ error: "id and model required" }); return; }
  const row = upsertDescriptor(descriptor as unknown as Record<string, unknown>);
  res.status(201).json({ ...row, descriptor });
});

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

router.get("/experiments/:experimentId/runs", (req, res) => {
  const runs = listRuns(req.params.experimentId).map(parseRunRow);
  res.json(runs);
});

router.get("/runs", (_req, res) => {
  res.json(listRuns().map(parseRunRow));
});

router.get("/runs/:id", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) { res.status(404).json({ error: "not found" }); return; }
  res.json(parseRunRow(run));
});

router.delete("/runs/:id", (req, res) => {
  deleteRun(req.params.id);
  res.json({ ok: true });
});

router.post("/experiments/:experimentId/runs", (req: Request, res: Response) => {
  const { experimentId } = req.params;
  const exp = getExperiment(String(experimentId));
  if (!exp) { res.status(404).json({ error: "experiment not found" }); return; }

  const body = req.body as {
    output: BAOutput;
    caseId: string;
    caseName: string;
    descriptorId?: string;
    descriptor?: AgentDescriptor;
  };

  if (!body.output || !body.caseId) {
    res.status(400).json({ error: "output and caseId required" });
    return;
  }

  const hardMetrics = computeHardMetrics(body.output);
  const skillMetrics = body.descriptor
    ? computeSkillMetrics(body.descriptor, body.output, hardMetrics)
    : null;

  // Upsert descriptor if provided inline
  if (body.descriptor) {
    upsertDescriptor(body.descriptor as unknown as Record<string, unknown>);
  }

  const runId = randomUUID();
  const row: RunRow = {
    id: runId,
    experiment_id: String(experimentId),
    run_at: new Date().toISOString(),
    case_id: body.caseId,
    case_name: body.caseName ?? body.caseId,
    input_format: body.output.rawInput.format,
    input_content: body.output.rawInput.content,
    descriptor_id: body.descriptor?.id ?? body.descriptorId ?? null as string | null,
    descriptor_json: body.descriptor ? JSON.stringify(body.descriptor) : null,
    output_json: JSON.stringify(body.output),
    hard_metrics_json: JSON.stringify(hardMetrics),
    skill_metrics_json: skillMetrics ? JSON.stringify(skillMetrics) : null,
    judge_result_json: null,
    overall_score: hardMetrics.summary.overallScore,
    judge_score: null,
  };

  insertRun(row);
  res.status(201).json(parseRunRow(row));
});

// ---------------------------------------------------------------------------
// Metrics aggregation — for dashboard charts
// ---------------------------------------------------------------------------

router.get("/experiments/:experimentId/metrics", (req, res) => {
  const runs = listRuns(req.params.experimentId).map(parseRunRow);

  // Group by descriptor_id
  const byDescriptor = new Map<string, typeof runs>();
  for (const run of runs) {
    const key = run.descriptorId ?? "unknown";
    if (!byDescriptor.has(key)) byDescriptor.set(key, []);
    byDescriptor.get(key)!.push(run);
  }

  const result = [...byDescriptor.entries()].map(([descriptorId, druns]) => {
    const latest = new Map<string, (typeof druns)[0]>();
    for (const r of druns) {
      const prev = latest.get(r.caseId);
      if (!prev || r.runAt > prev.runAt) latest.set(r.caseId, r);
    }
    const latestRuns = [...latest.values()];
    const avg = (key: string) =>
      latestRuns.length > 0
        ? latestRuns.reduce((s, r) => s + ((r.hardMetrics as Record<string, { score: number }>)[key]?.score ?? 0), 0) / latestRuns.length
        : 0;

    const metricKeys = [
      "formatCompliance","wellFormedness","atomicity","acMeasurability","gherkinCoverage",
      "edgeCaseRatio","duplicateAc","vagueWordRatio","modalVerbStrength","passiveVoiceRatio",
      "subordinateClauseDensity","storyIndependence","inputCoverage","terminologyConsistency",
      "typeTokenRatio","readability","gunningFog","smogIndex","sizeDistribution","personaDiversity",
    ];

    return {
      descriptorId,
      label: druns[0].descriptor?.label ?? descriptorId,
      runCount: druns.length,
      caseCount: latest.size,
      avgOverallScore: latestRuns.reduce((s, r) => s + r.overall_score, 0) / latestRuns.length,
      metrics: Object.fromEntries(metricKeys.map((k) => [k, Math.round(avg(k) * 10) / 10])),
    };
  });

  res.json(result);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRunRow(row: RunRow) {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    runAt: row.run_at,
    caseId: row.case_id,
    caseName: row.case_name,
    inputFormat: row.input_format,
    descriptorId: row.descriptor_id,
    descriptor: row.descriptor_json ? JSON.parse(row.descriptor_json) : null,
    hardMetrics: JSON.parse(row.hard_metrics_json),
    skillMetrics: row.skill_metrics_json ? JSON.parse(row.skill_metrics_json) : null,
    judgeResult: row.judge_result_json ? JSON.parse(row.judge_result_json) : null,
    overall_score: row.overall_score,
    judge_score: row.judge_score,
  };
}
