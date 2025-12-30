/**
 * AI-powered extraction of training program information from user responses
 * Updates the to-do list based on what the user has shared
 *
 * Pattern: Same structure as coach-creator/todo-extraction.ts + multimodal support from build-workout
 */

import {
  callBedrockApi,
  callBedrockApiMultimodal,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { buildMultimodalContent } from "../streaming/multimodal-helpers";
import { MESSAGE_TYPES } from "../coach-conversation/types";
import { TodoItem, ConversationMessage } from "../todo-types";
import { ProgramDesignerTodoList } from "./types";
import { PROGRAM_TODO_SCHEMA } from "../schemas/program-designer-todo-schema";

/**
 * Extract training program information from user's response and update the to-do list
 * Uses Claude Haiku 4.5 for fast, cheap extraction
 * Supports multimodal input (text + images)
 */
export async function extractAndUpdateTodoList(
  userResponse: string,
  conversationHistory: ConversationMessage[],
  currentTodoList: ProgramDesignerTodoList,
  imageS3Keys?: string[],
): Promise<ProgramDesignerTodoList> {
  console.info("🔍 Extracting training program information from user response");

  // Check if images are present (same pattern as build-workout)
  const hasImages = imageS3Keys && imageS3Keys.length > 0;

  if (hasImages) {
    console.info("🖼️ Processing with images:", {
      imageCount: imageS3Keys!.length,
      imageKeys: imageS3Keys,
    });
  }

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

Extract any training program creation information from the user's response and return a JSON object with the fields that were mentioned. Only include fields where you found information.

IMPORTANT:
- Only extract information that is EXPLICITLY stated or strongly implied
- Set confidence to "high" if explicitly stated, "medium" if implied, "low" if uncertain
- If the user says "none" or "no injuries", that IS valuable information (set value to "none")
- For injuries: "none" means no injuries (this is valid data, not missing data)
- For equipment: extract specific items mentioned (e.g., ["barbell", "pull-up bar", "rowing machine"])
- For goals: capture their primary training objectives
- For duration: extract timeframes (e.g., "8 weeks", "12 weeks", "3 months")
- Images may contain equipment, space, or injury information - analyze them carefully

Return JSON with ONLY the fields you found information for:
{
  "trainingGoals": { "value": "extracted goals", "confidence": "high|medium|low", "notes": "optional context" },
  "programDuration": { "value": "8 weeks", "confidence": "high|medium|low" },
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
            name: "extract_training_program_info",
            description:
              "Extract training program information from user response with optional images",
            inputSchema: PROGRAM_TODO_SCHEMA,
          },
          expectedToolName: "extract_training_program_info",
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
            name: "extract_training_program_info",
            description:
              "Extract training program information from user response",
            inputSchema: PROGRAM_TODO_SCHEMA,
          },
          expectedToolName: "extract_training_program_info",
        },
      );
    }

    console.info("✅ Received extraction response");

    // Handle tool response
    let extracted: any;
    if (typeof extractionResponse !== "string") {
      // Tool was used - extract the input
      extracted = extractionResponse.input;
      console.info("✅ Tool-based extraction successful");
    } else {
      // Fallback to parsing (shouldn't happen with tool enforcement)
      console.warn("⚠️ Received string response, parsing as JSON fallback");
      extracted = parseJsonWithFallbacks(extractionResponse);
    }

    if (!extracted || typeof extracted !== "object") {
      console.warn(
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
          updatedTodoList[key as keyof ProgramDesignerTodoList] = {
            status: "complete",
            value: item.value,
            confidence: item.confidence || "medium",
            notes: item.notes,
            extractedFrom: `message_${messageIndex}`,
            // Store image references for fields that commonly benefit from images
            imageRefs:
              hasImages && shouldStoreImageRef(key) ? imageS3Keys : undefined,
          };

          console.info(
            `✅ Extracted ${key}: ${JSON.stringify(item.value).substring(0, 50)}`,
          );
        }
      }
    }

    // Log extraction summary
    const extractedCount = Object.keys(extracted).length;
    console.info(`✅ Extraction complete: ${extractedCount} fields updated`);

    return updatedTodoList;
  } catch (error) {
    console.error("❌ Error during extraction:", error);
    console.error("Returning current todo list unchanged");
    return currentTodoList;
  }
}

/**
 * Determine if image references should be stored for this field
 */
function shouldStoreImageRef(fieldKey: string): boolean {
  // Fields that commonly benefit from image context
  return [
    "equipmentAccess",
    "trainingEnvironment",
    "injuryConsiderations",
    "currentFitnessBaseline",
  ].includes(fieldKey);
}

/**
 * Build the system prompt for extraction
 */
function buildExtractionPrompt(
  currentTodoList: ProgramDesignerTodoList,
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

  return `You are an expert at extracting structured training program information from conversational responses, including images.

WHAT WE'VE ALREADY COLLECTED:
${collectedFields.length > 0 ? collectedFields.join(", ") : "Nothing yet"}

WHAT WE STILL NEED:
${pendingFields.join(", ")}

YOUR TASK:
Analyze the user's response (text and/or images) and extract any training program creation information. Return a JSON object with ONLY the fields you found.

AVAILABLE FIELDS (only include if you find information):
- trainingGoals: string describing their training objectives
- targetEvent: specific event they're training for or "none"
- programDuration: timeframe (e.g., "8 weeks", "12 weeks", "3 months")
- trainingFrequency: number of days per week (1-7)
- sessionDuration: typical workout length (e.g., "45 minutes", "1 hour")
- startDate: when to begin (YYYY-MM-DD or relative like "next Monday", "ASAP")
- restDaysPreference: array of rest days (e.g., ["Saturday", "Sunday"], ["flexible"])
- equipmentAccess: array of equipment (e.g., ["barbell", "dumbbells", "pull-up bar"])
- trainingEnvironment: where they train (e.g., "CrossFit gym", "home garage", "commercial gym")
- experienceLevel: "beginner" | "intermediate" | "advanced"
- currentFitnessBaseline: description of current performance (e.g., "can do 5 pull-ups")
- injuryConsiderations: description of injuries or "none"
- movementPreferences: movements they enjoy
- movementDislikes: movements they dislike
- programFocus: main focus (e.g., "strength", "conditioning", "mixed", "Olympic lifting")
- intensityPreference: "conservative" | "moderate" | "aggressive"
- volumeTolerance: "low" | "moderate" | "high"
- deloadPreference: deload strategy (e.g., "every 4 weeks", "no deload") (OPTIONAL)
- progressionStyle: progression approach (e.g., "linear", "undulating") (OPTIONAL)

IMAGE ANALYSIS (if images provided):
- Equipment photos: Extract visible equipment items, assess setup quality
- Space photos: Identify training environment, space constraints
- Injury photos: Note visible limitations or modifications needed
- Form videos: Assess current fitness baseline, movement quality

EXTRACTION RULES:
1. ONLY extract information that is clearly stated or strongly implied
2. If uncertain, set confidence to "low"
3. "None" or "no" answers ARE valid data (not missing data)
4. Extract specific details when mentioned
5. Don't make assumptions beyond what's stated
6. If a field already has data, you can update it if new information is provided
7. For images: Analyze visual content carefully and extract relevant equipment/space/injury info

CONFIDENCE LEVELS:
- "high": User explicitly stated this information
- "medium": Strongly implied or indirectly stated
- "low": Inferred but uncertain

Return ONLY fields you found. Empty JSON {} if no extractable information.`;
}
