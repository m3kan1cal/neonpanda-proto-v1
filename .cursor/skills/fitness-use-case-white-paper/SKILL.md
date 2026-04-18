---
name: fitness-use-case-white-paper
description: >-
  Produces marketing-ready but evidence-grounded fitness customer use-case white
  papers from a raw text dump of JSON-shaped DynamoDB items (file may not be
  valid JSON as a whole), aligned with NeonPanda brand voice. Cursor project
  skill; sibling workflow for Claude Code lives under .claude/skills/. Use when
  the user asks for a case study, use-case white paper, customer success story,
  or narrative synthesis from comprehensive user history exports.
---

# Fitness use-case white paper (NeonPanda)

## Scope (project only)

Use this skill **only in this repository**. Linked docs ([docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md), [docs/strategy/DB_DESIGN.md](docs/strategy/DB_DESIGN.md)) are repo paths. Do not assume a global copy of this skill exists outside NeonPanda.

## Cursor usage notes

- **Install path:** `.cursor/skills/fitness-use-case-white-paper/` (project-level). When changing this workflow, update the parallel copy at `.claude/skills/fitness-use-case-white-paper/` so both agents stay aligned.
- **Ingesting the dump:** If the user provides a **workspace file path**, read it with the Read tool. For very large files, read in sequential chunks (offset/limit) and reconstruct items across reads. If they **paste** fragments or records in chat, use that instead and note the incomplete-coverage risk under **Method & limitations**.
- **Where to save output:** If they want a durable artifact, write markdown under something like `docs/marketing/use-cases/` (create directories if needed) unless they specify another path. If they only want draft copy, the chat reply may be enough—ask once if unclear.

## When to apply

Use this skill when synthesizing **real user journeys** into a **public-facing** asset: case study, use-case white paper, or launch story aimed at **fitness enthusiasts** considering NeonPanda. The output should feel **marketing-grade** yet stay **objective**: every claim must trace to supplied data or be clearly labeled as interpretation.

## Required inputs (ask if missing)

1. **Subject scope**: one user, cohort, or anonymized composite (if composite, say so explicitly).
2. **Data package (default)**: a **single raw text file** containing the **full DynamoDB history** for the subject. The file holds **only JSON records** (items/objects), but the file itself is often **not valid JSON** as one value—records may be concatenated, newline-separated, or otherwise unstructured. Parse by recovering individual objects (e.g. balanced `{`…`}` blocks, or line-delimited objects if that matches the dump). Cross-check shapes against [docs/strategy/DB_DESIGN.md](docs/strategy/DB_DESIGN.md). If parsing is lossy or ambiguous, say so under **Method & limitations**. Supplemental exports (analytics, S3 pointers) are optional unless the user provides them.
3. **Publication rules (ask every time)**: consent status, anonymity / naming (pseudonym vs real), and any red lines (quotes, metrics, imagery).
4. **Deliverable format**: default is **one markdown document** with a **short shareable summary** plus **~2–3 pages** of narrative detail (rough guide: **~900–1,400 words** for the detail portion—adjust for voice, not padding). Omit six-page treatises unless the user explicitly asks. Output is usually markdown; PDF/Notion only if requested.

## Brand and product context (read before drafting)

1. Read [docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md) for voice, tone, messaging pillars, and what to avoid (corporate-AI jargon, condescending clinical tone).
2. For entity shapes and where data lives, skim [docs/strategy/DB_DESIGN.md](docs/strategy/DB_DESIGN.md) so you map raw items (profiles, conversations, workouts, feedback) to narrative sections without inventing fields.

**Voice calibration (summary):** warm, conversational, confidently knowledgeable, playfully motivating, honest. Prefer plain language. Use technical precision only when the reader benefits. Avoid hype adjectives that outrun the evidence.

## Evidence discipline

- **Grounding**: Tie outcomes, habits, and coach behaviors to timestamps, counts, quotes, or event sequences from the data package. Prefer paraphrase over long verbatim paste unless the user supplied quote-approved snippets.
- **No fabrication**: If the data does not show a metric, do not imply one.
- **Thin numbers → qualitative honesty**: When counts, loads, or before/after metrics are missing or sparse, **prefer a frank qualitative story** (patterns, cadence, themes, what the user said) over fake precision. Never invent percentages, averages, or PRs. It is better to write "the records show steadier check-ins over time" with no number than to sound quantitative without data.
- **Uncertainty**: When inferring motivation or emotional state, label it as interpretation and point to the supporting signals (e.g., message tone, session frequency change).
- **Privacy**: Strip PII; use pseudonyms unless the user confirms real names are cleared for marketing. Never include emails, exact addresses, or other identifiers from Dynamo keys in public copy.

## Analysis workflow

Copy this checklist and track progress:

```
Task progress:
- [ ] Ingest raw dump: recover individual JSON items; note parsing assumptions and any corrupted lines
- [ ] Inventory data: entity types, approximate item counts, date range
- [ ] Reconstruct timeline: account creation → goal setting → key coaching threads → milestones
- [ ] Extract goals & constraints: stated goals, injuries, equipment, schedule, preferences
- [ ] Coach interaction pattern: initiation (user vs coach), length, cadence, topics, tool/feature usage if visible
- [ ] Outcomes & feedback: PRs, adherence, subjective check-ins, ratings, churn/retention signals
- [ ] Draft white paper using template below
- [ ] Run credibility pass: mark each major claim with its evidence type (metric, quote, event)
```

**Dynamo-oriented prompts** (adapt to actual item shapes): sort by time; group by conversation or workout entities; look for step-function changes after a coaching intervention; correlate feedback messages with subsequent behavior.

## Output template

**One document, two layers:** (1) **Shareable summary**—scannable, quotable, works for social or email; (2) **The story (~2–3 pages)**—enough depth that a curious enthusiast feels the arc. Write for **fitness enthusiasts** exploring NeonPanda: credible, human, on-brand—not enterprise procurement tone.

```markdown
# [Working title: outcome + persona signal — e.g., "From inconsistent training to weekly wins with an adaptive AI coach"]

**Subtitle:** One-line promise grounded in the strongest verified outcome.

---

## Shareable summary

~150–220 words max. Single tight intro paragraph optional, then bullets:

- **Who** (pseudonym or segment)
- **Where they started** (one plain sentence, evidence-backed)
- **What they wanted** (goals from the data)
- **What shifted** (2–4 bullets; qualitative phrasing OK if metrics are thin)
- **Why it matters** (one sentence for readers like you—inviting, not salesy)

_Intended to be copied or screenshotted without the rest of the doc._

---

## The story

### At a glance

- **Who:** [Pseudonym / segment description]
- **Starting point:** [Evidence-based snapshot]
- **Primary goals:** [As stated in data]
- **Timeframe:** [First activity → last observed activity in dataset]
- **What changed:** [3–5 bullets]

### The situation

Context the reader needs: schedule, experience level, constraints, emotional friction if evidenced.

### How they used NeonPanda

Product story without feature laundry lists: goals, coach conversations, logging, guidance. Tie to observed usage patterns.

### Coach relationship & interaction style

Cadence, who initiates, tone (supportive, direct, humorous) **as evidenced** by messages or metadata. Note adaptations over time.

### Progress & observations

Strong **quant** only when the data supports it. Otherwise lead **qualitative** with honest framing. Then subjective feedback and interpreted themes, clearly labeled.

### Representative moments

2–3 short vignettes from real sequences (anonymized). No dramatization beyond what the data can carry.

### What this suggests (for readers)

Transferable lessons—still restrained. If causality is not provable, say "associated with" not "caused."

### Method & limitations

Raw dump handling (how records were separated), date range, gaps, consent status. Keeps trust with readers who care about substance.

### Optional pull quotes

1–2 lines approved or clearly paraphrased for reuse elsewhere.
```

## Final quality bar

- Would a skeptical **fitness enthusiast** still find this **credible and worth their time**?
- Does every strong claim have a **visible evidentiary path**?
- Does it sound like **NeonPanda** (per branding doc) rather than generic SaaS marketing?
- Are privacy and consent statements accurate for what the user confirmed for this run?

If any answer is no, revise before handing off.

## Optional deep outline

For a longer deliverable or multi-subject synthesis, see [reference-long-form.md](reference-long-form.md).
