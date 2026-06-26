import { BAOutput } from "../../types.js";
import { InputCoverageMetric, MetricScore } from "./metric-types.js";
import { tokenize, allOutputText } from "./text-utils.js";

export function measureInputCoverage(output: BAOutput): InputCoverageMetric {
  const inputTokens = new Set(tokenize(output.rawInput.content));
  const outputTokens = new Set(tokenize(allOutputText(output)));
  const keywords = [...inputTokens].filter((w) => w.length > 4);
  const covered = keywords.filter((w) => outputTokens.has(w));
  const missed = keywords.filter((w) => !outputTokens.has(w));
  const value = keywords.length > 0 ? covered.length / keywords.length : 1;
  return { value, score: value * 10, label: "Input Coverage", coveredKeywords: covered, missedKeywords: missed.slice(0, 10), totalKeywords: keywords.length };
}

export function measureInputPrecision(output: BAOutput): MetricScore {
  const inputTokens = new Set(tokenize(output.rawInput.content).filter((w) => w.length > 4));
  const outputTokens = tokenize(allOutputText(output)).filter((w) => w.length > 4);
  if (outputTokens.length === 0) return { value: 1, score: 10, label: "Input Precision (anti-hallucination)" };
  const grounded = outputTokens.filter((w) => inputTokens.has(w));
  const value = grounded.length / outputTokens.length;
  return { value: Math.round(value * 100) / 100, score: Math.round(value * 100) / 10, label: "Input Precision (anti-hallucination)" };
}
