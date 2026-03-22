/**
 * JSON Schema for prospective memory extraction tool use.
 * Used to extract forward-looking events, commitments, and follow-ups
 * from user messages and AI responses.
 *
 * Field ordering follows reasoning-first pattern per Bedrock structured output best practices.
 */

export const PROSPECTIVE_MEMORY_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Brief explanation of what prospective elements were found and why",
    },
    hasProspectiveElements: {
      type: "boolean",
      description:
        "True if the conversation contains forward-looking events, commitments, or follow-up opportunities",
    },
    items: {
      type: "array",
      description:
        "List of prospective memory items extracted from the conversation",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          content: {
            type: "string",
            description:
              "Concise description of the future event/commitment (e.g., 'User has a marathon on October 15')",
          },
          targetDate: {
            type: "string",
            description:
              "ISO date string if a specific date can be determined (e.g., '2026-10-15'). Omit if no date.",
          },
          targetDateType: {
            type: "string",
            enum: ["specific", "approximate", "recurring", "relative"],
            description:
              "How precise the date reference is: specific (exact date known), approximate (rough timeframe), recurring (weekly/monthly pattern), relative (next week, in 2 months)",
          },
          relativeTimeframe: {
            type: "string",
            description:
              "Original phrasing when date is relative or approximate (e.g., 'next week', 'in a couple months', 'sometime in October')",
          },
          followUpType: {
            type: "string",
            enum: [
              "event_outcome",
              "commitment_check",
              "milestone",
              "try_new_thing",
              "general",
            ],
            description:
              "What kind of follow-up: event_outcome (ask how event went), commitment_check (check if they followed through), milestone (celebrate/check progress), try_new_thing (ask how new thing went), general (other follow-up)",
          },
          followUpPrompt: {
            type: "string",
            description:
              "Natural coaching prompt for follow-up (e.g., 'Ask how the marathon went and how their body feels')",
          },
          importance: {
            type: "string",
            enum: ["high", "medium", "low"],
            description:
              "How important this follow-up is: high (major event/goal), medium (notable commitment), low (casual mention)",
          },
          triggerWindowDaysBefore: {
            type: "number",
            description:
              "Days before target date to start surfacing (e.g., 3 for events, 1 for small commitments). Default 2.",
          },
          triggerWindowDaysAfter: {
            type: "number",
            description:
              "Days after target date to keep surfacing for follow-up (e.g., 5 for events, 3 for commitments). Default 3.",
          },
          originalContext: {
            type: "string",
            description:
              "Brief quote or paraphrase of the conversation snippet that triggered this extraction",
          },
        },
        required: [
          "content",
          "targetDateType",
          "followUpType",
          "followUpPrompt",
          "importance",
          "triggerWindowDaysBefore",
          "triggerWindowDaysAfter",
          "originalContext",
        ],
      },
    },
  },
  required: ["reasoning", "hasProspectiveElements", "items"],
};
