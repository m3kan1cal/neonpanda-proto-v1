/**
 * Memory-related types and interfaces
 */

/**
 * All supported memory types:
 * - preference: Training preferences, communication style, etc.
 * - goal: Fitness goals, targets, aspirations
 * - constraint: Physical limitations, time constraints, equipment limitations
 * - instruction: Specific coaching instructions or approaches
 * - context: Personal context, background, lifestyle factors
 * - prospective: Forward-looking commitments, events, and follow-ups with target dates
 * - episodic: Rich, specific moments from conversations (highlights, breakthroughs)
 * - behavioral: Observed patterns inferred from data, not stated by user
 */
export type MemoryType =
  | "preference"
  | "goal"
  | "constraint"
  | "instruction"
  | "context"
  | "prospective"
  | "episodic"
  | "behavioral";

export interface UserMemory {
  memoryId: string;
  userId: string;
  coachId?: string | null; // Optional - memories can be coach-specific (string) or global (null/undefined)
  content: string; // The memory content/description
  memoryType: MemoryType;
  metadata: {
    createdAt: Date;
    lastUsed?: Date;
    usageCount: number;
    source: "conversation" | "explicit_request" | "system_extraction";
    importance: "high" | "medium" | "low";
    tags?: string[];
    // Prospective memory metadata
    prospective?: ProspectiveMemoryMetadata;
    // Memory lifecycle metadata (for temporal decay — Upgrade 3)
    lifecycle?: MemoryLifecycleMetadata;
  };
}

/**
 * Prospective Memory: Forward-looking commitments and events the coach should follow up on.
 * Examples: "marathon in October", "trying sumo deadlifts next week", "vacation Aug 1-15"
 */
export interface ProspectiveMemoryMetadata {
  /** ISO date string for the target event/commitment, if known */
  targetDate?: string;
  /** How precise the date reference is */
  targetDateType: "specific" | "approximate" | "recurring" | "relative";
  /** Original timeframe phrasing when date is relative: "next week", "in 2 months" */
  relativeTimeframe?: string;
  /** What kind of follow-up this requires */
  followUpType:
    | "event_outcome"
    | "commitment_check"
    | "milestone"
    | "try_new_thing"
    | "general";
  /** Natural-language coaching prompt: "Ask how the marathon went" */
  followUpPrompt: string;
  /** Lifecycle status of this prospective memory */
  status: "pending" | "triggered" | "resolved" | "expired";
  /** When the prospective memory was resolved */
  resolvedAt?: string;
  /** Why it was resolved: "user_confirmed", "coach_followed_up", "expired", "user_cancelled" */
  resolvedReason?: string;
  /** Conversation snippet that created this memory */
  originalContext: string;
  /** Window around targetDate when this memory should be surfaced */
  triggerWindow: {
    /** Days before targetDate to start surfacing (e.g., 3 = start 3 days before) */
    startDaysBefore: number;
    /** Days after targetDate to keep surfacing (e.g., 5 = ask how it went for 5 days after) */
    endDaysAfter: number;
  };
}

/**
 * Memory lifecycle metadata for temporal decay (Upgrade 3 placeholder).
 * Fields are defined now so the data model is ready for Upgrade 3.
 */
export interface MemoryLifecycleMetadata {
  state: "active" | "compressed" | "archived";
  originalContent?: string;
  compressedAt?: string;
  archivedAt?: string;
  /** DSR model: days until retrievability drops to ~37%. Grows with each retrieval. */
  stability: number;
  /** Times retrieved in conversations (drives stability growth) */
  reinforcementCount: number;
  /** ISO date: decay clock resets from this date */
  lastReinforcedAt?: string;
  /** Memory IDs that contradict this memory */
  contradictedBy?: string[];
  /** If this memory was merged into another, the target memory ID */
  mergedInto?: string;
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
    type: MemoryType;
    importance: "high" | "medium" | "low";
  };
  reasoning?: string;
  /** Whether the message contains a forward-looking event/commitment */
  hasProspectiveElement?: boolean;
  /** Extracted prospective details if hasProspectiveElement is true */
  prospectiveDetails?: {
    content: string;
    targetDate?: string;
    targetDateType: ProspectiveMemoryMetadata["targetDateType"];
    relativeTimeframe?: string;
    followUpType: ProspectiveMemoryMetadata["followUpType"];
    followUpPrompt: string;
  };
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
  type: MemoryType;
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

/**
 * Result from prospective memory extraction (run on user message + AI response)
 */
export interface ProspectiveExtractionResult {
  hasProspectiveElements: boolean;
  items: Array<{
    content: string;
    targetDate?: string;
    targetDateType: ProspectiveMemoryMetadata["targetDateType"];
    relativeTimeframe?: string;
    followUpType: ProspectiveMemoryMetadata["followUpType"];
    followUpPrompt: string;
    importance: "high" | "medium" | "low";
    triggerWindowDaysBefore: number;
    triggerWindowDaysAfter: number;
    originalContext: string;
  }>;
}
