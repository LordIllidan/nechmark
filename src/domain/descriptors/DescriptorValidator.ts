import { AgentDescriptor } from "../../agent-descriptor";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class DescriptorValidator {
  validate(raw: unknown): ValidationResult {
    const errors: string[] = [];
    if (!raw || typeof raw !== "object") {
      return { valid: false, errors: ["body must be a JSON object"] };
    }
    const r = raw as Record<string, unknown>;
    if (!r["id"] || typeof r["id"] !== "string")           errors.push("id (string) required");
    if (!r["model"] || typeof r["model"] !== "object")     errors.push('model (object) required — e.g. {"provider":"anthropic","name":"claude-opus-4-8"}');
    if (!r["prompt"] || typeof r["prompt"] !== "object")   errors.push('prompt (object) required — e.g. {"version":"v1","technique":["zero-shot"]}');
    if (!Array.isArray(r["skills"]))                        errors.push("skills (array) required — use [] if none");
    if (!Array.isArray(r["tools"]))                         errors.push("tools (array) required — use [] if none");
    return { valid: errors.length === 0, errors };
  }

  toDescriptor(raw: Record<string, unknown>): AgentDescriptor {
    return { skills: [], tools: [], ...raw } as unknown as AgentDescriptor;
  }

  examplePayload(): AgentDescriptor {
    return {
      id: "my-agent-v1",
      label: "My Agent v1",
      model: { provider: "anthropic", name: "claude-opus-4-8", temperature: 0.3 },
      prompt: { version: "v1", technique: ["zero-shot"], language: "pl" },
      skills: [],
      tools: [],
      notes: "Optional notes",
    };
  }
}
