import { CreateQualityGateUseCase } from "../quality-gates/CreateQualityGateUseCase";
import { IQualityGateRepository } from "../../domain/quality-gates/IQualityGateRepository";

const makeRepo = (): jest.Mocked<IQualityGateRepository> => ({
  save: jest.fn(), findById: jest.fn(), findByExperiment: jest.fn(), delete: jest.fn(),
});

const validInput = {
  experimentId: "exp1",
  name: "AC Gate",
  rules: [{ metric: "acMeasurability", operator: ">=" as const, threshold: 6 }],
  action: "fail" as const,
};

describe("CreateQualityGateUseCase", () => {
  it("saves gate with generated id", () => {
    const repo = makeRepo();
    const uc = new CreateQualityGateUseCase(repo);

    const gate = uc.execute(validInput);

    expect(repo.save).toHaveBeenCalledWith(gate);
    expect(gate.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(gate.experimentId).toBe("exp1");
    expect(gate.rules).toHaveLength(1);
    expect(gate.action).toBe("fail");
  });

  it("throws when name missing", () => {
    const uc = new CreateQualityGateUseCase(makeRepo());
    expect(() => uc.execute({ ...validInput, name: "" })).toThrow("name required");
  });

  it("throws when rules array empty", () => {
    const uc = new CreateQualityGateUseCase(makeRepo());
    expect(() => uc.execute({ ...validInput, rules: [] })).toThrow("at least one rule required");
  });
});
