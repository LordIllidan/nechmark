/**
 * Dashboard CLI — compare results across agent versions.
 *
 * Commands:
 *   add      --version <id> --model <model> --output <file.json> --case <id> --case-name <name>
 *   import   --dir <results-dir>          Import all bench-*.json files from a directory
 *   show                                  Print all dashboards to terminal
 *   show     --version <id>               Score bars for one version
 *   trend    --version <id>               Trend over time for one version
 *   html     --out <file.html>            Export HTML dashboard
 *   list                                  List all stored versions and cases
 *   reset                                 Clear the store (prompts for confirmation)
 */
import { readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import { BAOutput } from "./types.js";
import {
  loadStore, saveStore, addRun, getVersions, getCases,
  importFromResultsDir, AgentVersion,
} from "./dashboard/store.js";
import {
  renderVersionMatrix, renderCaseMatrix, renderTrend,
  renderFailureSummary, renderScoreBars, renderHTML,
} from "./dashboard/render.js";

const STORE_PATH = "./results/store.json";

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(3);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      result[args[i].slice(2)] = args[i + 1] ?? "true";
      i++;
    }
  }
  return result;
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (ans) => { rl.close(); resolve(ans.toLowerCase() === "y"); });
  });
}

const command = process.argv[2];
const args = parseArgs();
const store = loadStore(STORE_PATH);

switch (command) {
  case "add": {
    if (!args.version || !args.model || !args.output || !args.case) {
      console.error("Usage: dashboard-cli add --version <id> --model <model> --output <file> --case <id> [--case-name <name>] [--notes <text>]");
      process.exit(1);
    }
    const output = JSON.parse(readFileSync(args.output, "utf-8")) as BAOutput;
    const version: AgentVersion = { id: args.version, model: args.model, notes: args.notes, promptVersion: args["prompt-version"] };
    const run = addRun(store, version, args.case, args["case-name"] ?? args.case, output);
    saveStore(store);
    console.log(`Added run ${run.runId}`);
    console.log(`Hard metrics overall: ${run.hardMetrics.summary.overallScore}/10`);
    break;
  }

  case "import": {
    const dir = args.dir ?? "./results";
    const n = importFromResultsDir(store, dir);
    saveStore(store);
    console.log(`Imported ${n} runs from ${dir}`);
    console.log(`Store now has ${store.runs.length} total runs`);
    break;
  }

  case "show": {
    if (store.runs.length === 0) { console.log("No runs in store. Use: import or add"); break; }
    if (args.version) {
      console.log(renderScoreBars(store.runs, args.version));
    } else {
      console.log(renderScoreBars(store.runs));
      console.log(renderVersionMatrix(store.runs));
      console.log(renderCaseMatrix(store.runs));
      console.log(renderFailureSummary(store.runs));
    }
    break;
  }

  case "trend": {
    if (!args.version) { console.error("--version required"); process.exit(1); }
    console.log(renderTrend(store.runs, args.version));
    break;
  }

  case "html": {
    const outPath = args.out ?? "./results/dashboard.html";
    const html = renderHTML(store.runs);
    writeFileSync(outPath, html);
    console.log(`HTML dashboard written to ${outPath}`);
    break;
  }

  case "list": {
    const versions = getVersions(store);
    const cases = getCases(store);
    console.log(`Versions (${versions.length}): ${versions.join(", ")}`);
    console.log(`Cases (${cases.length}): ${cases.join(", ")}`);
    console.log(`Total runs: ${store.runs.length}`);
    break;
  }

  case "reset": {
    confirm("Delete all stored runs?").then((yes) => {
      if (yes) {
        saveStore({ runs: [], path: STORE_PATH });
        console.log("Store cleared.");
      }
    });
    break;
  }

  default: {
    console.log(`
nechmark dashboard

Commands:
  show                        All dashboards (terminal)
  show --version <id>         Score bars for one version
  trend --version <id>        Metric trends across runs of one version
  html --out <file.html>      Export HTML dashboard
  import --dir <dir>          Import bench-*.json result files
  add --version <id> \\
      --model <model> \\
      --output <file.json> \\
      --case <case-id>        Add a single run to the store
  list                        List stored versions and cases
  reset                       Clear the store
`);
  }
}
