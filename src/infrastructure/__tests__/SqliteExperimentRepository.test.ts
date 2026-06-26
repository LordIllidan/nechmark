import { SqliteExperimentRepository } from "../db/SqliteExperimentRepository";
import { makeTestConnection } from "./helpers";
import { Experiment } from "../../domain/experiments/Experiment";

const makeExp = (id = "e1"): Experiment => ({
  id, name: "Sprint 1", description: "desc", tags: ["ba", "ai"], createdAt: "2026-01-01T00:00:00Z",
});

describe("SqliteExperimentRepository", () => {
  let repo: SqliteExperimentRepository;

  beforeEach(() => {
    repo = new SqliteExperimentRepository(makeTestConnection());
  });

  it("saves and retrieves by id", () => {
    repo.save(makeExp());
    const found = repo.findById("e1");
    expect(found?.name).toBe("Sprint 1");
    expect(found?.tags).toEqual(["ba", "ai"]);
  });

  it("returns undefined for unknown id", () => {
    expect(repo.findById("nope")).toBeUndefined();
  });

  it("findAll returns all experiments ordered by date desc", () => {
    repo.save({ ...makeExp("e1"), createdAt: "2026-01-01T00:00:00Z" });
    repo.save({ ...makeExp("e2"), createdAt: "2026-01-02T00:00:00Z" });
    const all = repo.findAll();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("e2");
  });

  it("deletes experiment", () => {
    repo.save(makeExp());
    repo.delete("e1");
    expect(repo.findById("e1")).toBeUndefined();
  });

  it("upsert overwrites existing", () => {
    repo.save(makeExp());
    repo.save({ ...makeExp(), name: "Updated" });
    expect(repo.findById("e1")?.name).toBe("Updated");
  });

  it("getStats returns zeros for empty experiment", () => {
    repo.save(makeExp());
    const stats = repo.getStats("e1");
    expect(stats.runCount).toBe(0);
    expect(stats.caseCount).toBe(0);
    expect(stats.descriptorCount).toBe(0);
  });
});
