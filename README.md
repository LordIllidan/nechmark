# nechmark

[![CI](https://github.com/LordIllidan/nechmark/actions/workflows/ci.yml/badge.svg)](https://github.com/LordIllidan/nechmark/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/LordIllidan/nechmark?include_prereleases&label=release&color=blue)](https://github.com/LordIllidan/nechmark/releases/latest)
[![Node](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

Benchmarking and quality assurance system for AI-generated BA artifacts (user stories, acceptance criteria).

## What it does

- **BA Agent** — generates user stories + acceptance criteria from free text, Jira/Linear tickets, PRDs, BRDs
- **LLM-as-Judge** — scores output across 6 quality dimensions (INVEST, AC completeness, clarity, etc.)
- **Hard Metrics** — 10 deterministic, math-based metrics computed without any LLM
- **Regression Suite** — fixed test cases to catch quality drift across model/prompt changes
- **AI vs Human Comparison** — side-by-side table comparing agent output against manually written stories

## Hard metrics (no LLM required)

| Metric | What it measures |
|---|---|
| Format Compliance | % stories with all required fields |
| AC Measurability | % AC containing numbers / thresholds / units |
| Gherkin Coverage | % AC with Given/When/Then structure |
| Story Independence | cosine similarity between stories (lower = better) |
| Input Coverage | % input keywords present in output |
| Readability | Flesch-Kincaid score (target 50–70) |
| Size Distribution | story points variance (zero = suspect) |
| Edge Case Ratio | % AC covering errors/limits (target 20–35%) |
| Persona Diversity | unique personas / total stories |
| Duplicate AC | cosine similarity between AC across output |

## Quick start

```bash
git clone https://github.com/LordIllidan/nechmark.git
cd nechmark
npm install
export ANTHROPIC_API_KEY=sk-ant-...
```

### Generate + evaluate

```bash
npx ts-node src/index.ts
```

### Run benchmark suite

```bash
npx ts-node src/bench/runner.ts
# Results saved to results/bench-<uuid>.json
```

### Compare AI vs human analyst

```bash
# human.json = { "userStories": [...] } written manually
npx ts-node src/compare-cli.ts \
  --ai results/ai-output.json \
  --human results/human.json \
  --input requirement.txt \
  --labels "Agent,Analityk"
```

## Project structure

```
src/
  types.ts                  shared types
  index.ts                  demo: generate → judge → suggest
  agent/
    ba-agent.ts             BAAgent — calls Claude, parses output
    prompts.ts              system + user prompts per input format
  judge/
    llm-judge.ts            LLMJudge — 6-dimension quality evaluation
    judge-prompts.ts        judge prompts
  bench/
    runner.ts               BenchmarkRunner — regression suite
    regression-cases.ts     seed test cases
  metrics/
    hard-metrics.ts         10 deterministic metrics
    compare.ts              A/B comparison table
  suggestions/
    suggester.ts            prioritized suggestion report
```

## Input formats supported

- Free text requirement descriptions
- Jira tickets
- Linear tickets
- PRD (Product Requirements Document)
- BRD (Business Requirements Document)

## Requirements

- Node.js 20+
- `ANTHROPIC_API_KEY` env var
