import { QualityGate } from "./QualityGate";
import { evaluateRule } from "./QualityRule";
import { GateEvaluation, RuleViolation } from "./GateEvaluation";

export class GateEvaluator {
  evaluate(gate: QualityGate, metrics: Record<string, { score: number }>): GateEvaluation {
    const violations: RuleViolation[] = [];

    for (const rule of gate.rules) {
      const entry = metrics[rule.metric];
      const actual = entry?.score ?? 0;
      const ruleViolated = !evaluateRule(rule, actual);
      if (ruleViolated) {
        violations.push({ metric: rule.metric, operator: rule.operator, threshold: rule.threshold, actual });
      }
    }

    return {
      gateId: gate.id,
      gateName: gate.name,
      action: gate.action,
      passed: violations.length === 0,
      violations,
    };
  }
}
