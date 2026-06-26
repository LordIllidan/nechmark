import { randomUUID } from "crypto";
import { IRunRepository, RunRow } from "../../domain/runs/IRunRepository";
import { IDescriptorRepository } from "../../domain/descriptors/IDescriptorRepository";
import { IExperimentRepository } from "../../domain/experiments/IExperimentRepository";
import { DescriptorValidator } from "../../domain/descriptors/DescriptorValidator";
import { BAOutput } from "../../types";
import { AgentDescriptor } from "../../agent-descriptor";
import { computeHardMetrics } from "../../metrics/hard-metrics";
import { computeSkillMetrics } from "../../metrics/skill-metrics";

export interface UploadRunInput {
  experimentId: string;
  output: BAOutput;
  caseId: string;
  caseName?: string;
  descriptorId?: string;
  descriptor?: AgentDescriptor;
}

export interface UploadRunResult {
  run: RunRow;
  hardMetrics: ReturnType<typeof computeHardMetrics>;
}

export class UploadRunUseCase {
  private readonly descriptorValidator = new DescriptorValidator();

  constructor(
    private readonly runRepo: IRunRepository,
    private readonly descriptorRepo: IDescriptorRepository,
    private readonly experimentRepo: IExperimentRepository,
  ) {}

  execute(input: UploadRunInput): UploadRunResult {
    const exp = this.experimentRepo.findById(input.experimentId);
    if (!exp) throw new Error(`Experiment ${input.experimentId} not found`);
    if (!input.output || !input.caseId) throw new Error("output and caseId required");

    const hardMetrics = computeHardMetrics(input.output);

    const desc = input.descriptor;
    const validDescriptor = this.descriptorValidator.validate(desc).valid && !!desc;
    const skillMetrics = validDescriptor ? computeSkillMetrics(desc!, input.output, hardMetrics) : null;

    if (validDescriptor && desc) {
      this.descriptorRepo.upsert({
        id: desc.id,
        label: desc.label ?? null,
        data: desc,
        createdAt: new Date().toISOString(),
      });
    }

    const row: RunRow = {
      id: randomUUID(),
      experiment_id: input.experimentId,
      run_at: new Date().toISOString(),
      case_id: input.caseId,
      case_name: input.caseName ?? input.caseId,
      input_format: input.output.rawInput.format,
      input_content: input.output.rawInput.content,
      descriptor_id: (validDescriptor ? desc!.id : input.descriptorId) ?? null,
      descriptor_json: validDescriptor ? JSON.stringify(desc) : null,
      output_json: JSON.stringify(input.output),
      hard_metrics_json: JSON.stringify(hardMetrics),
      skill_metrics_json: skillMetrics ? JSON.stringify(skillMetrics) : null,
      judge_result_json: null,
      overall_score: hardMetrics.summary.overallScore,
      judge_score: null,
    };

    this.runRepo.insert(row);
    return { run: row, hardMetrics };
  }
}
