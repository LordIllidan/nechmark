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

## Slajd 15 — Wzorce agentowe: jak skille wpływają na architekturę

### ReAct — Reasoning + Acting [\[Yao et al. 2022\]](#ref-react)
```
Thought → Action (tool call) → Observation → Thought → ...
```
Agent BA używający ReAct: myśli o wymaganiach → wywołuje Jira → analizuje odpowiedź → generuje story.
**Mierzalne proxy:** `toolCoverageBoost` — czy użycie toolów zwiększa `inputCoverage`?

### Reflexion — Verbal Reinforcement [\[Shinn et al. 2023\]](#ref-reflexion)
```
Output → Evaluate → Verbal feedback → Retry → Better Output
```
Agent sam ocenia swój output słownie i iteruje. Odpowiednik `self-critique` skilla.
**Mierzalne proxy:** `refinementRefinementScore` — delta liczby AC i ocen między rundami.

### Self-Consistency [\[Wang et al. 2022\]](#ref-self-consistency)
```
Prompt → [output_1, output_2, output_3] → majority vote / merge
```
Generuj N outputów, agreguj najczęściej pojawiające się elementy.
**Mierzalne proxy:** `structuredOutputQuality` — spójność formatu między próbkami.

### Constitutional AI / Self-Critique [\[Bai et al. 2022\]](#ref-cai)
```
Draft → Critique (własne zasady) → Revision → Final
```
Agent ma "konstytucję" (np. reguły INVEST) i krytykuje własny draft przed zwróceniem.
**Mierzalne proxy:** porównaj score agenta z `self-critique` skilla vs bez.

---

## Slajd 16 — Ambiguity Detection: co agent powinien eliminować

### Nocuous Ambiguity [\[Berry et al.\]](#ref-ambiguity)
Niejednoznaczność która **ma znaczenie** — różni czytelnicy rozumieją różnie.

```
Złe:  "System szybko odpowiada na zapytania"
       ↑ "szybko" = 100ms? 2s? 10s? — każdy dev rozumie inaczej

Dobre: "System odpowiada w czasie < 200ms dla 95. percentyla"
```

### Typy ambiguity w wymaganiach

| Typ | Przykład | Hard metric |
|-----|----------|------------|
| **Leksykalna** | "odpowiedni format" | `vagueWordRatio` |
| **Referencyjna** | "on powinien..." (kto?) | passive voice + brak roli |
| **Zakresowa** | "niektórzy użytkownicy" | brak personas |
| **Syntaktyczna** | "Admin i user mogą..." (razem czy osobno?) | `atomicity` |

### Metryki wykrywające ambiguity
- `vagueWordRatio` — słownik ~40 słów mętnych
- `passiveVoiceRatio` — czas bierny ukrywa aktora
- `personaDiversity` — brak ról = niejasne kto co robi
- `subordinateClauseDensity` — zbyt złożone zdania = ryzyko różnej interpretacji

---

## Slajd 17 — EARS: alternatywny format wymagań

### Easy Approach to Requirements Syntax [\[Mavin et al. 2009\]](#ref-ears)

Ustrukturyzowany język naturalny dla wymagań systemowych. Pięć wzorców:

| Wzorzec | Struktura | Przykład |
|---------|-----------|---------|
| **Ubiquitous** | The `<system>` shall `<action>` | System shall log all authentication attempts |
| **Event-driven** | When `<event>`, the `<system>` shall `<action>` | When login fails 5×, system shall lock account for 15 min |
| **State-driven** | While `<state>`, the `<system>` shall `<action>` | While session is active, system shall refresh token every 30 min |
| **Optional** | Where `<feature included>`, the `<system>` shall `<action>` | Where 2FA enabled, system shall send TOTP code |
| **Unwanted behaviour** | If `<condition>`, then the `<system>` shall `<response>` | If TOTP sync fails, system shall offer backup code |

### Dlaczego to ważne dla benchmarkowania?
User stories (As a / I want / So that) + EARS-style AC = pełna, mierzalna specyfikacja.
Agent generujący AC w EARS ma automatycznie wyższy `acMeasurability`.

---

## Slajd 18 — LLM generowanie user stories: co mówi literatura

### Badania 2024–2025

**Rahman & Zhu (2024)** — *Automated User Story Generation with Test Case Specification* [\[arXiv:2404.01558\]](#ref-llm-stories)
- LLM generuje stories + test cases razem
- Jakość porównywalna z human mid-level w 70% przypadków
- Słabe strony: brak edge cases, zbyt ogólne AC

**UStAI Dataset (2024)** — *Leveraging LLMs for User Stories in AI Systems* [\[ACM\]](#ref-ustai)
- Benchmark dataset stories dla systemów AI
- LLM-generated vs human-written
- Kluczowy wniosek: LLM lepszy w formacie, człowiek lepszy w domenie

**Obserwacja z nechmark** (case study logowanie 2FA):
```
AI:    78.4 / 100  — konkretne liczby, 3 persony, edge cases
Human: 41.2 / 100  — słowa mętne, 1 persona, brak edge cases
```

### Wniosek
LLM generuje lepiej formalnie. Człowiek wnosi wiedzę domenową.
**Optymalnie:** LLM draft → human domain review.

---

## Slajd 19 — Halucynacje w kontekście BA agenta

### Czym jest halucynacja w wymaganiach? [\[Survey, arXiv:2311.05232\]](#ref-hallucination)
Agent **wymyśla wymagania** których nie ma w inputcie.

```
Input:  "System logowania z 2FA dla szkoły"
Output: "As a student, I want to pay for lunch via the app..."
         ↑ HALUCYNACJA — nic o płatnościach w inpucie
```

### Jak mierzymy?
**`inputCoverage`** mierzy *recall* — co z inputu pokryte.
Ale halucynacje to *precision* — co w outputcie nie ma pokrycia w inputcie.

### Brakująca metryka: inputPrecision
```
inputPrecision = bigrams(output) ∩ bigrams(input) / bigrams(output)
```
Niska precyzja = agent "dodaje od siebie" → kandydat do roadmapy.

### Dlaczego trudne do wykrycia?
- Halucynowane wymagania często brzmią sensownie
- Hard metrics tego nie łapią — tylko LLM Judge może ocenić domenową trafność
- Dlatego warstwowy system pomiarowy jest konieczny

---

## Slajd 20 — ROUGE / BLEU w ewaluacji wymagań

### Skąd te metryki?
Pierwotnie dla machine translation i summarization. Dają się zaadaptować.

### BLEU (Bilingual Evaluation Understudy)
Mierzy *precision* n-gramów outputu względem referencji.
```
BLEU = BP · exp(Σ wₙ · log pₙ)
```
**Zastosowanie BA:** porównaj output agenta z "golden" user stories (np. zatwierdzony backlog).

### ROUGE-L (Longest Common Subsequence)
Mierzy *recall* — ile z referencji znalazło się w outputcie.
**Zastosowanie BA:** czy agent pokrył te same wymagania co złoty standard?

### Ograniczenia dla user stories
- Wymagają **golden dataset** — zatwierdzonych historyjek jako punkt odniesienia
- Mierzą overlap słów, nie sensu
- Dwie stories mogą znaczyć to samo, mieć BLEU=0

### Kiedy używać?
- Regression testing: nowa wersja agenta vs "certyfikowany" output z poprzedniej wersji
- Nie jako standalone — tylko jako uzupełnienie hard metrics

---

## Slajd 21 — Token efficiency: koszt vs jakość

### Podstawowy tradeoff

```
więcej tokenów ≠ lepsza jakość
ale: techniki jakościowe kosztują tokeny
```

### Dane z literatury [\[The Prompt Report, Schulhoff et al. 2024\]](#ref-prompt-report)

| Technika | Tokeny (relative) | Jakość (relative) | ROI |
|----------|------------------|------------------|-----|
| zero-shot | 1× | 1× | baseline |
| few-shot (3 examples) | 1.8× | 1.3× | ★★★★ |
| chain-of-thought | 2.5× | 1.4× | ★★★ |
| self-consistency (5 samples) | 5× | 1.5× | ★★ |
| self-critique + refinement | 3.5× | 1.45× | ★★★ |
| tree-of-thought | 8× | 1.6× | ★ |

### `agentComplexityRatio` — nasza metryka
```
agentComplexityRatio = qualityGain / complexityCost
qualityGain = (score - baseline) / baseline
complexityCost = (skills.length + tools.length + techniques.length) / maxPossible
```
Wysoki ratio = agent efektywny. Niski = over-engineered.

### Praktyczna zasada
**Few-shot + structured output** daje ~80% efektu CoT za ~50% ceny.
Dodawaj kolejne techniki dopiero gdy metryki pokazują plateau.

---

## Slajd 22 — Linguistic diversity: TTR i co za nim stoi

### Type-Token Ratio [\[Lexical Diversity\]](#ref-ttr)
```
TTR = unique_word_types / total_word_tokens
```

### Interpretacja dla user stories

| TTR | Interpretacja |
|-----|--------------|
| > 0.7 | Wysoka różnorodność — agent nie powtarza tych samych fraz |
| 0.4–0.7 | Normalny zakres dla dokumentów wymagań |
| < 0.4 | Copy-paste smell — agent stosuje szablony bez adaptacji |

### Uwaga: długość tekstu wpływa na TTR
Dłuższy tekst → naturalnie niższy TTR (prawo Zipfa).
Dla porównań między agentami: normalizuj do podobnej długości outputu lub używaj MATTR (Moving Average TTR).

### Co niski TTR sygnalizuje?
- Agent używa bardzo podobnych AC dla wszystkich stories
- Brak dostosowania do kontekstu
- Może maskować brak rzeczywistego rozumienia wymagań

---

## Slajd 23 — QUS Framework w szczegółach

### 13 kryteriów jakości [\[Lucassen et al. 2016\]](#ref-qus)

**Syntaktyczne (mierzalne automatycznie):**

| Kryterium | Opis | Nasza metryka |
|-----------|------|---------------|
| Well-formed | As/I want/So that kompletne | `wellFormedness` |
| Atomic | Jeden cel na story | `atomicity` |
| Minimal | Tylko As/I want/So that | brak dodatkowego szumu |
| Uniform | Spójny format w całym zbiorze | `formatCompliance` |
| Unique | Brak duplikatów | `storyIndependence` |

**Semantyczne (częściowo mierzalne):**

| Kryterium | Opis | Nasza metryka |
|-----------|------|---------------|
| Conceptually sound | Persona + akcja mają sens razem | `wellFormedness` (proxy) |
| Problem-oriented | Cel jest wartością, nie rozwiązaniem | LLM Judge: `clarity` |
| Unambiguous | Brak dwuznaczności | `vagueWordRatio`, `passiveVoiceRatio` |
| Full | Set pokrywa całą funkcjonalność | `inputCoverage` |
| Explicit | Brak niejasnych zaimków | `passiveVoiceRatio` |

**Zestaw-level:**

| Kryterium | Opis | Nasza metryka |
|-----------|------|---------------|
| Complete | Epik pokryty w całości | `inputCoverage` |
| Consistent | Brak sprzeczności | `terminologyConsistency` |
| Independent | Stories niezależne | `storyIndependence` |

---

## Slajd 24 — Benchmarki agentów: gdzie jesteśmy vs świat

### AgentBench [\[Liu et al. 2023\]](#ref-agentbench)
8 zadań: operating system, web browsing, database, knowledge graph, digital card game, lateral thinking puzzle, house-holding, web shopping.
**Najlepsze modele 2023:** GPT-4 ~ 3.5/10 overall. Open-source models < 1/10.

### Aktualny stan (2026)
- Claude Opus 4, GPT-4o, Gemini Ultra 2 — zbliżone wyniki w ogólnych benchmarkach
- Specjalistyczne zadania (kod, wymagania, analiza) — duże różnice między modelami
- **Luka:** brak standardowego benchmarku dla zadań BA/requirements engineering

### Dlaczego nechmark jest inny?
AgentBench mierzy *czy agent wykonuje zadanie*.
nechmark mierzy *jak dobrze agent tworzy wymagania* — nowa nisza.

### Survey agentów 2025 [\[Mohammadi et al. 2025\]](#ref-agent-survey)
Kluczowe wnioski:
- 80% benchmarków mierzy *correctness*, nie *quality*
- Brak standardowych metryk dla "soft" zadań jak analiza biznesowa
- Potrzeba domenowo-specyficznych benchmarków → **to jest nasza propozycja**

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

<a name="ref-react"></a>
**[ReAct]** Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K. R., & Cao, Y. (2022).
*ReAct: Synergizing Reasoning and Acting in Language Models.*
arXiv:2210.03629.
https://arxiv.org/abs/2210.03629

<a name="ref-reflexion"></a>
**[Reflexion]** Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023).
*Reflexion: Language Agents with Verbal Reinforcement Learning.*
NeurIPS 2023. arXiv:2303.11366.
https://arxiv.org/abs/2303.11366

<a name="ref-self-consistency"></a>
**[SelfConsistency]** Wang, X., Wei, J., Schuurmans, D., Le, Q., Chi, E., Narang, S., Chowdhery, A., & Zhou, D. (2022).
*Self-Consistency Improves Chain of Thought Reasoning in Language Models.*
arXiv:2203.11171.
https://arxiv.org/abs/2203.11171

<a name="ref-cai"></a>
**[CAI]** Bai, Y., Kadavath, S., et al. (2022).
*Constitutional AI: Harmlessness from AI Feedback.*
Anthropic. arXiv:2212.08073.
https://arxiv.org/abs/2212.08073

<a name="ref-ears"></a>
**[EARS]** Mavin, A., Wilkinson, P., Harwood, A. R. G., & Novak, M. (2009).
*Easy Approach to Requirements Syntax (EARS).*
IEEE 17th International Requirements Engineering Conference (RE '09).
https://www.researchgate.net/publication/224079416

<a name="ref-ambiguity"></a>
**[Ambiguity]** Ceccato, M., Kiyavitskaya, N., Zeni, N., Mich, L., & Berry, D. M. (2004).
*Ambiguity Identification and Measurement in Natural Language Texts.*
ResearchGate.
https://www.researchgate.net/publication/30530745

<a name="ref-llm-stories"></a>
**[LLMStories]** Rahman, T., & Zhu, Y. (2024).
*Automated User Story Generation with Test Case Specification Using Large Language Model.*
arXiv:2404.01558.
https://arxiv.org/abs/2404.01558

<a name="ref-ustai"></a>
**[UStAI]** (2024).
*Leveraging LLMs for User Stories in AI Systems: UStAI Dataset.*
ACM SIGSOFT. https://dl.acm.org/doi/10.1145/3727582.3728689

<a name="ref-hallucination"></a>
**[Hallucination]** Zhang, Y., et al. (2023).
*A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Questions.*
arXiv:2311.05232.
https://arxiv.org/abs/2311.05232

<a name="ref-ttr"></a>
**[TTR]** Lexical diversity — Type-Token Ratio.
*Journal of Quantitative Linguistics*, Vol. 21, No. 3 (2014).
https://www.tandfonline.com/doi/abs/10.1080/09296174.2014.911506
