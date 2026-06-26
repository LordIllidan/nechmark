import { IExperimentRepository } from "../../domain/experiments/IExperimentRepository";
import { Experiment, ExperimentStats } from "../../domain/experiments/Experiment";
import { DatabaseConnection } from "./DatabaseConnection";

interface ExperimentRow {
  id: string; name: string; description: string | null; tags: string; created_at: string;
}

export class SqliteExperimentRepository implements IExperimentRepository {
  constructor(private readonly conn: DatabaseConnection) {}

  save(exp: Experiment): void {
    this.conn.get().prepare(
      "INSERT OR REPLACE INTO experiments (id,name,description,tags,created_at) VALUES (?,?,?,?,?)"
    ).run(exp.id, exp.name, exp.description, JSON.stringify(exp.tags), exp.createdAt);
  }

  findById(id: string): Experiment | undefined {
    const row = this.conn.get().prepare("SELECT * FROM experiments WHERE id=?").get(id) as ExperimentRow | undefined;
    return row ? this.toEntity(row) : undefined;
  }

  findAll(): Experiment[] {
    const rows = this.conn.get().prepare("SELECT * FROM experiments ORDER BY created_at DESC").all() as ExperimentRow[];
    return rows.map((r) => this.toEntity(r));
  }

  delete(id: string): void {
    this.conn.get().prepare("DELETE FROM experiments WHERE id=?").run(id);
  }

  getStats(id: string): ExperimentStats {
    return this.conn.get().prepare(`
      SELECT
        COUNT(DISTINCT descriptor_id) AS descriptorCount,
        COUNT(DISTINCT case_id)       AS caseCount,
        COUNT(*)                      AS runCount,
        AVG(overall_score)            AS avgScore
      FROM runs WHERE experiment_id=?
    `).get(id) as ExperimentStats;
  }

  private toEntity(row: ExperimentRow): Experiment {
    return { id: row.id, name: row.name, description: row.description, tags: JSON.parse(row.tags), createdAt: row.created_at };
  }
}
