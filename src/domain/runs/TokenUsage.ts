export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Pricing per 1M tokens (approximate 2026 rates)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8":   { input: 15,  output: 75  },
  "claude-sonnet-4-6": { input: 3,   output: 15  },
  "claude-haiku-4-5":  { input: 0.8, output: 4   },
  "gpt-4o":            { input: 2.5, output: 10  },
  "gpt-4o-mini":       { input: 0.15,output: 0.6 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

export function estimateCost(modelName: string, inputTokens: number, outputTokens: number): TokenUsage {
  const pricing = PRICING[modelName] ?? DEFAULT_PRICING;
  const costUsd = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return { inputTokens, outputTokens, costUsd: Math.round(costUsd * 10_000) / 10_000 };
}
