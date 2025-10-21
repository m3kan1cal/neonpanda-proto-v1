/**
 * Coach Conversation Types
 *
 * This module contains TypeScript interfaces and types specific to
 * coach conversation functionality including messages, conversations, and metadata.
 */

import { CoachConfig, DynamoDBItem } from "../coach-creator/types";
import { UserMemory } from "../memory";

/**
 * Individual message in a coach conversation
 */
export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;

  // NEW: Image support
  messageType?: 'text' | 'text_with_images' | 'voice';
  imageS3Keys?: string[]; // S3 keys like "user-uploads/user-123/abc.jpg"

  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
  };
}

/**
 * Conversation mode types
 * - 'chat': Standard coaching conversation (default)
 * - 'build': Training program creation mode with structured generation
 */
export type ConversationMode = 'chat' | 'build';

/**
 * Conversation mode constants
 * Use these instead of string literals to ensure type safety and consistency
 */
export const CONVERSATION_MODES = {
  CHAT: 'chat' as const,
  BUILD: 'build' as const,
} satisfies Record<string, ConversationMode>;

/**
 * Complete coach conversation with full message history
 */
export interface CoachConversation {
  conversationId: string;
  coachId: string;
  userId: string;
  title?: string;
  mode?: ConversationMode; // NEW: Determines conversation behavior and prompts (defaults to 'chat' for backwards compatibility)
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
  mode?: ConversationMode; // Optional for backwards compatibility
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
  triggerReason: "message_count" | "complexity";
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
    conversation_tags: string[];
  };
  metadata: {
    createdAt: Date;
    messageRange: {
      startMessageId: string;
      endMessageId: string;
      totalMessages: number;
    };
    triggerReason: "message_count" | "complexity";
    complexityIndicators?: string[];
    confidence: number;
  };
}

export interface MethodologyIntent {
  isComparison: boolean;
  isImplementationQuestion: boolean;
  isPrincipleQuestion: boolean;
  methodologies: string[];
  primaryMethodology: string | null;
}

export interface EnhancedMethodologyOptions {
  topK?: number;
  contextType?: "conversation" | "workout_generation";
  includeComparisons?: boolean;
  includeProgression?: boolean;
  includePracticalApplication?: boolean;
}

/**
 * Conversation context information for prompt generation
 */
export interface ConversationContext {
  userName?: string;
  currentGoals?: string[];
  sessionNumber?: number;
  previousSessions?: number;
}

/**
 * Workout context information for prompt generation
 */
export interface WorkoutContext {
  completedAt: Date;
  summary?: string;
  discipline?: string;
  workoutName?: string;
}

/**
 * Coach config input type - can be either direct CoachConfig or DynamoDB item
 */
export type CoachConfigInput = CoachConfig | DynamoDBItem<CoachConfig>;

/**
 * Interface for system prompt generation options
 */
export interface PromptGenerationOptions {
  includeConversationGuidelines?: boolean;
  includeUserContext?: boolean;
  includeDetailedBackground?: boolean;
  conversationContext?: ConversationContext;
  additionalConstraints?: string[];
  workoutContext?: WorkoutContext[];
  userMemories?: UserMemory[];
  criticalTrainingDirective?: {
    content: string;
    enabled: boolean;
  };
  userTimezone?: string; // User's timezone for temporal context (e.g., 'America/Los_Angeles')
  mode?: ConversationMode; // NEW: Conversation mode for specialized prompts
}

/**
 * Interface for the complete system prompt result
 */
export interface SystemPrompt {
  systemPrompt: string;
  metadata: {
    coachId: string;
    coachName: string;
    primaryPersonality: string;
    methodology: string;
    safetyConstraints: string[];
    generatedAt: string;
    promptLength: number;
  };
}

/**
 * Interface for coach config validation results
 */
export interface CoachConfigValidationResult {
  isValid: boolean;
  missingComponents: string[];
  warnings: string[];
}

/**
 * Interface for system prompt preview/summary
 */
export interface SystemPromptPreview {
  coachName: string;
  personality: string;
  methodology: string;
  safetyConstraints: number;
  estimatedLength: number;
  keyFeatures: string[];
  dataRichness: string[];
}
