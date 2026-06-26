import { RunFilter } from "./RunFilter";

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

export interface IRunRepository {
  insert(row: RunRow): void;
  findById(id: string): RunRow | undefined;
  findAll(filter?: RunFilter): RunRow[];
  delete(id: string): void;
  getStats(experimentId: string): RunStats;
}

export interface RunStats {
  descriptorCount: number;
  caseCount: number;
  runCount: number;
  avgScore: number;
}
