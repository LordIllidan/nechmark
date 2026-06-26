import { Request, Response } from "express";
import { CreateExperimentUseCase } from "../../../application/experiments/CreateExperimentUseCase";
import { DeleteExperimentUseCase } from "../../../application/experiments/DeleteExperimentUseCase";
import { GetExperimentMetricsUseCase } from "../../../application/experiments/GetExperimentMetricsUseCase";
import { IExperimentRepository } from "../../../domain/experiments/IExperimentRepository";

export class ExperimentController {
  constructor(
    private readonly createExperiment: CreateExperimentUseCase,
    private readonly deleteExperiment: DeleteExperimentUseCase,
    private readonly getMetrics: GetExperimentMetricsUseCase,
    private readonly experimentRepo: IExperimentRepository,
  ) {}

  list = (_req: Request, res: Response): void => {
    const experiments = this.experimentRepo.findAll().map((e) => ({
      ...e,
      ...this.experimentRepo.getStats(e.id),
    }));
    res.json(experiments);
  };

  create = (req: Request, res: Response): void => {
    try {
      const exp = this.createExperiment.execute(req.body);
      res.status(201).json(exp);
    } catch (e: unknown) {
      res.status(400).json({ error: (e as Error).message });
    }
  };

  delete = (req: Request, res: Response): void => {
    try {
      this.deleteExperiment.execute(String(req.params.id));
      res.json({ ok: true });
    } catch (e: unknown) {
      res.status(404).json({ error: (e as Error).message });
    }
  };

  metrics = (req: Request, res: Response): void => {
    res.json(this.getMetrics.execute(String(req.params.experimentId)));
  };
}
