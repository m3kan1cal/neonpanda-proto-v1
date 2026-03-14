/**
 * Program Designer Session Agent Types
 *
 * Role-specific context for the StreamingConversationAgent when operating
 * in the "program designer" role. Extends BaseStreamingAgentContext so it
 * can be used with the generic agent and all shared tool factories.
 */

import type { BaseStreamingAgentContext } from "../core/types";
import type { ProgramDesignerSession } from "../../program-designer/types";
import type { CriticalTrainingDirective } from "../../user/types";

/**
 * Context passed to every program designer agent tool execute() call.
 *
 * The session.todoList is mutated in-place by the update_design_fields
 * and complete_design tools so that subsequent tool calls and the
 * post-agent session save both see the latest field values.
 */
export interface ProgramDesignerSessionAgentContext extends BaseStreamingAgentContext {
  userId: string;
  sessionId: string;
  userTimezone: string;

  // Coach context — the coach exists for program designer (unlike coach creator)
  coachId: string;
  coachName?: string;
  coachPersonality?: string; // From coachConfig.generated_prompts.personality_prompt

  // Mutable session object — tools update todoList, additionalConsiderations,
  // and isComplete directly on this object
  session: ProgramDesignerSession;

  // Pinecone context loaded at request time (user background/history)
  pineconeContext: string;

  // Critical training directive from user profile (when enabled)
  criticalTrainingDirective?: CriticalTrainingDirective;
}
