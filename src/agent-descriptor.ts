/**
 * AgentDescriptor — pełny opis konfiguracji agenta.
 * Jeden descriptor = jedna "wersja" w dashboardzie.
 *
 * Przykład:
 *   {
 *     id: "opus4-cot-v2",
 *     model: { provider: "anthropic", name: "claude-opus-4-8", temperature: 0.3 },
 *     prompt: { version: "v2", technique: ["chain-of-thought", "few-shot"], language: "pl" },
 *     skills: ["self-critique", "invest-checker"],
 *     tools: ["jira-fetch", "confluence-search"],
 *     notes: "Dodano few-shot przykłady z projektu X"
 *   }
 */

export type Provider = "anthropic" | "openai" | "google" | "mistral" | "ollama" | "human" | string;

export type PromptTechnique =
  | "chain-of-thought"      // model wyjaśnia kroki przed odpowiedzią
  | "few-shot"              // przykłady w prompcie
  | "zero-shot"             // bez przykładów
  | "self-critique"         // agent ocenia własny output i poprawia
  | "role-play"             // "Jesteś seniorem BA z 10-letnim doświadczeniem..."
  | "structured-output"     // wymuszony format JSON przez tool-use / response_format
  | "tree-of-thought"       // równoległe ścieżki rozumowania
  | "reflection"            // reflection loop: generate → critique → refine
  | string;

export type Skill =
  | "invest-checker"        // dodatkowy krok walidacji INVEST przed zwróceniem
  | "ac-generator"          // wyspecjalizowany subagent do pisania AC
  | "persona-expander"      // subagent identyfikujący brakujące persony
  | "edge-case-hunter"      // subagent szukający edge cases
  | "self-critique"         // agent ocenia własny output (może być prompt lub skill)
  | "rag-requirements"      // RAG po bazie poprzednich wymagań/standardów
  | "domain-glossary"       // wstrzykiwanie słownika domeny
  | string;

export type Tool =
  | "jira-fetch"            // pobieranie ticketów Jira API
  | "confluence-search"     // wyszukiwanie w Confluence
  | "linear-fetch"          // Linear API
  | "web-search"            // wyszukiwanie kontekstu domenowego
  | "figma-read"            // odczyt makiet
  | "code-scan"             // skanowanie istniejącego kodu po kontekst
  | "glossary-lookup"       // lookup słownika domenowego
  | string;

export interface ModelConfig {
  provider: Provider;
  name: string;
  version?: string;           // np. "claude-opus-4-8-20250514"
  temperature?: number;       // 0.0–1.0
  maxTokens?: number;
  thinking?: boolean;         // extended thinking / reasoning mode
  contextWindow?: number;
}

export interface PromptConfig {
  version: string;            // semver lub slug: "v1", "v2.1", "invest-rewrite"
  technique: PromptTechnique[];
  language?: "pl" | "en" | string;
  systemPromptHash?: string;  // sha256 pierwsze 8 znaków — do wykrywania dryftu promptu
  fewShotCount?: number;      // ile przykładów w prompcie
  maxRefinementRounds?: number; // ile razy agent poprawia własny output
}

export interface AgentDescriptor {
  /** Unikalny ID — używany jako klucz w dashboardzie. Snake-case, bez spacji. */
  id: string;

  /** Czytelna nazwa do wyświetlenia */
  label?: string;

  model: ModelConfig;
  prompt: PromptConfig;

  /** Skilale — dodatkowe kroki/subagenty w pipeline agenta */
  skills: Skill[];

  /** Narzędzia zewnętrzne do których agent ma dostęp */
  tools: Tool[];

  /** Dla porównań z ludzkim analitykiem */
  isHuman?: boolean;
  humanExperience?: "junior" | "mid" | "senior" | "principal";

  /** Wolny tekst — co zmieniło się względem poprzedniej wersji */
  notes?: string;

  /** Timestamp stworzenia konfiguracji */
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generuje czytelny label jeśli nie podano */
export function descriptorLabel(d: AgentDescriptor): string {
  if (d.label) return d.label;
  if (d.isHuman) return `Human (${d.humanExperience ?? "analyst"})`;
  const skills = d.skills.length > 0 ? `+[${d.skills.join(",")}]` : "";
  const tools = d.tools.length > 0 ? `+tools(${d.tools.length})` : "";
  return `${d.model.name}@${d.prompt.version}${skills}${tools}`;
}

/** Czy dwa descriptory różnią się tylko modelem */
export function differsOnlyInModel(a: AgentDescriptor, b: AgentDescriptor): boolean {
  return (
    a.prompt.version === b.prompt.version &&
    JSON.stringify(a.skills.sort()) === JSON.stringify(b.skills.sort()) &&
    JSON.stringify(a.tools.sort()) === JSON.stringify(b.tools.sort())
  );
}

/** Czy dwa descriptory różnią się tylko promptem */
export function differsOnlyInPrompt(a: AgentDescriptor, b: AgentDescriptor): boolean {
  return (
    a.model.name === b.model.name &&
    JSON.stringify(a.skills.sort()) === JSON.stringify(b.skills.sort()) &&
    JSON.stringify(a.tools.sort()) === JSON.stringify(b.tools.sort())
  );
}

/** Canonical string reprezentujący kombinację model+prompt+skills+tools */
export function descriptorFingerprint(d: AgentDescriptor): string {
  return [
    d.model.name,
    d.model.temperature ?? "def",
    d.prompt.version,
    d.prompt.technique.sort().join("|"),
    d.skills.sort().join("|"),
    d.tools.sort().join("|"),
  ].join("::");
}
