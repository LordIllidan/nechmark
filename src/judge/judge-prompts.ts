import { BAOutput } from "../types.js";

export function buildJudgeSystemPrompt(): string {
  return `You are an expert agile coach and BA quality reviewer.
Evaluate user stories and acceptance criteria against industry best practices.

Scoring dimensions (each 1-10):
1. **INVEST compliance** - Independent, Negotiable, Valuable, Estimable, Small, Testable
2. **AC completeness** - covers happy path, edge cases, error scenarios
3. **AC clarity** - unambiguous, verifiable, no implementation details
4. **Story granularity** - appropriately sized, not too big or too small
5. **Business value** - clear benefit articulated, from user perspective
6. **Testability** - each AC can be verified by a tester

Output valid JSON:
{
  "scores": [
    {
      "dimension": "INVEST compliance",
      "score": 7,
      "reasoning": "...",
      "suggestions": ["..."]
    }
  ],
  "passedINVEST": true,
  "suggestions": ["overall suggestion 1", "overall suggestion 2"]
}`;
}

export function buildJudgeUserPrompt(output: BAOutput): string {
  return `Evaluate the following BA output:

Original requirement (${output.rawInput.format}):
---
${output.rawInput.content.slice(0, 1000)}${output.rawInput.content.length > 1000 ? "..." : ""}
---

Generated output:
---
${JSON.stringify({ epicTitle: output.epicTitle, userStories: output.userStories, notes: output.notes }, null, 2)}
---

Provide detailed quality evaluation. Return only valid JSON.`;
}
