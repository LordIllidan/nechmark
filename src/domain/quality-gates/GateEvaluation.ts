export interface RuleViolation {
  metric: string;
  operator: string;
  threshold: number;
  actual: number;
}

export interface GateEvaluation {
  gateId: string;
  gateName: string;
  action: "warn" | "fail";
  passed: boolean;
  violations: RuleViolation[];
}

export type GateStatus = "pass" | "warn" | "fail";

export function overallStatus(evaluations: GateEvaluation[]): GateStatus {
  if (evaluations.some((e) => !e.passed && e.action === "fail")) return "fail";
  if (evaluations.some((e) => !e.passed && e.action === "warn")) return "warn";
  return "pass";
}
