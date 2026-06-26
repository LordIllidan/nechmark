import { Request, Response } from "express";
import { ListRunsUseCase } from "../../../application/runs/ListRunsUseCase";
import { CompareDescriptorsUseCase } from "../../../application/runs/CompareDescriptorsUseCase";
import { RunFilter } from "../../../domain/runs/RunFilter";

export class RunController {
  constructor(
    private readonly listRuns: ListRunsUseCase,
    private readonly compareDescriptors: CompareDescriptorsUseCase,
  ) {}

  list = (req: Request, res: Response): void => {
    const { experimentId, descriptorId, caseId, minScore, maxScore, from, to, limit, offset } = req.query as Record<string, string | undefined>;

    const filter: RunFilter = {
      ...(experimentId && { experimentId }),
      ...(descriptorId && { descriptorId }),
      ...(caseId && { caseId }),
      ...(minScore !== undefined && { minScore: parseFloat(minScore) }),
      ...(maxScore !== undefined && { maxScore: parseFloat(maxScore) }),
      ...(from && { from }),
      ...(to && { to }),
      ...(limit !== undefined && { limit: parseInt(limit) }),
      ...(offset !== undefined && { offset: parseInt(offset) }),
    };

    res.json(this.listRuns.execute(filter).map(parseRunRow));
  };

  listByExperiment = (req: Request, res: Response): void => {
    const filter: RunFilter = { experimentId: String(req.params.experimentId) };
    res.json(this.listRuns.execute(filter).map(parseRunRow));
  };

  compare = (req: Request, res: Response): void => {
    const experimentId = String(req.params.experimentId);
    const ids = req.query.descriptorIds;
    const descriptorIds: string[] = Array.isArray(ids) ? ids as string[] : ids ? [ids as string] : [];
    if (descriptorIds.length < 2) {
      res.status(400).json({ error: "provide at least 2 descriptorIds" });
      return;
    }
    res.json(this.compareDescriptors.execute(experimentId, descriptorIds));
  };
}

function parseRunRow(row: ReturnType<ListRunsUseCase["execute"]>[0]) {
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
