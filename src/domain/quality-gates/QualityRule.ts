export type RuleOperator = "<" | "<=" | ">" | ">=" | "==";
export type RuleAction = "warn" | "fail";

export interface QualityRule {
  metric: string;
  operator: RuleOperator;
  threshold: number;
}

export function evaluateRule(rule: QualityRule, value: number): boolean {
  switch (rule.operator) {
    case "<":  return value < rule.threshold;
    case "<=": return value <= rule.threshold;
    case ">":  return value > rule.threshold;
    case ">=": return value >= rule.threshold;
    case "==": return value === rule.threshold;
  }
}
