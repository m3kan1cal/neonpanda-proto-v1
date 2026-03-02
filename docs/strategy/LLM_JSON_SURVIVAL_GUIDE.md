# LLM Structured JSON: A Survival Guide

## The Core Idea

Stop telling the LLM "respond with JSON in this format" in your system prompt. Instead, define a **tool** with a JSON Schema that describes exactly what you want, and ask the model to call that tool. The model fills in the tool's parameters — which means the output structure is defined by the schema, not by how well the model interprets your prose instructions.

This gives you:

- Schema-enforced field names, types, and enums
- Clean extraction from `toolResult.input` instead of parsing markdown-wrapped JSON
- A forcing function (`toolChoice`) to guarantee the model calls the tool instead of generating text

---

## Step 1: Define a Schema

Write a JSON Schema object for the structure you want. Four things matter most:

1. **`required`** — list every field the model must always populate
2. **`additionalProperties: false`** — prevents the model from inventing fields not in your schema (see note below)
3. **`enum`** — constrains string fields to a fixed set of values
4. **`description`** on every field — this is how the model knows what to put there; treat it as an instruction, not documentation

**Schemas act as prompts.** The model reads your schema — field names, descriptions, enums, and structure — as part of its context when deciding what to generate. A well-written schema with clear, instructive `description` values will produce significantly better output than a schema with terse or absent descriptions. Think of each `description` as a targeted prompt for that specific field.

**On `additionalProperties: false`:** This constraint signals to the model that the schema is authoritative and complete. Without it, the model may append extra fields it thinks are helpful. With it, the model understands the schema is the full contract — nothing should be added, nothing omitted from the `required` list. It is effective as a structural signal even in unguarded mode (see limits section).

```typescript
// schemas/prior-auth-classification-schema.ts

export const PRIOR_AUTH_CLASSIFICATION_SCHEMA = {
  type: "object",
  required: [
    "reasoning",
    "authorizationRequired",
    "urgencyLevel",
    "clinicalCategory",
    "confidence",
  ],
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Step-by-step clinical reasoning for the authorization determination, " +
        "referencing the relevant formulary tier, policy criteria, and diagnosis codes",
    },
    authorizationRequired: {
      type: "boolean",
      description:
        "True if prior authorization is required before dispensing. " +
        "False if the drug is covered without review under the member's plan.",
    },
    urgencyLevel: {
      type: "string",
      enum: ["routine", "urgent", "emergent"],
      description:
        "Clinical urgency of the authorization request. Use 'urgent' for time-sensitive " +
        "conditions where a delay of more than 24 hours risks patient harm. " +
        "Use 'emergent' only for life-threatening situations requiring immediate dispensing.",
    },
    clinicalCategory: {
      type: "string",
      enum: [
        "specialty",
        "maintenance",
        "acute",
        "preventive",
        "controlled_substance",
      ],
      description:
        "The primary clinical category of the medication. Use the most specific category that applies.",
    },
    confidence: {
      type: "number",
      description:
        "Confidence score 0.0–1.0. Use 0.85+ for clear policy matches, " +
        "0.5–0.84 for cases requiring clinical judgment, below 0.5 for ambiguous cases " +
        "that should be escalated to a pharmacist.",
    },
  },
};
```

---

## Step 2: Wrap It in a Tool Definition

Pair the schema with a name and a description. The **tool description** is a brief instruction to the model about what the tool does. The field `description` values inside the schema do the detailed work.

```typescript
export const PRIOR_AUTH_CLASSIFICATION_TOOL = {
  name: "classify_prior_auth",
  description:
    "Classify a prior authorization request against formulary policy and return a structured determination.",
  inputSchema: PRIOR_AUTH_CLASSIFICATION_SCHEMA,
};
```

---

## Step 3: Call the API with `toolConfig` and Force Tool Use

When you provide a single tool and set `toolChoice` to that tool's name, the model is required to call it. It cannot respond with text instead.

```typescript
const response = await bedrockClient.send(
  new ConverseCommand({
    modelId: "us.anthropic.claude-sonnet-4-6",
    messages: [{ role: "user", content: [{ text: authRequestDetails }] }],
    system: [{ text: systemPrompt }],
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: PRIOR_AUTH_CLASSIFICATION_TOOL.name,
            description: PRIOR_AUTH_CLASSIFICATION_TOOL.description,
            inputSchema: { json: PRIOR_AUTH_CLASSIFICATION_TOOL.inputSchema },
          },
        },
      ],
      toolChoice: {
        tool: { name: "classify_prior_auth" }, // forces the model to call this tool
      },
    },
  }),
);
```

---

## Step 4: Extract the Result

When using a wrapper like `callBedrockApi()`, the tool result is returned as a normalized object — not the raw Bedrock response. The structured data lives directly in `result.input`, already parsed, no `JSON.parse` needed.

```typescript
const result = await callBedrockApi(systemPrompt, userMessage, modelId, {
  tools: PRIOR_AUTH_CLASSIFICATION_TOOL,
  expectedToolName: "classify_prior_auth",
});

if (result && typeof result === "object" && "input" in result) {
  const determination = result.input as PriorAuthDetermination;
  // determination.authorizationRequired === true
  // determination.urgencyLevel === "urgent"
  // determination.confidence === 0.91
} else {
  logger.warn("Tool response not in expected format");
  // handle fallback
}
```

If you are calling the Bedrock SDK directly (without a wrapper), the raw response structure looks like this:

```typescript
const content = response.output?.message?.content ?? [];
const toolUseBlock = content.find((block: any) => "toolUse" in block);

if (!toolUseBlock) {
  throw new Error("Model did not call the expected tool");
}

const determination = toolUseBlock.toolUse.input as PriorAuthDetermination;
```

---

## Patterns That Work Well

### Put "reasoning" first

Add a `reasoning` field as the first entry in `required` and the first property listed in the schema. This forces the model to articulate its reasoning before filling in the structured fields. It noticeably improves accuracy on classification and determination tasks, especially for ambiguous inputs — the model cannot "commit" to a classification before it has explained why.

```typescript
required: ["reasoning", "authorizationRequired", "urgencyLevel", "confidence"],
properties: {
  reasoning: {
    type: "string",
    description:
      "Step-by-step reasoning referencing the specific policy criteria, diagnosis codes, " +
      "and formulary tier that support this determination",
  },
  // ... other fields
}
```

### Write `description` values as decision rules, not labels

```typescript
// Weak — the model has to guess what you want
description: "The urgency level";

// Better — gives the model a concrete decision rule
description: "Clinical urgency of the request. Use 'urgent' for time-sensitive conditions " +
  "where a delay of more than 24 hours risks patient harm. " +
  "Use 'emergent' only for life-threatening situations. " +
  "Default to 'routine' for standard formulary reviews.";
```

### Keep AI schemas lean

Only include fields in the schema that you need the model to generate. Fields your backend adds at write time (record IDs, audit timestamps, computed fields) should not appear in the AI schema. Two reasons:

1. Every optional field increases compiled grammar size and pushes toward platform limits
2. The model will attempt to populate those fields, often with hallucinated values

Maintain a separate storage schema that merges the AI schema with backend-only fields if you need to validate stored records.

---

## Known Limits (Bedrock-Specific)

These apply to Amazon Bedrock's grammar compilation engine, which is what makes `toolChoice` enforcement actually work. Other platforms have their own constraints — validate them empirically.

| Limit                              | Value                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Max optional parameters per schema | 24                                                                        |
| Grammar size cap                   | ~50–100KB (undocumented; hit empirically)                                 |
| Nullable enum combination          | Not supported (`type: ["string", "null"]` + `enum` together causes a 400) |

**When you hit the optional parameter limit:** either reduce optional fields, or drop `toolChoice` enforcement and pass the schema as an unguarded tool definition. A well-written schema still dramatically improves output quality even without grammar enforcement — the model will follow it because the schema reads as a contract. Use a JSON parse fallback as a safety net downstream.

**The 24-parameter limit is not the only constraint.** Schemas with many optional top-level _objects_ (each containing enum fields) cause combinatorial grammar explosion even when under 24 params. For N optional top-level objects, the compiler evaluates approximately 2^N presence/absence combinations. At N=22, that is ~4 million paths — enough to time out a standard Lambda. If your schema has this shape and compilation times out, drop to unguarded mode.

**The nullable enum issue:** if you need a field to be nullable, make it non-nullable in the schema and handle null-coercion downstream, or split it into two fields (`value` + `isPresent`).

---

## Minimal End-to-End Example

```typescript
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

// 0. Types
type ClaimDisposition =
  | "approve"
  | "deny"
  | "pend_for_review"
  | "request_additional_info";

interface ClaimTriageResult {
  reasoning: string;
  disposition: ClaimDisposition;
  requiresPharmacistReview: boolean;
  confidence: number;
}

// 1. Schema
const CLAIM_TRIAGE_SCHEMA = {
  type: "object",
  required: [
    "reasoning",
    "disposition",
    "requiresPharmacistReview",
    "confidence",
  ],
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Step-by-step explanation of the triage decision, referencing the claim details, " +
        "NDC code, member eligibility, and any policy flags that influenced the outcome",
    },
    disposition: {
      type: "string",
      enum: ["approve", "deny", "pend_for_review", "request_additional_info"],
      description:
        "The adjudication disposition. Use 'pend_for_review' when the claim meets basic " +
        "eligibility but has a clinical flag that requires human review. " +
        "Use 'request_additional_info' when required documentation is missing.",
    },
    requiresPharmacistReview: {
      type: "boolean",
      description:
        "True if a licensed pharmacist must review before the disposition is finalized. " +
        "Always true when disposition is 'pend_for_review'.",
    },
    confidence: {
      type: "number",
      description:
        "Confidence score 0.0–1.0 in the disposition. " +
        "Use 0.9+ for clear policy matches, 0.6–0.89 for cases requiring judgment, " +
        "below 0.6 for ambiguous cases that should always escalate.",
    },
  },
};

// 2. Tool definition
const CLAIM_TRIAGE_TOOL = {
  toolSpec: {
    name: "triage_claim",
    description:
      "Triage a pharmacy benefit claim and return a structured adjudication disposition.",
    inputSchema: { json: CLAIM_TRIAGE_SCHEMA },
  },
};

// 3. API call
async function triageClaim(claimDetails: string): Promise<ClaimTriageResult> {
  const response = await client.send(
    new ConverseCommand({
      modelId: "us.anthropic.claude-sonnet-4-6",
      messages: [{ role: "user", content: [{ text: claimDetails }] }],
      system: [
        {
          text:
            "You are a pharmacy benefit management adjudication assistant. " +
            "Evaluate the claim against formulary policy and member eligibility, " +
            "then use the triage_claim tool to return a structured disposition.",
        },
      ],
      inferenceConfig: { temperature: 0.2 }, // low temperature for deterministic structured output
      toolConfig: {
        tools: [CLAIM_TRIAGE_TOOL],
        toolChoice: { tool: { name: "triage_claim" } },
      },
    }),
  );

  // 4. Extract result from raw SDK response
  const content = response.output?.message?.content ?? [];
  const toolUseBlock = content.find((b: any) => "toolUse" in b);
  if (!toolUseBlock) throw new Error("Model did not call triage_claim tool");

  return toolUseBlock.toolUse.input as ClaimTriageResult;
}
```

---

## Summary

| Do                                                                                          | Don't                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Define a JSON Schema with `required`, `additionalProperties: false`, and `enum` constraints | Tell the model "respond with JSON" in the system prompt                         |
| Write field `description` values as decision rules — treat them as prompts                  | Leave descriptions as terse labels or omit them entirely                        |
| Put a `reasoning` field first in `required` and `properties`                                | Skip reasoning — it improves accuracy by forcing deliberation before commitment |
| Keep AI schemas lean; omit backend-only fields                                              | Add server-side fields (IDs, timestamps, computed values) to the AI schema      |
| Use `toolChoice` to force a single-tool call                                                | Assume the model will call the tool without enforcement                         |
| Use low temperature (0.1–0.3) for structured extraction tasks                               | Use default or high temperature for deterministic JSON output                   |
| Test grammar compilation empirically for schemas near the limits                            | Assume any schema will compile without hitting size or structural limits        |
| Use a JSON parse fallback for unguarded large schemas                                       | Crash on malformed output when enforcement cannot be applied                    |
