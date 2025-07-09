/**
 * Coach Conversation Types
 *
 * This module contains TypeScript interfaces and types specific to
 * coach conversation functionality including messages, conversations, and metadata.
 */

/**
 * Individual message in a coach conversation
 */
export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
  };
}

/**
 * Complete coach conversation with full message history
 */
export interface CoachConversation {
  conversationId: string;
  coachId: string;
  userId: string;
  title?: string;
  messages: CoachMessage[];
  metadata: {
    startedAt: Date;
    lastActivity: Date;
    totalMessages: number;
    isActive: boolean;
    tags?: string[];
  };
}

/**
 * Summary version for efficient listing (excludes messages array)
 */
export interface CoachConversationSummary {
  conversationId: string;
  coachId: string;
  userId: string;
  title?: string;
  metadata: {
    startedAt: Date;
    lastActivity: Date;
    totalMessages: number;
    isActive: boolean;
    tags?: string[];
  };
}