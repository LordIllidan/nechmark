import { SqliteRunRepository } from "../db/SqliteRunRepository";
import { SqliteExperimentRepository } from "../db/SqliteExperimentRepository";
import { makeTestConnection } from "./helpers";
import { RunRow } from "../../domain/runs/IRunRepository";

const makeRun = (id: string, overallScore = 7, caseId = "c1", descriptorId?: string): RunRow => ({
  id, experiment_id: "exp1", run_at: `2026-01-0${id}T00:00:00Z`,
  case_id: caseId, case_name: "Login", input_format: "free_text", input_content: "x",
  descriptor_id: descriptorId ?? null, descriptor_json: null, output_json: "{}",
  hard_metrics_json: "{}", skill_metrics_json: null, judge_result_json: null,
  overall_score: overallScore, judge_score: null, token_usage_json: null, notes: null,
});

describe("SqliteRunRepository", () => {
  let repo: SqliteRunRepository;

  beforeEach(() => {
    const conn = makeTestConnection();
    const expRepo = new SqliteExperimentRepository(conn);
    expRepo.save({ id: "exp1", name: "Exp", description: null, tags: [], createdAt: "2026-01-01T00:00:00Z" });
    repo = new SqliteRunRepository(conn);
  });

  it("inserts and retrieves by id", () => {
    repo.insert(makeRun("r1"));
    const found = repo.findById("r1");
    expect(found?.overall_score).toBe(7);
  });

  it("returns undefined for unknown id", () => {
    expect(repo.findById("nope")).toBeUndefined();
  });

  it("findAll without filter returns all", () => {
    repo.insert(makeRun("r1"));
    repo.insert(makeRun("r2"));
    expect(repo.findAll()).toHaveLength(2);
  });

  it("filters by experimentId", () => {
    repo.insert(makeRun("r1"));
    expect(repo.findAll({ experimentId: "exp1" })).toHaveLength(1);
    expect(repo.findAll({ experimentId: "other" })).toHaveLength(0);
  });

  it("filters by minScore and maxScore", () => {
    repo.insert(makeRun("r1", 4));
    repo.insert(makeRun("r2", 7));
    repo.insert(makeRun("r3", 9));
    expect(repo.findAll({ minScore: 5, maxScore: 8 })).toHaveLength(1);
  });

  it("filters by descriptorId", () => {
    repo.insert(makeRun("r1", 7, "c1", "d1"));
    repo.insert(makeRun("r2", 7, "c1", "d2"));
    expect(repo.findAll({ descriptorId: "d1" })).toHaveLength(1);
  });

  it("filters by caseId", () => {
    repo.insert(makeRun("r1", 7, "login"));
    repo.insert(makeRun("r2", 7, "payment"));
    expect(repo.findAll({ caseId: "payment" })).toHaveLength(1);
  });

  it("delete removes run", () => {
    repo.insert(makeRun("r1"));
    repo.delete("r1");
    expect(repo.findById("r1")).toBeUndefined();
  });

  it("getStats counts correctly", () => {
    repo.insert(makeRun("r1", 6, "c1", "d1"));
    repo.insert(makeRun("r2", 8, "c2", "d2"));
    const stats = repo.getStats("exp1");
    expect(stats.runCount).toBe(2);
    expect(stats.caseCount).toBe(2);
    expect(stats.descriptorCount).toBe(2);
    expect(stats.avgScore).toBeCloseTo(7);
  });
});
