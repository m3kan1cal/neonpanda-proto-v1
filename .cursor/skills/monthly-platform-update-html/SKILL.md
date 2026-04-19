---
name: monthly-platform-update-html
description: >-
  Produces a single self-contained HTML monthly platform update for NeonPanda that
  reads well in the browser and can be embedded or sent as email. Structure and
  section patterns follow public/updates/platform-update-*.html; typography matches
  the site (Inter, Barlow, IBM Plex Mono). Voice from docs/strategy/BRANDING_STRATEGY.md.
  Cursor project skill; sibling workflow for Claude Code lives under .claude/skills/.
  Use for platform updates, release roundups, or changelog digests for web + email.
---

# Monthly platform update HTML (NeonPanda)

## Scope (project only)

Use this skill **only in this repository**.

- **Structure / IA reference:** Use the latest [public/updates/platform-update-\*.html](public/updates/) (e.g. [public/updates/platform-update-mar-2026.html](public/updates/platform-update-mar-2026.html)) for **section patterns**, spacing concepts, badges, `.callout-hero`, presentation **tables** for 2-up cards, CTAs, footer shape — **not** as the authority on **fonts** or **logo** (older files may predate current brand).
- **Typography & visual system:** Match the **rest of the site and themes**: **Inter** (body), **Barlow** (headings / display titles), **IBM Plex Mono** (mono accents, labels, or small UI-style text where appropriate). Load via **Google Fonts** in `<head>`.
- **Brand voice (source of truth):** [docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md). If a reference HTML file uses peak hype or off-brand phrasing, **the brand doc wins**.
- A parallel **Claude Code** project skill lives at `.claude/skills/monthly-platform-update-html/`; **keep both copies aligned** when editing this workflow.

## Cursor usage notes

- **Install path:** `.cursor/skills/monthly-platform-update-html/` (project-level). When changing this workflow, update the parallel copy at `.claude/skills/monthly-platform-update-html/` so both agents stay aligned.
- **Saving output:** Write the HTML artifact to `public/updates/platform-update-{mmm}-{yyyy}.html` unless the user specifies another path. If the file exists, confirm before overwriting. Filename month = **send/publication anchor**; body can summarize a **rolling** window (see Required inputs).
- **Evidence:** Prefer **GitHub** (merges, releases, compare links) as source of truth; ask for maintainer **What’s next** bullets before locking the teaser section.
- **Reference file:** Open the latest `public/updates/platform-update-*.html` for **layout patterns** — pair with **site fonts** (Inter / Barlow / IBM Plex Mono), not DM Sans from older files.

## When to apply

Use when generating a **user-facing monthly (or period) platform update** as **one `.html` file** that:

- Highlights **what shipped** and **why it matters** to athletes, coaches, and curious newcomers—not an internal engineering post.
- Can be **hosted under `public/updates/`** and **reused in email** (same file or pasted HTML body).
- Should feel **on-brand**: playful power, electric energy, intelligent approachability—**not** stiff corporate SaaS or hype that outruns the facts.

## Required inputs (ask if missing)

Ask **before** drafting. Do not invent shipped work or roadmap teasers.

1. **Coverage window.** Default: roughly the **last ~four weeks** of shipped work (rolling). **Mid-month sends are normal**—the window does **not** need to align with calendar month boundaries. If the user specifies a different range (e.g. mid-March through latest `main`), use that.
2. **Evidence — source of truth: GitHub.** Build the “what shipped” sections from **GitHub**: merged PRs, release tags/notes, compare views, deployment or release summaries the user links to, or **this repo’s** merge history as surfaced in Git. Translate engineering work into **user benefits**; do **not** paste raw commit lists or SHAs in the email. Supplement only when needed: user paste/summary, or `https://neonpanda.ai/changelog` for **wording alignment**—still reconcile against GitHub so facts match what actually merged.
3. **What’s next (roadmap teasers).** **Default: include** a “What’s coming next” section. **Before writing it, ask the maintainer** what is actually planned/teasable; **do not invent** roadmap bullets. If they defer, use a short honest stub (e.g. “More soon—we’ll share as it firms up”) or omit bullets only if they explicitly say to drop the section for this edition.
4. **Audience emphasis** (optional). Default: **mixed** (enthusiasts + coaches). Options: athletes-first, coaches-first, enterprise/partners (still warm; avoid procurement-speak).
5. **White papers / content drops** (optional). Use **absolute** `https://neonpanda.ai/...` for any linked story. **Maintainer may restrict links:** e.g. only **one** white paper gets an `href` this send; **others may be named in prose** (“more stories coming”) **without** links until approved. Do not invent URLs.
6. **Email footer behavior.** Default: keep **`{{UNSUBSCRIBE_LINK}}`** as a literal placeholder in the HTML for the sending pipeline to replace. If the user wants a static corporate footer only, omit or adjust per their instructions.

## Optional: Changelog (`changelogData.js`)

When the user wants the in-app changelog to match the release:

- Prepend a **new** object to `changelogEntries` in [src/utils/changelogData.js](src/utils/changelogData.js) (newest first), same shape as existing entries.
- Use the project’s version pattern (e.g. `Release v1.0.YYYYMMDD-beta`) and **user-facing** bullets; **no** SHAs. Reconcile bullets with **merged** GitHub work.

## Optional: Git workflow (ship via `develop`)

When the user asks for a branch/PR flow:

1. `git fetch origin`; checkout **`develop`** and sync with **`origin/develop`**.
2. Create a **feature branch** (e.g. `feat/platform-update-{mmm}-{yyyy}`); make changes **only** there.
3. After review: commit, `git push -u origin <branch>`, open a **pull request with base `develop`** (not necessarily `main`).

Evidence for **copy** may still be summarized from **`main`** / production merges; integration target is whatever branch the user specifies.

## Output location and naming

- **Directory:** [public/updates/](public/updates/)
- **Filename:** `platform-update-{mmm}-{yyyy}.html`
  - `{mmm}` = English **three-letter lowercase** month: `jan`, `feb`, `mar`, `apr`, `may`, `jun`, `jul`, `aug`, `sep`, `oct`, `nov`, `dec`
  - `{yyyy}` = four-digit year (e.g. `2026`)
- **Anchor month for the filename:** Use the **send / publication month** (or the month the user says should appear on the document), **not** a strict rule that coverage must equal that calendar month. Example: a mid-April send covering ~the prior four weeks can still be `platform-update-apr-2026.html`.
- **Examples:** `platform-update-mar-2026.html`, `platform-update-apr-2026.html`
- If a file for that month **already exists**, **do not overwrite** without explicit user confirmation—offer to append a suffix (e.g. `-rev2`) or merge sections.

## Structural template (patterns from reference HTML + site typography)

Use a recent [public/updates/platform-update-\*.html](public/updates/) for **layout ideas** (`.email-wrapper`, `.container` ~600px card, `.logo-header`, `.callout-hero`, badges, `.feature-box`, `.highlight`, `.visual-box`, section dividers, CTA row, signature, footer). **Do not** copy **DM Sans** or outdated logo choices from older references unless the user asks.

- **`<head>`:** `viewport` meta, `<title>`, **Google Fonts** link for **Inter**, **Barlow**, and **IBM Plex Mono** (weights aligned with the app, e.g. Inter 400–700, Barlow 500–800, IBM Plex Mono 400–600), **embedded `<style>`** with `font-family` stacks: body **Inter**, headings **Barlow**, monospace accents **IBM Plex Mono**.
- **Header logo (default):** `https://neonpanda.ai/images/logo-dark-sm-head.webp` (panda head — matches white papers / current brand). **Alternate:** `https://neonpanda.ai/images/logo-dark-sm.webp` if the user wants the wordmark strip.
- **Outer layout:** `.email-wrapper` → `.container` for a ~600px card feel, light gray page background, white card, rounded corners (web); dark/gradient `.logo-header` bar consistent with brand.
- **Open with impact:** optional `.callout-hero` for the **strongest user-facing story** of the period—**specific counts or claims only if sourced**.
- **Title block:** `<h1>Platform Update — {Month} {YYYY}</h1>` + `.subtitle` one-liner.
- **Body:** short intro paragraph(s) that thank/acknowledge users and tie work to **their** training reality.
- **Sections:** optional **badge** (`.section-badge`, `.section-badge-pink`, `.section-badge-green`); plain `<h2>` / `<h3>` for email robustness; at most one **icon-heavy** hero if it helps scannability; mix paragraphs, bullets, colored boxes, and **`<table role="presentation">`** for 2-up feature cards (**prefer tables** when email is primary).
- **What’s coming next:** include once maintainer supplies teasers; otherwise stub; never fabricate roadmap items.
- **CTAs:** **Open NeonPanda** (`https://neonpanda.ai`) + **View Full Changelog** (`https://neonpanda.ai/changelog`).
- **Signature:** `.signature`, first person plural, warm, aligned with brand.
- **Footer:** `.footer` with brand line, links, **`{{UNSUBSCRIBE_LINK}}`** unless user specifies otherwise.

## Voice and tone (read before drafting)

Read [docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md) and apply:

- **Conversational, warm, confidently knowledgeable**; **playfully motivating** without bro-culture or toxic positivity.
- Prefer **plain language** and **user benefit** (“what you can do now”) over internal codenames.
- **Technically precise when it helps** (e.g. naming a discipline or methodology) but **never condescending**.
- **Playful power:** serious product depth can coexist with light, human phrasing—avoid “initiate your workout protocol” energy.
- **Electric energy:** enthusiasm is on-brand; **generic hype** and **unverified superlatives** are not.
- **Superlatives:** Avoid **absolute peaks** (“biggest ever,” “largest in history,” “nothing comes close”). **OK:** measured language like **“big update,” “substantial update,” “a lot in this one,”** or specific sourced counts—grounded excitement, not chest-beating.
- Tagline may appear in footer: _Where electric intelligence meets approachable excellence._

## Links

- Use **absolute `https://` URLs** for every link in the body, footer, and CTAs. No relative paths.
- **White papers:** only link URLs the maintainer approved for this send; tease others in text without `href` when requested.

## Web + email compatibility

- **Single file:** all CSS in `<style>`; no build step required.
- **Images:** absolute `https://` URLs.
- **Layout:** **presentation tables** for multi-column cards when mirroring the reference; prefer tables for 2-up summaries when email is primary.
- **Avoid** relying on `:hover` for critical meaning (fine for web enhancement).
- If the user names a **specific ESP** (Customer.io, SES, etc.), follow their **HTML fragment** rules in addition to this template.

## Content selection principles

- **Lead with outcomes and curiosity:** what users can try, measure, feel, or share.
- **Group related bullets** under narrative headers; don’t paste raw commit lists.
- **Credit evidence:** shipped counts, model names, or bug-fix tallies **only** when the user’s sources support them.
- **Platform + story:** include a short section when applicable on **content and community** (e.g. new **use-case white papers**, blog posts, events)—this reinforces that NeonPanda is **building in public** and **documenting real coaching journeys**.
- **Under the hood** optional: infrastructure/model upgrades **only if** user wants them surfaced—frame as “smoother, smarter, more reliable,” not a benchmark flex.

## Workflow checklist

```
Task progress:
- [ ] Confirm coverage window, filename anchor month, GitHub evidence range, audience, white-paper link policy (which URLs get hrefs), footer/unsubscribe behavior
- [ ] Ask maintainer for **What’s next** bullets (or approved stub); do not invent roadmap items
- [ ] Read BRANDING_STRATEGY.md; open reference HTML for **structure** only; set **Inter / Barlow / IBM Plex Mono** + header logo choice
- [ ] Outline 3–7 user-meaningful sections from **GitHub-backed** evidence (merge thin items; drop internal-only noise)
- [ ] Draft copy in brand voice; avoid “biggest ever”-style peaks; mark any TBD facts clearly if sources incomplete
- [ ] Build self-contained HTML; prefer table 2-up for email-sensitive grids; **all links absolute https://**
- [ ] If requested: prepend matching entry to changelogData.js
- [ ] If requested: feature branch off develop, PR to develop
- [ ] Set <title>, hero, CTAs, signature, footer; filename platform-update-{mmm}-{yyyy}.html under public/updates/
- [ ] Quick pass: no fabricated features or roadmap; placeholders only where user asked; links resolve
```

## Final quality bar

- Would a **busy athlete or coach** skim this and **find one thing worth trying** within 60 seconds?
- Does it sound like **NeonPanda** (brand doc), not generic SaaS?
- Is every **specific claim** tied to **GitHub-backed** evidence (and changelog only as secondary copy)?
- Are **roadmap teasers** either maintainer-supplied or honestly stubbed—**never invented**?
- Does copy avoid **“biggest ever”**-style peaks while still feeling energetic?
- Does typography use **Inter + Barlow + IBM Plex Mono** (site-consistent), not stale reference fonts?
- Would the team be comfortable **emailing** this without embarrassing factual errors?

If any answer is no, revise before handing off.
