import { randomUUID } from "crypto";
import { IExperimentRepository } from "../../domain/experiments/IExperimentRepository";
import { Experiment } from "../../domain/experiments/Experiment";

export interface CreateExperimentInput {
  name: string;
  description?: string;
  tags?: string[];
}

export class CreateExperimentUseCase {
  constructor(private readonly experimentRepo: IExperimentRepository) {}

  execute(input: CreateExperimentInput): Experiment {
    if (!input.name?.trim()) throw new Error("name required");
    const experiment: Experiment = {
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description ?? null,
      tags: input.tags ?? [],
      createdAt: new Date().toISOString(),
    };
    this.experimentRepo.save(experiment);
    return experiment;
  }
}
