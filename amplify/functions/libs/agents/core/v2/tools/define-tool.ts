/**
 * Zod-backed tool factory. Auto-generates the JSON Schema fragment Bedrock's
 * Converse toolConfig expects, validates input/output at runtime, and applies
 * sane per-tool defaults (timeout, parallelSafe, retryable).
 *
 * Phase 1 — see plan §2.1.
 */

import { z } from "zod";
import type { AgentContext } from "../../types";
import type {
  Tool,
  ToolMiddleware,
  ToolResult,
  ToolExecutionContext,
  ToolValidator,
} from "./tool-types";

export interface DefineToolSpec<
  TContext extends AgentContext,
  TInSchema extends z.ZodType,
  TOutSchema extends z.ZodType | undefined = undefined,
> {
  id: string;
  description: string;
  input: TInSchema;
  output?: TOutSchema;
  contextualMessages?: string[];
  /** Hard timeout. Default 25_000ms. Use 60_000+ for tools that call Bedrock. */
  timeoutMs?: number;
  parallelSafe?: boolean;
  retryable?: boolean;
  redactInput?: boolean;
  middleware?: ToolMiddleware<TContext>[];
  /** See `Tool.getStoreLocation`. Forwarded to the produced Tool. */
  getStoreLocation?: (
    input: z.infer<TInSchema>,
    ctx: ToolExecutionContext<TContext>,
  ) => { index?: number; uniqueKey?: string };
  execute: (
    input: z.infer<TInSchema>,
    ctx: ToolExecutionContext<TContext>,
  ) => Promise<
    ToolResult<
      TOutSchema extends z.ZodType ? z.infer<TOutSchema> : unknown
    >
  >;
}

const DEFAULT_TIMEOUT_MS = 25_000;

export function defineTool<
  TContext extends AgentContext,
  TInSchema extends z.ZodType,
  TOutSchema extends z.ZodType | undefined = undefined,
>(spec: DefineToolSpec<TContext, TInSchema, TOutSchema>): Tool<
  TContext,
  z.infer<TInSchema>,
  TOutSchema extends z.ZodType ? z.infer<TOutSchema> : unknown
> {
  const inputSchema = toBedrockJsonSchema(spec.input);
  const outputSchema = spec.output ? toBedrockJsonSchema(spec.output) : undefined;

  const validateInput: ToolValidator<z.infer<TInSchema>> = (value) => {
    const result = spec.input.safeParse(value);
    if (result.success) return { ok: true, value: result.data };
    return { ok: false, error: formatZodError(result.error) };
  };

  const validateOutput = spec.output
    ? ((value: unknown) => {
        const result = (spec.output as z.ZodType).safeParse(value);
        if (result.success) return { ok: true, value: result.data };
        return { ok: false, error: formatZodError(result.error) };
      }) satisfies ToolValidator<unknown>
    : undefined;

  return {
    id: spec.id,
    description: spec.description,
    inputSchema,
    outputSchema,
    contextualMessages: spec.contextualMessages,
    timeoutMs: spec.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    parallelSafe: spec.parallelSafe ?? false,
    retryable: spec.retryable ?? true,
    redactInput: spec.redactInput ?? false,
    middleware: spec.middleware ?? [],
    getStoreLocation: spec.getStoreLocation as Tool<TContext>["getStoreLocation"],
    execute: spec.execute as Tool<TContext>["execute"],
    validateInput,
    validateOutput: validateOutput as Tool<TContext>["validateOutput"],
  };
}

/** Bedrock's Converse toolConfig expects a plain JSON Schema fragment. The
 *  draft-2020-12 `$schema` reference confuses some downstream tooling; strip
 *  it. Other fields (additionalProperties, required, enum, etc.) pass through. */
function toBedrockJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  if ("$schema" in json) delete json.$schema;
  if ("definitions" in json) delete json.definitions;
  if ("$defs" in json) delete json.$defs;
  return json;
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("; ");
}
