import { DescriptorValidator } from "../descriptors/DescriptorValidator";

describe("DescriptorValidator", () => {
  const validator = new DescriptorValidator();

  it("validates a correct descriptor", () => {
    const result = validator.validate({
      id: "agent-v1",
      model: { provider: "anthropic", name: "claude-opus-4-8" },
      prompt: { version: "v1", technique: ["zero-shot"] },
      skills: [],
      tools: [],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object body", () => {
    expect(validator.validate("string").valid).toBe(false);
    expect(validator.validate(null).valid).toBe(false);
  });

  it("collects all missing field errors", () => {
    const result = validator.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });

  it("requires id to be a string", () => {
    const result = validator.validate({ id: 123, model: {}, prompt: {}, skills: [], tools: [] });
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("requires skills to be an array", () => {
    const result = validator.validate({
      id: "x", model: {}, prompt: {}, skills: "invest-checker", tools: [],
    });
    expect(result.errors.some((e) => e.includes("skills"))).toBe(true);
  });

  it("toDescriptor merges defaults", () => {
    const raw = { id: "x", model: { provider: "anthropic", name: "m" }, prompt: { version: "v1", technique: [] } };
    const desc = validator.toDescriptor(raw as Record<string, unknown>);
    expect(desc.skills).toEqual([]);
    expect(desc.tools).toEqual([]);
  });

  it("examplePayload returns valid descriptor", () => {
    const example = validator.examplePayload();
    const result = validator.validate(example as unknown as Record<string, unknown>);
    expect(result.valid).toBe(true);
  });
});
