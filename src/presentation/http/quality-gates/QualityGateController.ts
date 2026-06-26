import { Request, Response } from "express";
import { CreateQualityGateUseCase } from "../../../application/quality-gates/CreateQualityGateUseCase";
import { EvaluateRunGatesUseCase } from "../../../application/quality-gates/EvaluateRunGatesUseCase";
import { IQualityGateRepository } from "../../../domain/quality-gates/IQualityGateRepository";

export class QualityGateController {
  constructor(
    private readonly createGate: CreateQualityGateUseCase,
    private readonly evaluateGates: EvaluateRunGatesUseCase,
    private readonly gateRepo: IQualityGateRepository,
  ) {}

  list = (req: Request, res: Response): void => {
    res.json(this.gateRepo.findByExperiment(String(req.params.experimentId)));
  };

  create = (req: Request, res: Response): void => {
    const experimentId = String(req.params.experimentId);
    try {
      const gate = this.createGate.execute({ experimentId, ...req.body });
      res.status(201).json(gate);
    } catch (e: unknown) {
      res.status(400).json({ error: (e as Error).message });
    }
  };

  delete = (req: Request, res: Response): void => {
    this.gateRepo.delete(String(req.params.id));
    res.json({ ok: true });
  };

  evaluate = (req: Request, res: Response): void => {
    try {
      res.json(this.evaluateGates.execute(String(req.params.runId)));
    } catch (e: unknown) {
      res.status(404).json({ error: (e as Error).message });
    }
  };
}
