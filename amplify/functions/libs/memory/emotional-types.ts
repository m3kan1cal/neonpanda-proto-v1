/**
 * Emotional Intelligence Types
 *
 * Types for tracking emotional state snapshots, trends, and patterns
 * across coaching conversations. Fed into the Living Profile and used
 * for real-time coaching tone adaptation.
 */

/**
 * A point-in-time emotional snapshot extracted from a conversation.
 * Stored in DynamoDB with SK pattern: emotionalSnapshot#{snapshotId}
 */
export interface EmotionalSnapshot {
  snapshotId: string;
  userId: string;
  coachId: string;
  conversationId: string;
  timestamp: string;
  /** Core dimensions (1-10 scale) */
  motivation: number;
  energy: number;
  confidence: number;
  stress: number;
  coachSatisfaction: number;
  /** Primary emotion label: "excited", "frustrated", "anxious", "calm", etc. */
  dominantEmotion: string;
  /** Brief narrative: "User seems burnt out from work stress but still showed up" */
  emotionalNarrative: string;
  /** What triggered the emotional state: ["work_stress", "pr_attempt_failed"] */
  triggers: string[];
  /** Topics discussed in this conversation */
  conversationTopics: string[];
  dayOfWeek: string;
  timeOfDay: string;
}

/**
 * Aggregated emotional trends over a time period.
 * Stored in DynamoDB with SK pattern: emotionalTrend#{period}#{periodStart}
 */
export interface EmotionalTrend {
  userId: string;
  period: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  averages: {
    motivation: number;
    energy: number;
    confidence: number;
    stress: number;
  };
  trend: {
    motivation: "rising" | "stable" | "declining";
    energy: "rising" | "stable" | "declining";
    confidence: "rising" | "stable" | "declining";
    stress: "rising" | "stable" | "declining";
  };
  patterns: Array<{
    pattern: string;
    confidence: number;
    category: "temporal" | "event_driven" | "seasonal" | "cyclical";
  }>;
  /** AI-generated coaching guidance based on trends */
  insights: string[];
}
