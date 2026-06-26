import { overallStatus, GateEvaluation } from "../quality-gates/GateEvaluation";

const passed   = (action: "warn" | "fail" = "fail"): GateEvaluation =>
  ({ gateId: "g", gateName: "g", action, passed: true,  violations: [] });
const violated = (action: "warn" | "fail" = "fail"): GateEvaluation =>
  ({ gateId: "g", gateName: "g", action, passed: false, violations: [] });

describe("overallStatus", () => {
  it("returns pass when no evaluations", () => {
    expect(overallStatus([])).toBe("pass");
  });

  it("returns pass when all gates pass", () => {
    expect(overallStatus([passed("fail"), passed("warn")])).toBe("pass");
  });

  it("returns fail when any fail-gate violated", () => {
    expect(overallStatus([passed("warn"), violated("fail")])).toBe("fail");
  });

  it("returns warn when only warn-gates violated", () => {
    expect(overallStatus([passed("fail"), violated("warn")])).toBe("warn");
  });

  it("fail takes priority over warn", () => {
    expect(overallStatus([violated("warn"), violated("fail")])).toBe("fail");
  });
});
