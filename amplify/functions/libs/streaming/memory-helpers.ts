/**
 * Memory context building utilities for streaming handlers
 */

/**
 * Build message context string from conversation history
 * Common pattern used for memory retrieval and analysis
 *
 * @param history - Array of conversation items with question and userResponse
 * @param recentCount - Number of recent items to include (default: 5)
 * @returns Formatted context string
 */
export function buildMessageContext(
  history: Array<{ question: string; userResponse: string }>,
  recentCount: number = 5
): string {
  return history
    .slice(-recentCount)
    .map((item) => `Q: ${item.question}\nA: ${item.userResponse}`)
    .join("\n");
}

/**
 * Build message context from coach conversation messages
 * Used when history contains role-based messages
 *
 * @param messages - Array of messages with role and content
 * @param recentCount - Number of recent messages to include (default: 5)
 * @returns Formatted context string
 */
export function buildMessageContextFromMessages(
  messages: Array<{ role: string; content: string }>,
  recentCount: number = 5
): string {
  return messages
    .slice(-recentCount)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");
}

/**
 * Format memory context for AI prompt
 * Converts memory array to formatted string
 *
 * @param memories - Array of memory objects
 * @param maxLength - Maximum character length (default: 2000)
 * @returns Formatted memory context string
 */
export function formatMemoryContext(
  memories: Array<{ memoryText?: string; content?: string }>,
  maxLength: number = 2000
): string {
  if (!memories || memories.length === 0) {
    return "";
  }

  return memories
    .map((mem) => `- ${mem.memoryText || mem.content}`)
    .filter((text) => text.length > 2) // Filter out empty or very short items
    .join("\n")
    .substring(0, maxLength); // Limit total length
}
