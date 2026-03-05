/**
 * Coach Creator Session Agent Types
 *
 * Role-specific context for the StreamingConversationAgent when operating
 * in the "coach creator" role. Extends BaseStreamingAgentContext so it
 * can be used with the generic agent and all shared tool factories.
 */

import type { BaseStreamingAgentContext } from "../core/types";
import type {
  CoachCreatorSession,
  CoachCreatorTodoList,
  SophisticationLevel,
} from "../../coach-creator/types";

/**
 * Context passed to every coach creator agent tool execute() call.
 *
 * The session.todoList is mutated in-place by the update_intake_fields
 * and complete_intake tools so that subsequent tool calls and the
 * post-agent session save both see the latest field values.
 */
export interface CoachCreatorSessionAgentContext extends BaseStreamingAgentContext {
  userId: string;
  sessionId: string;
  userTimezone: string;

  // Mutable session object — tools update todoList, sophisticationLevel,
  // and isComplete directly on this object
  session: CoachCreatorSession;

  // Pinecone context loaded at request time (user background/history)
  pineconeContext: string;
}
