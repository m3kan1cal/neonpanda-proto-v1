# Social content pipeline: placeholders → copy → images

This doc answers: **Does the pipeline make sense? Is it possible? Can it be repeatable next week?**

**Short answer:** Yes to all three. Below is what each piece would take and how to keep it repeatable.

---

## End-to-end executable script

**Goal:** One script you can run (with HTML templates and placeholders in place) that:

1. Reads **SOCIAL_BRAND.md** (and **docs/strategy/BRANDING_STRATEGY.md**) from the repo.
2. Calls **Bedrock** (Claude Sonnet 4.6, same model ID as the Amplify backend: `us.anthropic.claude-sonnet-4-6`) with that context and the week’s theme to generate copy.
3. Parses the model’s response as **JSON** (schema defined in SOCIAL_BRAND.md “Output format”).
4. **Injects** that copy into the HTML templates (replaces `{{HEADLINE}}` / `{{SUBLINE}}` from the JSON), writing filled HTML to `templates/filled/post/` and `templates/filled/story/`.
5. **Renders** the filled HTML to PNGs via Puppeteer and saves them to **docs/social-content/images/post** (1080×1080) and **docs/social-content/images/story** (1080×1920).

**Requirements:**

- **AWS credentials:** The script uses `@aws-sdk/client-bedrock-runtime` and the same Converse API as the backend. Run it with the same credentials you use for Amplify (e.g. `AWS_PROFILE` or default profile) so it has permission to call Bedrock.
- **Templates:** HTML files in `docs/social-content/templates/post/` and `templates/story/` must include the placeholder text blocks and neon CSS (see section 2).

**Usage (after implementation):**

```bash
node scripts/social-content-pipeline.mjs --week=1
```

Optional flags: `--skip-bedrock` (use existing `docs/social-content/copy/weekN.json`), `--skip-render` (only generate copy and inject into HTML, do not run Puppeteer).

**Repeatability:** Next week you update the week theme in SOCIAL_BRAND.md (or pass `--week=2`), run the same command; the script regenerates copy, reinjects, and re-renders.

---

## 1. Template path alignment

Current state:

- **Templates** live at `docs/social-content/templates/post/` and `templates/story/`.
- **Images** already exist at `docs/social-content/images/post/` and `images/story/`.
- **Scripts** still point at `docs/social-content/instagram/templates` and `instagram/output`.

So step zero is to **point the scripts at the canonical paths**: `templates/` for input HTML and `images/` for output PNGs (see section 4).

---

## 2. Add placeholder text blocks to HTML templates

**Goal:** Each template has a visible text block (headline and/or subline) that can be replaced by copy. The block uses a neon color that fits the template background.

**Approach:**

- Add a wrapper, e.g. `<div class="text-block text-neon-cyan">` (or `text-neon-pink` / `text-neon-purple`) containing something like `<span data-slot="headline">{{HEADLINE}}</span>` and optionally `<span data-slot="subline">{{SUBLINE}}</span>`.
- Define three CSS classes, e.g.:
  - `.text-neon-pink` — color `#FF2D7D` (or your hot pink), `text-shadow` glow.
  - `.text-neon-cyan` — `#00E5FF`, glow.
  - `.text-neon-purple` — e.g. `#BF00FF` from BRANDING_STRATEGY, glow.
- Choose the class per template from the dominant background (e.g. 01-neon-grid has pink in the gradient → cyan or purple for contrast; 02-electric-pulse is purple → cyan or pink).
- Position the block in a consistent area (e.g. center or top-third) so it doesn’t clash with logo. Use a high `z-index` so it sits above decorative layers.

**Placeholder convention:** Use a fixed token that the inject script can find and replace, e.g. `{{HEADLINE}}` and `{{SUBLINE}}`. That keeps replacement simple and repeatable.

---

## 3. “Dynamic” content generation and SOCIAL_BRAND.md

**Two ways to make “dynamic” repeatable:**

**Option A – File-based (recommended for repeatability)**
No API dependency; you run the SOCIAL_BRAND prompt when you want new copy.

- **SOCIAL_BRAND.md:** Add a short “Output format” section that says: _“Output the week’s copy in the following JSON structure so it can be injected into HTML templates.”_ Then paste a minimal schema, e.g.:
  - `post.headline`, `post.subline`
  - `story.headline`, `story.subline`
- You (or a Cursor/AI run) generate copy from SOCIAL_BRAND + BRANDING_STRATEGY and paste the result into a file, e.g. `docs/social-content/copy/week1.json`.
- A small **inject script** (Node) reads that JSON and replaces `{{HEADLINE}}` / `{{SUBLINE}}` in each HTML template, then writes “filled” HTML to a target directory (e.g. `templates/filled/post/` and `templates/filled/story/` or a single `filled/` tree). The render script then uses that filled HTML to produce PNGs.

**Option B – API-based**
A script reads SOCIAL_BRAND.md + BRANDING_STRATEGY.md (and optionally a “week N” config), calls an LLM API, parses the response into the same JSON shape, and writes `copy/weekN.json`. The rest of the pipeline (inject → render → save images) is identical. Repeatable as long as the API and prompt stay stable; adds dependency and key management.

**SOCIAL_BRAND.md change:** Add an “Output format” block that defines the exact keys (e.g. `post.headline`, `post.subline`, `story.headline`, `story.subline`) and state that copy must be valid JSON so the inject script can replace placeholders. No need to change the rest of the prompt instructions.

---

## 4. Save filled HTML, render to PNG, write to `docs/social-content/images`

**Flow:**

1. **Generate copy** (manual + paste into `copy/weekN.json`, or API script).
2. **Inject:** Read `templates/post/*.html` and `templates/story/*.html`, replace `{{HEADLINE}}` / `{{SUBLINE}}` from the JSON, write to a “filled” directory (e.g. `templates/filled/post/` and `templates/filled/story/`) so the original templates stay untouched.
3. **Render:** Reuse the logic in `scripts/html-templates-to-png.mjs` but:
   - **Input:** Filled HTML from `templates/filled/post/` and `templates/filled/story/` (or, if you prefer a single source, the script can inject in memory and then render without writing filled HTML to disk).
   - **Output:** PNGs to `docs/social-content/images/post/` (1080×1080) and `docs/social-content/images/story/` (1080×1920).

**Script updates:**

- **Paths:** Change template input from `docs/social-content/instagram/templates` to `docs/social-content/templates` (or to `templates/filled` if you write filled HTML to disk). Change PNG output from `docs/social-content/instagram/output/post` and `.../story` to `docs/social-content/images/post` and `docs/social-content/images/story`.
- **Optional:** Add a `--week=N` (or `--copy=copy/week2.json`) so the script runs inject then render for that week’s copy. If you only have one `copy/weekN.json` at a time, the script can just take `--copy=path/to/copy.json` and use that for injection.

So: **yes**, save the filled HTML (or generate it in memory), render with the same Puppeteer approach, and write PNGs to `docs/social-content/images` by format (post vs story). That’s one small path/config change in the existing script plus an optional inject step.

---

## 5. Repeatability for next week

- **Week 1:** You have SOCIAL_BRAND.md, BRANDING_STRATEGY.md, and (once added) a `copy/week1.json` and inject + render scripts.
- **Next week:** Update SOCIAL_BRAND.md (or a small `week-themes.md`) with Week 2 messaging; generate copy (paste into `copy/week2.json` or run API script); run inject + render (e.g. `node scripts/inject-and-render.mjs --week=2` or `--copy=docs/social-content/copy/week2.json`). PNGs land again in `images/post/` and `images/story/` (optionally under `images/week2/post/` and `images/week2/story/` if you want to keep weeks separate).

If you standardize on one template set and one JSON shape per week, the same pipeline runs every time.

---

## 6. Summary checklist

| Step | What                                                                                                                                           | Status / Repeatable?                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | Add to each HTML template: a text block with `{{HEADLINE}}` / `{{SUBLINE}}` and a neon class (pink/cyan/purple) chosen by background           | One-time per template                                                      |
| 2    | Add “Output format” (JSON) to SOCIAL_BRAND.md and optionally a `copy/weekN.json` layout                                                        | One-time prompt change; new JSON per week                                  |
| 3    | Single script: Bedrock → inject → render                                                                                                       | **Done:** `scripts/social-content-pipeline.mjs`. Run each week with’s JSON |
| 4    | Script: read templates, write filled to `templates/filled/`, PNGs to `images/post` and `images/story`                                          | Done in pipeline script                                                    |
| 5    | Run: `node scripts/social-content-pipeline.mjs --week=N` or `npm run social:pipeline -- --week=N`; optional `--skip-bedrock` / `--skip-render` | Same command each week                                                     |

All of this is possible with the stack you have (Node, Puppeteer, existing templates). The only open choice is whether “dynamic” means “I paste JSON each week” (file-based) or “script calls an LLM and writes JSON” (API-based); both are repeatable.
