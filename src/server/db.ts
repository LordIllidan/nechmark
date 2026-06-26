import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

const DB_DIR = "./data";
const DB_PATH = join(DB_DIR, "nechmark.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS experiments (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      tags        TEXT DEFAULT '[]',
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS descriptors (
      id              TEXT PRIMARY KEY,
      label           TEXT,
      descriptor_json TEXT NOT NULL,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id                  TEXT PRIMARY KEY,
      experiment_id       TEXT REFERENCES experiments(id) ON DELETE CASCADE,
      run_at              TEXT NOT NULL,
      case_id             TEXT NOT NULL,
      case_name           TEXT NOT NULL,
      input_format        TEXT NOT NULL,
      input_content       TEXT NOT NULL,
      descriptor_id       TEXT,
      descriptor_json     TEXT,
      output_json         TEXT NOT NULL,
      hard_metrics_json   TEXT NOT NULL,
      skill_metrics_json  TEXT,
      judge_result_json   TEXT,
      overall_score       REAL NOT NULL,
      judge_score         REAL
    );

    CREATE INDEX IF NOT EXISTS idx_runs_experiment ON runs(experiment_id);
    CREATE INDEX IF NOT EXISTS idx_runs_descriptor ON runs(descriptor_id);
    CREATE INDEX IF NOT EXISTS idx_runs_case       ON runs(case_id);

    CREATE TABLE IF NOT EXISTS quality_gates (
      id            TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      rules_json    TEXT NOT NULL,
      action        TEXT NOT NULL DEFAULT 'warn',
      created_at    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gates_experiment ON quality_gates(experiment_id);
  `);
}

// ---------------------------------------------------------------------------
// Experiment CRUD
// ---------------------------------------------------------------------------

export interface ExperimentRow {
  id: string; name: string; description: string | null; tags: string; created_at: string;
}

export function createExperiment(id: string, name: string, description?: string, tags: string[] = []): ExperimentRow {
  const db = getDb();
  db.prepare("INSERT INTO experiments (id,name,description,tags,created_at) VALUES (?,?,?,?,?)").run(
    id, name, description ?? null, JSON.stringify(tags), new Date().toISOString()
  );
  return db.prepare("SELECT * FROM experiments WHERE id=?").get(id) as ExperimentRow;
}

export function listExperiments(): ExperimentRow[] {
  return getDb().prepare("SELECT * FROM experiments ORDER BY created_at DESC").all() as ExperimentRow[];
}

export function getExperiment(id: string): ExperimentRow | undefined {
  return getDb().prepare("SELECT * FROM experiments WHERE id=?").get(id) as ExperimentRow | undefined;
}

export function deleteExperiment(id: string): void {
  getDb().prepare("DELETE FROM experiments WHERE id=?").run(id);
}

// ---------------------------------------------------------------------------
// Descriptor CRUD
// ---------------------------------------------------------------------------

export interface DescriptorRow {
  id: string; label: string | null; descriptor_json: string; created_at: string;
}

export function upsertDescriptor(descriptor: Record<string, unknown>): DescriptorRow {
  const db = getDb();
  const id = descriptor["id"] as string;
  const label = (descriptor["label"] as string | undefined) ?? null;
  db.prepare("INSERT OR REPLACE INTO descriptors (id,label,descriptor_json,created_at) VALUES (?,?,?,?)").run(
    id, label, JSON.stringify(descriptor), new Date().toISOString()
  );
  return db.prepare("SELECT * FROM descriptors WHERE id=?").get(id) as DescriptorRow;
}

export function listDescriptors(): DescriptorRow[] {
  return getDb().prepare("SELECT * FROM descriptors ORDER BY created_at DESC").all() as DescriptorRow[];
}

// ---------------------------------------------------------------------------
// Run CRUD
// ---------------------------------------------------------------------------

export interface RunRow {
  id: string;
  experiment_id: string | null;
  run_at: string;
  case_id: string;
  case_name: string;
  input_format: string;
  input_content: string;
  descriptor_id: string | null;
  descriptor_json: string | null;
  output_json: string;
  hard_metrics_json: string;
  skill_metrics_json: string | null;
  judge_result_json: string | null;
  overall_score: number;
  judge_score: number | null;
}

export function insertRun(row: Omit<RunRow, never>): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO runs
      (id,experiment_id,run_at,case_id,case_name,input_format,input_content,
       descriptor_id,descriptor_json,output_json,hard_metrics_json,
       skill_metrics_json,judge_result_json,overall_score,judge_score)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    row.id, row.experiment_id, row.run_at, row.case_id, row.case_name,
    row.input_format, row.input_content,
    row.descriptor_id, row.descriptor_json, row.output_json,
    row.hard_metrics_json, row.skill_metrics_json, row.judge_result_json,
    row.overall_score, row.judge_score
  );
}

export function listRuns(experimentId?: string): RunRow[] {
  const db = getDb();
  if (experimentId) {
    return db.prepare("SELECT * FROM runs WHERE experiment_id=? ORDER BY run_at DESC").all(experimentId) as RunRow[];
  }
  return db.prepare("SELECT * FROM runs ORDER BY run_at DESC").all() as RunRow[];
}

export function getRun(id: string): RunRow | undefined {
  return getDb().prepare("SELECT * FROM runs WHERE id=?").get(id) as RunRow | undefined;
}

export function deleteRun(id: string): void {
  getDb().prepare("DELETE FROM runs WHERE id=?").run(id);
}

export function getRunStats(experimentId: string): {
  descriptorCount: number;
  caseCount: number;
  runCount: number;
  avgScore: number;
} {
  const db = getDb();
  const r = db.prepare(`
    SELECT
      COUNT(DISTINCT descriptor_id) AS descriptorCount,
      COUNT(DISTINCT case_id)       AS caseCount,
      COUNT(*)                      AS runCount,
      AVG(overall_score)            AS avgScore
    FROM runs WHERE experiment_id=?
  `).get(experimentId) as { descriptorCount: number; caseCount: number; runCount: number; avgScore: number };
  return r;
}
