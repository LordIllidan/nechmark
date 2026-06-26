export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  createdAt: string;
}

export interface ExperimentStats {
  descriptorCount: number;
  caseCount: number;
  runCount: number;
  avgScore: number;
}
