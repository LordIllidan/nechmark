import { IRunRepository } from "../../domain/runs/IRunRepository";

export class AddRunNoteUseCase {
  constructor(private readonly runRepo: IRunRepository) {}

  execute(runId: string, notes: string): void {
    const run = this.runRepo.findById(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    this.runRepo.insert({ ...run, notes });
  }
}
