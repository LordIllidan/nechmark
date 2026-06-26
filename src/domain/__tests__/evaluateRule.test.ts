import { evaluateRule } from "../quality-gates/QualityRule";

describe("evaluateRule", () => {
  it.each([
    [">",  5, 6,  true],
    [">",  5, 5,  false],
    [">=", 5, 5,  true],
    [">=", 5, 4,  false],
    ["<",  5, 4,  true],
    ["<",  5, 5,  false],
    ["<=", 5, 5,  true],
    ["<=", 5, 6,  false],
    ["==", 5, 5,  true],
    ["==", 5, 4,  false],
  ] as const)("operator %s threshold %d value %d → %s", (op, threshold, value, expected) => {
    expect(evaluateRule({ metric: "x", operator: op, threshold }, value)).toBe(expected);
  });
});
