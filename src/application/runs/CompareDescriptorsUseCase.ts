import { IRunRepository } from "../../domain/runs/IRunRepository";

const METRIC_KEYS = [
  "formatCompliance","wellFormedness","atomicity","acMeasurability","gherkinCoverage",
  "edgeCaseRatio","duplicateAc","vagueWordRatio","modalVerbStrength","passiveVoiceRatio",
  "subordinateClauseDensity","storyIndependence","inputCoverage","terminologyConsistency",
  "typeTokenRatio","readability","gunningFog","smogIndex","sizeDistribution","personaDiversity",
] as const;

export interface DescriptorProfile {
  descriptorId: string;
  label: string;
  runCount: number;
  caseCount: number;
  avgOverallScore: number;
  metrics: Record<string, number>;
  caseScores: Record<string, number>;  // caseId → latest overall_score
}

export class CompareDescriptorsUseCase {
  constructor(private readonly runRepo: IRunRepository) {}

  execute(experimentId: string, descriptorIds: string[]): DescriptorProfile[] {
    const runs = this.runRepo.findAll({ experimentId });

    return descriptorIds.map((descriptorId) => {
      const dRuns = runs.filter((r) => r.descriptor_id === descriptorId);
      const latest = this.latestPerCase(dRuns);
      const descriptor = dRuns[0]?.descriptor_json ? JSON.parse(dRuns[0].descriptor_json) : null;

      return {
        descriptorId,
        label: descriptor?.label ?? descriptorId,
        runCount: dRuns.length,
        caseCount: latest.size,
        avgOverallScore: this.avg(latest, (r) => r.overall_score),
        metrics: Object.fromEntries(
          METRIC_KEYS.map((k) => [k, Math.round(this.avg(latest, (r) => {
            const m = JSON.parse(r.hard_metrics_json) as Record<string, { score: number }>;
            return m[k]?.score ?? 0;
          }) * 10) / 10])
        ),
        caseScores: Object.fromEntries(
          [...latest.entries()].map(([caseId, r]) => [caseId, r.overall_score])
        ),
      };
    });
  }

  private latestPerCase(runs: ReturnType<IRunRepository["findAll"]>) {
    const map = new Map<string, (typeof runs)[0]>();
    for (const r of runs) {
      const prev = map.get(r.case_id);
      if (!prev || r.run_at > prev.run_at) map.set(r.case_id, r);
    }
    return map;
  }

  private avg(map: Map<string, { overall_score: number; hard_metrics_json: string }>, fn: (r: { overall_score: number; hard_metrics_json: string }) => number): number {
    const values = [...map.values()].map(fn);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
}
