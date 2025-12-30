/**
 * Prompt Helpers
 *
 * Reusable prompt components and instructions for consistent AI behavior
 * across all backend Lambda functions that generate JSON responses.
 */

/**
 * Standard JSON formatting instructions for AI prompts
 *
 * Use this in any prompt where the AI needs to return structured JSON data.
 * These instructions have been battle-tested across workout extraction,
 * coach config generation, and analytics generation.
 *
 * @param options - Optional customization
 * @param options.minified - If true, includes minification instructions (for large payloads)
 * @param options.noMarkdown - Explicitly mentions no markdown wrapping (default: true)
 * @returns Formatted instruction string ready to insert into prompts
 *
 * @example
 * ```typescript
 * const prompt = `
 * You are an AI assistant that generates structured data.
 *
 * ${getJsonFormattingInstructions()}
 *
 * Generate the following data:
 * ...
 * `;
 * ```
 */
export function getJsonFormattingInstructions(
  options: {
    minified?: boolean;
    noMarkdown?: boolean;
  } = {},
): string {
  const { minified = false, noMarkdown = true } = options;

  const minificationSection = minified
    ? `- CRITICAL: Generate MINIFIED JSON with NO extra whitespace, newlines, or formatting
- Remove all unnecessary spaces, tabs, and line breaks to minimize payload size
- Example: {"key":"value","array":[1,2,3]} NOT { "key": "value", "array": [ 1, 2, 3 ] }
`
    : "";

  const markdownSection = noMarkdown
    ? `- Do not wrap the JSON in \`\`\`json blocks or any markdown formatting
- CRITICAL: If your response starts with a backtick (\`) character, you have FAILED
- CRITICAL: If your response contains the text \`\`\`json anywhere, you have FAILED
`
    : "";

  return `CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON. No markdown backticks, no explanations, no text outside JSON
- Your response MUST start with the { character (opening curly brace)
- Your response MUST end with the } character (closing curly brace)
- THE VERY FIRST CHARACTER of your response must be { - not a backtick, not a space, not a newline
- THE VERY LAST CHARACTER of your response must be } - nothing after it
${markdownSection}- NEVER include trailing commas before closing braces } or brackets ]
- Use double quotes for all strings, never single quotes
- CRITICAL: Use standard JSON with SINGLE double-quotes for property names and values
- Example CORRECT: {"property": "value"} NOT {""property"": ""value""}
- Do NOT escape quotes unnecessarily - use single double-quotes, not double double-quotes
- Ensure all arrays and objects are properly closed
- If unsure about a value, use null instead of omitting the field
- Test JSON validity before responding
${minificationSection}
CRITICAL JSON STRUCTURE VALIDATION:
- Each opening brace { must have exactly ONE matching closing brace }
- Each opening bracket [ must have exactly ONE matching closing bracket ]
- Count your braces: total opening braces must equal total closing braces exactly
- Count your brackets: total opening brackets must equal total closing brackets exactly
- Multiple consecutive closing characters (like }]}) are VALID when closing nested structures
- Focus on total count balance, not consecutive characters

RESPONSE FORMAT VERIFICATION:
- Before you respond, verify your response starts with {
- Before you respond, verify your response ends with }
- Before you respond, verify your response does NOT contain \`\`\` or backticks
- Return ONLY raw JSON. Do not wrap in markdown code blocks or backticks.
- Example CORRECT response: {"key":"value","array":[1,2,3]}
- Example WRONG response: \`\`\`json\n{"key":"value"}\n\`\`\`

YOUR RESPONSE MUST START WITH { - BEGIN YOUR RESPONSE NOW WITH THE { CHARACTER.`;
}

/**
 * Comprehensive JSON formatting instructions for complex nested structures
 *
 * Use this variant for workouts with 20+ rounds or deeply nested data structures
 * where brace/bracket balance is critical.
 */
export const JSON_FORMATTING_INSTRUCTIONS_COMPREHENSIVE =
  getJsonFormattingInstructions();

/**
 * Minified JSON formatting instructions for large payloads
 *
 * Use this variant when response size is a concern (e.g., workout extraction
 * with many rounds or large analytics payloads).
 */
export const JSON_FORMATTING_INSTRUCTIONS_MINIFIED =
  getJsonFormattingInstructions({ minified: true });

/**
 * Standard JSON formatting instructions (most common use case)
 *
 * Use this for most JSON generation scenarios where size and complexity
 * are moderate (e.g., coach configs, analytics, summaries).
 */
export const JSON_FORMATTING_INSTRUCTIONS_STANDARD =
  getJsonFormattingInstructions();
