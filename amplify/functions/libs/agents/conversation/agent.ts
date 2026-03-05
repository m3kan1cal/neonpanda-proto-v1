/**
 * Conversation Agent — Backward-Compatibility Re-export
 *
 * The StreamingConversationAgent has been moved to agents/core/streaming-agent.ts
 * and is now generic over TContext. All existing imports continue to work because
 * this module re-exports the class under the same name.
 *
 * The coach conversation handler uses it with ConversationAgentContext (the default
 * before the refactor), which still resolves correctly because TContext defaults
 * to BaseStreamingAgentContext and ConversationAgentContext extends that base.
 */

export { StreamingConversationAgent } from "../core/streaming-agent";
