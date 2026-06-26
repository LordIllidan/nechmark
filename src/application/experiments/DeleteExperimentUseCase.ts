import { IExperimentRepository } from "../../domain/experiments/IExperimentRepository";

export class DeleteExperimentUseCase {
  constructor(private readonly experimentRepo: IExperimentRepository) {}

  execute(id: string): void {
    const exp = this.experimentRepo.findById(id);
    if (!exp) throw new Error(`Experiment ${id} not found`);
    this.experimentRepo.delete(id);
  }
}
