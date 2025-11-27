/**
 * Shared Todo Types
 *
 * Generic types for todo-list based information collection flows.
 * Used by: coach-creator, program, and future todo-based features.
 */

/**
 * A single item in a todo list
 * Tracks whether a piece of information has been collected
 */
export interface TodoItem {
  status: 'pending' | 'in_progress' | 'complete';
  value: any | null;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  extractedFrom?: string; // Message ID, timestamp, or message index
  imageRefs?: string[]; // Optional: S3 keys if extracted from images (multimodal support)
}

/**
 * Message in the conversation history
 * Used by: coach-creator, program conversation flows
 */
export interface ConversationMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string | Date;
  messageType?: string; // Optional: e.g., 'text_with_images' for multimodal messages
  imageS3Keys?: string[]; // Optional: S3 keys for images attached to this message
}
