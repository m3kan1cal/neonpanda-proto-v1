/**
 * Prompt builder for AI-generated conversation titles.
 *
 * Used by build-conversation-title to produce a short, descriptive label
 * for new coach conversations, contextual chats, coach creator sessions,
 * and program designer sessions.
 */

import {
  sanitizeUserContent,
  wrapUserContent,
} from "../security/prompt-sanitizer";

export type TitleEntityType =
  | "coachConversation"
  | "coachCreatorSession"
  | "programDesignerSession";

export interface BuildTitlePromptArgs {
  entityType: TitleEntityType;
  userMessage: string;
  aiResponse: string;
  surfaceContext?: string;
  tags?: string[];
}

const ENTITY_GUIDANCE: Record<TitleEntityType, string> = {
  coachConversation:
    "This is a coaching conversation between a user and their AI fitness coach. Focus on the topic, exercise, training question, or issue being discussed. Examples: \"Squat Depth Troubleshooting\", \"Hamstring Tightness After Deadlifts\", \"Switching to 5/3/1 Programming\".",
  coachCreatorSession:
    "This is the start of an interview that builds the user's personalized AI fitness coach. Focus on the user's training identity, goals, or coaching style they want. Examples: \"Strength-Focused Hybrid Coach\", \"Marathon Training Mentor\", \"Conjugate Method Powerlifter\".",
  programDesignerSession:
    "This is the start of an interview that designs a personalized training program. Focus on the program's shape, duration, or primary goal. Examples: \"12-Week Hypertrophy Block\", \"Half Marathon Build-Up\", \"Powerlifting Peak for Meet\".",
};

const TITLE_RULES = `Output a short, descriptive title that follows ALL of these rules:
- 3 to 7 words.
- Title Case (capitalize each significant word).
- No trailing punctuation.
- No enclosing quotes or smart quotes.
- No PII: do not include names, emails, phone numbers, exact ages, or specific locations.
- Avoid generic filler words: "Chat", "Conversation", "Discussion", "Session", "Talk", "New".
- Be specific to what the user actually wants help with — not the entity type.
- If the first user message is too generic to title (e.g., a greeting only), output a topical guess based on the assistant's reply, or fall back to "Quick Question".`;

export function buildConversationTitlePrompt(
  args: BuildTitlePromptArgs,
): { systemPrompt: string; userMessage: string } {
  const sanitizedUser = sanitizeUserContent(args.userMessage, 2000);
  const sanitizedAi = sanitizeUserContent(args.aiResponse, 2000);

  const surfaceLine = args.surfaceContext
    ? `\n\nSurface context: ${args.surfaceContext}. The title should make sense within this surface — for example, a chat from a Program Dashboard surface should reference what the user wants to know about their program (e.g., "Week 3 Volume Check").`
    : "";

  const tagsLine =
    args.tags && args.tags.length > 0
      ? `\n\nTags applied to this conversation: ${args.tags.join(", ")}. Use them as additional hints about scope.`
      : "";

  const entityGuidance = ENTITY_GUIDANCE[args.entityType];

  const systemPrompt = `You generate concise titles for newly-created conversations in a fitness coaching app called NeonPanda.

${entityGuidance}${surfaceLine}${tagsLine}

${TITLE_RULES}

Call the generate_conversation_title tool exactly once with your chosen title.`;

  const wrappedUser = wrapUserContent(sanitizedUser, "first_user_message");
  const wrappedAi = wrapUserContent(sanitizedAi, "first_assistant_reply");

  const userMessage = `First user message:\n${wrappedUser}\n\nFirst assistant reply:\n${wrappedAi}\n\nGenerate the title now.`;

  return { systemPrompt, userMessage };
}

/**
 * Default titles produced when an entity is created without an AI title.
 * Used to detect "untouched" titles before overwriting them.
 */
export const DEFAULT_COACH_CONVERSATION_TITLES: ReadonlySet<string> = new Set([
  "New Conversation",
  "New Training Program",
  "Workout Edit",
]);

export const DEFAULT_COACH_CREATOR_SESSION_TITLE = "New Coach Session";
export const DEFAULT_PROGRAM_DESIGNER_SESSION_TITLE = "New Program Design";

const ALL_DEFAULT_TITLES: ReadonlySet<string> = new Set([
  ...DEFAULT_COACH_CONVERSATION_TITLES,
  DEFAULT_COACH_CREATOR_SESSION_TITLE,
  DEFAULT_PROGRAM_DESIGNER_SESSION_TITLE,
]);

export function isDefaultTitle(
  title: string | undefined | null,
): boolean {
  if (!title) return true;
  return ALL_DEFAULT_TITLES.has(title.trim());
}

/**
 * Sanitize and validate the model's title output.
 * Returns null if the output cannot be coerced into a valid title.
 */
export function normalizeAiTitle(rawTitle: unknown): string | null {
  if (typeof rawTitle !== "string") return null;

  let title = rawTitle.trim();

  // Strip surrounding quotes (single, double, and smart quotes)
  title = title.replace(/^["'‘’“”]+/, "");
  title = title.replace(/["'‘’“”]+$/, "");

  // Strip trailing punctuation
  title = title.replace(/[.!?,;:…]+$/, "");

  // Collapse internal whitespace
  title = title.replace(/\s+/g, " ").trim();

  if (title.length === 0) return null;
  if (title.length > 60) title = title.substring(0, 60).trim();

  return title;
}
