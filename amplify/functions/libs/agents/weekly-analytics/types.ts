/**
 * Weekly Analytics Agent Types
 *
 * Specific type definitions for the weekly analytics agent.
 * Extends the core agent types with analytics-specific context.
 */

import type { AgentContext } from "../core/types";
import type { UserProfile } from "../../user/types";
import type { WeeklyAnalytics, UserWeeklyData } from "../../analytics/types";

/**
 * Weekly Analytics Context
 *
 * Contains all data needed for weekly analytics generation tools.
 * Passed to the agent during initialization.
 */
export interface WeeklyAnalyticsContext extends AgentContext {
  // Inherits from AgentContext:
  // - userId (required)

  // User profile for context
  userProfile: UserProfile;

  // Week identifier (YYYY-WW format)
  weekId: string;

  // Week date range
  weekStart: Date;
  weekEnd: Date;

  // User's timezone for date conversion
  userTimezone: string;
}

/**
 * Result from weekly analytics generation process
 */
export interface WeeklyAnalyticsResult {
  success: boolean;

  // Success case
  weekId?: string;
  userId?: string;
  s3Location?: string;
  analyticsData?: any;
  metadata?: {
    workoutCount: number;
    conversationCount: number;
    memoryCount: number;
    historicalSummaryCount: number;
    analyticsLength: number;
    hasAthleteProfile: boolean;
    hasDualOutput: boolean;
    humanSummaryLength: number;
    normalizationApplied?: boolean;
    analysisConfidence: string;
    dataCompleteness: number;
  };

  // Failure case
  skipped?: boolean;
  reason?: string;
  blockingFlags?: string[];
}

/**
 * Event type for weekly analytics Lambda invocation
 */
export interface WeeklyAnalyticsAgentEvent {
  userId: string;
  userProfile: UserProfile;
  weekId: string;
  weekStart: string; // ISO date string
  weekEnd: string; // ISO date string
  userTimezone: string;
}
