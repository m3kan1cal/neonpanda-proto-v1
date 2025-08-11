/**
 * Analytics Types
 *
 * Type definitions for analytics processing and batch operations.
 */

import { DynamoDBItem } from "../coach-creator/types";
import { Workout } from "../workout/types";
import { CoachConversation } from "../coach-conversation/types";
import { UserMemory } from "../user/types";

/**
 * Event type for weekly analytics trigger from EventBridge
 */
export interface WeeklyAnalyticsEvent {
  source: string;
  detail: any;
}

/**
 * Historical workout summary for analytics context
 */
export interface HistoricalWorkoutSummary {
  date: Date;
  workoutId: string;
  workoutName?: string;
  discipline?: string;
  summary: string;
}

/**
 * Aggregated data for a single user's weekly analytics
 */
export interface UserWeeklyData {
  userId: string;
  weekRange: {
    weekStart: Date;
    weekEnd: Date;
  };
  workouts: {
    completed: DynamoDBItem<Workout>[];
    count: number;
  };
  coaching: {
    conversations: DynamoDBItem<CoachConversation>[];
    totalMessages: number;
  };
  userContext: {
    memories: UserMemory[];
    memoryCount: number;
  };
  historical: {
    workoutSummaries: HistoricalWorkoutSummary[];
    summaryCount: number;
  };
}

/**
 * Result of analytics normalization process
 */
export interface NormalizationResult {
  isValid: boolean;
  normalizedData: any;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: "ai" | "skipped";
}

/**
 * Issue found during analytics normalization
 */
export interface NormalizationIssue {
  type: "structural" | "data_consistency" | "quality_threshold" | "cross_validation";
  severity: "error" | "warning";
  section: string;
  field: string;
  description: string;
  corrected: boolean;
}

/**
 * Weekly analytics data for DynamoDB storage
 */
export interface WeeklyAnalytics {
  userId: string;
  weekId: string; // Format: YYYY-WW (e.g., "2025-W32")
  weekStart: string; // ISO date string
  weekEnd: string; // ISO date string
  analyticsData: any; // The complete analytics JSON (structured_analytics + human_summary)
  s3Location: string; // Reference to the S3 file
  metadata: {
    workoutCount: number;
    conversationCount: number;
    memoryCount: number;
    historicalSummaryCount: number;
    analyticsLength: number;
    hasAthleteProfile: boolean;
    hasDualOutput: boolean;
    humanSummaryLength: number;
    normalizationApplied?: boolean;
    analysisConfidence: string; // "high" | "medium" | "low"
    dataCompleteness: number; // 0.0 - 1.0
  };
}
