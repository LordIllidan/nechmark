import { EvaluateRunGatesUseCase } from "../quality-gates/EvaluateRunGatesUseCase";
import { IRunRepository, RunRow } from "../../domain/runs/IRunRepository";
import { IQualityGateRepository } from "../../domain/quality-gates/IQualityGateRepository";
import { QualityGate } from "../../domain/quality-gates/QualityGate";

const makeRunRepo = (): jest.Mocked<IRunRepository> => ({
  insert: jest.fn(), findById: jest.fn(), findAll: jest.fn(), delete: jest.fn(), getStats: jest.fn(),
});
const makeGateRepo = (): jest.Mocked<IQualityGateRepository> => ({
  save: jest.fn(), findById: jest.fn(), findByExperiment: jest.fn(), delete: jest.fn(),
});

const makeRun = (overallScore: number, acScore: number): RunRow => ({
  id: "r1", experiment_id: "exp1", run_at: "2026-01-01T00:00:00Z",
  case_id: "c1", case_name: "Login", input_format: "free_text", input_content: "x",
  descriptor_id: null, descriptor_json: null, output_json: "{}",
  hard_metrics_json: JSON.stringify({ acMeasurability: { score: acScore } }),
  skill_metrics_json: null, judge_result_json: null,
  overall_score: overallScore, judge_score: null, token_usage_json: null, notes: null,
});

const makeGate = (threshold: number, action: "warn" | "fail" = "fail"): QualityGate => ({
  id: "g1", experimentId: "exp1", name: "AC Gate", action, createdAt: "2026-01-01T00:00:00Z",
  rules: [{ metric: "acMeasurability", operator: ">=", threshold }],
});

describe("EvaluateRunGatesUseCase", () => {
  it("returns pass when no gates defined", () => {
    const runRepo = makeRunRepo();
    const gateRepo = makeGateRepo();
    runRepo.findById.mockReturnValue(makeRun(80, 8));
    gateRepo.findByExperiment.mockReturnValue([]);

    const result = new EvaluateRunGatesUseCase(runRepo, gateRepo).execute("r1");

    expect(result.status).toBe("pass");
    expect(result.evaluations).toHaveLength(0);
  });

  it("returns pass when all gates pass", () => {
    const runRepo = makeRunRepo();
    const gateRepo = makeGateRepo();
    runRepo.findById.mockReturnValue(makeRun(80, 8));
    gateRepo.findByExperiment.mockReturnValue([makeGate(6)]);

    const result = new EvaluateRunGatesUseCase(runRepo, gateRepo).execute("r1");

    expect(result.status).toBe("pass");
  });

  it("returns fail when fail-gate violated", () => {
    const runRepo = makeRunRepo();
    const gateRepo = makeGateRepo();
    runRepo.findById.mockReturnValue(makeRun(80, 3));
    gateRepo.findByExperiment.mockReturnValue([makeGate(6, "fail")]);

    const result = new EvaluateRunGatesUseCase(runRepo, gateRepo).execute("r1");

    expect(result.status).toBe("fail");
    expect(result.evaluations[0].violations).toHaveLength(1);
  });

  it("returns warn when only warn-gate violated", () => {
    const runRepo = makeRunRepo();
    const gateRepo = makeGateRepo();
    runRepo.findById.mockReturnValue(makeRun(80, 3));
    gateRepo.findByExperiment.mockReturnValue([makeGate(6, "warn")]);

    const result = new EvaluateRunGatesUseCase(runRepo, gateRepo).execute("r1");

    expect(result.status).toBe("warn");
  });

  it("throws when run not found", () => {
    const runRepo = makeRunRepo();
    runRepo.findById.mockReturnValue(undefined);
    const uc = new EvaluateRunGatesUseCase(runRepo, makeGateRepo());
    expect(() => uc.execute("missing")).toThrow("not found");
  });

  it("returns pass with empty evaluations when run has no experiment", () => {
    const runRepo = makeRunRepo();
    const run = { ...makeRun(80, 8), experiment_id: null };
    runRepo.findById.mockReturnValue(run);
    const result = new EvaluateRunGatesUseCase(runRepo, makeGateRepo()).execute("r1");
    expect(result.status).toBe("pass");
  });
});
