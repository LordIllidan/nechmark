export interface RunFilter {
  experimentId?: string;
  descriptorId?: string;
  caseId?: string;
  minScore?: number;
  maxScore?: number;
  from?: string;   // ISO date
  to?: string;     // ISO date
  limit?: number;
  offset?: number;
}
