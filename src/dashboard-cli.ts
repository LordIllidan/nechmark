/**
 * Dashboard CLI — compare results across agent versions.
 *
 * Commands:
 *   add      --descriptor <file.json> --output <file.json> --case <id> --case-name <name>
 *            --version <id> --model <model> ...   (legacy, without descriptor)
 *   import   --dir <results-dir>
 *   show     [--version <id>]
 *   skills   [--version <id>]
 *   trend    --version <id>
 *   html     --out <file.html>
 *   list
 *   reset
 */
import { readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import { BAOutput } from "./types.js";
import { AgentDescriptor } from "./agent-descriptor.js";
import {
  loadStore, saveStore, addRun, addRunWithDescriptor,
  getVersions, getCases, importFromResultsDir, AgentVersion,
} from "./dashboard/store.js";
import {
  renderVersionMatrix, renderCaseMatrix, renderTrend,
  renderFailureSummary, renderScoreBars, renderHTML,
} from "./dashboard/render.js";
import {
  renderSkillMatrix, renderSkillProfile, renderDescriptorComparison, renderSkillHTML,
} from "./dashboard/render-skills.js";

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
    if (!args.output || !args.case) {
      console.error("Usage: dashboard-cli add --output <file.json> --case <id> (--descriptor <file.json> | --version <id> --model <model>)");
      process.exit(1);
    }

    const output = JSON.parse(readFileSync(args.output, "utf-8")) as BAOutput;

    if (args.descriptor) {
      // Pełny descriptor z pliku JSON
      const descriptor = JSON.parse(readFileSync(args.descriptor, "utf-8")) as AgentDescriptor;
      const run = addRunWithDescriptor(store, descriptor, args.case, args["case-name"] ?? args.case, output);
      saveStore(store);
      console.log(`Added run ${run.runId} [descriptor: ${descriptor.id}]`);
      console.log(`Hard metrics overall: ${run.hardMetrics.summary.overallScore}/10`);
      if (run.skillMetrics) {
        const applicable = Object.values(run.skillMetrics).filter((m) => (m as { applicable: boolean }).applicable);
        console.log(`Skill metrics: ${applicable.length} applicable`);
      }
    } else if (args.version && args.model) {
      // Legacy bez descriptora
      const version: AgentVersion = { id: args.version, model: args.model, notes: args.notes, promptVersion: args["prompt-version"] };
      const run = addRun(store, version, args.case, args["case-name"] ?? args.case, output);
      saveStore(store);
      console.log(`Added run ${run.runId}`);
      console.log(`Hard metrics overall: ${run.hardMetrics.summary.overallScore}/10`);
    } else {
      console.error("Podaj --descriptor <file.json> lub --version <id> --model <model>");
      process.exit(1);
    }
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

  case "skills": {
    if (store.runs.length === 0) { console.log("No runs in store."); break; }
    console.log(renderDescriptorComparison(store.runs));
    console.log(renderSkillMatrix(store.runs));
    if (args.version) {
      console.log(renderSkillProfile(store.runs, args.version));
    } else {
      const versions = getVersions(store);
      for (const v of versions) {
        console.log(renderSkillProfile(store.runs, v));
      }
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
    const skillSection = renderSkillHTML(store.runs);
    const html = renderHTML(store.runs).replace("</body>", `${skillSection}\n</body>`);
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
    const withDescriptors = store.runs.filter((r) => r.descriptor).length;
    console.log(`Runs with full descriptor: ${withDescriptors}`);
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
  show                          All dashboards (terminal)
  show --version <id>           Score bars for one version
  skills                        Skill metrics + descriptor comparison
  skills --version <id>         Skill profile for one version
  trend --version <id>          Metric trends over time
  html --out <file.html>        Export HTML dashboard (includes skills)
  import --dir <dir>            Import bench-*.json result files
  add --descriptor <file.json>  Add run with full agent descriptor (recommended)
      --output <file.json>
      --case <case-id>
  add --version <id>            Add run (legacy, no skill metrics)
      --model <model>
      --output <file.json>
      --case <case-id>
  list                          List versions, cases, run counts
  reset                         Clear the store

Descriptor file format (JSON):
  See src/agent-descriptor.ts or examples/descriptors/
`);
  }
}
