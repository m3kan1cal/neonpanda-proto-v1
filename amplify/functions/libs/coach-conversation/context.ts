import { queryWorkouts } from "../../../dynamodb/operations";
import { queryPineconeContext } from "../api-helpers";
import { shouldUsePineconeSearch, formatPineconeContext } from "../pinecone-utils";

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
 */
export async function gatherConversationContext(
  userId: string,
  userMessage: string
): Promise<ConversationContextResult> {
  // Load recent workouts for context
  let recentWorkouts: any[] = [];
  try {
    const workoutResults = await queryWorkouts(userId, {
      limit: RECENT_WORKOUTS_CONTEXT_LIMIT,
      sortBy: "completedAt",
      sortOrder: "desc",
    });
    recentWorkouts = workoutResults.map((workout) => ({
      completedAt: workout.attributes.completedAt,
      summary: workout.attributes.summary,
      discipline: workout.attributes.workoutData.discipline,
      workoutName: workout.attributes.workoutData.workout_name,
    }));
    console.info("Loaded recent workouts for context:", {
      userId,
      workoutCount: recentWorkouts.length,
      summaries: recentWorkouts.map(
        (w) => w.summary?.substring(0, 50) + "..."
      ),
    });
  } catch (error) {
    console.warn(
      "Failed to load recent workouts for context, continuing without:",
      error
    );
    // Continue without workout context - don't fail the conversation
  }

  // Query Pinecone for semantic context if appropriate
  let pineconeContext = "";
  let pineconeMatches: any[] = [];
  const shouldQueryPinecone = await shouldUsePineconeSearch(userMessage);

  if (shouldQueryPinecone) {
    try {
      console.info("🔍 Querying Pinecone for semantic context:", {
        userId,
        userMessageLength: userMessage.length,
        messagePreview: userMessage.substring(0, 100) + "...",
      });

      const pineconeResult = await queryPineconeContext(
        userId,
        userMessage,
        {
          topK: 6, // Increase to 8-10 for more context
          includeWorkouts: true,
          includeCoachCreator: true,
          includeConversationSummaries: true,
          includeMethodology: true, // Enable methodology document retrieval
          minScore: 0.7,
        }
      );

      if (pineconeResult.success && pineconeResult.matches.length > 0) {
        pineconeMatches = pineconeResult.matches;
        pineconeContext = formatPineconeContext(pineconeMatches);

        console.info("✅ Successfully retrieved Pinecone context:", {
          totalMatches: pineconeResult.totalMatches,
          relevantMatches: pineconeResult.relevantMatches,
          contextLength: pineconeContext.length,
        });
      } else {
        console.info("📭 No relevant Pinecone context found:", {
          success: pineconeResult.success,
          totalMatches: pineconeResult.totalMatches,
        });
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to query Pinecone context, continuing without:",
        error
      );
      // Continue without Pinecone context - don't fail the conversation
    }
  } else {
    console.info(
      "⏭️ Skipping Pinecone query - message does not require semantic search"
    );
  }

  return {
    recentWorkouts,
    pineconeContext,
    pineconeMatches,
  };
}
