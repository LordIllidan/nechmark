import { IRunRepository } from "../../domain/runs/IRunRepository";

const METRIC_KEYS = [
  "formatCompliance","wellFormedness","atomicity","acMeasurability","gherkinCoverage",
  "edgeCaseRatio","duplicateAc","vagueWordRatio","modalVerbStrength","passiveVoiceRatio",
  "subordinateClauseDensity","storyIndependence","inputCoverage","terminologyConsistency",
  "typeTokenRatio","readability","gunningFog","smogIndex","sizeDistribution","personaDiversity",
] as const;

export interface DescriptorMetrics {
  descriptorId: string;
  label: string;
  runCount: number;
  caseCount: number;
  avgOverallScore: number;
  metrics: Record<string, number>;
}

export class GetExperimentMetricsUseCase {
  constructor(private readonly runRepo: IRunRepository) {}

  execute(experimentId: string): DescriptorMetrics[] {
    const runs = this.runRepo.findAll({ experimentId });

    const byDescriptor = new Map<string, typeof runs>();
    for (const r of runs) {
      const key = r.descriptor_id ?? "unknown";
      if (!byDescriptor.has(key)) byDescriptor.set(key, []);
      byDescriptor.get(key)!.push(r);
    }

    return [...byDescriptor.entries()].map(([descriptorId, dRuns]) => {
      const latest = this.latestPerCase(dRuns);
      const latestRuns = [...latest.values()];
      const descriptor = dRuns[0]?.descriptor_json ? JSON.parse(dRuns[0].descriptor_json) : null;

      const avg = (key: string) =>
        latestRuns.length > 0
          ? latestRuns.reduce((s, r) => s + ((JSON.parse(r.hard_metrics_json) as Record<string, { score: number }>)[key]?.score ?? 0), 0) / latestRuns.length
          : 0;

      return {
        descriptorId,
        label: descriptor?.label ?? descriptorId,
        runCount: dRuns.length,
        caseCount: latest.size,
        avgOverallScore: latestRuns.reduce((s, r) => s + r.overall_score, 0) / (latestRuns.length || 1),
        metrics: Object.fromEntries(METRIC_KEYS.map((k) => [k, Math.round(avg(k) * 10) / 10])),
      };
    });
  }

  private latestPerCase(runs: import("../../domain/runs/IRunRepository").RunRow[]) {
    const map = new Map<string, import("../../domain/runs/IRunRepository").RunRow>();
    for (const r of runs) {
      const prev = map.get(r.case_id);
      if (!prev || r.run_at > prev.run_at) map.set(r.case_id, r);
    }
    return map;
  }
}
