import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BAOutput } from "../types.js";
import { HardMetrics, computeHardMetrics } from "../metrics/hard-metrics.js";
import { JudgeResult } from "../types.js";

export interface AgentVersion {
  id: string;          // e.g. "v1", "gpt4o-20250601", "human-analyst"
  model: string;       // e.g. "claude-opus-4-8", "human"
  promptVersion?: string;
  notes?: string;
}

export interface StoredRun {
  runId: string;
  runAt: string;
  version: AgentVersion;
  caseName: string;
  caseId: string;
  input: string;
  inputFormat: string;
  output: BAOutput;
  hardMetrics: HardMetrics;
  judgeResult?: JudgeResult;
}

export interface RunStore {
  runs: StoredRun[];
  path: string;
}

const DEFAULT_STORE = "./results/store.json";

export function loadStore(storePath = DEFAULT_STORE): RunStore {
  if (!existsSync(storePath)) {
    return { runs: [], path: storePath };
  }
  const data = JSON.parse(readFileSync(storePath, "utf-8")) as { runs: StoredRun[] };
  return { runs: data.runs ?? [], path: storePath };
}

export function saveStore(store: RunStore): void {
  mkdirSync(join(store.path, ".."), { recursive: true });
  writeFileSync(store.path, JSON.stringify({ runs: store.runs }, null, 2));
}

export function addRun(
  store: RunStore,
  version: AgentVersion,
  caseId: string,
  caseName: string,
  output: BAOutput,
  judgeResult?: JudgeResult
): StoredRun {
  const run: StoredRun = {
    runId: `${version.id}-${caseId}-${Date.now()}`,
    runAt: new Date().toISOString(),
    version,
    caseId,
    caseName,
    input: output.rawInput.content,
    inputFormat: output.rawInput.format,
    output,
    hardMetrics: computeHardMetrics(output),
    judgeResult,
  };
  store.runs.push(run);
  return run;
}

export function getVersions(store: RunStore): string[] {
  return [...new Set(store.runs.map((r) => r.version.id))];
}

export function getCases(store: RunStore): string[] {
  return [...new Set(store.runs.map((r) => r.caseId))];
}

export function getRunsForVersion(store: RunStore, versionId: string): StoredRun[] {
  return store.runs.filter((r) => r.version.id === versionId);
}

export function getRunsForCase(store: RunStore, caseId: string): StoredRun[] {
  return store.runs.filter((r) => r.caseId === caseId);
}

export function getLatestRunPerVersionPerCase(store: RunStore): Map<string, StoredRun> {
  const map = new Map<string, StoredRun>();
  for (const run of store.runs) {
    const key = `${run.version.id}::${run.caseId}`;
    const existing = map.get(key);
    if (!existing || run.runAt > existing.runAt) {
      map.set(key, run);
    }
  }
  return map;
}

/** Import results from bench runner JSON files in a directory */
export function importFromResultsDir(store: RunStore, dir = "./results"): number {
  if (!existsSync(dir)) return 0;
  let imported = 0;
  for (const file of readdirSync(dir).filter((f) => f.startsWith("bench-") && f.endsWith(".json"))) {
    try {
      const bench = JSON.parse(readFileSync(join(dir, file), "utf-8")) as {
        id: string;
        runAt: string;
        modelUsed: string;
        regressionResults: Array<{
          caseId: string;
          caseName: string;
          output: BAOutput;
          judgeResult: JudgeResult;
        }>;
      };
      const version: AgentVersion = { id: bench.modelUsed, model: bench.modelUsed };
      for (const r of bench.regressionResults) {
        if (!store.runs.find((x) => x.runId === `${bench.id}-${r.caseId}`)) {
          const run: StoredRun = {
            runId: `${bench.id}-${r.caseId}`,
            runAt: bench.runAt,
            version,
            caseId: r.caseId,
            caseName: r.caseName,
            input: r.output.rawInput.content,
            inputFormat: r.output.rawInput.format,
            output: r.output,
            hardMetrics: computeHardMetrics(r.output),
            judgeResult: r.judgeResult,
          };
          store.runs.push(run);
          imported++;
        }
      }
    } catch {}
  }
  return imported;
}
