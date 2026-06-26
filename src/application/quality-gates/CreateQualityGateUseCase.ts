import { randomUUID } from "crypto";
import { IQualityGateRepository } from "../../domain/quality-gates/IQualityGateRepository";
import { QualityGate } from "../../domain/quality-gates/QualityGate";
import { QualityRule } from "../../domain/quality-gates/QualityRule";

export interface CreateQualityGateInput {
  experimentId: string;
  name: string;
  rules: QualityRule[];
  action: "warn" | "fail";
}

export class CreateQualityGateUseCase {
  constructor(private readonly gateRepo: IQualityGateRepository) {}

  execute(input: CreateQualityGateInput): QualityGate {
    if (!input.name) throw new Error("name required");
    if (!input.rules || input.rules.length === 0) throw new Error("at least one rule required");

    const gate: QualityGate = {
      id: randomUUID(),
      experimentId: input.experimentId,
      name: input.name,
      rules: input.rules,
      action: input.action ?? "warn",
      createdAt: new Date().toISOString(),
    };

    this.gateRepo.save(gate);
    return gate;
  }
}
