import { GateEvaluator } from "../quality-gates/GateEvaluator";
import { QualityGate } from "../quality-gates/QualityGate";

const makeGate = (overrides?: Partial<QualityGate>): QualityGate => ({
  id: "g1",
  experimentId: "exp1",
  name: "AC Gate",
  action: "fail",
  createdAt: "2026-01-01T00:00:00.000Z",
  rules: [{ metric: "acMeasurability", operator: ">=", threshold: 6 }],
  ...overrides,
});

const metrics = (acMeasurability: number) => ({
  acMeasurability: { score: acMeasurability },
});

describe("GateEvaluator", () => {
  const evaluator = new GateEvaluator();

  it("passes when all rules satisfied", () => {
    const result = evaluator.evaluate(makeGate(), metrics(8));
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails when rule violated", () => {
    const result = evaluator.evaluate(makeGate(), metrics(4));
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].metric).toBe("acMeasurability");
    expect(result.violations[0].actual).toBe(4);
  });

  it("collects all violations when multiple rules fail", () => {
    const gate = makeGate({
      rules: [
        { metric: "acMeasurability", operator: ">=", threshold: 6 },
        { metric: "vagueWordRatio",  operator: ">=", threshold: 7 },
      ],
    });
    const result = evaluator.evaluate(gate, {
      acMeasurability: { score: 3 },
      vagueWordRatio:  { score: 2 },
    });
    expect(result.violations).toHaveLength(2);
  });

  it("treats missing metric score as 0", () => {
    const result = evaluator.evaluate(makeGate(), {});
    expect(result.passed).toBe(false);
    expect(result.violations[0].actual).toBe(0);
  });

  it("preserves gate name and action in result", () => {
    const gate = makeGate({ name: "My Gate", action: "warn" });
    const result = evaluator.evaluate(gate, metrics(9));
    expect(result.gateName).toBe("My Gate");
    expect(result.action).toBe("warn");
  });
});
