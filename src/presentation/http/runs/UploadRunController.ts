import { Request, Response } from "express";
import { UploadRunUseCase } from "../../../application/runs/UploadRunUseCase";
import { BAOutput } from "../../../types";
import { AgentDescriptor } from "../../../agent-descriptor";
import { TokenUsage } from "../../../domain/runs/TokenUsage";

export class UploadRunController {
  constructor(private readonly uploadRun: UploadRunUseCase) {}

  upload = (req: Request, res: Response): void => {
    const body = req.body as {
      output: BAOutput;
      caseId: string;
      caseName?: string;
      descriptorId?: string;
      descriptor?: AgentDescriptor;
      tokenUsage?: TokenUsage;
      notes?: string;
    };

    try {
      const { run, hardMetrics } = this.uploadRun.execute({
        experimentId: String(req.params.experimentId),
        output: body.output,
        caseId: body.caseId,
        caseName: body.caseName,
        descriptorId: body.descriptorId,
        descriptor: body.descriptor,
        tokenUsage: body.tokenUsage,
        notes: body.notes,
      });

      res.status(201).json({
        id: run.id,
        experimentId: run.experiment_id,
        runAt: run.run_at,
        caseId: run.case_id,
        caseName: run.case_name,
        descriptorId: run.descriptor_id,
        overall_score: run.overall_score,
        hardMetrics,
      });
    } catch (e: unknown) {
      const msg = (e as Error).message;
      res.status(msg.includes("not found") ? 404 : 400).json({ error: msg });
    }
  };
}
