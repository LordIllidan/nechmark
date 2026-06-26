import { IQualityGateRepository } from "../../domain/quality-gates/IQualityGateRepository";
import { QualityGate } from "../../domain/quality-gates/QualityGate";
import { DatabaseConnection } from "./DatabaseConnection";

export class SqliteQualityGateRepository implements IQualityGateRepository {
  constructor(private readonly conn: DatabaseConnection) {}

  save(gate: QualityGate): void {
    this.conn.get().prepare(`
      INSERT OR REPLACE INTO quality_gates (id, experiment_id, name, rules_json, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(gate.id, gate.experimentId, gate.name, JSON.stringify(gate.rules), gate.action, gate.createdAt);
  }

  findById(id: string): QualityGate | undefined {
    const row = this.conn.get()
      .prepare("SELECT * FROM quality_gates WHERE id=?")
      .get(id) as QualityGateRow | undefined;
    return row ? this.toGate(row) : undefined;
  }

  findByExperiment(experimentId: string): QualityGate[] {
    const rows = this.conn.get()
      .prepare("SELECT * FROM quality_gates WHERE experiment_id=? ORDER BY created_at DESC")
      .all(experimentId) as QualityGateRow[];
    return rows.map((r) => this.toGate(r));
  }

  delete(id: string): void {
    this.conn.get().prepare("DELETE FROM quality_gates WHERE id=?").run(id);
  }

  private toGate(row: QualityGateRow): QualityGate {
    return {
      id: row.id,
      experimentId: row.experiment_id,
      name: row.name,
      rules: JSON.parse(row.rules_json),
      action: row.action as "warn" | "fail",
      createdAt: row.created_at,
    };
  }
}

interface QualityGateRow {
  id: string;
  experiment_id: string;
  name: string;
  rules_json: string;
  action: string;
  created_at: string;
}
