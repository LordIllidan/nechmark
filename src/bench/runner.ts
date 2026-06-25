import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { BAAgent } from "../agent/ba-agent.js";
import { LLMJudge } from "../judge/llm-judge.js";
import { computeHardMetrics } from "../metrics/hard-metrics.js";
import { BenchmarkRun, RegressionCase, RegressionResult } from "../types.js";
import { REGRESSION_CASES } from "./regression-cases.js";

interface RunnerConfig {
  model?: string;
  judgeModel?: string;
  cases?: RegressionCase[];
  outputDir?: string;
}

export class BenchmarkRunner {
  private agent: BAAgent;
  private judge: LLMJudge;
  private cases: RegressionCase[];
  private outputDir: string;

  constructor(apiKey?: string, config: RunnerConfig = {}) {
    this.agent = new BAAgent(apiKey, { model: config.model });
    this.judge = new LLMJudge(apiKey, { model: config.judgeModel });
    this.cases = config.cases ?? REGRESSION_CASES;
    this.outputDir = config.outputDir ?? "./results";
  }

  async run(): Promise<BenchmarkRun> {
    const runId = randomUUID();
    const runAt = new Date().toISOString();
    const results: RegressionResult[] = [];

    console.log(`\nBenchmark run ${runId}`);
    console.log(`Cases: ${this.cases.length}\n`);

    for (const testCase of this.cases) {
      const result = await this.runCase(testCase);
      results.push(result);

      const hardMetrics = computeHardMetrics(result.output);
      const icon = result.passed ? "✓" : "✗";
      console.log(
        `${icon} ${testCase.name} — LLM judge: ${result.judgeResult.overallScore}/10  hard: ${hardMetrics.summary.overallScore}/10`
      );
      if (!result.passed) {
        result.failures.forEach((f) => console.log(`  - ${f}`));
      }
      if (hardMetrics.summary.failures.length) {
        console.log(`  hard failures: ${hardMetrics.summary.failures.join(", ")}`);
      }
    }

    const passRate = results.filter((r) => r.passed).length / results.length;
    const avgScore = results.reduce((sum, r) => sum + r.judgeResult.overallScore, 0) / results.length;

    const benchmarkRun: BenchmarkRun = {
      id: runId,
      runAt,
      modelUsed: "claude-opus-4-8",
      regressionResults: results,
      passRate: Math.round(passRate * 100) / 100,
      avgScore: Math.round(avgScore * 10) / 10,
    };

    this.saveResults(benchmarkRun);

    console.log(`\nResults: ${Math.round(passRate * 100)}% pass rate, avg score ${avgScore.toFixed(1)}/10`);

    return benchmarkRun;
  }

  private async runCase(testCase: RegressionCase): Promise<RegressionResult> {
    const runAt = new Date().toISOString();
    const failures: string[] = [];

    const output = await this.agent.generate(testCase.input);
    const judgeResult = await this.judge.evaluate(output);

    if (judgeResult.overallScore < testCase.expectedMinScore) {
      failures.push(
        `Score ${judgeResult.overallScore} < expected min ${testCase.expectedMinScore}`
      );
    }

    if (testCase.expectedUserStoriesCount) {
      const count = output.userStories.length;
      const { min, max } = testCase.expectedUserStoriesCount;
      if (count < min || count > max) {
        failures.push(`Story count ${count} outside expected range [${min}, ${max}]`);
      }
    }

    if (testCase.expectedAcPerStory) {
      for (const story of output.userStories) {
        const count = story.acceptanceCriteria.length;
        const { min, max } = testCase.expectedAcPerStory;
        if (count < min || count > max) {
          failures.push(
            `Story "${story.title}" AC count ${count} outside expected range [${min}, ${max}]`
          );
          break;
        }
      }
    }

    return {
      caseId: testCase.id,
      caseName: testCase.name,
      passed: failures.length === 0,
      output,
      judgeResult,
      failures,
      runAt,
    };
  }

  private saveResults(run: BenchmarkRun): void {
    mkdirSync(this.outputDir, { recursive: true });
    const path = join(this.outputDir, `bench-${run.id}.json`);
    writeFileSync(path, JSON.stringify(run, null, 2));
    console.log(`\nSaved: ${path}`);
  }
}

if (require.main === module) {
  const runner = new BenchmarkRunner(process.env.ANTHROPIC_API_KEY);
  runner.run().catch(console.error);
}
