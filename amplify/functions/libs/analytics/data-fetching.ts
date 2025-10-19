import {
  queryWorkouts,
  getWorkout,
  queryCoachConversations,
  getCoachConversation,
  queryMemories,
  queryCoachConversationSummaries,
  queryWorkoutSummaries,
} from "../../../dynamodb/operations";
import { callBedrockApi, MODEL_IDS } from "../api-helpers";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import {
  shouldNormalizeAnalytics,
  normalizeAnalytics,
  generateNormalizationSummary,
} from "./normalization";
import {
  getCurrentWeekRange,
  getLastNWeeksRange,
  getHistoricalWorkoutRange,
  getWeekDescription,
  getCurrentMonthRange,
  getHistoricalMonthRange,
  getUserTimezoneOrDefault,
  convertUTCToUserDate,
} from "./date-utils";
import { Workout } from "../workout/types";
import { CoachConversation, CoachConversationSummary } from "../coach-conversation/types";
import { UserProfile } from "../user/types";
import { UserMemory } from "../memory/types";
import { DynamoDBItem } from "../coach-creator/types";
import {
  HistoricalWorkoutSummary,
  UserWeeklyData,
  UserMonthlyData,
  WorkoutSummary,
} from "./types";
import { getAnalyticsSchemaWithContext } from "../schemas/universal-analytics-schema";

/**
 * Fetch workout summaries for a date range (for analytics)
 * Uses efficient ProjectionExpression to only fetch summary fields, not full workout data
 * Converts completedAt timestamps to user's timezone for proper date aggregation
 */
export const fetchWorkoutSummaries = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string,
  userTimezone?: string
): Promise<WorkoutSummary[]> => {
  console.info(
    `Fetching workout summaries for user ${userId} for ${periodLabel}`,
    {
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    }
  );

  try {
    // Use specialized query that only fetches summary fields (much more efficient)
    const workoutList = await queryWorkoutSummaries(
      userId,
      startDate,
      endDate
    );

    console.info(
      `Found ${workoutList.length} workout summaries for user ${userId} in ${periodLabel}`
    );

    if (workoutList.length === 0) {
      return [];
    }

    // Map to WorkoutSummary format
    const workoutSummaries: WorkoutSummary[] = [];

    for (let i = 0; i < workoutList.length; i++) {
      const workout = workoutList[i];

      // Only include workouts that have summaries
      if (workout.attributes.summary && workout.attributes.summary.length > 50) {
        workoutSummaries.push({
          date: workout.attributes.completedAt,
          workoutId: workout.attributes.workoutId,
          workoutName: workout.attributes.workoutName,
          discipline: workout.attributes.discipline,
          summary: workout.attributes.summary,
          userTimezone: userTimezone, // Pass timezone for later conversion
        });

        console.info(
          `Workout summary ${i + 1}/${workoutList.length}: ${workout.attributes.workoutName || workout.attributes.workoutId} (${workout.attributes.summary.length} chars)`
        );
      } else {
        console.warn(
          `Workout ${i + 1}/${workoutList.length}: ${workout.attributes.workoutId} - no summary available, skipping`
        );
      }
    }

    console.info(
      `Successfully extracted ${workoutSummaries.length} workout summaries for user ${userId} in ${periodLabel}`
    );
    return workoutSummaries;
  } catch (error) {
    console.error(
      `Error fetching workout summaries for user ${userId} in ${periodLabel}:`,
      error
    );
    return [];
  }
};

/**
 * Extract unique coach IDs from workout summaries
 * Uses efficient query to avoid fetching full workout data
 */
const extractCoachIdsFromSummaries = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<string[]> => {
  // Use specialized query that only fetches needed fields
  const workoutList = await queryWorkoutSummaries(
    userId,
    startDate,
    endDate
  );

  const coachIds = new Set<string>();

  workoutList.forEach((workout) => {
    if (workout.attributes.coachIds && workout.attributes.coachIds.length > 0) {
      workout.attributes.coachIds.forEach((id) => coachIds.add(id));
    }
  });

  const uniqueCoachIds = Array.from(coachIds);
  console.info(
    `Extracted ${uniqueCoachIds.length} unique coach IDs: [${uniqueCoachIds.join(", ")}]`
  );

  return uniqueCoachIds;
};

/**
 * Fetch coach conversation summaries for a date range (for analytics)
 * Returns conversation summaries instead of full message history
 */
export const fetchCoachConversationSummaries = async (
  userId: string,
  coachIds: string[],
  startDate: Date,
  endDate: Date,
  periodLabel: string
): Promise<CoachConversationSummary[]> => {
  console.info(
    `Fetching conversation summaries for user ${userId}, coaches [${coachIds.join(", ")}] for ${periodLabel}`
  );

  try {
    if (coachIds.length === 0) {
      console.info(
        `No coaches found for user ${userId}, skipping conversation summaries`
      );
      return [];
    }

    const allSummaries: CoachConversationSummary[] = [];

    for (const coachId of coachIds) {
      try {
        // Query conversation summaries for this coach
        const summaries = await queryCoachConversationSummaries(userId, coachId);
        console.info(
          `Found ${summaries.length} conversation summaries for user ${userId} and coach ${coachId}`
        );

        if (summaries.length === 0) {
          continue;
        }

        // Filter summaries to the date range based on their createdAt timestamp
        const filteredSummaries = summaries
          .filter((summaryItem) => {
            const summaryDate = new Date(summaryItem.attributes.metadata.createdAt);
            return summaryDate >= startDate && summaryDate <= endDate;
          })
          .map((summaryItem) => summaryItem.attributes); // Extract attributes from DynamoDBItem

        console.info(
          `Filtered to ${filteredSummaries.length} conversation summaries in date range for coach ${coachId}`
        );

        allSummaries.push(...filteredSummaries);
      } catch (error) {
        console.error(
          `Failed to fetch conversation summaries for user ${userId} and coach ${coachId}:`,
          error
        );
        // Continue with other coaches
      }
    }

    console.info(
      `Successfully fetched ${allSummaries.length} conversation summaries for user ${userId} across ${coachIds.length} coaches in ${periodLabel}`
    );
    return allSummaries;
  } catch (error) {
    console.error(
      `Error fetching conversation summaries for user ${userId} in ${periodLabel}:`,
      error
    );
    return [];
  }
};

/**
 * Extract unique coach IDs from a list of workouts
 * @deprecated Use extractCoachIdsFromSummaries instead
 */
const extractCoachIds = (workouts: DynamoDBItem<Workout>[]): string[] => {
  const coachIds = new Set<string>();

  workouts.forEach((workout) => {
    if (workout.attributes.coachIds && workout.attributes.coachIds.length > 0) {
      workout.attributes.coachIds.forEach((id) => coachIds.add(id));
    }
  });

  const uniqueCoachIds = Array.from(coachIds);
  console.info(
    `Extracted ${uniqueCoachIds.length} unique coach IDs: [${uniqueCoachIds.join(", ")}]`
  );

  return uniqueCoachIds;
};

/**
 * Step 4: Fetch current week workout data for a user
 */
export const fetchCurrentWeekWorkouts = async (
  userId: string
): Promise<DynamoDBItem<Workout>[]> => {
  const weekRange = getCurrentWeekRange();

  console.info(
    `Fetching workouts for user ${userId} for week: ${getWeekDescription(weekRange)}`
  );

  try {
    // Step 4a: Get simplified workout list for current week
    const workoutList = await queryWorkouts(userId, {
      fromDate: weekRange.weekStart,
      toDate: weekRange.weekEnd,
      sortBy: "completedAt",
      sortOrder: "desc",
    });

    console.info(
      `Found ${workoutList.length} workouts for user ${userId} in current week`
    );

    if (workoutList.length === 0) {
      return [];
    }

    // Step 4b: Get full workout details for each workout
    const fullWorkouts: DynamoDBItem<Workout>[] = [];

    for (let i = 0; i < workoutList.length; i++) {
      const workoutSummary = workoutList[i];
      try {
        console.info(
          `Loading workout ${i + 1}/${workoutList.length}: ${workoutSummary.attributes.workoutId} (${workoutSummary.attributes.workoutData?.workout_name || "Unnamed Workout"})`
        );

        const fullWorkout = await getWorkout(
          userId,
          workoutSummary.attributes.workoutId
        );
        if (fullWorkout) {
          fullWorkouts.push(fullWorkout);
        }
      } catch (error) {
        console.error(
          `❌ Failed to fetch workout ${i + 1}/${workoutList.length} (${workoutSummary.attributes.workoutId}) for user ${userId}:`,
          error
        );
        // Continue with other workouts
      }
    }

    console.info(
      `Successfully fetched ${fullWorkouts.length} full workouts for user ${userId}`
    );
    return fullWorkouts;
  } catch (error) {
    console.error(`Error fetching workouts for user ${userId}:`, error);
    return [];
  }
};

/**
 * Step 5: Fetch historical workout summaries (4 weeks before current week)
 */
export const fetchHistoricalWorkoutSummaries = async (
  userId: string
): Promise<HistoricalWorkoutSummary[]> => {
  const historicalRange = getHistoricalWorkoutRange();

  console.info(
    `Fetching historical workout summaries for user ${userId} for period: ${getWeekDescription(historicalRange)}`
  );

  try {
    // Query historical workouts (simplified list only)
    const historicalWorkouts = await queryWorkouts(userId, {
      fromDate: historicalRange.weekStart,
      toDate: historicalRange.weekEnd,
      sortBy: "completedAt",
      sortOrder: "desc", // Most recent first for chronological order
    });

    console.info(
      `Found ${historicalWorkouts.length} historical workouts for user ${userId}`
    );

    if (historicalWorkouts.length === 0) {
      return [];
    }

    // Extract summaries from workouts that have them
    const workoutSummaries: HistoricalWorkoutSummary[] = [];

    for (let i = 0; i < historicalWorkouts.length; i++) {
      const workout = historicalWorkouts[i];

      // Only include workouts that have substantial summaries
      if (
        workout.attributes.summary &&
        workout.attributes.summary.length > 50
      ) {
        workoutSummaries.push({
          date: new Date(workout.attributes.completedAt),
          workoutId: workout.attributes.workoutId,
          workoutName: workout.attributes.workoutData?.workout_name,
          discipline: workout.attributes.workoutData?.discipline,
          summary: workout.attributes.summary,
        });

        console.info(
          `Loaded workout (historical) ${i + 1}: ${workout.attributes.workoutData?.workout_name || workout.attributes.workoutId} loaded (${workout.attributes.summary.length} chars)`
        );
      } else {
        console.info(
          `Skipped workout (historical) ${i + 1}: ${workout.attributes.workoutId} (no substantial summary)`
        );
      }
    }

    console.info(
      `Successfully extracted ${workoutSummaries.length} historical workout summaries for user ${userId}`
    );
    return workoutSummaries;
  } catch (error) {
    console.error(
      `Error fetching historical workout summaries for user ${userId}:`,
      error
    );
    return [];
  }
};

/**
 * Step 6: Fetch coaching context (last 2 weeks of conversations)
 */
export const fetchCoachingContext = async (
  userId: string,
  coachIds: string[]
): Promise<DynamoDBItem<CoachConversation>[]> => {
  const twoWeeksRange = getLastNWeeksRange(2);

  console.info(
    `Fetching coaching context for user ${userId}, coaches [${coachIds.join(", ")}] for period: ${getWeekDescription(twoWeeksRange)}`
  );

  try {
    if (coachIds.length === 0) {
      console.info(
        `No coaches found in workouts for user ${userId}, skipping coaching context`
      );
      return [];
    }

    // Step 6a: Get simplified conversation list for each coach
    let allConversations: DynamoDBItem<CoachConversation>[] = [];

    for (const coachId of coachIds) {
      try {
        const conversationList = await queryCoachConversations(userId, coachId);
        console.info(
          `Found ${conversationList.length} total conversations for user ${userId} and coach ${coachId} (will filter to last 2 weeks)`
        );

        if (conversationList.length === 0) {
          continue;
        }

        // Step 6b: Get full conversation details with messages for this coach
        for (let j = 0; j < conversationList.length; j++) {
          const conversationSummary = conversationList[j];
          try {
            console.info(
              `Loading conversation ${j + 1}/${conversationList.length} for coach ${coachId}: ${conversationSummary.attributes.conversationId}`
            );

            const fullConversation = await getCoachConversation(
              userId,
              coachId,
              conversationSummary.attributes.conversationId
            );

            if (fullConversation) {
              // Filter messages to last 2 weeks
              const filteredMessages =
                fullConversation.attributes.messages.filter((message) => {
                  const messageDate = new Date(message.timestamp);
                  return (
                    messageDate >= twoWeeksRange.weekStart &&
                    messageDate <= twoWeeksRange.weekEnd
                  );
                });

              if (filteredMessages.length > 0) {
                // Create a copy with filtered messages
                const filteredConversation = {
                  ...fullConversation,
                  attributes: {
                    ...fullConversation.attributes,
                    messages: filteredMessages,
                  },
                };
                allConversations.push(filteredConversation);
                console.info(
                  `Conversation (historical) ${j + 1} included: ${filteredMessages.length} messages in last 2 weeks`
                );
              } else {
                console.info(
                  `Conversation (historical) ${j + 1} skipped: no messages in last 2 weeks`
                );
              }
            }
          } catch (error) {
            console.error(
              `Failed to fetch full conversation ${conversationSummary.attributes.conversationId} for user ${userId} and coach ${coachId}:`,
              error
            );
            // Continue with other conversations
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch conversations for user ${userId} and coach ${coachId}:`,
          error
        );
        // Continue with other coaches
      }
    }

    console.info(
      `Successfully fetched ${allConversations.length} conversations with recent messages for user ${userId} across ${coachIds.length} coaches`
    );
    return allConversations;
  } catch (error) {
    console.error(`Error fetching coaching context for user ${userId}:`, error);
    return [];
  }
};

/**
 * Step 7: Fetch user context (memories, goals, constraints)
 */
export const fetchUserContext = async (
  userId: string
): Promise<UserMemory[]> => {
  console.info(`Fetching user context for user ${userId}`);

  try {
    // Query memories (function already exists) - get all memories for user
    const memories = await queryMemories(userId, undefined, {
      limit: 50, // Get more memories for comprehensive context
    });

    console.info(
      `Successfully fetched ${memories.length} memories for user ${userId}`
    );
    return memories;
  } catch (error) {
    console.error(`Error fetching user context for user ${userId}:`, error);
    return [];
  }
};

/**
 * Aggregate all data for a single user (weekly, using summaries)
 */
export const fetchUserWeeklyData = async (
  user: DynamoDBItem<UserProfile>
): Promise<UserWeeklyData> => {
  const userId = user.attributes.userId;
  const weekRange = getCurrentWeekRange();
  const historicalRange = getHistoricalWorkoutRange();

  // Get user's timezone preference (defaults to Pacific if not set)
  const userTimezone = getUserTimezoneOrDefault(user.attributes.preferences?.timezone);

  console.info(`📊 Fetching complete weekly data (summary-based) for user ${userId}`, {
    timezone: userTimezone
  });

  // Step 1: Extract coach IDs from current week workouts
  const coachIds = await extractCoachIdsFromSummaries(
    userId,
    weekRange.weekStart,
    weekRange.weekEnd
  );

  // Step 2: Fetch all data in parallel (passing timezone for proper date conversion)
  const [currentWeekSummaries, historicalSummaries, conversationSummaries, memories] =
    await Promise.all([
      fetchWorkoutSummaries(userId, weekRange.weekStart, weekRange.weekEnd, "current week", userTimezone),
      fetchWorkoutSummaries(
        userId,
        historicalRange.weekStart,
        historicalRange.weekEnd,
        "historical (4 weeks)",
        userTimezone
      ),
      fetchCoachConversationSummaries(
        userId,
        coachIds,
        getLastNWeeksRange(2).weekStart, // Last 2 weeks of conversations
        weekRange.weekEnd,
        "last 2 weeks"
      ),
      fetchUserContext(userId),
    ]);

  const userData: UserWeeklyData = {
    userId,
    weekRange,
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
  };

  console.info(`✅ Completed weekly data fetch for user ${userId}:`, {
    workoutCount: userData.workouts.count,
    historicalSummaryCount: userData.historical.summaryCount,
    conversationSummaryCount: userData.coaching.count,
    memoryCount: userData.userContext.memoryCount,
    timezone: userTimezone,
  });

  return userData;
};

/**
 * Build analytics prompt from user weekly data
 */
const buildAnalyticsPrompt = (
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any,
  criticalTrainingDirective?: { content: string; enabled: boolean }
): string => {
  // Build directive section if enabled
  const directiveSection = criticalTrainingDirective?.enabled && criticalTrainingDirective?.content
    ? `🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:

${criticalTrainingDirective.content}

This directive takes precedence over all other instructions except safety constraints. Apply this when analyzing and summarizing the training data.

---

`
    : '';

  // Build comprehensive athlete profile from AI profile + memories
  let athleteProfile = "";

  // Add AI-generated athlete profile if available
  if (userProfile?.athleteProfile?.summary) {
    athleteProfile += `ATHLETE PROFILE:\n${userProfile.athleteProfile.summary}\n\n`;
  }

  // Add structured memories
  if (weeklyData.userContext.memories.length > 0) {
    athleteProfile += `DETAILED CONTEXT:\n`;
    athleteProfile += weeklyData.userContext.memories
      .map((memory) => `${memory.memoryType.toUpperCase()}: ${memory.content}`)
      .join("\n");
  }

  // Fallback if no profile data available
  if (!athleteProfile.trim()) {
    athleteProfile = "No specific athlete profile available.";
  }

  // Determine period type for labels
  const isPeriodWeekly = 'weekRange' in weeklyData;
  const periodLabel = isPeriodWeekly ? "THIS WEEK'S" : "THIS MONTH'S";
  const historicalLabel = isPeriodWeekly ? "PREVIOUS WEEKS" : "PREVIOUS MONTHS";

  // Format current period workout summaries (convert to user's timezone)
  const currentPeriodWorkouts = weeklyData.workouts.summaries
    .map(
      (summary) => {
        // Convert UTC timestamp to user's timezone date
        const userTimezone = summary.userTimezone || 'America/Los_Angeles';
        const localDate = convertUTCToUserDate(summary.date, userTimezone);
        return `${localDate} - ${summary.workoutName || "Workout"} (${summary.discipline || "Unknown"})\n${summary.summary}`;
      }
    )
    .join("\n\n");

  // Format historical workout summaries chronologically (convert to user's timezone)
  const historicalSummaries = weeklyData.historical.workoutSummaries
    .map(
      (summary) => {
        // Convert UTC timestamp to user's timezone date
        const userTimezone = summary.userTimezone || 'America/Los_Angeles';
        const localDate = convertUTCToUserDate(summary.date, userTimezone);
        return `${localDate} - ${summary.workoutName || "Workout"}: ${summary.summary}`;
      }
    )
    .join("\n\n");

  // Format coaching conversation summaries
  const coachingContext = weeklyData.coaching.summaries
    .map((summary) => {
      return `Conversation Summary (${summary.metadata.createdAt.toISOString().split("T")[0]}):\n${summary.narrative}\n\nKey Insights: ${summary.structuredData.key_insights.join(", ")}`;
    })
    .join("\n\n");

  return `${directiveSection}You are an elite strength and conditioning analyst examining training data from workout and conversation summaries.

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

ATHLETE CONTEXT:
${athleteProfile}

COACHING CONVERSATION SUMMARIES (Recent Period):
${coachingContext || "No recent coaching conversation summaries available."}

${periodLabel} WORKOUT SUMMARIES:
${currentPeriodWorkouts}

${historicalLabel} WORKOUT SUMMARIES (for trending):
${historicalSummaries || "No historical data available."}

DUAL OUTPUT REQUIREMENTS:
Your response must include TWO components:

1. STRUCTURED ANALYTICS: Complete JSON analysis following the detailed schema
2. HUMAN SUMMARY: A conversational, coach-friendly summary formatted like this example:

"Weekly Training Summary

6 out of 6 planned sessions completed with high data quality
18,750 lbs total tonnage across 456 reps and 67 working sets
Average session duration: 61 minutes with excellent density score (7.8/10)

Key Highlights
Performance Records Set:
• Front Squat PR: 215lbs x 3 (up from previous 205lbs x 3)
• Deadlift Progress: 275lbs x 3 - on track toward 315lb goal (87% there)

Volume Leaders:
• Deadlift: 4,950 lbs (strongest focus)
• Back Squat: 4,125 lbs
• Front Squat: 2,790 lbs

Training Intelligence Insights:
• Progressive overload score: 8.5/10 (excellent)
• Volume increased 12% from previous week
• Optimal exercise ordering maintained

Areas for Improvement:
• Pull volume slightly low vs push - needs more horizontal pulling
• T2B technique needs consistent skill work

Key Actionable Insights:
• Priority: Continue deadlift progression toward 315lb goal (achievable in 4-6 weeks)
• Quick wins: Add more pulling volume, integrate T2B skill work
• No red flags - training is progressing optimally"

ANALYZE BASED ON AVAILABLE UWS FIELDS:

1. CORE VOLUME CALCULATIONS
From UWS movement data, calculate:
- Total volume INCLUDING:
  * Complete reps (sets × reps × weight)
  * Failed reps (if marked - count as 0.5 for volume)
  * Partial reps (if marked - adjust multiplier)
  * Assisted reps (if marked - reduce load accordingly)
  * Drop sets/rest-pause sets (aggregate all work)
- Exercise order impact (performance degradation in later exercises)
- Warm-up volume (if tracked separately - exclude from working volume)
- Competition/test attempts vs training volume

2. ADVANCED SET ANALYSIS
Detect and handle special set types:
- Cluster sets (multiple mini-sets with short rest)
- Supersets/giant sets (from rest_seconds between different movements)
- Complexes (multiple movements without rest)
- EMOM/Tabata/Interval work (from workout_structure)
- Time-restricted sets (AMRAP sets within strength work)

3. PROGRESSIVE OVERLOAD TRACKING
Week-over-week comparison for repeated movements:
- Volume progression per movement_id
- Intensity progression (weight increases)
- Density progression (same work, less time)
- Rep quality progression (less failed/assisted reps)
- Technical progression (from coach notes)

4. WORKOUT SEGMENT ANALYSIS
For multi-part workouts in UWS:
- Part A (typically strength) metrics
- Part B (typically conditioning) metrics
- Buy-in/Cash-out work (if marked)
- Skill/technique work (different analysis than strength)
- Accessory work completion rate

5. FAILURE & INTENSITY ANALYSIS
Critical for understanding true effort:
- Failed rep patterns (which set, which exercise)
- Technical failure vs muscular failure (from notes)
- Rep drop-off across sets (fatigue accumulation)
- Time to complete sets (rest-pause indicators)
- Grinding reps (if bar velocity or time per rep tracked)

6. PERIODIZATION DETECTION
Identify training phase from patterns:
- Accumulation (high volume, moderate intensity)
- Intensification (lower volume, higher intensity)
- Realization/Peaking (very high intensity, low volume)
- Deload (>40% volume reduction)
- Testing week (1RM attempts, benchmark WODs)

CRITICAL: Return ONLY valid JSON in the exact format below. No markdown, no explanations, just the JSON object:

${getAnalyticsSchemaWithContext("generation")}

CRITICAL ANALYSIS RULES:
1. ALWAYS compare to previous weeks - never analyze in isolation
2. Detect workout structure (straight sets vs circuits vs supersets) from rest patterns
3. Flag any weight that's >20% different from recent history as potential error
4. Separate competition/testing from training volume
5. Account for failed work differently than completed work
6. Recognize deload weeks and adjust expectations accordingly
7. Use movement_id relationships (e.g., back_squat_variants) if available
8. Calculate true training density (exclude excessive rest, setup time)
9. Identify repeated workout templates for accurate comparison
10. Consider workout time of day if it affects performance
11. Track exercise substitutions as continuous progression (e.g., box squat → regular squat)
12. Note when equipment limitations affect programming (e.g., "max weight available")

ERROR HANDLING:
- If data seems impossible (e.g., 1000lb bench press), flag but still process
- If movement_id unknown, attempt to categorize by name pattern
- If no previous data for comparison, note as "baseline week"
- If workout incomplete, calculate based on completed portion
- Handle timezone differences in workout timestamps

DATE VALIDATION REQUIREMENTS:
- All dates in raw_aggregations.daily_volume MUST be within the specified week range
- Week range is provided in the metadata.date_range (start to end dates)
- Exclude any daily volume entries with dates outside this range
- If historical data spans multiple periods, only include current week data in daily_volume
- Use YYYY-MM-DD format for all dates

DAILY RPE/INTENSITY CALCULATION REQUIREMENTS:
- For each day in daily_volume, calculate avg_rpe and avg_intensity from workout performance_metrics
- avg_rpe: Average of all workouts' performance_metrics.perceived_exertion for that date (null if no RPE data)
- avg_intensity: Average of all workouts' performance_metrics.intensity for that date (null if no intensity data)
- workout_count: Total number of completed workouts for that date (integer, minimum 0)
- primary_workout_id: workout_id of the first chronologically completed workout for navigation (null if no workouts)
- Handle multiple workouts per day by averaging RPE/intensity values
- Days with no workouts should still appear with workout_count: 0 and null values for averages

CRITICAL: Return ONLY valid JSON in the exact format above. No markdown, no explanations, no text outside the JSON object. Start with { and end with }.`;
};

/**
 * Step 9-11: Generate analytics using LLM
 */
export const generateAnalytics = async (
  weeklyData: UserWeeklyData | UserMonthlyData,
  userProfile?: any
): Promise<any> => {
  const userId = weeklyData.userId;

  console.info(
    `🧠 Generating analytics for user ${userId} using Claude Sonnet 4 with thinking`
  );

  try {
    // Build the analytics prompt with user profile and critical training directive
    const analyticsPrompt = buildAnalyticsPrompt(
      weeklyData,
      userProfile,
      userProfile?.attributes?.criticalTrainingDirective
    );

    console.info(
      `📝 Analytics prompt built: ${analyticsPrompt.length} characters`
    );

    // Call Claude with thinking enabled
    const analyticsResponse = await callBedrockApi(
      analyticsPrompt,
      "analytics_generation",
      MODEL_IDS.CLAUDE_SONNET_4_FULL, // Use default model (Sonnet 4)
      { enableThinking: true } // Enable thinking
    );

    console.info(
      `🔍 Raw analytics response received: ${analyticsResponse.length} characters`
    );

    // Parse JSON response with cleaning and fixing (handles markdown-wrapped JSON and common issues)
    const analyticsData = parseJsonWithFallbacks(analyticsResponse);
    console.info(`✅ Analytics JSON parsed successfully for user ${userId}`);

    // NORMALIZATION STEP - Normalize analytics data for schema compliance
    let finalAnalyticsData = analyticsData;
    let normalizationSummary = "Analytics normalization skipped";

    if (shouldNormalizeAnalytics(analyticsData, weeklyData)) {
      console.info("🔧 Running normalization on analytics data...", {
        userId,
      });

      const normalizationResult = await normalizeAnalytics(
        analyticsData,
        weeklyData,
        userId,
        true // Enable thinking for analytics normalization
      );
      normalizationSummary = generateNormalizationSummary(normalizationResult);

      console.info("Analytics normalization completed:", {
        isValid: normalizationResult.isValid,
        issuesFound: normalizationResult.issues.length,
        correctionsMade: normalizationResult.issues.filter((i) => i.corrected)
          .length,
        normalizationConfidence: normalizationResult.confidence,
        summary: normalizationSummary,
      });

      // Use normalized data if normalization was successful
      if (
        normalizationResult.isValid ||
        normalizationResult.issues.some((i) => i.corrected)
      ) {
        finalAnalyticsData = normalizationResult.normalizedData;
        console.info(`✅ Using normalized analytics data for user ${userId}`);
      } else {
        console.warn(
          `⚠️  Analytics normalization failed, using original data for user ${userId}`
        );
      }
    } else {
      console.info(
        `✅ Analytics normalization skipped for user ${userId}: no critical issues detected`
      );
    }

    return finalAnalyticsData;
  } catch (error) {
    console.error(`❌ Failed to generate analytics for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Aggregate all data for a single user (monthly version, using summaries)
 */
export const fetchUserMonthlyData = async (
  user: DynamoDBItem<UserProfile>
): Promise<UserMonthlyData> => {
  const userId = user.attributes.userId;
  const monthRange = getCurrentMonthRange();
  const historicalRange = getHistoricalMonthRange(3);

  // Get user's timezone preference (defaults to Pacific if not set)
  const userTimezone = getUserTimezoneOrDefault(user.attributes.preferences?.timezone);

  console.info(`📊 Fetching complete monthly data (summary-based) for user ${userId}`, {
    timezone: userTimezone
  });

  // Step 1: Extract coach IDs from current month workouts
  const coachIds = await extractCoachIdsFromSummaries(
    userId,
    monthRange.monthStart,
    monthRange.monthEnd
  );

  // Step 2: Fetch all data in parallel (passing timezone for proper date conversion)
  const [currentMonthSummaries, historicalSummaries, conversationSummaries, memories] =
    await Promise.all([
      fetchWorkoutSummaries(userId, monthRange.monthStart, monthRange.monthEnd, "current month", userTimezone),
      fetchWorkoutSummaries(
        userId,
        historicalRange.monthStart,
        historicalRange.monthEnd,
        "historical (3 months)",
        userTimezone
      ),
      fetchCoachConversationSummaries(
        userId,
        coachIds,
        monthRange.monthStart,
        monthRange.monthEnd,
        "current month"
      ),
      fetchUserContext(userId),
    ]);

  const userData: UserMonthlyData = {
    userId,
    monthRange,
    workouts: {
      summaries: currentMonthSummaries,
      count: currentMonthSummaries.length,
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
  };

  console.info(`✅ Completed monthly data fetch for user ${userId}:`, {
    workoutCount: userData.workouts.count,
    historicalSummaryCount: userData.historical.summaryCount,
    conversationSummaryCount: userData.coaching.count,
    memoryCount: userData.userContext.memoryCount,
    timezone: userTimezone,
    monthRange: `${monthRange.monthStart.toISOString().split("T")[0]} to ${monthRange.monthEnd.toISOString().split("T")[0]}`,
  });

  return userData;
};
