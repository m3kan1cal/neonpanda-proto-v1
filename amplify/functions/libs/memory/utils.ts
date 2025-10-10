/**
 * Memory utility functions
 */

/**
 * Generate a unique memory ID using consistent format
 * Pattern: user_memory_${userId}_${timestamp}_${shortId}
 */
export function generateMemoryId(userId: string): string {
  return `user_memory_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
