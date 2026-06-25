import Anthropic from "@anthropic-ai/sdk";
import { BAOutput, JudgeResult, JudgeScore } from "../types.js";
import { buildJudgeSystemPrompt, buildJudgeUserPrompt } from "./judge-prompts.js";

interface JudgeConfig {
  model?: string;
  maxTokens?: number;
}

const DEFAULT_CONFIG: JudgeConfig = {
  model: "claude-opus-4-8",
  maxTokens: 4096,
};

export class LLMJudge {
  private client: Anthropic;
  private config: JudgeConfig;

  constructor(apiKey?: string, config: JudgeConfig = {}) {
    this.client = new Anthropic({ apiKey });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async evaluate(output: BAOutput): Promise<JudgeResult> {
    const response = await this.client.messages.create({
      model: this.config.model!,
      max_tokens: this.config.maxTokens!,
      system: buildJudgeSystemPrompt(),
      messages: [{ role: "user", content: buildJudgeUserPrompt(output) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from judge");
    }

    const parsed = this.parseJudgeResponse(textBlock.text);
    const overallScore = parsed.scores.reduce((sum, s) => sum + s.score, 0) / parsed.scores.length;

    return {
      outputId: `${output.rawInput.format}-${output.generatedAt}`,
      overallScore: Math.round(overallScore * 10) / 10,
      scores: parsed.scores,
      passedINVEST: parsed.passedINVEST,
      suggestions: parsed.suggestions,
      evaluatedAt: new Date().toISOString(),
      judgeModel: this.config.model!,
    };
  }

  private parseJudgeResponse(text: string): {
    scores: JudgeScore[];
    passedINVEST: boolean;
    suggestions: string[];
  } {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from judge response");
    }

    return JSON.parse(jsonMatch[1]) as {
      scores: JudgeScore[];
      passedINVEST: boolean;
      suggestions: string[];
    };
  }
}
