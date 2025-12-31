/**
 * Weekly Analytics Agent Tools
 *
 * Tools that orchestrate weekly analytics generation, validation, and storage.
 * Each tool is a discrete capability that Claude can use to generate analytics.
 */

import type { Tool } from "../core/types";
import type { WeeklyAnalyticsContext } from "./types";
import type {
  UserWeeklyData,
  WeeklyAnalytics,
  WorkoutSummary,
} from "../../analytics/types";
import type { CoachConversationSummary } from "../../coach-conversation/types";
import type { UserMemory } from "../../memory/types";
import {
  fetchWorkoutSummaries,
  fetchCoachConversationSummaries,
  fetchUserContext,
} from "../../analytics/data-fetching";
import {
  shouldNormalizeAnalytics,
  normalizeAnalytics,
  generateNormalizationSummary,
} from "../../analytics/normalization";
import {
  getCurrentWeekRange,
  getHistoricalWorkoutRange,
  getLastNWeeksRange,
} from "../../analytics/date-utils";
import {
  saveWeeklyAnalytics,
  queryWorkoutSummaries,
} from "../../../../dynamodb/operations";
import { storeDebugDataInS3 } from "../../api-helpers";
import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../../api-helpers";
import { parseJsonWithFallbacks } from "../../response-utils";
import { getAnalyticsSchemaWithContext } from "../../schemas/universal-analytics-schema";
import { storeAnalyticsDebugData } from "./helpers";

/**
 * Tool-specific result types
 */

/**
 * Result from fetch_weekly_data tool
 */
export interface FetchWeeklyDataResult {
  userId: string;
  weekRange: {
    weekStart: Date;
    weekEnd: Date;
  };
  workouts: {
    summaries: WorkoutSummary[];
    count: number;
  };
  coaching: {
    summaries: CoachConversationSummary[];
    count: number;
  };
  userContext: {
    memories: UserMemory[];
    memoryCount: number;
  };
  historical: {
    workoutSummaries: WorkoutSummary[];
    summaryCount: number;
  };
  coachIds: string[];
}

/**
 * Result from validate_weekly_data tool
 */
export interface ValidateWeeklyDataResult {
  isValid: boolean;
  shouldGenerate: boolean;
  shouldNormalize: boolean;
  confidence: number;
  completeness: number;
  validationFlags: string[];
  blockingFlags: string[];
  reason?: string;
}

/**
 * Result from generate_weekly_analytics tool
 */
export interface GenerateWeeklyAnalyticsResult {
  structuredAnalytics: any;
  humanSummary: string;
  analysisConfidence: string;
  dataCompleteness: number;
}

/**
 * Result from normalize_analytics_data tool
 */
export interface NormalizeAnalyticsDataResult {
  normalizedData: any;
  isValid: boolean;
  issuesFound: number;
  issuesCorrected: number;
  normalizationSummary: string;
  normalizationConfidence: number;
}

/**
 * Result from save_analytics_to_database tool
 */
export interface SaveAnalyticsToDatabaseResult {
  success: boolean;
  weekId: string;
  s3Location: string;
  dynamoDbSaved: boolean;
}

/**
 * Extract unique coach IDs from workout summaries
 */
const extractCoachIdsFromSummaries = async (
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> => {
  const workoutList = await queryWorkoutSummaries(userId, startDate, endDate);

  const coachIds = new Set<string>();
  workoutList.forEach((workout) => {
    if (workout.coachIds && workout.coachIds.length > 0) {
      workout.coachIds.forEach((id) => coachIds.add(id));
    }
  });

  return Array.from(coachIds);
};

/**
 * Tool 1: Fetch Weekly Data
 *
 * Gathers all necessary data for weekly analytics generation:
 * - Current week workout summaries
 * - Historical workout summaries (4 weeks prior)
 * - Coaching conversation summaries
 * - User memories and context
 */
export const fetchWeeklyDataTool: Tool<WeeklyAnalyticsContext> = {
  id: "fetch_weekly_data",
  description: `Fetch all user data needed for weekly analytics generation.

ALWAYS CALL THIS FIRST to gather all necessary data.

This tool:
- Fetches current week workout summaries (lightweight, efficient)
- Fetches historical workout summaries (4 weeks prior for trending)
- Fetches coaching conversation summaries (last 2 weeks)
- Fetches user memories and context
- Extracts unique coach IDs from workouts
- Converts dates to user's timezone

Returns: UserWeeklyData with workouts, coaching, userContext, historical data`,

  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User ID to fetch data for",
      },
      weekStart: {
        type: "string",
        description: "Week start date (ISO string)",
      },
      weekEnd: {
        type: "string",
        description: "Week end date (ISO string)",
      },
      userTimezone: {
        type: "string",
        description: "User timezone for date conversion",
      },
    },
    required: ["userId", "weekStart", "weekEnd", "userTimezone"],
  },

  async execute(
    input: any,
    context: WeeklyAnalyticsContext,
  ): Promise<FetchWeeklyDataResult> {
    console.info("📥 Executing fetch_weekly_data tool");

    const { userId, weekStart, weekEnd, userTimezone } = input;

    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekEnd);

    // Calculate historical range (4 weeks prior to current week)
    const historicalEnd = new Date(weekStartDate);
    historicalEnd.setDate(historicalEnd.getDate() - 1); // Day before week start
    const historicalStart = new Date(historicalEnd);
    historicalStart.setDate(historicalStart.getDate() - 28); // 4 weeks back

    // Step 1: Extract coach IDs from current week workouts
    const coachIds = await extractCoachIdsFromSummaries(
      userId,
      weekStartDate,
      weekEndDate,
    );

    console.info("📊 Fetching weekly data in parallel", {
      userId,
      weekRange: `${weekStartDate.toISOString().split("T")[0]} to ${weekEndDate.toISOString().split("T")[0]}`,
      historicalRange: `${historicalStart.toISOString().split("T")[0]} to ${historicalEnd.toISOString().split("T")[0]}`,
      coachIds,
    });

    // Step 2: Fetch all data in parallel
    const twoWeeksAgo = new Date(weekStartDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      currentWeekSummaries,
      historicalSummaries,
      conversationSummaries,
      memories,
    ] = await Promise.all([
      fetchWorkoutSummaries(
        userId,
        weekStartDate,
        weekEndDate,
        "current week",
        userTimezone,
      ),
      fetchWorkoutSummaries(
        userId,
        historicalStart,
        historicalEnd,
        "historical (4 weeks)",
        userTimezone,
      ),
      fetchCoachConversationSummaries(
        userId,
        coachIds,
        twoWeeksAgo,
        weekEndDate,
        "last 2 weeks",
      ),
      fetchUserContext(userId),
    ]);

    console.info("✅ Weekly data fetched:", {
      currentWeekWorkouts: currentWeekSummaries.length,
      historicalWorkouts: historicalSummaries.length,
      conversationSummaries: conversationSummaries.length,
      memories: memories.length,
    });

    return {
      userId,
      weekRange: {
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
      },
      workouts: {
        summaries: currentWeekSummaries,
        count: currentWeekSummaries.length,
      },
      coaching: {
        summaries: conversationSummaries,
        count: conversationSummaries.length,
      },
      userContext: {
        memories,
        memoryCount: memories.length,
      },
      historical: {
        workoutSummaries: historicalSummaries,
        summaryCount: historicalSummaries.length,
      },
      coachIds,
    };
  },
};

/**
 * Tool 2: Validate Weekly Data
 *
 * Validates that fetched data meets minimum requirements for analytics generation.
 * Determines if analytics should be generated and if normalization is needed.
 */
export const validateWeeklyDataTool: Tool<WeeklyAnalyticsContext> = {
  id: "validate_weekly_data",
  description: `Validate fetched weekly data and determine next steps.

ALWAYS CALL THIS SECOND after fetch_weekly_data.

This tool checks:
- Minimum workout count (requires >= 2 workouts)
- Data quality and completeness
- Historical data availability for trending
- Coaching context availability

CRITICAL DECISIONS RETURNED:
- shouldGenerate (boolean): Whether analytics should be generated
- shouldNormalize (boolean): Whether normalization will likely be needed
- confidence (number): Data quality confidence score (0-1)
- blockingFlags (array): List of flags preventing generation

For Phase 1: Minimum 2 workouts required per week.

Returns: validation result with shouldGenerate, confidence, blockingFlags`,

  inputSchema: {
    type: "object",
    properties: {
      weeklyData: {
        type: "object",
        description: "The fetched weekly data from fetch_weekly_data tool",
      },
    },
    required: ["weeklyData"],
  },

  async execute(
    input: any,
    context: WeeklyAnalyticsContext,
  ): Promise<ValidateWeeklyDataResult> {
    console.info("✅ Executing validate_weekly_data tool");

    const { weeklyData } = input;

    const validationFlags: string[] = [];
    const blockingFlags: string[] = [];

    // Calculate completeness score
    let completeness = 0;
    const weights = {
      workouts: 0.5, // Most important
      historical: 0.2, // Important for trending
      coaching: 0.15, // Helpful context
      memories: 0.15, // User context
    };

    // Workout score (primary factor)
    if (weeklyData.workouts.count >= 4) {
      completeness += weights.workouts;
    } else if (weeklyData.workouts.count >= 2) {
      completeness += weights.workouts * 0.7;
    } else if (weeklyData.workouts.count >= 1) {
      completeness += weights.workouts * 0.3;
      validationFlags.push("minimal_workouts");
    } else {
      validationFlags.push("no_workouts");
    }

    // Historical score
    if (weeklyData.historical.summaryCount >= 8) {
      completeness += weights.historical;
    } else if (weeklyData.historical.summaryCount >= 4) {
      completeness += weights.historical * 0.7;
    } else if (weeklyData.historical.summaryCount >= 1) {
      completeness += weights.historical * 0.5;
      validationFlags.push("limited_history");
    } else {
      validationFlags.push("no_history");
    }

    // Coaching score
    if (weeklyData.coaching.count >= 2) {
      completeness += weights.coaching;
    } else if (weeklyData.coaching.count >= 1) {
      completeness += weights.coaching * 0.5;
    } else {
      validationFlags.push("no_coaching_context");
    }

    // Memories score
    if (weeklyData.userContext.memoryCount >= 3) {
      completeness += weights.memories;
    } else if (weeklyData.userContext.memoryCount >= 1) {
      completeness += weights.memories * 0.5;
    } else {
      validationFlags.push("no_memories");
    }

    // Check blocking conditions (Phase 1: minimum 2 workouts)
    const minWorkoutsRequired = 2;
    if (weeklyData.workouts.count < minWorkoutsRequired) {
      blockingFlags.push("insufficient_workouts");
    }

    // Determine if generation should proceed
    const shouldGenerate = blockingFlags.length === 0;

    // Determine if normalization will likely be needed
    const shouldNormalize = completeness < 0.7;

    // Calculate confidence based on data quality
    const confidence = completeness;

    // Build reason if blocked
    let reason: string | undefined;
    if (!shouldGenerate) {
      if (blockingFlags.includes("insufficient_workouts")) {
        reason = `Insufficient workouts: ${weeklyData.workouts.count} found, minimum ${minWorkoutsRequired} required`;
      }
    }

    console.info("Validation results:", {
      shouldGenerate,
      shouldNormalize,
      confidence,
      completeness,
      validationFlags,
      blockingFlags,
      workoutCount: weeklyData.workouts.count,
    });

    return {
      isValid: shouldGenerate,
      shouldGenerate,
      shouldNormalize,
      confidence,
      completeness,
      validationFlags,
      blockingFlags,
      reason,
    };
  },
};

/**
 * Tool 3: Generate Weekly Analytics
 *
 * Generates comprehensive weekly analytics using AI.
 * Produces both structured analytics (JSON) and human-readable summary.
 */
export const generateWeeklyAnalyticsTool: Tool<WeeklyAnalyticsContext> = {
  id: "generate_weekly_analytics",
  description: `Generate comprehensive weekly analytics using AI.

CALL THIS THIRD after validation passes (shouldGenerate: true).

This tool:
- Analyzes workout data for volume, intensity, progression
- Identifies performance trends and patterns
- Calculates training intelligence metrics
- Generates actionable insights and recommendations
- Creates both structured JSON analytics and human-readable summary

The analytics follow the Universal Analytics Schema v1.0:
- metadata: Week info, sessions, data quality
- volume_breakdown: Tonnage, sets, reps by movement
- weekly_progression: Trends vs previous weeks
- performance_markers: PRs, benchmarks, achievements
- training_intelligence: Fatigue, recovery, load management
- coaching_synthesis: Key insights from coach conversations
- actionable_insights: Prioritized recommendations

Returns: structuredAnalytics (JSON), humanSummary (string), confidence metrics`,

  inputSchema: {
    type: "object",
    properties: {
      weeklyData: {
        type: "object",
        description: "The fetched weekly data",
      },
      userProfile: {
        type: "object",
        description: "User profile with athlete context",
      },
    },
    required: ["weeklyData"],
  },

  async execute(
    input: any,
    context: WeeklyAnalyticsContext,
  ): Promise<GenerateWeeklyAnalyticsResult> {
    console.info("🧠 Executing generate_weekly_analytics tool");

    const { weeklyData, userProfile } = input;
    const criticalTrainingDirective = context.userProfile?.criticalTrainingDirective;

    // Build comprehensive athlete profile from AI profile + memories
    let athleteProfile = "";

    // Add AI-generated athlete profile if available
    if (userProfile?.athleteProfile?.summary) {
      athleteProfile += `ATHLETE PROFILE:\n${userProfile.athleteProfile.summary}\n\n`;
    }

    // Add structured memories
    if (weeklyData.userContext.memories && weeklyData.userContext.memories.length > 0) {
      athleteProfile += `DETAILED CONTEXT:\n`;
      athleteProfile += weeklyData.userContext.memories
        .map((memory: UserMemory) => `${memory.memoryType.toUpperCase()}: ${memory.content}`)
        .join("\n");
    }

    if (!athleteProfile.trim()) {
      athleteProfile = "No specific athlete profile available.";
    }

    // Format current week workout summaries
    const currentWeekWorkouts = weeklyData.workouts.summaries
      .map((summary: WorkoutSummary) => {
        const userTimezone = summary.userTimezone || "America/Los_Angeles";
        const localDate = new Date(summary.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: userTimezone,
        });
        return `${localDate} - ${summary.workoutName || "Workout"} (${summary.discipline || "Unknown"}) [workout_id: ${summary.workoutId}]\n${summary.summary}`;
      })
      .join("\n\n");

    // Format historical workout summaries
    const historicalSummaries = weeklyData.historical.workoutSummaries
      .map((summary: WorkoutSummary) => {
        const userTimezone = summary.userTimezone || "America/Los_Angeles";
        const localDate = new Date(summary.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: userTimezone,
        });
        return `${localDate} - ${summary.workoutName || "Workout"}: ${summary.summary}`;
      })
      .join("\n\n");

    // Format coaching conversation summaries
    const coachingContext = weeklyData.coaching.summaries
      .map((summary: CoachConversationSummary) => {
        const date = new Date(summary.metadata.createdAt).toISOString().split("T")[0];
        return `Conversation Summary (${date}):\n${summary.narrative}\n\nKey Insights: ${summary.structuredData.key_insights.join(", ")}`;
      })
      .join("\n\n");

    // Build the analytics prompt
    const directiveSection =
      criticalTrainingDirective?.enabled && criticalTrainingDirective?.content
        ? `🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:\n\n${criticalTrainingDirective.content}\n\n---\n\n`
        : "";

    const analyticsPrompt = `${directiveSection}You are an elite strength and conditioning analyst examining training data from workout and conversation summaries.

ATHLETE CONTEXT:
${athleteProfile}

COACHING CONVERSATION SUMMARIES (Recent Period):
${coachingContext || "No recent coaching conversation summaries available."}

THIS WEEK'S WORKOUT SUMMARIES:
${currentWeekWorkouts}

PREVIOUS WEEKS WORKOUT SUMMARIES (for trending):
${historicalSummaries || "No historical data available."}

DUAL OUTPUT REQUIREMENTS:
Your response must include TWO components:

1. STRUCTURED ANALYTICS: Complete JSON analysis following the Universal Analytics Schema
2. HUMAN SUMMARY: A conversational, coach-friendly summary

ANALYZE BASED ON AVAILABLE DATA:
1. CORE VOLUME CALCULATIONS - Total volume, exercise order impact
2. ADVANCED SET ANALYSIS - Cluster sets, supersets, complexes, EMOM/Tabata
3. PROGRESSIVE OVERLOAD TRACKING - Week-over-week comparison
4. WORKOUT SEGMENT ANALYSIS - Multi-part workouts (strength + conditioning)
5. FAILURE & INTENSITY ANALYSIS - Failed rep patterns, fatigue accumulation
6. PERIODIZATION DETECTION - Current training phase identification

${getAnalyticsSchemaWithContext("generation")}

CRITICAL: Return ONLY valid JSON with both structured_analytics and human_summary fields. No markdown, no explanations, just the JSON object.`;

    console.info("📝 Analytics prompt built:", {
      promptLength: analyticsPrompt.length,
      workoutCount: weeklyData.workouts.count,
      historicalCount: weeklyData.historical.summaryCount,
    });

    // Call Claude with thinking enabled
    const analyticsResponse = (await callBedrockApi(
      analyticsPrompt,
      "analytics_generation",
      MODEL_IDS.PLANNER_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        enableThinking: true,
      },
    )) as string;

    console.info("🔍 Raw analytics response received:", {
      responseLength: analyticsResponse.length,
    });

    // Parse JSON response
    const analyticsData = parseJsonWithFallbacks(analyticsResponse);

    // Extract confidence and completeness from response
    const analysisConfidence =
      analyticsData.structured_analytics?.metadata?.analysis_confidence || "medium";
    const dataCompleteness =
      analyticsData.structured_analytics?.metadata?.data_completeness || 0.8;

    console.info("✅ Analytics generated:", {
      hasStructuredAnalytics: !!analyticsData.structured_analytics,
      hasHumanSummary: !!analyticsData.human_summary,
      humanSummaryLength: analyticsData.human_summary?.length || 0,
      analysisConfidence,
      dataCompleteness,
    });

    return {
      structuredAnalytics: analyticsData.structured_analytics,
      humanSummary: analyticsData.human_summary || "",
      analysisConfidence,
      dataCompleteness,
    };
  },
};

/**
 * Tool 4: Normalize Analytics Data
 *
 * Normalizes analytics data to ensure schema compliance.
 * Only called if validation recommends normalization or if issues are detected.
 */
export const normalizeAnalyticsDataTool: Tool<WeeklyAnalyticsContext> = {
  id: "normalize_analytics_data",
  description: `Normalize analytics data to ensure schema compliance.

ONLY CALL THIS IF:
- validate_weekly_data returns shouldNormalize: true
- OR generate_weekly_analytics output has structural issues

This tool:
- Uses AI to fix schema violations and data inconsistencies
- Corrects date boundaries (ensure all dates within week range)
- Validates mathematical consistency (totals match sums)
- Fixes missing or incorrect field types
- Improves confidence score

Returns: normalizedData, isValid, issuesFound, issuesCorrected, normalizationSummary`,

  inputSchema: {
    type: "object",
    properties: {
      analyticsData: {
        type: "object",
        description: "The generated analytics data to normalize",
      },
      weeklyData: {
        type: "object",
        description: "Original weekly data for context",
      },
    },
    required: ["analyticsData", "weeklyData"],
  },

  async execute(
    input: any,
    context: WeeklyAnalyticsContext,
  ): Promise<NormalizeAnalyticsDataResult> {
    console.info("🔧 Executing normalize_analytics_data tool");

    const { analyticsData, weeklyData } = input;

    // Run normalization
    const normalizationResult = await normalizeAnalytics(
      {
        structured_analytics: analyticsData.structuredAnalytics || analyticsData.structured_analytics,
        human_summary: analyticsData.humanSummary || analyticsData.human_summary,
      },
      weeklyData,
      context.userId,
      true, // Enable thinking for analytics normalization
    );

    const normalizationSummary = generateNormalizationSummary(normalizationResult);

    console.info("Normalization completed:", {
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      correctionsMade: normalizationResult.issues.filter((i) => i.corrected).length,
      confidence: normalizationResult.confidence,
    });

    return {
      normalizedData: normalizationResult.normalizedData,
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      issuesCorrected: normalizationResult.issues.filter((i) => i.corrected).length,
      normalizationSummary,
      normalizationConfidence: normalizationResult.confidence,
    };
  },
};

/**
 * Tool 5: Save Analytics to Database
 *
 * Saves finalized analytics to S3 and DynamoDB.
 * Final step in the analytics workflow.
 */
export const saveAnalyticsToDatabaseTool: Tool<WeeklyAnalyticsContext> = {
  id: "save_analytics_to_database",
  description: `Save finalized analytics to S3 and DynamoDB.

⚠️ ONLY CALL THIS AS THE FINAL STEP after:
1. fetch_weekly_data (complete)
2. validate_weekly_data (shouldGenerate: true)
3. generate_weekly_analytics (complete)
4. normalize_analytics_data (if needed)

This tool:
- Stores full analytics JSON in S3 (debug bucket)
- Saves analytics record to DynamoDB
- Generates metadata for querying

DO NOT call this if:
- Validation found blocking flags
- shouldGenerate is false
- User didn't meet minimum workout requirement

Returns: success, weekId, s3Location, dynamoDbSaved`,

  inputSchema: {
    type: "object",
    properties: {
      analyticsData: {
        type: "object",
        description: "The finalized analytics data",
      },
      weeklyData: {
        type: "object",
        description: "Original weekly data for metadata",
      },
      weekId: {
        type: "string",
        description: "Week identifier (YYYY-WW format)",
      },
      normalizationApplied: {
        type: "boolean",
        description: "Whether normalization was applied",
      },
    },
    required: ["analyticsData", "weeklyData", "weekId"],
  },

  async execute(
    input: any,
    context: WeeklyAnalyticsContext,
  ): Promise<SaveAnalyticsToDatabaseResult> {
    console.info("💾 Executing save_analytics_to_database tool");

    const { analyticsData, weeklyData, weekId, normalizationApplied = false } = input;

    const userId = context.userId;

    // Prepare the complete analytics object
    const completeAnalytics = {
      structured_analytics: analyticsData.structuredAnalytics || analyticsData.structured_analytics,
      human_summary: analyticsData.humanSummary || analyticsData.human_summary,
    };

    // 1. Store analytics in S3
    console.info("📤 Storing analytics in S3...");
    let s3Location: string;

    try {
      s3Location = await storeDebugDataInS3(
        JSON.stringify(completeAnalytics, null, 2),
        {
          userId,
          type: "weekly-analytics",
          weekId,
          weekStart: weeklyData.weekRange.weekStart.toISOString(),
          weekEnd: weeklyData.weekRange.weekEnd.toISOString(),
          workoutCount: weeklyData.workouts.count,
          conversationCount: weeklyData.coaching.count,
          memoryCount: weeklyData.userContext.memoryCount,
          historicalSummaryCount: weeklyData.historical.summaryCount,
          analyticsLength: JSON.stringify(completeAnalytics).length,
          hasAthleteProfile: !!context.userProfile?.athleteProfile?.summary,
          hasDualOutput: !!(completeAnalytics.structured_analytics && completeAnalytics.human_summary),
          humanSummaryLength: completeAnalytics.human_summary?.length || 0,
          normalizationApplied,
        },
      );

      console.info("✅ Analytics stored in S3:", { s3Location });
    } catch (s3Error) {
      console.error("❌ Failed to store analytics in S3:", s3Error);
      throw s3Error;
    }

    // 2. Save to DynamoDB
    console.info("📥 Saving analytics to DynamoDB...");
    let dynamoDbSaved = false;

    try {
      const weeklyAnalytics: WeeklyAnalytics = {
        userId,
        weekId,
        weekStart: new Date(weeklyData.weekRange.weekStart).toISOString().split("T")[0],
        weekEnd: new Date(weeklyData.weekRange.weekEnd).toISOString().split("T")[0],
        analyticsData: completeAnalytics,
        s3Location,
        metadata: {
          workoutCount: weeklyData.workouts.count,
          conversationCount: weeklyData.coaching.count,
          memoryCount: weeklyData.userContext.memoryCount,
          historicalSummaryCount: weeklyData.historical.summaryCount,
          analyticsLength: JSON.stringify(completeAnalytics).length,
          hasAthleteProfile: !!context.userProfile?.athleteProfile?.summary,
          hasDualOutput: !!(completeAnalytics.structured_analytics && completeAnalytics.human_summary),
          humanSummaryLength: completeAnalytics.human_summary?.length || 0,
          normalizationApplied,
          analysisConfidence:
            completeAnalytics.structured_analytics?.metadata?.analysis_confidence || "medium",
          dataCompleteness:
            completeAnalytics.structured_analytics?.metadata?.data_completeness || 0.8,
        },
      };

      await saveWeeklyAnalytics(weeklyAnalytics);
      dynamoDbSaved = true;

      console.info("✅ Analytics saved to DynamoDB:", {
        weekId,
        userId,
      });
    } catch (dynamoError) {
      console.warn("⚠️ Failed to save analytics to DynamoDB:", dynamoError);
      // Continue - S3 storage succeeded
    }

    // Store debug data
    await storeAnalyticsDebugData("success", {
      userId,
      weekId,
      s3Location,
      dynamoDbSaved,
      workoutCount: weeklyData.workouts.count,
      normalizationApplied,
    });

    console.info("✅ Analytics saved successfully");

    return {
      success: true,
      weekId,
      s3Location,
      dynamoDbSaved,
    };
  },
};
