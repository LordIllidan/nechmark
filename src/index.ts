import { BAAgent } from "./agent/ba-agent.js";
import { LLMJudge } from "./judge/llm-judge.js";
import { generateSuggestionReport, formatSuggestionReport } from "./suggestions/suggester.js";
import { RawInput } from "./types.js";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY env var required");
  }

  const input: RawInput = {
    format: "free_text",
    content: `We need a user profile page where users can view and edit their personal information
(name, email, phone, avatar). Users should be able to change their password with current password
confirmation. Email changes require verification. All changes should be logged for audit purposes.`,
  };

  console.log("Generating user stories...");
  const agent = new BAAgent(apiKey);
  const output = await agent.generate(input);

  console.log(`\nGenerated ${output.userStories.length} user stories`);
  for (const story of output.userStories) {
    console.log(`  - ${story.title} (${story.acceptanceCriteria.length} AC)`);
  }

  console.log("\nEvaluating quality...");
  const judge = new LLMJudge(apiKey);
  const judgeResult = await judge.evaluate(output);

  const report = generateSuggestionReport(output, judgeResult);
  console.log("\n" + formatSuggestionReport(report));
}

main().catch(console.error);
