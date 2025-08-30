/**
 * Memory utility functions
 */

/**
 * Generate a unique memory ID using consistent format
 */
export function generateMemoryId(): string {
  return `user_memory_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
