/**
 * Business Logic Types for Streaming Functions
 *
 * Reusable interfaces and types for streaming Lambda functions that handle
 * business logic like coach conversations, workout processing, etc.
 */

// Core validation and extraction types
export interface ValidationParams {
  userId: string;
  coachId: string;
  conversationId: string;
  userResponse: string;
  messageTimestamp: string;
}

// Data loading result types
export interface ConversationData {
  existingConversation: any;
  coachConfig: any;
  context: any;
  userProfile?: any; // User profile for timezone and preferences
}

// Combined business logic parameters
export interface BusinessLogicParams extends ValidationParams, ConversationData {}

// Business processing results
export interface BusinessResults {
  workoutResult: any;
  memoryResult: any;
  memoryRetrieval: any;
  newUserMessage: any;
  newAiMessage: any;
  conversationContext: any;
  promptMetadata: any;
}

// Feature flags interface for consistent feature toggling
export interface StreamingFeatureFlags {
  ENABLE_WORKOUT_DETECTION: boolean;
  ENABLE_MEMORY_PROCESSING: boolean;
  ENABLE_CONVERSATION_SUMMARY: boolean;
}

// Streaming processing phases for consistent error handling
export type StreamingPhase =
  | "validation"
  | "data_loading"
  | "business_logic"
  | "ai_streaming"
  | "finalization";

// Error context for better debugging
export interface StreamingErrorContext {
  phase: StreamingPhase;
  userId?: string;
  conversationId?: string;
  originalError: Error;
}

// Progress event types for consistent UX
export type ProgressEventType =
  | "start"
  | "processing_message"
  | "generating_response"
  | "ai_chunk"
  | "complete";

// Streaming metrics for monitoring
export interface StreamingMetrics {
  startTime: Date;
  endTime?: Date;
  phase: StreamingPhase;
  chunkCount: number;
  errorCount: number;
  userId: string;
  conversationId: string;
}

// Smart Request Router Types for AI Call Optimization
export interface SmartRequestRouter {
  // Intent & Contextual Updates
  userIntent: "workout_logging" | "memory_request" | "question" | "progress_check" | "acknowledgment" | "general";
  showContextualUpdates: boolean;

  // Workout Processing
  workoutDetection: {
    isWorkoutLog: boolean;
    confidence: number;
    workoutType: "strength" | "cardio" | "crossfit" | "general" | null;
    reasoning: string;
  };

  // Memory Processing (CONSOLIDATED)
  memoryProcessing: {
    needsRetrieval: boolean;
    isMemoryRequest: boolean;
    memoryCharacteristics: {
      type: "preference" | "goal" | "constraint" | "instruction";
      importance: "low" | "medium" | "high";
      isCoachSpecific: boolean;
      suggestedTags: string[];
    } | null;
    reasoning: string;
  };

  // Context & Search
  contextNeeds: {
    needsPineconeSearch: boolean;
    searchTypes: string[];
    reasoning: string;
  };

  // Conversation Management
  conversationComplexity: {
    hasComplexity: boolean;
    complexityTypes: string[];
    needsSummary: boolean;
    confidence: number;
    reasoning: string;
  };

  // Processing Priorities (for concurrent execution)
  processingPriority: {
    workoutFirst: boolean;
    memoryFirst: boolean;
    contextFirst: boolean;
  };

  // Router metadata
  routerMetadata: {
    confidence: number;
    processingTime?: number;
    fallbackUsed: boolean;
  };
}
