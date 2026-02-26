/**
 * AI-powered extraction of information from user responses
 * Updates the to-do list based on what the user has shared
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import {
  parseJsonWithFallbacks,
  fixDoubleEncodedProperties,
} from "../response-utils";
import { CoachCreatorTodoList, TodoItem, CoachMessage } from "./types";
import { COACH_CREATOR_EXTRACTION_SCHEMA } from "../schemas/coach-creator-extraction-schema";
import { logger } from "../logger";

/**
 * Extract information from user's response and update the to-do list
 * Uses Claude Haiku 4.5 for fast, cheap extraction
 */
export async function extractAndUpdateTodoList(
  userResponse: string,
  conversationHistory: CoachMessage[],
  currentTodoList: CoachCreatorTodoList,
): Promise<CoachCreatorTodoList> {
  logger.info("🔍 Extracting information from user response");

  // Include FULL conversation history for better context
  // With 200K token context window, we have plenty of room
  const conversationContext = conversationHistory
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  // Build extraction prompt
  const systemPrompt = buildExtractionPrompt(currentTodoList);
  const userPrompt = `
FULL CONVERSATION HISTORY:
${conversationContext}

CURRENT USER RESPONSE:
"${userResponse}"

Extract any fitness coach intake information from the user's response and return a JSON object with the fields that were mentioned. Only include fields where you found information.

IMPORTANT:
- Only extract information that is EXPLICITLY stated or strongly implied
- Set confidence to "high" if explicitly stated, "medium" if implied, "low" if uncertain
- If the user says "none" or "no injuries", that IS valuable information (set value to "none")
- For injuries: "none" means no injuries (this is valid data, not missing data)
- For equipment: extract specific items mentioned (e.g., ["barbell", "pull-up bar", "rowing machine"])
- For goals: capture their primary fitness objectives
- For timeline: extract timeframes (e.g., "6 months", "1 year", "no rush")

Return JSON with ONLY the fields you found information for:
{
  "coachGenderPreference": { "value": "male|female|neutral", "confidence": "high|medium|low" },
  "primaryGoals": { "value": "extracted goals", "confidence": "high|medium|low" },
  // ... only include fields you found
}
`;

  try {
    // STRUCTURED OUTPUT EXEMPTION: COACH_CREATOR_EXTRACTION_SCHEMA has 22 top-level
    // optional objects. Even within the 24-param count limit, the grammar compiler
    // times out on schemas with many optional objects containing nested enum fields
    // (combinatorial explosion: 2^22 possible presence/absence combinations × enum paths).
    // This is the same root cause as extract_workout_info and extract_program_info.
    // The model follows the schema voluntarily via the tool definition context.
    // See: docs/strategy/STRUCTURED_OUTPUTS_STRATEGY.md
    const extractionResponse = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.EXECUTOR_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: [
          {
            name: "extract_coach_creator_info",
            description:
              "Extract fitness coach intake information from user response",
            inputSchema: COACH_CREATOR_EXTRACTION_SCHEMA,
          },
        ],
        expectedToolName: "extract_coach_creator_info",
        // strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
        skipValidation: true, // large schema; output cleaned downstream by evaluator-optimizer
      },
    );

    logger.info("✅ Received extraction response");

    let extracted: any;
    if (typeof extractionResponse !== "string") {
      extracted = fixDoubleEncodedProperties(extractionResponse.input);
    } else {
      extracted = parseJsonWithFallbacks(extractionResponse);
    }

    if (!extracted || typeof extracted !== "object") {
      logger.warn(
        "⚠️ Failed to parse extraction response, returning current todo list",
      );
      return currentTodoList;
    }

    // Update the to-do list with extracted information
    const updatedTodoList = { ...currentTodoList };
    const messageIndex = conversationHistory.length; // Index where this response will be stored

    for (const [key, extractedItem] of Object.entries(extracted)) {
      if (
        key in updatedTodoList &&
        extractedItem &&
        typeof extractedItem === "object"
      ) {
        const item = extractedItem as Partial<TodoItem>;

        // Only update if we have a value
        if (item.value !== null && item.value !== undefined) {
          updatedTodoList[key as keyof CoachCreatorTodoList] = {
            status: "complete",
            value: item.value,
            confidence: item.confidence || "medium",
            extractedFrom: `message_${messageIndex}`,
          };

          logger.info(
            `✅ Extracted ${key}: ${JSON.stringify(item.value).substring(0, 50)}`,
          );
        }
      }
    }

    // Log extraction summary
    const extractedCount = Object.keys(extracted).length;
    logger.info(`✅ Extraction complete: ${extractedCount} fields updated`);

    return updatedTodoList;
  } catch (error) {
    logger.error("❌ Error during extraction:", error);
    logger.error("Returning current todo list unchanged");
    return currentTodoList;
  }
}

/**
 * Build the system prompt for extraction
 */
function buildExtractionPrompt(currentTodoList: CoachCreatorTodoList): string {
  // Build a summary of what's already been collected
  const collectedFields: string[] = [];
  const pendingFields: string[] = [];

  for (const [key, item] of Object.entries(currentTodoList)) {
    if (item.status === "complete") {
      collectedFields.push(key);
    } else {
      pendingFields.push(key);
    }
  }

  return `You are an expert at extracting structured fitness intake information from conversational responses.

WHAT WE'VE ALREADY COLLECTED:
${collectedFields.length > 0 ? collectedFields.join(", ") : "Nothing yet"}

WHAT WE STILL NEED:
${pendingFields.join(", ")}

YOUR TASK:
Analyze the user's response and extract any fitness coach intake information. Return a JSON object with ONLY the fields you found.

AVAILABLE FIELDS (only include if you find information):
- coachGenderPreference: "male" | "female" | "neutral"
- primaryGoals: string describing their fitness goals
- goalTimeline: timeframe for achieving goals (e.g., "6 months", "1 year")
- age: number (their age)
- lifeStageContext: context about life stage (e.g., "parent of young kids", "retired", "college student")
- experienceLevel: "beginner" | "intermediate" | "advanced"
- trainingHistory: description of their training background
- trainingFrequency: number of days per week (e.g., 3, 4, 5)
- sessionDuration: typical workout length (e.g., "45 minutes", "1 hour")
- timeOfDayPreference: when they prefer to train (e.g., "morning", "evening", "flexible")
- injuryConsiderations: description of injuries or "none"
- movementLimitations: description of movement restrictions or "none"
- equipmentAccess: array of equipment (e.g., ["barbell", "dumbbells", "pull-up bar"])
- trainingEnvironment: where they train (e.g., "CrossFit gym", "home garage", "commercial gym")
- movementPreferences: movements they enjoy
- movementDislikes: movements they dislike
- coachingStylePreference: description of coaching style they want
- motivationStyle: how they want to be motivated
- successMetrics: how they measure success
- progressTrackingPreferences: how they want to track progress
- competitionGoals: competition plans or "none" (OPTIONAL)
- competitionTimeline: when they plan to compete (OPTIONAL)

EXTRACTION RULES:
1. ONLY extract information that is clearly stated or strongly implied
2. If uncertain, set confidence to "low"
3. "None" or "no" answers ARE valid data (not missing data)
4. Extract specific details when mentioned
5. Don't make assumptions beyond what's stated
6. If a field already has data, you can update it if new information is provided

CONFIDENCE LEVELS:
- "high": User explicitly stated this information
- "medium": Strongly implied or indirectly stated
- "low": Inferred but uncertain

Return ONLY fields you found. Empty JSON {} if no extractable information.`;
}
