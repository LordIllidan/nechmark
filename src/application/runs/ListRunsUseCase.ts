import { IRunRepository } from "../../domain/runs/IRunRepository";
import { RunFilter } from "../../domain/runs/RunFilter";

export class ListRunsUseCase {
  constructor(private readonly runRepo: IRunRepository) {}

  execute(filter: RunFilter = {}) {
    return this.runRepo.findAll(filter);
  }
}
