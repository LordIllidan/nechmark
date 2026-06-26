import { UpsertDescriptorUseCase } from "../descriptors/UpsertDescriptorUseCase";
import { IDescriptorRepository } from "../../domain/descriptors/IDescriptorRepository";

const makeRepo = (): jest.Mocked<IDescriptorRepository> => ({
  upsert: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
});

const validRaw = {
  id: "agent-v1",
  label: "Test Agent",
  model: { provider: "anthropic", name: "claude-opus-4-8" },
  prompt: { version: "v1", technique: ["zero-shot"] },
  skills: ["invest-checker"],
  tools: [],
};

describe("UpsertDescriptorUseCase", () => {
  it("saves valid descriptor and returns it", () => {
    const repo = makeRepo();
    const uc = new UpsertDescriptorUseCase(repo);

    const result = uc.execute(validRaw);

    expect(repo.upsert).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("agent-v1");
    expect(result.label).toBe("Test Agent");
    expect(result.data.skills).toEqual(["invest-checker"]);
  });

  it("throws with field list on invalid descriptor", () => {
    const repo = makeRepo();
    const uc = new UpsertDescriptorUseCase(repo);

    expect(() => uc.execute({ id: 123 })).toThrow("Invalid descriptor");
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("thrown error includes fields array and example", () => {
    const repo = makeRepo();
    const uc = new UpsertDescriptorUseCase(repo);
    try {
      uc.execute({});
    } catch (e: unknown) {
      const err = e as { fields?: string[]; example?: unknown };
      expect(Array.isArray(err.fields)).toBe(true);
      expect(err.example).toBeTruthy();
    }
  });

  it("defaults skills/tools when missing from valid descriptor", () => {
    const repo = makeRepo();
    const uc = new UpsertDescriptorUseCase(repo);
    const raw = { id: "x", model: { provider: "anthropic", name: "m" }, prompt: { version: "v1", technique: [] }, skills: [], tools: [] };
    const result = uc.execute(raw);
    expect(result.data.skills).toEqual([]);
    expect(result.data.tools).toEqual([]);
  });
});
