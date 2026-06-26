import { Request, Response } from "express";
import { UpsertDescriptorUseCase } from "../../../application/descriptors/UpsertDescriptorUseCase";
import { IDescriptorRepository } from "../../../domain/descriptors/IDescriptorRepository";

export class DescriptorController {
  constructor(
    private readonly upsertDescriptor: UpsertDescriptorUseCase,
    private readonly descriptorRepo: IDescriptorRepository,
  ) {}

  list = (_req: Request, res: Response): void => {
    const descriptors = this.descriptorRepo.findAll().map((d) => ({ ...d, descriptor: d.data }));
    res.json(descriptors);
  };

  upsert = (req: Request, res: Response): void => {
    try {
      const descriptor = this.upsertDescriptor.execute(req.body);
      res.status(201).json({ ...descriptor, descriptor: descriptor.data });
    } catch (e: unknown) {
      const err = e as Error & { fields?: string[]; example?: unknown };
      res.status(400).json({ error: err.message, ...(err.fields && { fields: err.fields, example: err.example }) });
    }
  };
}
