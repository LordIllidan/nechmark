export type InputFormat = "free_text" | "jira_ticket" | "linear_ticket" | "prd" | "brd";

export interface RawInput {
  format: InputFormat;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface UserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: AcceptanceCriterion[];
  priority?: "must" | "should" | "could" | "wont";
  storyPoints?: number;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  type: "functional" | "non_functional" | "edge_case";
}

export interface BAOutput {
  userStories: UserStory[];
  epicTitle?: string;
  notes?: string;
  rawInput: RawInput;
  generatedAt: string;
  modelUsed: string;
}

export interface JudgeScore {
  dimension: string;
  score: number; // 1-10
  reasoning: string;
  suggestions: string[];
}

export interface JudgeResult {
  outputId: string;
  overallScore: number;
  scores: JudgeScore[];
  passedINVEST: boolean;
  suggestions: string[];
  evaluatedAt: string;
  judgeModel: string;
}

export interface RegressionCase {
  id: string;
  name: string;
  input: RawInput;
  expectedMinScore: number;
  expectedUserStoriesCount?: { min: number; max: number };
  expectedAcPerStory?: { min: number; max: number };
  tags: string[];
}

export interface RegressionResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  output: BAOutput;
  judgeResult: JudgeResult;
  failures: string[];
  runAt: string;
}

export interface BenchmarkRun {
  id: string;
  runAt: string;
  modelUsed: string;
  regressionResults: RegressionResult[];
  passRate: number;
  avgScore: number;
}
