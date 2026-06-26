import { CreateExperimentUseCase } from "../experiments/CreateExperimentUseCase";
import { IExperimentRepository } from "../../domain/experiments/IExperimentRepository";
import { Experiment, ExperimentStats } from "../../domain/experiments/Experiment";

const makeRepo = (): jest.Mocked<IExperimentRepository> => ({
  save:     jest.fn(),
  findById: jest.fn(),
  findAll:  jest.fn(),
  delete:   jest.fn(),
  getStats: jest.fn(),
});

describe("CreateExperimentUseCase", () => {
  it("saves experiment and returns it", () => {
    const repo = makeRepo();
    const uc = new CreateExperimentUseCase(repo);

    const result = uc.execute({ name: "Sprint 1", tags: ["ba"] });

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0] as Experiment;
    expect(saved.name).toBe("Sprint 1");
    expect(saved.tags).toEqual(["ba"]);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toEqual(saved);
  });

  it("defaults tags to empty array", () => {
    const repo = makeRepo();
    const uc = new CreateExperimentUseCase(repo);
    uc.execute({ name: "X" });
    const saved = repo.save.mock.calls[0][0] as Experiment;
    expect(saved.tags).toEqual([]);
  });

  it("throws when name is empty", () => {
    const uc = new CreateExperimentUseCase(makeRepo());
    expect(() => uc.execute({ name: "" })).toThrow("name required");
    expect(() => uc.execute({ name: "  " })).toThrow("name required");
  });
});
