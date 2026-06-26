import { DeleteExperimentUseCase } from "../experiments/DeleteExperimentUseCase";
import { IExperimentRepository } from "../../domain/experiments/IExperimentRepository";

const makeRepo = (): jest.Mocked<IExperimentRepository> => ({
  save: jest.fn(), findAll: jest.fn(), delete: jest.fn(), getStats: jest.fn(),
  findById: jest.fn(),
});

describe("DeleteExperimentUseCase", () => {
  it("deletes existing experiment", () => {
    const repo = makeRepo();
    repo.findById.mockReturnValue({ id: "e1", name: "X", description: null, tags: [], createdAt: "" });
    const uc = new DeleteExperimentUseCase(repo);

    uc.execute("e1");

    expect(repo.delete).toHaveBeenCalledWith("e1");
  });

  it("throws when experiment not found", () => {
    const repo = makeRepo();
    repo.findById.mockReturnValue(undefined);
    const uc = new DeleteExperimentUseCase(repo);

    expect(() => uc.execute("missing")).toThrow("not found");
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
