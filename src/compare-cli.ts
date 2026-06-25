/**
 * Compare AI-generated output vs manually written stories.
 *
 * Usage:
 *   npx ts-node src/compare-cli.ts --ai path/to/ai-output.json --human path/to/human-output.json
 *
 * Both files must be BAOutput JSON (or array of UserStory with minimal wrapper).
 * You can also pass --input path/to/requirement.txt to include input coverage metric.
 */
import { readFileSync } from "fs";
import { BAOutput, RawInput, UserStory } from "./types.js";
import { compare } from "./metrics/compare.js";

interface CliArgs {
  ai?: string;
  human?: string;
  input?: string;
  labels?: string[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ai") result.ai = args[++i];
    else if (args[i] === "--human") result.human = args[++i];
    else if (args[i] === "--input") result.input = args[++i];
    else if (args[i] === "--labels") result.labels = args[++i].split(",");
  }

  return result;
}

function loadOutput(path: string, inputContent: string, format: "free_text" = "free_text"): BAOutput {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;

  // Accept full BAOutput or plain { userStories: [...] }
  const rawInput: RawInput = {
    format,
    content: inputContent,
  };

  if (isBAOutput(raw)) {
    return { ...raw, rawInput };
  }

  if (isStoriesWrapper(raw)) {
    return {
      userStories: raw.userStories,
      rawInput,
      generatedAt: new Date().toISOString(),
      modelUsed: "human",
    };
  }

  throw new Error(`Cannot parse file: ${path}. Expected BAOutput or {userStories:[...]}`);
}

function isBAOutput(v: unknown): v is BAOutput {
  return typeof v === "object" && v !== null && "userStories" in v && "rawInput" in v;
}

function isStoriesWrapper(v: unknown): v is { userStories: UserStory[] } {
  return typeof v === "object" && v !== null && "userStories" in v;
}

function main() {
  const args = parseArgs();

  if (!args.ai || !args.human) {
    console.error("Usage: ts-node src/compare-cli.ts --ai <file> --human <file> [--input <file>] [--labels AI,Human]");
    process.exit(1);
  }

  const inputContent = args.input ? readFileSync(args.input, "utf-8") : "";
  const labels = args.labels ?? ["AI", "Human"];

  const aiOutput = loadOutput(args.ai, inputContent);
  const humanOutput = loadOutput(args.human, inputContent);

  const report = compare([
    { label: labels[0], output: aiOutput },
    { label: labels[1], output: humanOutput },
  ]);

  console.log("\n== AI vs Human Analyst Comparison ==\n");
  console.log(report.table);
  console.log(`\nOverall winner: ${report.winner}`);
}

main();
