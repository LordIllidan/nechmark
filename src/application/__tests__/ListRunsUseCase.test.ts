import { ListRunsUseCase } from "../runs/ListRunsUseCase";
import { IRunRepository, RunRow } from "../../domain/runs/IRunRepository";

const makeRepo = (): jest.Mocked<IRunRepository> => ({
  insert: jest.fn(), findById: jest.fn(), findAll: jest.fn(), delete: jest.fn(), getStats: jest.fn(),
});

const makeRun = (id: string, descriptorId?: string, overallScore = 7): RunRow => ({
  id, experiment_id: "exp1", run_at: "2026-01-01T00:00:00Z",
  case_id: "c1", case_name: "Login", input_format: "free_text", input_content: "x",
  descriptor_id: descriptorId ?? null, descriptor_json: null, output_json: "{}",
  hard_metrics_json: "{}", skill_metrics_json: null, judge_result_json: null,
  overall_score: overallScore, judge_score: null,
});

describe("ListRunsUseCase", () => {
  it("delegates to repository with empty filter by default", () => {
    const repo = makeRepo();
    repo.findAll.mockReturnValue([makeRun("r1")]);
    const uc = new ListRunsUseCase(repo);

    const result = uc.execute();

    expect(repo.findAll).toHaveBeenCalledWith({});
    expect(result).toHaveLength(1);
  });

  it("passes filter through to repository", () => {
    const repo = makeRepo();
    repo.findAll.mockReturnValue([]);
    const uc = new ListRunsUseCase(repo);

    uc.execute({ descriptorId: "d1", minScore: 5 });

    expect(repo.findAll).toHaveBeenCalledWith({ descriptorId: "d1", minScore: 5 });
  });
});
