import { QualityGate } from "./QualityGate";

export interface IQualityGateRepository {
  save(gate: QualityGate): void;
  findById(id: string): QualityGate | undefined;
  findByExperiment(experimentId: string): QualityGate[];
  delete(id: string): void;
}
