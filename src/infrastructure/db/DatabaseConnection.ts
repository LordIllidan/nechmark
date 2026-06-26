import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private readonly db: Database.Database;

  private constructor(dbPath: string) {
    mkdirSync(join(dbPath, ".."), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  static getInstance(dbPath = "./data/nechmark.db"): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(dbPath);
    }
    return DatabaseConnection.instance;
  }

  get(): Database.Database {
    return this.db;
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
        tags TEXT DEFAULT '[]', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS descriptors (
        id TEXT PRIMARY KEY, label TEXT, descriptor_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        experiment_id TEXT REFERENCES experiments(id) ON DELETE CASCADE,
        run_at TEXT NOT NULL, case_id TEXT NOT NULL, case_name TEXT NOT NULL,
        input_format TEXT NOT NULL, input_content TEXT NOT NULL,
        descriptor_id TEXT, descriptor_json TEXT,
        output_json TEXT NOT NULL, hard_metrics_json TEXT NOT NULL,
        skill_metrics_json TEXT, judge_result_json TEXT,
        overall_score REAL NOT NULL, judge_score REAL,
        token_usage_json TEXT,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_runs_experiment ON runs(experiment_id);
      CREATE INDEX IF NOT EXISTS idx_runs_descriptor ON runs(descriptor_id);
      CREATE INDEX IF NOT EXISTS idx_runs_case       ON runs(case_id);

      CREATE TABLE IF NOT EXISTS quality_gates (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        name TEXT NOT NULL, rules_json TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT 'warn', created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_gates_experiment ON quality_gates(experiment_id);
    `);
  }
}
