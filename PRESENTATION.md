# Mierzenie jakości agentów AI — benchmarki, skille, techniki

> Materiał do prezentacji / slajdów
> Projekt: **nechmark** — system benchmarkowania agentów BA
> Autor: Krzysztof Adamiak · 2026

---

## Slajd 1 — Problem: Jak mierzyć, czy agent AI robi dobrą robotę?

### Pytanie centralne
> Napisałem agenta który generuje user stories. Skąd wiem, że są dobre?

### Trzy pułapki
- **Gut feeling** — "wygląda okej" to nie jest metryka
- **Tylko LLM-as-Judge** — model ocenia model → circular bias
- **Tylko człowiek** — wolno, kosztownie, niepowtarzalnie

### Odpowiedź
Warstwowy system pomiarowy: deterministyczne metryki matematyczne + ocena LLM + porównanie z człowiekiem.

---

## Slajd 2 — Architektura systemu benchmarków

```
┌─────────────────────────────────────────────────┐
│              BA Agent (generuje output)          │
└───────────────────┬─────────────────────────────┘
                    │ BAOutput { userStories, rawInput }
          ┌─────────▼──────────┐
          │   Hard Metrics     │  ← deterministyczne, zero LLM
          │   (20 metryk)      │
          └─────────┬──────────┘
          ┌─────────▼──────────┐
          │   LLM-as-Judge     │  ← osobny model ocenia
          │   (6 wymiarów)     │
          └─────────┬──────────┘
          ┌─────────▼──────────┐
          │   Skill Metrics    │  ← proxy efektu technik
          │   (10 wskaźników)  │
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │   Dashboard        │  ← porównanie wersji/agentów
          └────────────────────┘
```

---

## Slajd 3 — Warstwa 1: Twarda matematyka (Hard Metrics)

### Czym są?
Metryki **deterministyczne** — regex, wzory matematyczne, słowniki. Zero LLM. Zawsze powtarzalne.

### Dlaczego to ważne?
Porównanie AI vs człowiek jest uczciwe tylko gdy pomiar nie zależy od innego AI.

### 5 grup metryk

| Grupa | Co mierzy |
|-------|-----------|
| **Format & struktura** | Czy output jest poprawny jako user story |
| **Jakość kryteriów AC** | Mierzalność, pokrycie Gherkin, duplikaty |
| **Język** | Słowa mętne, czas bierny, złożoność zdań |
| **Pokrycie wymagań** | Czy agent nie zgubił tematów z inputu |
| **Różnorodność** | Persona, rozkład wielkości stories |

---

## Slajd 4 — Hard Metrics: szczegóły (1/2)

### Format & Struktura
- **formatCompliance** — `As a [X] I want [Y] so that [Z]` pattern ✓/✗
- **wellFormedness** — kompletność: rola + akcja + cel
- **atomicity** — jeden cel na story (wykrywa `and` / `oraz` w want-clause)

### Jakość Acceptance Criteria
- **acMeasurability** — AC zawiera liczby, wartości graniczne, negacje → mierzalne
- **gherkinCoverage** — odsetek AC w formacie Given/When/Then
- **edgeCaseRatio** — odsetek AC pokrywających przypadki brzegowe
- **duplicateAc** — cosine similarity bag-of-words między AC → wykrywa duplikaty

### Readability (3 formuły)
- **Flesch Reading Ease** `206.835 − 1.015·(words/sent) − 84.6·(syl/word)` [\[Flesch 1948\]](#ref-flesch)
- **Gunning Fog** `0.4·(words/sent + 100·complexWords/words)` [\[Gunning 1952\]](#ref-gunning)
- **SMOG** `3 + √(polysyllables · 30/sentences)` [\[McLaughlin 1969\]](#ref-smog)

---

## Slajd 5 — Hard Metrics: szczegóły (2/2)

### Język i precyzja
- **vagueWordRatio** — słownik słów mętnych (quickly, soon, appropriate, some, certain…)
- **passiveVoiceRatio** — czas bierny zmniejsza klarowność wymagań
- **modalVerbStrength** — rozkład `must/shall` vs `should` vs `may` (rygoryzm wymagań)
- **subordinateClauseDensity** — zagęszczenie zdań podrzędnych (złożoność kognitywna)
- **typeTokenRatio** — leksykalna różnorodność (TTR = unique\_words / total\_words)

### Pokrycie i spójność
- **inputCoverage** — `bigrams(output) ∩ bigrams(input) / bigrams(input)` — czy agent nie zgubił tematów
- **terminologyConsistency** — ta sama encja = ta sama nazwa we wszystkich stories
- **storyIndependence** — cosine similarity między stories → wykrywa nakładanie się

### Dystrybucja
- **sizeDistribution** — rozkład liczby AC na story (Gini coefficient)
- **personaDiversity** — liczba unikalnych ról/person

**Wagi:** `inputCoverage ×2.0`, `formatCompliance ×1.5`, `acMeasurability ×1.5`, `vagueWordRatio ×1.5`, `terminologyConsistency ×1.5`

---

## Slajd 6 — Warstwa 2: LLM-as-Judge

### Wzorzec [\[Zheng et al. 2023\]](#ref-llm-judge)
Osobny model (nie ten sam co agent) ocenia output w skali 0–10 w 6 wymiarach.

```
Judge prompt → ocenia output → zwraca JSON { dimension: score }
```

### 6 wymiarów oceny

| Wymiar | Co ocenia |
|--------|-----------|
| **completeness** | Czy wszystkie wymagania pokryte |
| **clarity** | Zrozumiałość dla deweloperów |
| **testability** | Czy AC da się przetestować |
| **invest\_compliance** | Zgodność z INVEST [\[Wake 2003\]](#ref-invest) |
| **consistency** | Spójność terminologii i logiki |
| **edge\_case\_coverage** | Przypadki brzegowe, błędy, wyjątki |

### Dlaczego osobny model?
Self-evaluation bias — model oceniający własne wyjście systematycznie zawyża oceny. Inna temperatura, inny model → niezależna perspektywa.

---

## Slajd 7 — Warstwa 3: Skill Metrics

### Pytanie
Mam agenta z CoT i bez CoT. Skąd wiem, że CoT faktycznie pomaga?

### Rozwiązanie: proxy metrics
Nie mierzymy skilla bezpośrednio — mierzymy **efekt, który powinien wywołać**.

| Skill | Proxy metric |
|-------|-------------|
| `self-critique` | refinementRefinementScore — wzrost liczby AC po rondzie krytyki |
| `edge-case-hunter` | edgeCaseHunterEffect — ratio AC brzegowych vs normalnych |
| `persona-expander` | personaExpanderEffect — liczba unikalnych ról |
| `chain-of-thought` | chainOfThoughtCoherence — spójność logiczna między stories |
| `structured-output` | structuredOutputQuality — poprawność formatu JSON |
| `few-shot` | fewShotImpact — jakość relative do liczby przykładów |
| tools (jira/web) | toolCoverageBoost — czy input z toolów zwiększa inputCoverage |

### agentComplexityRatio
Penalizuje over-engineering: jeśli agent ma 5 skillów ale outputy nie są lepsze niż baseline → negatywny sygnał.

---

## Slajd 8 — AgentDescriptor: kto właściwie był testowany?

### Problem reprodukowalności
"Agent Claude Opus z dobrym promptem" to za mało. Za rok nie wiesz co testowałeś.

### Rozwiązanie: pełny descriptor

```json
{
  "id": "opus4-cot-selfcritique-v2",
  "label": "Claude Opus 4 — CoT + Self-Critique v2",
  "model": {
    "provider": "anthropic",
    "name": "claude-opus-4-8",
    "temperature": 0.3,
    "thinking": true
  },
  "prompt": {
    "version": "v2",
    "technique": ["chain-of-thought", "self-critique", "structured-output"],
    "language": "pl",
    "fewShotCount": 3,
    "maxRefinementRounds": 2
  },
  "skills": ["invest-checker", "edge-case-hunter", "persona-expander"],
  "tools": ["jira-fetch", "confluence-search"],
  "notes": "Dodano few-shot examples z projektu X. Zwiększono max AC z 5 do 8."
}
```

### Co to daje?
- Pełna reprodukowalność eksperymentu
- Wersjonowanie promptów
- Porównanie: czy zmiana temperatury 0.3→0.7 zmieniła coś?

---

## Slajd 9 — AI vs Człowiek: case study

### Scenariusz testowy: Logowanie 2FA do systemu szkolnego

**Ten sam input** → dwa analizy: agent AI (Claude Opus 4) vs analityk mid-level

| Metryka | AI Agent | Człowiek Mid |
|---------|----------|-------------|
| Liczba stories | 8 | 6 |
| Liczba AC | 38 | 16 |
| formatCompliance | 100% | 83% |
| acMeasurability | 89% | 31% |
| gherkinCoverage | 87% | 0% |
| vagueWordRatio | 4% | 23% |
| edgeCaseRatio | 34% | 6% |
| personaDiversity | 3 role | 1 rola |
| **Overall Score** | **78.4** | **41.2** |

### Obserwacje
- AI: konkretne liczby (30s, 5min, 12 znaków), 3 persony, backup codes, TOTP sync
- Człowiek: "szybko", "odpowiedni", "pewien czas" — brak liczb, jedna persona, brak edge cases
- Ale: człowiek napisał to w 20 min. Agent: 45s + koszt API

---

## Slajd 10 — Ile danych potrzeba?

### Minimalne progi dla sensownych porównań

| Cel | Min. stories | Min. przypadki | Min. agenty |
|-----|-------------|----------------|-------------|
| Proof of concept | 10 | 1 | 2 |
| Wstępna analiza | 30 | 3 | 2 |
| Raport porównawczy | 60 | 5 | 3 |
| Statystycznie wiarygodne | 150+ | 10+ | 3+ |

### Dlaczego tak dużo?
- Pojedynczy output ma wysoką wariancję (temperatura modelu)
- Różne domeny wymagań ujawniają różne słabości
- Potrzeba bootstrapowania CI dla median scores

### Zalecenie praktyczne
- Min. **5 case'ów** per agent (różne domeny: login, płatności, raportowanie, notyfikacje, admin)
- Min. **3 niezależne runy** per case (różne temperature seeds lub różne prompty)
- Agreguj mediany, nie średnie (odporne na outliers)

---

## Slajd 11 — Techniki i ich mierzalny wpływ

### Ranking technik (na podstawie literatury + obserwacji)

| Technika | Wpływ na jakość | Koszt tokenów | Kiedy warto |
|----------|----------------|---------------|-------------|
| **Few-shot (3-5 examples)** | +15–25% | ×1.5 | Zawsze przy nowym domenie |
| **Chain-of-Thought** | +10–20% | ×2–3 | Złożone wymagania, wiele aktorów |
| **Self-Critique + Refinement** | +8–15% | ×3–4 | Gdy liczy się jakość AC |
| **Structured Output** | +5% (konsystencja) | ×1.0 | Zawsze, zerowy koszt |
| **Role-play (BA persona)** | +5–10% | ×1.1 | Specjalistyczne domeny |
| **Tree-of-Thought** | +12–18% | ×5–8 | Rzadko — za drogo |

Źródło: [\[The Prompt Report, Schulhoff et al. 2024\]](#ref-prompt-report)

### Kluczowa obserwacja
Few-shot + Self-Critique daje ~80% efektu Tree-of-Thought za ~40% ceny tokenów.

---

## Slajd 12 — Framework INVEST jako kryterium oceny

### Co to jest INVEST [\[Wake 2003\]](#ref-invest)

| Litera | Kryterium | Jak mierzymy |
|--------|-----------|-------------|
| **I** — Independent | Stories nie zależą od siebie | cosine similarity < 0.3 |
| **N** — Negotiable | Nie spec, a rozmowa | modal verb ratio (must/should/may) |
| **V** — Valuable | Wartość dla użytkownika | "so that" clause completeness |
| **E** — Estimable | Da się wycenić | atomicity + rozmiar AC |
| **S** — Small | Jedno story = jeden sprint | liczba AC ≤ 8, brak `and` w want |
| **T** — Testable | Da się przetestować | acMeasurability + gherkinCoverage |

### QUS Framework [\[Lucassen et al. 2016\]](#ref-qus)
13 kryteriów jakości user stories — rozszerzenie INVEST o:
- Uniform (spójny format)
- Unique (brak duplikatów)
- Full (epic = set of stories covering whole feature)
- Explicit (brak niejasnych zaimków)

---

## Slajd 13 — Dashboard: co porównujemy

### Radar chart — profil agenta
```
         formatCompliance
              ●
     /                 \
    ●  vagueWordRatio   ●  acMeasurability
    |                  |
    ●  inputCoverage   ●  gherkinCoverage
     \                 /
         edgeCaseRatio
```

Każdy agent ma swój "fingerprint" — wzorzec silnych i słabych stron.

### Matrix wersji
```
                v1    v2    v3
┌──────────────┬─────┬─────┬─────┐
│ Login 2FA    │ 61  │ 71  │ 78  │ ← trend ↑
│ Płatności    │ 58  │ 69  │ 74  │
│ Raportowanie │ 72  │ 70  │ 79  │ ← v2 regresja!
└──────────────┴─────┴─────┴─────┘
```

Regresje widoczne od razu — zmiana promptu v1→v2 popsuła Raportowanie.

---

## Slajd 14 — Pułapki i ograniczenia

### Hard metrics nie zastąpią sensu
- `acMeasurability` = 95% → agent pisze "system response time < 2000ms"
- Ale może to nonsens dla danej domeny (aplikacja offline)
- **Metryki mierzą formę, nie domenową poprawność**

### LLM Judge ma bias
- Modele preferują dłuższe, bardziej szczegółowe odpowiedzi
- Modele tego samego dostawcy mogą faworyzować swoje outputy
- Używaj innego modelu jako judge niż agent

### Skill metrics to proxy, nie dowód
- Wysoki `edgeCaseHunterEffect` = agent pisze dużo edge case'ów
- Nie wiesz czy te edge cases są trafne domenowo
- Potrzeba human review dla kalibracji

### Wariancja modeli
- Ta sama temperatura, ten sam prompt → różny output
- Min. 3 runy per case, agreguj mediany

---

## Slajd 15 — Roadmap: co dalej

### Krótkoterminowo (1–3 miesiące)
- [ ] LLM Judge integracja w UI (teraz tylko hard metrics)
- [ ] Import z Jira — automatyczne case'y z ticketów
- [ ] Eksport CSV / PDF raportów
- [ ] Alerty regresji — webhook gdy score spada >5 pkt

### Średnioterminowo (3–6 miesięcy)
- [ ] Human annotation layer — BA review oceniający domenową trafność
- [ ] A/B testing promptów z automatycznym significance testem
- [ ] Domain-specific słowniki (fintech, healthcare, e-commerce)
- [ ] Historical benchmark database — porównaj z innymi teamami

### Długoterminowo
- [ ] Fine-tuning na zatwierdzonych user stories
- [ ] Automatyczna selekcja technik (per-case optimal technique routing)
- [ ] Benchmark publiczny — open dataset user stories z ocenami

---

## Slajd 16 — Podsumowanie

### Co system mierzy
```
Output = f(model, prompt, skills, tools, input)
```
Każdy wymiar jest śledzony osobno przez AgentDescriptor.

### Trzy warstwy pomiarów
1. **Hard metrics** — deterministyczne, powtarzalne, uczciwe dla AI vs człowiek
2. **LLM Judge** — subiektywna jakość, 6 wymiarów
3. **Skill metrics** — proxy efektu technik i skillów

### Kluczowa teza
> Nie optymalizuj agenta bez mierzenia. Mierz często, mierz warstwowo, porównuj z człowiekiem.

### Narzędzie
**nechmark** — open source, TypeScript, Express 5, SQLite, Chart.js
`github.com/LordIllidan/nechmark`

---

## Źródła

<a name="ref-qus"></a>
**[QUS]** Lucassen, G., Dalpiaz, F., van der Werf, J. M., & Brinkkemper, S. (2016).
*Improving agile requirements: the Quality User Story framework and tool.*
Requirements Engineering, 21(3), 383–403.
https://doi.org/10.1007/s00766-016-0250-x

<a name="ref-invest"></a>
**[INVEST]** Wake, B. (2003).
*INVEST in Good Stories, and SMART Tasks.*
https://agilealliance.org/glossary/invest/

<a name="ref-llm-judge"></a>
**[LLM-Judge]** Zheng, L., Chiang, W.-L., Sheng, Y., et al. (2023).
*Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.*
NeurIPS 2023 Datasets & Benchmarks Track.
https://arxiv.org/abs/2306.05685

<a name="ref-agentbench"></a>
**[AgentBench]** Liu, X., et al. (2023).
*AgentBench: Evaluating LLMs as Agents.*
ICLR 2024.
https://arxiv.org/abs/2308.03688

<a name="ref-agent-survey"></a>
**[AgentSurvey]** Mohammadi, M., et al. (2025).
*Evaluation and Benchmarking of LLM Agents: A Survey.*
KDD 2025.
https://arxiv.org/abs/2507.21504

<a name="ref-prompt-report"></a>
**[PromptReport]** Schulhoff, S., et al. (2024).
*The Prompt Report: A Systematic Survey of Prompt Engineering Techniques.*
https://arxiv.org/abs/2406.06608

<a name="ref-flesch"></a>
**[Flesch]** Flesch, R. (1948).
*A New Readability Yardstick.*
Journal of Applied Psychology, 32(3), 221–233.

<a name="ref-gunning"></a>
**[Gunning]** Gunning, R. (1952).
*The Technique of Clear Writing.*
McGraw-Hill.

<a name="ref-smog"></a>
**[SMOG]** McLaughlin, G. H. (1969).
*SMOG Grading — A New Readability Formula.*
Journal of Reading, 12(8), 639–646.

<a name="ref-bdd"></a>
**[BDD]** North, D. (2006).
*Introducing Behaviour-Driven Development.*
Better Software Magazine, March 2006.
https://dannorth.net/blog/article-introducing-behaviour-driven-development/
