import Database from "better-sqlite3";
import { DatabaseConnection } from "../db/DatabaseConnection";

export function makeTestConnection(): DatabaseConnection {
  // Reset singleton so each test suite gets a fresh in-memory DB
  (DatabaseConnection as unknown as { instance: null }).instance = null;

  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      tags TEXT DEFAULT '[]', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS descriptors (
      id TEXT PRIMARY KEY, label TEXT, descriptor_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY, experiment_id TEXT REFERENCES experiments(id) ON DELETE CASCADE,
      run_at TEXT NOT NULL, case_id TEXT NOT NULL, case_name TEXT NOT NULL,
      input_format TEXT NOT NULL, input_content TEXT NOT NULL,
      descriptor_id TEXT, descriptor_json TEXT, output_json TEXT NOT NULL,
      hard_metrics_json TEXT NOT NULL, skill_metrics_json TEXT,
      judge_result_json TEXT, overall_score REAL NOT NULL, judge_score REAL
    );
    CREATE TABLE IF NOT EXISTS quality_gates (
      id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
      name TEXT NOT NULL, rules_json TEXT NOT NULL, action TEXT NOT NULL DEFAULT 'warn',
      created_at TEXT NOT NULL
    );
  `);

  const conn = Object.create(DatabaseConnection.prototype) as DatabaseConnection;
  (conn as unknown as { db: Database.Database }).db = db;
  return conn;
}
