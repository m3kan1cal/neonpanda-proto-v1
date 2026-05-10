/**
 * Conversation Title Schema - JSON Schema Definition
 *
 * Used by build-conversation-title to extract a short, descriptive title
 * for newly-created coach conversations, contextual chats, coach creator
 * sessions, and program designer sessions.
 *
 * The model is constrained to a single string output via Bedrock tool use.
 */

import { BedrockToolConfig } from "../api-helpers";

export const CONVERSATION_TITLE_SCHEMA = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      maxLength: 60,
      description:
        "A short, descriptive title for the conversation. 3-7 words, Title Case, no trailing punctuation, no enclosing quotes. Avoid generic words like 'Chat', 'Conversation', 'Discussion', 'Session', 'Talk', 'New'. No PII (names, emails, phone numbers, exact ages, locations).",
    },
  },
};

/**
 * Bedrock toolConfig for conversation title generation.
 * Use with callBedrockApi({ tools: [CONVERSATION_TITLE_TOOL] })
 */
export const CONVERSATION_TITLE_TOOL: BedrockToolConfig = {
  name: "generate_conversation_title",
  description:
    "Generate a short, descriptive title (3-7 words) summarizing what this conversation is about, based on the first user message and the assistant's first reply.",
  inputSchema: CONVERSATION_TITLE_SCHEMA,
};
