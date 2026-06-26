import { IRunRepository, RunRow, RunStats } from "../../domain/runs/IRunRepository";
import { RunFilter } from "../../domain/runs/RunFilter";
import { DatabaseConnection } from "./DatabaseConnection";

export class SqliteRunRepository implements IRunRepository {
  constructor(private readonly conn: DatabaseConnection) {}

  insert(row: RunRow): void {
    this.conn.get().prepare(`
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
      row.overall_score, row.judge_score,
    );
  }

  findById(id: string): RunRow | undefined {
    return this.conn.get()
      .prepare("SELECT * FROM runs WHERE id=?")
      .get(id) as RunRow | undefined;
  }

  findAll(filter: RunFilter = {}): RunRow[] {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filter.experimentId) { clauses.push("experiment_id = ?"); params.push(filter.experimentId); }
    if (filter.descriptorId) { clauses.push("descriptor_id = ?"); params.push(filter.descriptorId); }
    if (filter.caseId)       { clauses.push("case_id = ?");       params.push(filter.caseId); }
    if (filter.minScore !== undefined) { clauses.push("overall_score >= ?"); params.push(filter.minScore); }
    if (filter.maxScore !== undefined) { clauses.push("overall_score <= ?"); params.push(filter.maxScore); }
    if (filter.from)         { clauses.push("run_at >= ?");        params.push(filter.from); }
    if (filter.to)           { clauses.push("run_at <= ?");        params.push(filter.to); }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit  = filter.limit  !== undefined ? `LIMIT ${filter.limit}`   : "";
    const offset = filter.offset !== undefined ? `OFFSET ${filter.offset}` : "";

    return this.conn.get()
      .prepare(`SELECT * FROM runs ${where} ORDER BY run_at DESC ${limit} ${offset}`)
      .all(...params) as RunRow[];
  }

  delete(id: string): void {
    this.conn.get().prepare("DELETE FROM runs WHERE id=?").run(id);
  }

  getStats(experimentId: string): RunStats {
    return this.conn.get().prepare(`
      SELECT
        COUNT(DISTINCT descriptor_id) AS descriptorCount,
        COUNT(DISTINCT case_id)       AS caseCount,
        COUNT(*)                      AS runCount,
        AVG(overall_score)            AS avgScore
      FROM runs WHERE experiment_id=?
    `).get(experimentId) as RunStats;
  }
}
