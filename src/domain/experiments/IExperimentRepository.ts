import { Experiment, ExperimentStats } from "./Experiment";

export interface IExperimentRepository {
  save(experiment: Experiment): void;
  findById(id: string): Experiment | undefined;
  findAll(): Experiment[];
  delete(id: string): void;
  getStats(id: string): ExperimentStats;
}
