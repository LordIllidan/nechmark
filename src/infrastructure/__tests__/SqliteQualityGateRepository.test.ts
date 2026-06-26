import { SqliteQualityGateRepository } from "../db/SqliteQualityGateRepository";
import { SqliteExperimentRepository } from "../db/SqliteExperimentRepository";
import { makeTestConnection } from "./helpers";
import { QualityGate } from "../../domain/quality-gates/QualityGate";

const makeGate = (id = "g1", experimentId = "exp1"): QualityGate => ({
  id, experimentId, name: "AC Gate", action: "fail", createdAt: "2026-01-01T00:00:00Z",
  rules: [{ metric: "acMeasurability", operator: ">=", threshold: 6 }],
});

describe("SqliteQualityGateRepository", () => {
  let repo: SqliteQualityGateRepository;

  beforeEach(() => {
    const conn = makeTestConnection();
    const expRepo = new SqliteExperimentRepository(conn);
    expRepo.save({ id: "exp1", name: "Exp", description: null, tags: [], createdAt: "2026-01-01T00:00:00Z" });
    repo = new SqliteQualityGateRepository(conn);
  });

  it("saves and retrieves by id", () => {
    repo.save(makeGate());
    const found = repo.findById("g1");
    expect(found?.name).toBe("AC Gate");
    expect(found?.rules).toHaveLength(1);
    expect(found?.rules[0].threshold).toBe(6);
  });

  it("returns undefined for unknown id", () => {
    expect(repo.findById("nope")).toBeUndefined();
  });

  it("findByExperiment returns gates for experiment", () => {
    repo.save(makeGate("g1"));
    repo.save(makeGate("g2"));
    expect(repo.findByExperiment("exp1")).toHaveLength(2);
    expect(repo.findByExperiment("other")).toHaveLength(0);
  });

  it("delete removes gate", () => {
    repo.save(makeGate());
    repo.delete("g1");
    expect(repo.findById("g1")).toBeUndefined();
  });

  it("preserves action warn/fail", () => {
    repo.save({ ...makeGate(), action: "warn" });
    expect(repo.findById("g1")?.action).toBe("warn");
  });
});
