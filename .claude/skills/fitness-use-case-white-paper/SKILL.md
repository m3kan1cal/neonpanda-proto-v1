---
name: fitness-use-case-white-paper
description: >-
  Produces marketing-ready but evidence-grounded fitness customer use-case white
  papers from a raw text dump of JSON-shaped DynamoDB items (file may not be
  valid JSON as a whole), aligned with NeonPanda brand voice. Project-only skill.
  Use when the user asks for a case study, use-case white paper, customer success
  story, or narrative synthesis from comprehensive user history exports. Frames
  the featured user with agency and dignity so they feel proud to share with friends and networks.
---

# Fitness use-case white paper (NeonPanda)

## Scope (project only)

Use this skill **only in this repository**. Linked docs ([docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md), [docs/strategy/DB_DESIGN.md](docs/strategy/DB_DESIGN.md)) are repo paths. Do not assume a global copy of this skill exists outside NeonPanda. A parallel **Cursor** project skill lives at `.cursor/skills/fitness-use-case-white-paper/`; keep both copies aligned when editing this workflow.

## When to apply

Use this skill when synthesizing **real user journeys** into a **public-facing** asset: case study, use-case white paper, or launch story aimed at **fitness enthusiasts** considering NeonPanda. The output should feel **marketing-grade** yet stay **objective**: every claim must trace to supplied data or be clearly labeled as interpretation.

## Required inputs (ask if missing)

Ask these four questions **up front** before any analysis or drafting. Use a structured multiple-choice prompt when the tooling supports it (e.g. `AskUserQuestion`); otherwise ask them inline. Do not guess—the answers shape framing, tone, and file output.

1. **Naming / identity handling.** Options:
   - *Pseudonym* (recommended default) — invented first name or persona label.
   - *Real first name only* — requires confirmed consent.
   - *Real full name* — requires explicit written clearance for public use.
   - *Segment / composite label* — no personal name at all (e.g. "a masters-age CrossFitter"). Required if framing as a multi-user composite.
2. **Red lines on quoted or cited detail.** Multi-select. Options:
   - *No direct message quotes* (paraphrase only).
   - *No specific numeric PRs / loads / body metrics* (keep quantitative claims qualitative).
   - *No injury or medical detail.*
   - *None* — use what the data supports, subject to normal evidence and privacy discipline.
3. **Deliverable format.** Options:
   - *Markdown only* (default) — single `.md` with shareable summary + ~2–3 page story.
   - *Markdown + HTML* — adds a polished, single-file, self-contained `.html` using Inter + Barlow fonts and a clean light theme (same aesthetic conventions as the `kanban-delivery-report` skill). Best when the user will share via link, Slack, or email preview.
   - *Markdown + Word (.docx)* — for editorial review by non-technical reviewers.
   - *Markdown + PDF* — for read-only external distribution.
4. **Consent status.** Enumerate clearly; the answer must be surfaced in the deliverable's **Method & limitations** section:
   - *Internal draft only* — not cleared for external sharing. Label "Internal draft" visibly.
   - *Draft for subject review* — subject has given conditional consent, wants to review before external publication. Add a visible "Draft · For subject review" badge to the output (markdown frontmatter note + HTML footer tag). Do not frame as publication-ready copy.
   - *Consent obtained, public-ready* — cleared for external publication now.
   - *Unsure* — treat conservatively (anonymized, no direct quotes, flag as draft pending consent).

**Subject scope** (infer from context; confirm if ambiguous): one user, cohort, or anonymized composite. If composite, say so explicitly in copy.

**Data package (default)**: a **single raw text file** containing the **full DynamoDB history** for the subject. The file holds **only JSON records** (items/objects), but the file itself is often **not valid JSON** as one value—records may be concatenated, newline-separated, or otherwise unstructured. Parse by recovering individual objects (e.g. balanced `{`…`}` blocks, or line-delimited objects if that matches the dump). Cross-check shapes against [docs/strategy/DB_DESIGN.md](docs/strategy/DB_DESIGN.md). If parsing is lossy or ambiguous, say so under **Method & limitations**. Supplemental exports (analytics, S3 pointers) are optional unless the user provides them.

**Length guide**: ~150–220 words for the shareable summary; **~900–1,400 words** for the story detail portion (adjust for voice, not padding). Omit six-page treatises unless the user explicitly asks.

## Brand and product context (read before drafting)

1. Read [docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md) for voice, tone, messaging pillars, and what to avoid (corporate-AI jargon, condescending clinical tone).
2. For entity shapes and where data lives, skim [docs/strategy/DB_DESIGN.md](docs/strategy/DB_DESIGN.md) so you map raw items (profiles, conversations, workouts, feedback) to narrative sections without inventing fields.

**Voice calibration (summary):** warm, conversational, confidently knowledgeable, playfully motivating, honest. Prefer plain language. Use technical precision only when the reader benefits. Avoid hype adjectives that outrun the evidence.

## Share-worthy, subject-centered tone

The doc is for **prospects**, but it must also read well for the **person whose story this is**. Write so they would **feel proud** and **excited to share** the piece with friends or their network—without sacrificing credibility.

- **Agency and credit**: Center **their** effort and choices—follow-through, honesty in check-ins, willingness to adjust—using what the records actually show. Frame NeonPanda and the coach as a **partner** that supported **their** work, not a story where they were passive or “rescued” unless the data clearly supports that dynamic.
- **Dignity**: No condescension, pity, or mockable detail. Do not exaggerate lows for drama or reduce them to a one-dimensional “before.” They should sound like a real person peers would **respect**.
- **Earned pride**: Call out specific, evidence-backed wins and turning points (including small ones) so the tone feels **authentically celebratory**, not hollow praise.
- **Share test**: Ask whether they’d happily tag someone or drop the link in a group chat because the summary makes them look **capable and genuine**—not because it oversells.
- **Boundaries**: Warmth is not license to **inflate** outcomes. Pride must rest on **real** patterns in the data.

## Evidence discipline

- **Grounding**: Tie outcomes, habits, and coach behaviors to timestamps, counts, quotes, or event sequences from the data package. Prefer paraphrase over long verbatim paste unless the user supplied quote-approved snippets.
- **No fabrication**: If the data does not show a metric, do not imply one.
- **Thin numbers → qualitative honesty**: When counts, loads, or before/after metrics are missing or sparse, **prefer a frank qualitative story** (patterns, cadence, themes, what the user said) over fake precision. Never invent percentages, averages, or PRs. It is better to write "the records show steadier check-ins over time" with no number than to sound quantitative without data.
- **Cross-check platform-generated labels against underlying numbers.** The data often contains AI- or trend-derived labels (e.g. `emotionalTrend.trend.motivation: "declining"`) that may conflict with the underlying averages. Always verify the label against the raw series; if they disagree, flag the mismatch in **Method & limitations** rather than parroting the label.
- **Uncertainty**: When inferring motivation or emotional state, label it as interpretation and point to the supporting signals (e.g., message tone, session frequency change).
- **Privacy**: Strip PII; use pseudonyms unless the user confirms real names are cleared for marketing. Never include emails, exact addresses, or other identifiers from Dynamo keys in public copy.

## Product-enabler beats (show how NeonPanda helped)

The subject carries the story; NeonPanda is the **partner that adapted around them**. For every major narrative beat, the writer should be able to answer: *"what product capability made this moment possible?"* — without turning the paper into a feature list.

Practical technique: for each of the 2–3 representative moments, write one sentence (1) about what the user did, and (2) about the underlying product mechanism (e.g. "the Sabbath constraint got encoded as a high-importance behavioral memory, so every downstream conversation reads it first"). Weave the mechanism into the narrative; don't section it off as "Features used."

Common capabilities worth naming when the data supports them:

- **Coach creator / multi-coach flexibility** — when a user's re-engagement comes from rebuilding rather than retrying.
- **Program designer + block periodization** — when a multi-phase program structure is the scaffold for the arc.
- **User memory system (behavioral, prospective, episodic, constraint, context types)** — when constraints or preferences persist across sessions without reminders.
- **Living profile (`observedPatterns`, `highlightReel`, `coachingRelationship`, `trainingIdentity`, `goalsAndProgress`)** — when the coach adapts to the person over time.
- **Conversational workout logging / natural-language parsing** — when the user captures training by typing raw numbers in chat.
- **In-conversation program state retrieval and editing** — when schedule conflicts are resolved in chat rather than via a settings screen.
- **Post-turn pipeline (summaries, memory dispatch, living-profile update)** — when each conversation sharpens the next.

If the data doesn't evidence the capability, don't claim it. The point is grounded attribution, not marketing coverage.

## Known data quirks to watch for

Check and, where relevant, call out in **Method & limitations**:

- **`workout.duration` is stored in seconds, not minutes.** A 46-minute session shows as `2760`. Convert before quoting and state the unit plainly.
- **`conversationSummary` records may be present but empty.** Don't silently skip — note it and source narrative from the `coachConversation.messages`, the user profile's `livingProfile`, and `userMemory` records instead.
- **`emotionalTrend` labels can disagree with their own averages.** Treat labels as hypotheses; verify against the raw `emotionalSnapshot` series or the `averages` block. Small samples (n < ~10) rarely support a directional verdict.
- **`exercise` records are often shells** (no sets/reps/weight at the top level); the real lift data lives inside `workout.workoutData.discipline_specific`. Don't try to reconstruct strength progressions from `exercise.json` alone.
- **Workout `workout_name` often uses Latin pseudo-names** ("Ignis Perpetuus," "Glacies Apex"). Useful as flavor; always pair with discipline + date for the reader.
- **Multiple coaches per user are common.** Sort `coachConfig` by `createdAt` and trace which coach/program was active during the window you're writing about.

## Richest narrative sources (where to look first)

The `userMemory` records and the user profile's `livingProfile` subtree are usually more revealing than the raw message logs. Prioritize:

- **`livingProfile.highlightReel`** — curated, dated, pre-themed turning points. Often the scaffolding for the paper.
- **`livingProfile.observedPatterns`** — scored, re-observed patterns (training, adherence, emotional, communication). Reliable for characterization.
- **`livingProfile.coachingRelationship`** — rapport, communication dynamic, relationship stage. Good for the "how the coach/user interact" section.
- **`livingProfile.trainingIdentity` and `.goalsAndProgress`** — identity narrative + active goals + recent milestones. Especially useful when raw workout records are thin.
- **`userMemory` by type**: `behavioral` (rules and defaults for the coach), `constraint` (hard non-negotiables), `context` (user background), `episodic` (specific moments), `prospective` (planned next steps). Behavioral + constraint memories frequently anchor the most important narrative beats.

## Analysis workflow

Copy this checklist and track progress:

```
Task progress:
- [ ] Confirm clarifying inputs: naming, red lines, format, consent status (use AskUserQuestion or inline ask)
- [ ] Ingest raw dump: recover individual JSON items; note parsing assumptions and any corrupted lines
- [ ] Inventory data: entity types, item counts, date range; map to DB_DESIGN.md shapes
- [ ] Reconstruct timeline: account creation → coach creation(s) → program creation(s) → key coaching threads → milestones. Sort coaches/programs by createdAt to identify which were active during the window.
- [ ] Extract goals & constraints: stated goals, injuries, equipment, schedule, faith/family context, preferences. Lean heavily on livingProfile subtree and userMemory records (especially behavioral + constraint types).
- [ ] Coach interaction pattern: initiation (user vs coach), length, cadence, topics, feature usage (memory capture, program edits in chat, history retrieval, natural-language logging).
- [ ] Outcomes & feedback: PRs, adherence, subjective check-ins, emotional snapshots, trend labels. Cross-check any trend label against the underlying numbers before quoting it.
- [ ] Map product-enabler beats: for each of the 2–3 representative moments, name the underlying NeonPanda capability that made it possible (see "Product-enabler beats" section).
- [ ] Note known data quirks (duration-in-seconds, empty summaries, pseudo-name workouts, etc.) for Method & limitations.
- [ ] Draft white paper using template below.
- [ ] Run credibility pass: mark each major claim with its evidence type (metric, quote, event) and confirm every strong claim has a visible evidentiary path.
```

**Dynamo-oriented prompts** (adapt to actual item shapes): sort by time; group by conversation or workout entities; look for step-function changes after a coaching intervention; correlate feedback messages with subsequent behavior.

## Output template

**One document, two layers:** (1) **Shareable summary**—scannable, quotable, works for social or email; (2) **The story (~2–3 pages)**—enough depth that a curious enthusiast feels the arc. Write for **fitness enthusiasts** exploring NeonPanda: credible, human, on-brand—not enterprise procurement tone.

The sections below are a **scaffold, not a rigid form.** If the arc benefits from re-ordering or renaming sections (e.g. a "first fit vs. second fit" framing when re-engagement is the pivotal beat, or "how the coaching actually works, by example" to stage product-enabler beats), do that instead of shoehorning the story into the default headings. Serve the arc first; the template second.

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

### [Arc-specific section — e.g. "The first fit vs. the second fit," or "How the coaching actually works, by example"]

Stage the **product-enabler beats** here (see the "Product-enabler beats" section). Weave the capability into the narrative rather than listing features. Each of the 2–3 representative moments should pair user action with the underlying product mechanism.

### [Optional: "The quiet compounding"]

When the living profile, memory system, or observed-patterns loop is part of the story (it usually is), give it a short section. Describe the mechanism plainly and name what it produces in coaching behavior.

### Progress & observations

Strong **quant** only when the data supports it. Otherwise lead **qualitative** with honest framing. Then subjective feedback and interpreted themes, clearly labeled. Cross-check any platform-generated trend labels against their underlying numbers and flag mismatches.

### Representative moments (if not already staged above)

2–3 short vignettes from real sequences (anonymized). No dramatization beyond what the data can carry.

### What this suggests (for readers)

Transferable lessons—still restrained. If causality is not provable, say "associated with" not "caused." Land on the idea that **the program was adapted to them, not the other way around** (when the evidence supports it).

### Method & limitations

Raw dump handling (how records were separated), date range, gaps, known data quirks, consent status and draft state. Keeps trust with readers who care about substance.

### Optional pull quotes

1–2 lines approved or clearly paraphrased for reuse elsewhere.
```

## HTML output conventions (when requested)

When the user chooses "Markdown + HTML," produce a **single, self-contained** `.html` file alongside the markdown (same base filename, `.html` extension). Follow these conventions:

- **Fonts**: Inter (body) + Barlow (headings, kickers, mascot-ish chrome), loaded from Google Fonts. Mirrors the `kanban-delivery-report` skill's typography.
- **Palette**: light theme — white background (#fff), near-black body ink (#0a0a0a), muted gray secondary ink (#3a3a3a / #666), soft border (#e6e6e6). Neon used *sparingly* as accent only: Electric Cyan (#00b8b8 body-safe; #00ffff bright) for the shareable-summary border, beat numbers, and section kickers; Hot Pink (#ff10f0) with a soft pink background (#ffe6fb) for the primary pull quote and the "Draft · For subject review" badge when that consent state applies.
- **Structure**: kicker → h1 → subtitle → shareable-summary card (with a 4px cyan left border and light-cyan background) → hr → "The story" h2 and its subsections. Put "Method & limitations" in a gray panel for visual separation. Footer row with brand wordmark + consent badge.
- **Accessibility**: max content width ~780px, responsive at 520px breakpoint, 16.5px body text, line-height ~1.65.
- **Consent badge**: if the consent state is *Draft for subject review*, show a pink-pill badge in the footer ("Draft · For subject review"); also add a kicker line at the top ("Use-case white paper · Draft for subject review"). For *Internal draft only*, use a neutral gray pill. For *Public-ready*, omit the badge.

Keep the HTML legible and serious — neon accents should punctuate, not dominate.

## Final quality bar

- Would a skeptical **fitness enthusiast** still find this **credible and worth their time**?
- Would the **featured user** feel **good about themselves** reading it—**fair, dignified, and worth sharing** with friends or their network?
- Does every strong claim have a **visible evidentiary path**?
- Does each major narrative beat have its **product enabler** named (without the paper becoming a feature list)?
- Does it sound like **NeonPanda** (per branding doc) rather than generic SaaS marketing?
- Were platform-generated trend labels cross-checked against their underlying numbers?
- Are **privacy and consent statements** accurate for what the user confirmed for this run — including the correct draft/public-ready labeling on the deliverable itself?

If any answer is no, revise before handing off.

## Optional deep outline

For a longer deliverable or multi-subject synthesis, see [reference-long-form.md](reference-long-form.md).
