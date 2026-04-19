---
name: analyze-incident-logs
description: >-
  Analyzes CloudWatch Lambda incident logs fetched by fetch-incident-logs.js and produces
  a structured remediation plan from the perspective of a veteran developer, architect, and
  engineer. Use when the user asks to analyze incident logs, look at a backend error, review
  CloudWatch logs, or investigate a Lambda failure. Incident logs live in the incidents/
  directory of this project.
---

# Analyze Incident Logs

## Overview

This skill analyzes CloudWatch Lambda logs that have been fetched by `scripts/fetch-incident-logs.js`
and stored in `incidents/{timestamp}_{function-name}/`. It produces a structured, prioritized
remediation plan.

## Step 1 — Locate the Incident

If the user specifies an incident directory, use it. Otherwise find the most recently modified
directory under `incidents/` by listing it:

```bash
ls -lt incidents/ | head -5
```

Read the `incident-context.json` in that directory to understand the log group, stream count,
time range, and any note the engineer added when fetching.

## Step 2 — Load the Logs

Read `logs.csv` from the incident directory. The CSV has three columns:

```
timestamp, logStreamName, message
```

Timestamps are Unix milliseconds. Parse the `message` column for analysis. Log messages
from Lambda may include:

- Structured JSON from `console.log(JSON.stringify(...))` calls
- AWS platform events: `START`, `END`, `REPORT`
- Error stack traces (multi-line, escaped as `\n` in CSV)
- `[ERROR]` prefixed application errors
- `[WARN]` prefixed warnings

## Step 3 — Classify and Extract

Build a structured picture before writing conclusions. Identify:

**Errors**

- Any line containing `ERROR`, `Error:`, `Unhandled`, `UnhandledPromiseRejection`, `throw`, `Exception`
- Stack traces (lines starting with `at ` following an error)
- AWS service errors: `ResourceNotFoundException`, `ProvisionedThroughputExceededException`, `ThrottlingException`, `ValidationException`, `AccessDeniedException`

**Warnings**

- `WARN`, `Warning`, deprecated usage notices
- Soft failures that were caught and swallowed

**Performance Signals**

- `REPORT` lines: extract `Duration`, `Billed Duration`, `Max Memory Used`, `Init Duration`
- Cold starts: presence of `Init Duration` in REPORT lines
- Timeouts: `Task timed out after` message
- Memory pressure: `Max Memory Used` within 80% of `Memory Size`

**Behavioral Anomalies**

- Unexpected empty responses from AI/Bedrock calls
- Pinecone upsert/query failures
- DynamoDB condition check failures
- S3 errors
- Retries or fallback paths triggered

## Step 4 — Root Cause Analysis

Reason through the causal chain from symptom to root cause. Be specific:

- What was the Lambda doing when it failed (which function, which code path)?
- Was this a transient infrastructure issue or a code defect?
- Is there a data dependency that was missing or malformed?
- Was this caused by an upstream service (Bedrock, Pinecone, DynamoDB) or internal logic?
- Is there evidence of a regression (was this path working before)?

## Step 5 — Produce the Remediation Plan

Format the output as follows:

---

### Incident Summary

- **Function**: `<Lambda function short name>`
- **Time range**: `<first event timestamp>` → `<last event timestamp>`
- **Streams analyzed**: N
- **Total log events**: N
- **Note**: `<engineer note if present>`

### Error & Warning Inventory

List every distinct error and warning with the timestamp of first occurrence and a count.

| Severity | Type | Message (truncated) | First Seen | Count |
| -------- | ---- | ------------------- | ---------- | ----- |
| ERROR    | ...  | ...                 | ...        | N     |
| WARN     | ...  | ...                 | ...        | N     |

### Performance Profile

| Metric                        | Value       |
| ----------------------------- | ----------- |
| Invocation duration (avg/max) | ...         |
| Cold starts detected          | Yes / No    |
| Memory pressure               | X% of limit |
| Timeouts                      | N           |

### Root Cause Assessment

[2–4 paragraphs reasoning through the causal chain. Be direct and precise — name the code path,
the condition, the data shape. Do not hedge unnecessarily.]

### Remediation Plan

Prioritized action items. Use these tiers:

**P0 — Fix immediately (production impact)**

1. [Specific fix with file reference if applicable]

**P1 — Fix before next release**

1. [Specific fix or defensive improvement]

**P2 — Improve for resilience**

1. [Observability, retry logic, circuit breakers, etc.]

### Follow-up Verification

Steps to confirm the fix worked after deployment:

- Specific log patterns to look for (absence of errors, expected output)
- Manual test case that exercises the failing path
- Monitoring metric to watch

---

## Analysis Principles

Apply these throughout:

- **Name the file and function** when identifying where a fix should be made — do not say "the handler should be updated", say "in `amplify/functions/stream-coach-conversation/handler.ts`, the `handleConversation` function needs..."
- **Distinguish symptom from cause** — a timeout is a symptom, not a root cause
- **Prefer conservative fixes** — suggest adding a guard before refactoring a whole path
- **Flag incomplete information** — if logs are too sparse to determine root cause, say so and suggest what additional logging would help
- **Consider the architecture** — this is an AWS Amplify Gen 2 app with Lambda, DynamoDB single-table, S3, Bedrock (Claude), and Pinecone. Failures often cross service boundaries.
