import { IQualityGateRepository } from "../../domain/quality-gates/IQualityGateRepository";
import { IRunRepository } from "../../domain/runs/IRunRepository";
import { GateEvaluator } from "../../domain/quality-gates/GateEvaluator";
import { GateEvaluation, overallStatus } from "../../domain/quality-gates/GateEvaluation";

export interface EvaluateRunGatesResult {
  runId: string;
  status: "pass" | "warn" | "fail";
  evaluations: GateEvaluation[];
}

export class EvaluateRunGatesUseCase {
  private readonly evaluator = new GateEvaluator();

  constructor(
    private readonly runRepo: IRunRepository,
    private readonly gateRepo: IQualityGateRepository,
  ) {}

  execute(runId: string): EvaluateRunGatesResult {
    const run = this.runRepo.findById(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    if (!run.experiment_id) return { runId, status: "pass", evaluations: [] };

    const gates = this.gateRepo.findByExperiment(run.experiment_id);
    if (gates.length === 0) return { runId, status: "pass", evaluations: [] };

    const metrics = JSON.parse(run.hard_metrics_json) as Record<string, { score: number }>;
    const evaluations = gates.map((gate) => this.evaluator.evaluate(gate, metrics));

    return { runId, status: overallStatus(evaluations), evaluations };
  }
}
