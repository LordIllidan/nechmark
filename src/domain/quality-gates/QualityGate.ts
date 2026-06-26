import { QualityRule } from "./QualityRule";

export interface QualityGate {
  id: string;
  experimentId: string;
  name: string;
  rules: QualityRule[];
  action: "warn" | "fail";
  createdAt: string;
}
