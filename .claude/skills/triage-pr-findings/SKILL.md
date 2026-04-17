---
name: triage-pr-findings
description: >-
  Triages automated PR review findings from BugBot, Copilot, CodeQL, and similar
  tools by cross-referencing each finding against the full codebase to determine
  whether it is a genuine issue or a false positive. Use when the user asks to
  analyze PR findings, triage PR comments, review BugBot issues, review Copilot
  suggestions, or check whether automated PR feedback is valid.
---

# Triage PR Findings

## Overview

Automated PR review tools (GitHub Copilot, BugBot, CodeQL, etc.) flag potential
issues but often lack full codebase context — imports, utility wrappers, shared
patterns, architectural conventions. This skill systematically evaluates each
finding against the actual code to produce a clear keep/dismiss verdict.

## Step 1 — Collect the Findings

Ask the user to paste the findings if they haven't already. Findings typically
arrive as one of:

- A list of comments copied from the PR conversation
- A summary block from BugBot or Copilot
- A link to the PR (use `gh` CLI to fetch comments if a URL is provided)

If given a PR URL, fetch the review comments:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate
gh api repos/{owner}/{repo}/pulls/{number}/reviews --paginate
```

Filter to comments from known bot authors: `github-actions[bot]`, `copilot`,
`bugbot`, `codeql`, or any author the user identifies.

## Step 2 — Parse Each Finding

Extract a structured list. For each finding capture:

| Field        | Description                                          |
| ------------ | ---------------------------------------------------- |
| **id**       | Sequential number (F1, F2, ...)                      |
| **source**   | Tool that raised it (BugBot, Copilot, CodeQL, etc.)  |
| **file**     | File path referenced                                 |
| **line(s)**  | Line number(s) or range                              |
| **category** | Bug, security, performance, style, complexity, other |
| **claim**    | One-sentence summary of what the tool says is wrong  |

## Step 3 — Investigate Each Finding

For every finding, gather the evidence needed to make a judgment:

1. **Read the cited code** — Read the file and the specific lines referenced,
   plus surrounding context (at least 30 lines above and below).
2. **Trace dependencies** — Follow imports, utility functions, and type
   definitions that the finding touches. Many false positives stem from the tool
   not seeing a wrapper (e.g., `withThroughputScaling()` already handles retries,
   `parseJsonWithFallbacks()` already handles malformed JSON).
3. **Check project conventions** — Consult `AGENTS.md` and relevant source files
   to see if the flagged pattern is an established convention. Common examples in
   this codebase:
   - DynamoDB operations use `withThroughputScaling()` (retry/backoff built in)
   - AI JSON parsing uses `parseJsonWithFallbacks()` (multi-strategy fallback)
   - S3 access uses centralized `libs/s3-utils.ts` utilities
   - Error responses use `createErrorResponse()` helpers
   - Prompt injection safety via `sanitizeUserContent()` / `wrapUserContent()`
4. **Check for guards elsewhere** — The issue may be handled at a different layer
   (middleware, caller, wrapper function, try/catch higher in the call stack).
5. **Assess actual risk** — Even if technically valid, gauge severity in context.
   A theoretical null dereference in a path that always receives validated input
   is low-risk.

## Step 4 — Render the Verdict

Produce a structured report. Use this template:

---

### PR Findings Triage

**PR**: [title or number if known]
**Findings analyzed**: N
**Verdict summary**: X genuine | Y false positive | Z needs discussion

### Finding-by-Finding Analysis

For each finding, produce:

#### F{n}: {one-line claim} — {VERDICT}

- **Source**: {tool name}
- **File**: `{path}` (lines {range})
- **Category**: {bug | security | performance | style | complexity | other}
- **Verdict**: **Genuine Issue** | **False Positive** | **Needs Discussion**
- **Confidence**: High | Medium | Low

**Tool's claim**: {what the tool flagged}

**Analysis**: {2-4 sentences explaining why the finding is or isn't valid,
referencing specific code, utilities, or patterns. Name files and functions.}

**Action**: {If genuine: specific fix recommendation. If false positive: why it
can be dismissed. If needs discussion: what additional context would resolve it.}

---

### Summary Table

| ID  | File               | Claim (short)      | Verdict        | Confidence |
| --- | ------------------ | ------------------ | -------------- | ---------- |
| F1  | `path/to/file.ts`  | Missing null check | False Positive | High       |
| F2  | `path/to/other.ts` | Unbounded loop     | Genuine Issue  | Medium     |

### Recommended Actions

**Genuine issues to fix** (ordered by severity):

1. F2: {brief description and fix approach}

**False positives to dismiss**:

- F1: {one-line reason}

**Items needing discussion**:

- F3: {what to clarify}

---

## Analysis Principles

- **Name the code path precisely** — reference specific files, functions, and
  line numbers rather than speaking in generalities.
- **Follow the full call chain** — many tools only see the immediate function
  and miss that safety is handled by a caller or wrapper.
- **Respect project conventions** — if a pattern is used consistently across the
  codebase and is documented in AGENTS.md, it is intentional. Do not flag it as
  a problem just because the tool did.
- **Distinguish theoretical from practical risk** — a "possible null" in a path
  that is always called with validated data is categorically different from one
  in a public API handler.
- **Be direct about uncertainty** — if you cannot determine the verdict without
  runtime data or more context, say "Needs Discussion" and explain what is
  missing. Do not guess.
- **Err toward false positive when evidence is strong** — these tools have a
  high false positive rate by design. If you can demonstrate the concern is
  handled, dismiss it confidently.
