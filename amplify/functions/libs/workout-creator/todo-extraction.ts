/**
 * AI-powered extraction of workout information from user responses
 * Updates the to-do list based on what the user has shared
 *
 * Pattern: Same structure as coach-creator/todo-extraction.ts and program/todo-extraction.ts
 */

import {
  callBedrockApi,
  callBedrockApiMultimodal,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../api-helpers";
import {
  parseJsonWithFallbacks,
  fixDoubleEncodedProperties,
} from "../response-utils";
import { buildMultimodalContent } from "../streaming/multimodal-helpers";
import { MESSAGE_TYPES } from "../coach-conversation/types";
import { TodoItem, ConversationMessage } from "../todo-types";
import { WorkoutCreatorTodoList } from "./types";
import { WORKOUT_CREATOR_TODO_SCHEMA } from "../schemas/workout-creator-todo-schema";

/**
 * Result of AI extraction from user's workout logging message
 * Includes both structured workout data and user intent signals
 */
export interface WorkoutExtractionResult {
  todoList: WorkoutCreatorTodoList;
  userWantsToFinish: boolean; // AI-detected intent to skip remaining optional fields
  userChangedTopic: boolean; // AI-detected topic change (user abandoned workout logging)
}

/**
 * Extract workout information from user's response and update the to-do list
 * Uses Claude Haiku 4.5 for fast, cheap extraction
 * Supports multimodal input (text + images)
 */
export async function extractAndUpdateTodoList(
  userResponse: string,
  conversationHistory: ConversationMessage[],
  currentTodoList: WorkoutCreatorTodoList,
  imageS3Keys?: string[],
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
): Promise<WorkoutExtractionResult> {
  console.info("🔍 Extracting workout information from user response");

  // Check if images are present
  const hasImages = imageS3Keys && imageS3Keys.length > 0;

  if (hasImages) {
    console.info("🖼️ Processing with images:", {
      imageCount: imageS3Keys!.length,
      imageKeys: imageS3Keys,
    });
  }

  // Include FULL conversation history for better context
  const conversationContext = conversationHistory
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  // Build context summary for smarter extraction
  let contextSummary = "";
  if (userContext) {
    if (userContext.activeProgram) {
      contextSummary += `\nACTIVE TRAINING PROGRAM: ${userContext.activeProgram.name || "Unknown"} - ${userContext.activeProgram.goal || userContext.activeProgram.trainingGoals || "No goal specified"}`;
    }
    if (
      userContext.pineconeMemories &&
      userContext.pineconeMemories.length > 0
    ) {
      const relevantMemories = userContext.pineconeMemories.slice(0, 3);
      contextSummary += `\n\nRELEVANT USER CONTEXT:\n${relevantMemories.map((m: any) => `- ${m.text || m.content}`).join("\n")}`;
    }
    if (userContext.userProfile?.preferences?.timezone) {
      contextSummary += `\n\nUSER TIMEZONE: ${userContext.userProfile.preferences.timezone}`;
    }
  }

  // Build extraction prompt
  const systemPrompt = buildExtractionPrompt(currentTodoList, userContext);
  const userPrompt = `
FULL CONVERSATION HISTORY:
${conversationContext}
${contextSummary ? `\n${contextSummary}` : ""}

CURRENT USER RESPONSE:
"${userResponse}"

Extract any workout logging information from the user's response and return a JSON object with the fields that were mentioned. Only include fields where you found information.

IMPORTANT:
- Only extract information that is EXPLICITLY stated or strongly implied
- Use the user context above to make informed inferences (e.g., if they always work out at "CrossFit Box ABC" and mention "the box", infer location)
- Set confidence to "high" if explicitly stated, "medium" if inferred from context, "low" if uncertain
- For workoutDate: "today", "yesterday", or specific dates are all valid
- For exercises: capture exercise names and how they were performed
- For weights: include units (lbs, kg) and whether it's per dumbbell or total
- Images may contain workout details, form checks, or performance notes - analyze carefully

Return JSON with ONLY the fields you found information for:
{
  "exercises": { "value": "extracted exercises", "confidence": "high|medium|low", "notes": "optional context" },
  "setsOrRounds": { "value": 3, "confidence": "high|medium|low" },
  // ... only include fields you found
}
`;

  try {
    let extractionResponse: any;

    if (hasImages) {
      // Multimodal extraction (text + images)
      const currentMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user" as const,
        content: userPrompt,
        timestamp: new Date(),
        messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
        imageS3Keys: imageS3Keys,
      };

      // Convert to Bedrock format
      const converseMessages = await buildMultimodalContent([currentMessage]);

      // Call with images
      extractionResponse = await callBedrockApiMultimodal(
        systemPrompt,
        converseMessages,
        MODEL_IDS.EXECUTOR_MODEL_FULL,
        {
          temperature: TEMPERATURE_PRESETS.STRUCTURED,
          tools: {
            name: "extract_workout_info",
            description:
              "Extract workout information from user response with optional images",
            inputSchema: WORKOUT_CREATOR_TODO_SCHEMA,
          },
          expectedToolName: "extract_workout_info",
        },
      );
    } else {
      // Text-only extraction
      extractionResponse = await callBedrockApi(
        systemPrompt,
        userPrompt,
        MODEL_IDS.EXECUTOR_MODEL_FULL,
        {
          temperature: TEMPERATURE_PRESETS.STRUCTURED,
          tools: {
            name: "extract_workout_info",
            description: "Extract workout information from user response",
            inputSchema: WORKOUT_CREATOR_TODO_SCHEMA,
          },
          expectedToolName: "extract_workout_info",
        },
      );
    }

    console.info("✅ Received extraction response");

    // Handle tool response
    let extracted: any;
    if (typeof extractionResponse !== "string") {
      // Tool was used - extract the input and fix any double-encoding
      extracted = extractionResponse.input;
      console.info("✅ Tool-based extraction successful");
      // Apply double-encoding fix to tool inputs (same as parseJsonWithFallbacks does)
      extracted = fixDoubleEncodedProperties(extracted);
    } else {
      // Fallback to parsing (shouldn't happen with tool enforcement)
      console.warn("⚠️ Received string response, parsing as JSON fallback");
      extracted = parseJsonWithFallbacks(extractionResponse);
    }

    if (!extracted || typeof extracted !== "object") {
      console.warn(
        "⚠️ Failed to parse extraction response, returning current todo list",
      );
      return {
        todoList: currentTodoList,
        userWantsToFinish: false,
        userChangedTopic: false,
      };
    }

    // Update the to-do list with extracted information
    const updatedTodoList = { ...currentTodoList };
    const messageIndex = conversationHistory.length; // Index where this response will be stored

    // Extract user intent signals (AI-detected)
    const userWantsToFinish = extracted.userWantsToFinish === true;
    const userChangedTopic = extracted.userChangedTopic === true;

    if (userWantsToFinish) {
      console.info(
        "⏭️ AI detected user wants to finish logging and skip remaining fields",
      );
    }
    if (userChangedTopic) {
      console.info(
        "🔀 AI detected user changed topics - abandoning workout logging session",
      );
    }

    for (const [key, extractedItem] of Object.entries(extracted)) {
      // Skip intent detection fields (not todo items)
      if (key === "userWantsToFinish" || key === "userChangedTopic") continue;

      if (
        key in updatedTodoList &&
        extractedItem &&
        typeof extractedItem === "object"
      ) {
        const item = extractedItem as Partial<TodoItem>;

        // Only update if we have a value
        if (item.value !== null && item.value !== undefined) {
          // Build the todo item, conditionally including imageRefs only if present
          const todoItem: any = {
            status: "complete",
            value: item.value,
            confidence: item.confidence || "medium",
            notes: item.notes,
            extractedFrom: `message_${messageIndex}`,
          };

          // Only add imageRefs if images are present and relevant for this field
          if (hasImages && shouldStoreImageRef(key)) {
            todoItem.imageRefs = imageS3Keys;
          }

          updatedTodoList[key as keyof WorkoutCreatorTodoList] = todoItem;

          console.info(
            `✅ Extracted ${key}: ${JSON.stringify(item.value).substring(0, 50)}`,
          );
        }
      }
    }

    // Log extraction summary
    const extractedCount = Object.keys(extracted).filter(
      (k) => k !== "userWantsToFinish" && k !== "userChangedTopic",
    ).length;
    console.info(`✅ Extraction complete: ${extractedCount} fields updated`);

    return {
      todoList: updatedTodoList,
      userWantsToFinish,
      userChangedTopic,
    };
  } catch (error) {
    console.error("❌ Error during extraction:", error);
    console.error("Returning current todo list unchanged");
    return {
      todoList: currentTodoList,
      userWantsToFinish: false,
      userChangedTopic: false,
    };
  }
}

/**
 * Determine if image references should be stored for this field
 */
function shouldStoreImageRef(fieldKey: string): boolean {
  // Fields that commonly benefit from image context
  return ["exercises", "weights", "performanceNotes", "location"].includes(
    fieldKey,
  );
}

/**
 * Build the system prompt for extraction
 */
function buildExtractionPrompt(
  currentTodoList: WorkoutCreatorTodoList,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
): string {
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

  // Build context hints for smarter extraction
  let contextHints = "";
  if (userContext) {
    if (userContext.recentWorkouts && userContext.recentWorkouts.length > 0) {
      const recentWorkout = userContext.recentWorkouts[0];
      contextHints += `\n- User's recent workouts typically include: ${recentWorkout.discipline || "various disciplines"}`;
      if (recentWorkout.location) {
        contextHints += `\n- Typical location: ${recentWorkout.location}`;
      }
      if (recentWorkout.duration) {
        contextHints += `\n- Typical duration: ${recentWorkout.duration} minutes`;
      }
    }
    if (userContext.activeProgram) {
      contextHints += `\n- Currently following: ${userContext.activeProgram.name || "a training program"} focused on ${userContext.activeProgram.goal || userContext.activeProgram.trainingGoals || "fitness"}`;
    }
  }

  return `You are an expert at extracting structured workout information from conversational responses, including images.

WHAT WE'VE ALREADY COLLECTED:
${collectedFields.length > 0 ? collectedFields.join(", ") : "Nothing yet"}

WHAT WE STILL NEED:
${pendingFields.join(", ")}
${contextHints ? `\nUSER CONTEXT (use to make informed inferences):${contextHints}` : ""}

YOUR TASK:
Analyze the user's response (text and/or images) and extract any workout logging information. Use the user context to make reasonable inferences when appropriate. Return a JSON object with ONLY the fields you found.

AVAILABLE FIELDS (only include if you find information):
- exercises: string describing what exercises they did (e.g., "back squats, then Bulgarian split squats")
- setsOrRounds: number of sets/rounds (e.g., 3, "5 rounds", "AMRAP")
- repsOrTime: reps per set, time duration, or distance (e.g., "10 reps", "20 minutes", "1 mile")
- workoutDate: when completed (YYYY-MM-DD or relative like "today", "yesterday", "20 minutes ago")
- discipline: workout discipline (e.g., "crossfit", "functional_bodybuilding", "running", "strength_training")
- weights: weights used (e.g., "185lbs", "45lb dumbbells each hand", "bodyweight")
- restPeriods: rest between sets/rounds (e.g., "90 seconds", "2 minutes", "minimal rest")
- workoutType: workout format (e.g., "AMRAP", "For Time", "EMOM", "Strength Training", "Interval Run")
- duration: actual working time in minutes, EXCLUDING warmup/cooldown (e.g., 27, 45)
  * If user says "workout took 30 minutes" or "30 minute workout" → duration: 30
  * If user says "actual workout for 27 minutes" → duration: 27
  * Look for keywords: "workout", "working time", "actual", "WOD"
- sessionDuration: total time including warmup/cooldown in minutes (e.g., 45, 60)
  * If user says "7am - 7:45am" → calculate difference: 45 minutes
  * If user says "start to finish was 50 minutes" → sessionDuration: 50
  * If user says "including warmup/cooldown" → sessionDuration
  * Look for time ranges (X:XX - Y:YY) or "total time" or "start to finish"
- intensity: workout intensity level 1-10 (e.g., 7, 9)
- rpe: Rate of Perceived Exertion 1-10 (e.g., 6, 8)
- enjoyment: how much they enjoyed the workout 1-10 (e.g., 8, 9)
- difficulty: how challenging the workout felt 1-10 (e.g., 7, 9)
- location: where they worked out (e.g., "home gym", "CrossFit box", "park", "trail")
- performanceNotes: how they felt, modifications, PRs, struggles (e.g., "felt strong, hit PR", "modified due to knee")
- heartRate: average heart rate during workout (e.g., 145, 160)
- caloriesBurned: estimated calories burned (e.g., 450, 600)
- temperature: temperature during workout in Fahrenheit (e.g., 75, 82)
- sleepHours: hours of sleep before workout (e.g., 7, 8.5)

IMAGE ANALYSIS (if images provided):
- Form check videos/photos: Extract exercise names, weights visible, performance notes
- Whiteboard photos: Extract workout details, rounds, times, modifications
- Smartwatch/app screenshots: Extract distance, time, heart rate, pace
- Gym equipment photos: Identify weights, equipment used

INTENT DETECTION (userWantsToFinish field):
Set "userWantsToFinish": true if the user indicates they want to skip remaining optional fields and finish logging.

**CRITICAL CONTEXT**: If we've collected 4+ required fields already, be MORE SENSITIVE to dismissal signals.

Detect these patterns:
- **Explicit**: "skip", "that's all", "that's it", "log it now", "I'm done", "done", "just log it", "finish"
- **Dismissive**: "no more", "nah", "nope", "nothing else", "no", "n"
- **Short/terse**: ".", "ok", "okay", single letter responses when asked for optional info
- **Acknowledgment after substantial data**: "thanks", "thank you", "got it", "sounds good", "perfect"
  * ESPECIALLY if we already have 5+ required fields or 4+ required + all high-priority fields
  * These signal "I'm satisfied, wrap it up" rather than continuing the conversation
- **Deflection**: "I'll let you know", "maybe later", "not sure", "don't remember"
  * User avoiding answering → wants to finish
- **Repetition**: User repeating the same information (indicates they want to finish)
- **Context clues**: "gotta go", "in a hurry", "quick log", "busy"

**IMPORTANT**: If we have substantial progress (5/6 required OR 4/6+high-priority complete), simple acknowledgments like "thanks", "okay", "got it" should be treated as finish signals, NOT as continuing the conversation.

EXTRACTION RULES:
1. ONLY extract information that is clearly stated or strongly implied
2. If uncertain, set confidence to "low"
3. For dates: "today", "yesterday", "this morning" are all valid
4. Extract specific details when mentioned (e.g., "75 each side for 2 sets, 70 for 2 sets")
5. Don't make assumptions beyond what's stated
6. **CORRECTIONS/EDITS:** If a field already has data, you MUST update it if the user corrects or changes the information
   - Examples: "actually it was 5 sets", "wait, I meant 185 not 165", "correction: it was yesterday not today"
   - Always honor the most recent information provided by the user
7. For images: Analyze visual content carefully and extract relevant workout details

INTENT DETECTION:
- **userWantsToFinish**: Set to true if user wants to skip remaining fields and finish logging
  - Explicit phrases: "skip", "that's all", "I'm done", "just log it", "log it now", "finish", "no more"
  - Acknowledgments with substantial progress (5/6 or 4/6+high-priority): "thanks", "thank you", "okay", "got it", "sounds good"
  - Deflections: "I'll let you know", "not sure", "don't remember"
  - Consider context and tone, not just exact keywords
  - If we have good progress already, be generous in interpreting dismissal intent

- **userChangedTopic**: Set to true if user has abandoned workout logging and changed topics
  - Phrases: "never mind", "forget it", "what's a good workout?", "how should I program?", "tell me about..."
  - Questions about programming, advice, or unrelated topics
  - Do NOT set true if they're just providing more workout details or correcting information
  - Only set true when they've clearly moved on from the current workout logging effort

CONFIDENCE LEVELS:
- "high": User explicitly stated this information
- "medium": Strongly implied or indirectly stated
- "low": Inferred but uncertain

Return ONLY fields you found. Empty JSON {} if no extractable information.`;
}
