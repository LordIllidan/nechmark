import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { BAOutput, RawInput, UserStory } from "../types.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";

interface AgentConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  model: "claude-opus-4-8",
  maxTokens: 8192,
};

export class BAAgent {
  private client: Anthropic;
  private config: AgentConfig;

  constructor(apiKey?: string, config: AgentConfig = {}) {
    this.client = new Anthropic({ apiKey });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generate(input: RawInput): Promise<BAOutput> {
    const userPrompt = buildUserPrompt(input.format, input.content);

    const response = await this.client.messages.create({
      model: this.config.model!,
      max_tokens: this.config.maxTokens!,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    const parsed = this.parseResponse(textBlock.text);

    return {
      ...parsed,
      rawInput: input,
      generatedAt: new Date().toISOString(),
      modelUsed: this.config.model!,
    };
  }

  private parseResponse(text: string): Pick<BAOutput, "userStories" | "epicTitle" | "notes"> {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from response");
    }

    const raw = JSON.parse(jsonMatch[1]) as {
      epicTitle?: string;
      notes?: string;
      userStories: UserStory[];
    };

    const userStories = raw.userStories.map((s, i) => ({
      ...s,
      id: s.id || `US-${String(i + 1).padStart(3, "0")}`,
      acceptanceCriteria: s.acceptanceCriteria.map((ac, j) => ({
        ...ac,
        id: ac.id || `AC-${String(j + 1).padStart(3, "0")}`,
      })),
    }));

    return {
      epicTitle: raw.epicTitle,
      notes: raw.notes,
      userStories,
    };
  }
}
