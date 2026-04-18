---
name: monthly-platform-update-html
description: >-
  Produces a single self-contained HTML monthly platform update for NeonPanda that
  reads well in the browser and can be embedded or sent as email, matching the
  structure and visual system of public/updates/platform-update-*.html and the
  voice in docs/strategy/BRANDING_STRATEGY.md. Project-only skill. Use when the
  user asks for a platform update, monthly product newsletter, changelog digest for
  users, release roundup HTML, or “what we shipped this month” for web + email.
---

# Monthly platform update HTML (NeonPanda)

## Scope (project only)

Use this skill **only in this repository**. Canonical reference HTML: [public/updates/platform-update-mar-2026.html](public/updates/platform-update-mar-2026.html). Brand voice: [docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md). A parallel **Cursor** project skill lives at `.cursor/skills/monthly-platform-update-html/`; **keep both copies aligned** when editing this workflow.

## When to apply

Use when generating a **user-facing monthly (or period) platform update** as **one `.html` file** that:

- Highlights **what shipped** and **why it matters** to athletes, coaches, and curious newcomers—not an internal engineering post.
- Can be **hosted under `public/updates/`** and **reused in email** (same file or pasted HTML body).
- Should feel **on-brand**: playful power, electric energy, intelligent approachability—**not** stiff corporate SaaS or hype that outruns the facts.

## Required inputs (ask if missing)

Ask **before** drafting. Do not invent shipped work or roadmap teasers.

1. **Coverage window.** Default: roughly the **last ~four weeks** of shipped work (rolling). **Mid-month sends are normal**—the window does **not** need to align with calendar month boundaries. If the user specifies a different range, use that.
2. **Evidence — source of truth: GitHub.** Build the “what shipped” sections from **GitHub**: merged PRs, release tags/notes, compare views, deployment or release summaries the user links to, or **this repo’s** merge history as surfaced in Git. Translate engineering work into **user benefits**; do **not** paste raw commit lists or SHAs in the email. Supplement only when needed: user paste/summary, or `https://neonpanda.ai/changelog` for **wording alignment**—still reconcile against GitHub so facts match what actually merged.
3. **What’s next (roadmap teasers).** **Default: include** a “What’s coming next” section. **Before writing it, ask the maintainer** what is actually planned/teasable; **do not invent** roadmap bullets. If they defer, use a short honest stub (e.g. “More soon—we’ll share as it firms up”) or omit bullets only if they explicitly say to drop the section for this edition.
4. **Audience emphasis** (optional). Default: **mixed** (enthusiasts + coaches). Options: athletes-first, coaches-first, enterprise/partners (still warm; avoid procurement-speak).
5. **White papers / content drops** (optional). URLs to new **use-case white papers** or other published stories (use **absolute** `https://neonpanda.ai/...` links in the HTML—see Links).
6. **Email footer behavior.** Default: keep **`{{UNSUBSCRIBE_LINK}}`** as a literal placeholder in the HTML for the sending pipeline to replace. If the user wants a static corporate footer only, omit or adjust per their instructions.

## Output location and naming

- **Directory:** [public/updates/](public/updates/)
- **Filename:** `platform-update-{mmm}-{yyyy}.html`
  - `{mmm}` = English **three-letter lowercase** month: `jan`, `feb`, `mar`, `apr`, `may`, `jun`, `jul`, `aug`, `sep`, `oct`, `nov`, `dec`
  - `{yyyy}` = four-digit year (e.g. `2026`)
- **Anchor month for the filename:** Use the **send / publication month** (or the month the user says should appear on the document), **not** a strict rule that coverage must equal that calendar month. Example: a mid-April send covering ~the prior four weeks can still be `platform-update-apr-2026.html`.
- **Examples:** `platform-update-mar-2026.html`, `platform-update-apr-2026.html`
- If a file for that month **already exists**, **do not overwrite** without explicit user confirmation—offer to append a suffix (e.g. `-rev2`) or merge sections.

## Structural template (match the reference page)

Treat [public/updates/platform-update-mar-2026.html](public/updates/platform-update-mar-2026.html) as the **layout and CSS source of truth**:

- **`<head>`:** viewport meta, `<title>`, DM Sans from Google Fonts, **embedded `<style>`** block (copy/adapt classes from the reference—do not introduce a new design system unless asked).
- **Outer layout:** `.email-wrapper` → `.container` for a ~600px card feel, light gray page background, white card, rounded corners (web); logo strip `.logo-header` with `https://neonpanda.ai/images/logo-dark-sm.webp`.
- **Open with impact:** optional `.callout-hero` for the **strongest user-facing story** of the period (or “what matters most” framing)—**specific counts or claims only if sourced**.
- **Title block:** `<h1>Platform Update — {Month} {YYYY}</h1>` (adjust headline if user wants a campaign title, but keep the month clear) + `.subtitle` one-liner.
- **Body:** short intro paragraph(s) that thank/acknowledge users and tie work to **their** training reality.
- **Sections:** each major theme gets:
  - Optional **badge**: `.section-badge`, `.section-badge-pink`, or `.section-badge-green` with labels like `NEW`, `REBUILT`, `UPGRADED`, `EXPANDED` (use honestly).
  - **Headings and icons (UX):** Default to **plain** `<h2>` / `<h3>` for clarity and email robustness. Optionally add **at most one** `.callout-hero` or top-section title with `.heading-with-icon` **and** a **small inline SVG** (same pattern as the reference) if it noticeably aids scannability—**do not** sprinkle icons across every section (noise in email, fragile in clients).
  - Mix **paragraphs**, **bullets**, `.feature-box`, `.highlight`, `.visual-box`, `.callout`, and **two-column `<table role="presentation">`** for “feature cards” (tables degrade better in some email clients than CSS grid).
  - `<hr class="section-divider">` between major sections.
- **What’s coming next:** **Include by default** once the maintainer has supplied teasers (see Required inputs). Frame as **planned / directional**, not promised. If they have not answered yet, **ask** before finalizing; never fabricate specific upcoming features.
- **CTAs:** centered row with `.cta` (cyan) and `.cta cta-secondary` (magenta)—typically **Open NeonPanda** + **View Full Changelog** linking to `https://neonpanda.ai` and `https://neonpanda.ai/changelog`.
- **Signature:** `.signature` closing in first person plural, warm and proud, **aligned with brand** (community, partnership, not vanity).
- **Footer:** `.footer` with brand line, links, and **`{{UNSUBSCRIBE_LINK}}`** for email sends unless user specifies otherwise.

## Voice and tone (read before drafting)

Read [docs/strategy/BRANDING_STRATEGY.md](docs/strategy/BRANDING_STRATEGY.md) and apply:

- **Conversational, warm, confidently knowledgeable**; **playfully motivating** without bro-culture or toxic positivity.
- Prefer **plain language** and **user benefit** (“what you can do now”) over internal codenames.
- **Technically precise when it helps** (e.g. naming a discipline or methodology) but **never condescending**.
- **Playful power:** serious product depth can coexist with light, human phrasing—avoid “initiate your workout protocol” energy.
- **Electric energy:** enthusiasm is on-brand; **generic hype** and **unverified superlatives** are not.
- **Superlatives:** Avoid **absolute peaks** (“biggest ever,” “largest in history,” “nothing comes close”). **OK:** measured language like **“big update,” “substantial update,” “a lot in this one,”** or specific sourced counts—grounded excitement, not chest-beating.
- Tagline may appear in footer: _Where electric intelligence meets approachable excellence._ (match reference usage.)

## Links

- Use **absolute `https://` URLs for every link** in the body, footer, and CTAs (e.g. `https://neonpanda.ai/...`, `https://neonpanda.ai/changelog`, white papers at `https://neonpanda.ai/...`). Do not rely on relative paths in the HTML so the same file works in email and on the static site without rewriting.

## Web + email compatibility

- **Single file:** all CSS in `<style>`; no build step required.
- **Images:** absolute `https://` URLs (same as reference logo).
- **Layout:** use **presentation tables** for multi-column “cards” in the body when mirroring the reference; they **behave better in email** than pure CSS grid. The reference uses both—**prefer tables for 2-up feature summaries** when the primary delivery is email.
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
- [ ] Confirm ~4-week coverage window, filename anchor month, GitHub evidence links/range, audience, white-paper URLs, footer/unsubscribe behavior
- [ ] Ask maintainer for **What’s next** bullets (or approved stub); do not invent roadmap items
- [ ] Read BRANDING_STRATEGY.md (or skim if recently loaded) and re-open reference HTML for structure
- [ ] Outline 3–7 user-meaningful sections from **GitHub-backed** evidence (merge thin items; drop internal-only noise)
- [ ] Draft copy in brand voice; avoid “biggest ever”-style peaks; mark any TBD facts clearly if sources incomplete
- [ ] Build self-contained HTML; preserve CSS patterns from reference; prefer table 2-up for email-sensitive grids; **all links absolute https://**
- [ ] Set <title>, hero, CTAs, signature, footer; filename platform-update-{mmm}-{yyyy}.html under public/updates/
- [ ] Quick pass: no fabricated features or roadmap; placeholders only where user asked; links resolve
```

## Final quality bar

- Would a **busy athlete or coach** skim this and **find one thing worth trying** within 60 seconds?
- Does it sound like **NeonPanda** (brand doc), not generic SaaS?
- Is every **specific claim** tied to **GitHub-backed** evidence (and changelog only as secondary copy)?
- Are **roadmap teasers** either maintainer-supplied or honestly stubbed—**never invented**?
- Does copy avoid **“biggest ever”**-style peaks while still feeling energetic?
- Does the HTML **match the house style** of the reference update page, with **absolute** links?
- Would the team be comfortable **emailing** this without embarrassing factual errors?

If any answer is no, revise before handing off.
