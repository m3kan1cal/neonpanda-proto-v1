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
 * Lightweight version for efficient listing (excludes messages array)
 */
export interface CoachConversationListItem {
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

/**
 * Event structure for building coach conversation summaries
 */
export interface BuildCoachConversationSummaryEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  triggerReason: 'message_count' | 'complexity';
  messageCount: number;
  complexityIndicators?: string[];
}

/**
 * AI-generated coach conversation summary for semantic search and coach context
 */
export interface CoachConversationSummary {
  summaryId: string;
  userId: string;
  coachId: string;
  conversationId: string;
  narrative: string; // 150-300 word narrative summary
  structuredData: {
    current_goals: string[];
    recent_progress: string[];
    preferences: {
      communication_style: string;
      training_preferences: string[];
      schedule_constraints: string[];
    };
    methodology_preferences: {
      mentioned_methodologies: string[];
      preferred_approaches: string[];
      methodology_questions: string[];
    };
    emotional_state: {
      current_mood: string;
      motivation_level: string;
      confidence_level: string;
    };
    key_insights: string[];
    important_context: string[];
  };
  metadata: {
    createdAt: Date;
    messageRange: {
      startMessageId: string;
      endMessageId: string;
      totalMessages: number;
    };
    triggerReason: 'message_count' | 'complexity';
    complexityIndicators?: string[];
    confidence: number;
  };
}