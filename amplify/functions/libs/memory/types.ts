/**
 * Memory-related types and interfaces
 */

export interface UserMemory {
  memoryId: string;
  userId: string;
  coachId?: string | null; // Optional - memories can be coach-specific (string) or global (null/undefined)
  content: string; // The memory content/description
  memoryType: "preference" | "goal" | "constraint" | "instruction" | "context";
  metadata: {
    createdAt: Date;
    lastUsed?: Date;
    usageCount: number;
    source: "conversation" | "explicit_request";
    importance: "high" | "medium" | "low";
    tags?: string[];
  };
}

export interface MemoryDetectionEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  messageContext?: string;
}

export interface MemoryDetectionResult {
  isMemoryRequest: boolean;
  confidence: number;
  extractedMemory?: {
    content: string;
    type: "preference" | "goal" | "constraint" | "instruction" | "context";
    importance: "high" | "medium" | "low";
  };
  reasoning?: string;
}

export interface MemoryRetrievalResult {
  memories: UserMemory[];
}

export interface MemoryProcessingResult {
  memoryFeedback: string | null;
}

export interface MemoryRetrievalNeedResult {
  needsSemanticRetrieval: boolean;
  confidence: number;
  contextTypes: string[];
  reasoning: string;
}

export interface MemoryCharacteristicsResult {
  type: "preference" | "goal" | "constraint" | "instruction" | "context";
  importance: "high" | "medium" | "low";
  isCoachSpecific: boolean;
  confidence: number;
  suggestedTags: string[];
  exerciseTags: string[];
  reasoning: {
    type: string;
    importance: string;
    scope: string;
    tags: string;
    exercises: string;
  };
}
