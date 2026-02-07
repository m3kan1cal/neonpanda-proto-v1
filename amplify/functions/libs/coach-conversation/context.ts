import { queryWorkouts } from "../../../dynamodb/operations";
import { queryPineconeContext } from "../api-helpers";
import {
  shouldUsePineconeSearch,
  formatPineconeContext,
} from "../pinecone-utils";

// Configuration constants
const RECENT_WORKOUTS_CONTEXT_LIMIT = 14;

export interface ConversationContextResult {
  recentWorkouts: any[];
  pineconeContext: string;
  pineconeMatches: any[];
}

/**
 * Gathers all contextual data needed for the conversation
 * Including recent workouts and semantic search context from Pinecone
 *
 * @param userId - The user ID
 * @param userMessage - The user's message
 * @param shouldQueryPinecone - Optional flag to control Pinecone query (defaults to AI-based decision)
 */
export async function gatherConversationContext(
  userId: string,
  userMessage: string,
  shouldQueryPinecone?: boolean,
): Promise<ConversationContextResult> {
  // Use provided flag, or fall back to AI-based decision for backward compatibility
  const shouldQuery =
    shouldQueryPinecone !== undefined
      ? shouldQueryPinecone
      : await shouldUsePineconeSearch(userMessage);

  // Run DynamoDB workouts query and Pinecone query in parallel
  // Both are independent I/O operations that benefit from concurrent execution
  const workoutsPromise = queryWorkouts(userId, {
    limit: RECENT_WORKOUTS_CONTEXT_LIMIT,
    sortBy: "completedAt",
    sortOrder: "desc",
  })
    .then((workoutResults) => {
      const workouts = workoutResults.map((workout) => ({
        completedAt: workout.completedAt,
        summary: workout.summary,
        discipline: workout.workoutData.discipline,
        workoutName: workout.workoutData.workout_name,
      }));
      console.info("Loaded recent workouts for context:", {
        userId,
        workoutCount: workouts.length,
        summaries: workouts.map((w) => w.summary?.substring(0, 50) + "..."),
      });
      return workouts;
    })
    .catch((error) => {
      console.warn(
        "Failed to load recent workouts for context, continuing without:",
        error,
      );
      return [] as any[];
    });

  const pineconePromise = shouldQuery
    ? (async () => {
        try {
          const decisionSource =
            shouldQueryPinecone !== undefined ? "smart-router" : "ai-analysis";
          console.info(
            `🔍 Querying Pinecone for semantic context (decision: ${decisionSource}):`,
            {
              userId,
              userMessageLength: userMessage.length,
              messagePreview: userMessage.substring(0, 100) + "...",
            },
          );

          const pineconeResult = await queryPineconeContext(
            userId,
            userMessage,
            {
              workoutTopK: 8,
              conversationTopK: 5,
              programTopK: 3,
              coachCreatorTopK: 2,
              programDesignerTopK: 2,
              userMemoryTopK: 3,
              includeMethodology: true,
              minScore: 0.7,
            },
          );

          if (pineconeResult.success && pineconeResult.matches.length > 0) {
            console.info("✅ Successfully retrieved Pinecone context:", {
              totalMatches: pineconeResult.totalMatches,
              relevantMatches: pineconeResult.relevantMatches,
            });
            return {
              matches: pineconeResult.matches,
              context: formatPineconeContext(pineconeResult.matches),
            };
          } else {
            console.info("📭 No relevant Pinecone context found:", {
              success: pineconeResult.success,
              totalMatches: pineconeResult.totalMatches,
            });
            return { matches: [] as any[], context: "" };
          }
        } catch (error) {
          console.warn(
            "⚠️ Failed to query Pinecone context, continuing without:",
            error,
          );
          return { matches: [] as any[], context: "" };
        }
      })()
    : (() => {
        console.info(
          "⏭️ Skipping Pinecone query - message does not require semantic search",
        );
        return Promise.resolve({ matches: [] as any[], context: "" });
      })();

  // Wait for both to complete in parallel
  const [recentWorkouts, pineconeData] = await Promise.all([
    workoutsPromise,
    pineconePromise,
  ]);

  return {
    recentWorkouts,
    pineconeContext: pineconeData.context,
    pineconeMatches: pineconeData.matches,
  };
}
