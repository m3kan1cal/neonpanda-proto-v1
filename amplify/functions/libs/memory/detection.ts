/**
 * Memory detection logic using AI analysis
 */

import { callBedrockApi, MODEL_IDS } from "../api-helpers";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";
import {
  MemoryDetectionEvent,
  MemoryDetectionResult,
  MemoryRetrievalNeedResult,
  MemoryCharacteristicsResult,
} from "./types";
import { parseJsonWithFallbacks } from "../response-utils";

/**
 * @deprecated DEPRECATED: This function has been replaced by the Smart Request Router.
 *
 * Use `analyzeRequestCapabilities()` from `../coach-conversation/detection.ts` instead.
 * The smart router provides the same functionality via `routerResult.memoryProcessing.needsRetrieval`
 * along with comprehensive analysis of all processing needs in a single AI call.
 *
 * This function will be removed in a future version.
 */
export async function detectMemoryRetrievalNeed(
  userMessage: string,
  messageContext?: string
): Promise<MemoryRetrievalNeedResult> {
  const systemPrompt = `You are an AI assistant that analyzes user messages to determine if retrieving past memories would enhance the coaching response.

TASK: Determine if the user's message would benefit from accessing their stored preferences, goals, constraints, or past context.

MEMORY CONTEXT INDICATORS:
- Direct memory queries ("do you remember", "remember my", "what do you remember about", "did I tell you about")
- References to personal preferences ("I like/hate", "works for me", "my preference")
- Goal-related discussions ("my goal", "trying to", "working towards", "want to achieve")
- Constraint mentions ("I can't", "limited time", "only have", "schedule constraints")
- Emotional/motivational states that might have past patterns ("feeling frustrated", "struggling", "motivated")
- Past reference patterns ("remember when", "you told me", "we discussed", "like before")
- Requests for personalized advice that would benefit from knowing user context
- Questions about progress, patterns, or consistency
- Mentions of specific preferences, limitations, or approaches

CONTEXT TYPES:
- preference: Training preferences, exercise likes/dislikes, communication style
- goal: Fitness goals, targets, aspirations, motivations
- constraint: Physical limitations, time constraints, equipment limitations, schedule
- instruction: Specific coaching approaches or methods the user prefers
- context: Personal background, lifestyle factors, emotional patterns
- motivational: Past emotional states, motivation patterns, support strategies

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

RESPONSE SCHEMA:
{
  "needsSemanticRetrieval": boolean,
  "confidence": number (0.0 to 1.0),
  "contextTypes": ["preference", "goal", "constraint", "instruction", "context", "motivational"],
  "reasoning": "brief explanation why semantic memory retrieval would/wouldn't help"
}

GUIDELINES:
- CRITICAL: Any message asking "do you remember" or similar memory queries should ALWAYS trigger semantic retrieval
- Consider if knowing the user's past preferences, goals, or constraints would improve the coaching response
- Higher confidence for explicit personal references, lower for general fitness questions
- Include multiple context types if relevant
- Be generous - better to include memory context than miss important personalization`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message and determine if retrieving stored memories would enhance the coaching response.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_FULL,
      { prefillResponse: "{" } // Force JSON output format
    );
    const result = parseJsonWithFallbacks(response);

    return result;
  } catch (error) {
    console.error("Error in memory retrieval detection:", error);
    // Conservative fallback - assume no semantic retrieval needed
    return {
      needsSemanticRetrieval: false,
      confidence: 0.0,
      contextTypes: [],
      reasoning: "Error in AI detection, defaulting to no semantic retrieval",
    };
  }
}

/**
 * Detect if user message contains a memory request using Bedrock API
 */
export async function detectMemoryRequest(
  event: MemoryDetectionEvent
): Promise<MemoryDetectionResult> {
  const { userMessage, messageContext } = event;

  const systemPrompt = `You are an AI assistant that analyzes user messages to detect when they want you to "remember" something about them for future conversations.

TASK: Determine if the user is asking you to remember something, and if so, extract the memory content.

MEMORY REQUEST INDICATORS:
- "I want you to remember..."
- "Please remember that..."
- "Remember this about me..."
- "Don't forget that I..."
- "Keep in mind that..."
- "Note that I..."
- "For future reference..."
- "Always remember..."
- Similar phrases expressing desire for persistent memory

CRITICAL: DO NOT DETECT WORKOUT LOGS AS MEMORY REQUESTS
Workouts are already stored in two separate systems:
1. Pinecone: Stores workout summaries for semantic search and progress tracking
2. DynamoDB: Stores complete workout records with full details

DO NOT save as memories:
- Workout performance data (e.g., "I did Fran in 8:57", "Deadlifted 315 for 5 reps")
- Exercise logs with sets, reps, weights, times, or distances
- Training session reports or workout completions
- Slash commands like "/log-workout" (handled by workout system)
- Messages that are primarily about logging today's training activity

These are handled by the workout logging system (/log-workout) and should NEVER trigger memory saves.

EXCEPTION: Future workout goals ARE memories (e.g., "I want to deadlift 315 by June" = goal memory)
Only the GOAL is a memory, not the actual workout performance when achieved.

MEMORY TYPES:
- preference: Training preferences, communication style, etc.
- goal: Fitness goals, targets, aspirations
- constraint: Physical limitations, time constraints, equipment limitations
- instruction: Specific coaching instructions or approaches
- context: Personal context, background, lifestyle factors

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

RESPONSE SCHEMA:
{
  "isMemoryRequest": boolean,
  "confidence": number (0.0 to 1.0),
  "extractedMemory": {
    "content": "string describing what to remember",
    "type": "preference|goal|constraint|instruction|context",
    "importance": "high|medium|low"
  } | null,
  "reasoning": "brief explanation of decision"
}

GUIDELINES:
- Be conservative: only detect clear, explicit memory requests
- Content should be concise but capture the essential information
- Importance: high=critical for coaching, medium=helpful context, low=nice to know
- If unsure, set isMemoryRequest to false
- Don't detect questions, general statements, or workout logging as memory requests`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message and respond with the JSON format specified.`;

  try {
    console.info("🔍 Detecting memory request:", {
      userMessage:
        userMessage.substring(0, 100) + (userMessage.length > 100 ? "..." : ""),
      hasContext: !!messageContext,
      contextLength: messageContext?.length || 0,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_FULL
    );
    // Clean the response to handle potential markdown wrapping
    let cleanedResponse = response.trim();

    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    // Remove any leading/trailing whitespace again
    cleanedResponse = cleanedResponse.trim();

    let result;
    try {
      result = JSON.parse(cleanedResponse);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error("❌ JSON parsing failed for memory characteristics:", {
        originalResponse: response,
        cleanedResponse: cleanedResponse,
        originalLength: response.length,
        cleanedLength: cleanedResponse.length,
        parseError: errorMessage,
        startsWithJson: cleanedResponse.startsWith('```json'),
        startsWithBackticks: cleanedResponse.startsWith('```'),
        firstChar: cleanedResponse.charAt(0),
        lastChar: cleanedResponse.charAt(cleanedResponse.length - 1),
      });
      throw new Error(
        `Invalid response format from memory characteristics detection: ${errorMessage}`
      );
    }

    // Validate the response structure
    if (
      typeof result.isMemoryRequest !== "boolean" ||
      typeof result.confidence !== "number" ||
      result.confidence < 0 ||
      result.confidence > 1
    ) {
      throw new Error("Invalid response format from memory request detection");
    }

    return result;
  } catch (error) {
    console.error("Error in memory request detection:", error);

    // Return safe fallback (no memory detected)
    return {
      isMemoryRequest: false,
      confidence: 0,
      reasoning: "Error occurred during memory request detection analysis",
    };
  }
}

/**
 * Combined function to detect memory type, importance, scope, and suggest relevant tags in a single AI call
 * This is more efficient and provides better consistency than separate calls
 */
/**
 * @deprecated DEPRECATED: This function has been replaced by the Smart Request Router.
 *
 * Use `analyzeRequestCapabilities()` from `../coach-conversation/detection.ts` instead.
 * The smart router provides the same functionality via `routerResult.memoryProcessing.memoryCharacteristics`
 * along with comprehensive analysis of all processing needs in a single AI call.
 *
 * For consolidated memory analysis, use `analyzeMemoryNeeds()` from this same file.
 *
 * This function will be removed in a future version.
 */
export async function detectMemoryCharacteristics(
  memoryContent: string,
  coachName?: string
): Promise<MemoryCharacteristicsResult> {
  const systemPrompt = `You are an AI assistant that analyzes user memories to determine their type, importance, scope, and suggest relevant tags for fitness coaching.

CRITICAL: This function should ONLY be called for content that has already been identified as a memory request.
DO NOT process workout performance logs - these are handled by the workout logging system and stored separately in Pinecone and DynamoDB.

MEMORY TYPES:
- preference: Training preferences, communication style, etc.
- goal: Fitness goals, targets, aspirations
- constraint: Physical limitations, time constraints, equipment limitations
- instruction: Specific coaching instructions or approaches
- context: Personal context, background, lifestyle factors

IMPORTANCE LEVELS:
- high: Critical for coaching, safety-related, or core preferences
- medium: Helpful context that improves coaching quality
- low: Nice to know information, minor preferences

SCOPE DETERMINATION:
COACH-SPECIFIC memories are about:
- Coaching style preferences and feedback ("I like when Marcus gives detailed technical cues")
- Communication style preferences ("Your motivational approach works well for me")
- Methodology-specific interactions ("In CrossFit, I need you to remind me about pacing")
- Coach relationship dynamics ("You push me the right amount", "I respond better to your encouragement")
- Coaching technique feedback ("I prefer when you demonstrate movements")
- Program-specific context tied to this coach's approach

GLOBAL memories apply to ALL coaches and are about:
- Physical constraints and injuries ("I have a shoulder injury")
- Equipment, time, location constraints ("I train at home with limited equipment")
- Goals and aspirations ("I want to deadlift 315 pounds")
- Personal context and lifestyle ("I'm a busy parent with two kids")
- General training preferences ("I prefer morning workouts")
- Dietary restrictions or preferences
- Past training history and experience

TAG SUGGESTIONS:
Select 3-5 relevant tags from these categories:

CONTENT TAGS:
- preference: Training preferences, likes/dislikes
- goal: Fitness goals, targets, aspirations
- constraint: Limitations, restrictions, boundaries
- instruction: Coaching directions, methodologies
- context: Personal background, lifestyle factors

CONTEXT TAGS:
- workout_planning: Program design, scheduling, periodization
- form_analysis: Technique, movement quality, corrections
- motivation: Mental state, encouragement, drive
- scheduling: Time management, availability, timing
- nutrition: Diet, supplements, fueling
- injury_management: Pain, recovery, modifications
- equipment: Gear, tools, facility access
- communication: Feedback style, interaction preferences

SCOPE TAGS:
- coach_specific: Tied to specific coach relationship
- global: Applies to all coaches
- methodology_specific: Tied to training approach

TEMPORAL TAGS:
- morning: Morning-related preferences/constraints
- evening: Evening-related preferences/constraints
- weekend: Weekend-specific activities/constraints
- seasonal: Seasonal variations, weather-related

IMPORTANCE TAGS:
- critical: Safety-critical, must-know information
- important: High-value context for coaching
- helpful: Nice-to-know additional context

EXERCISE DETECTION:
If the memory mentions specific exercises, add relevant exercise tags:
- Exercise names: "lunges" → ["lunge", "lower_body", "functional"]
- Exercise types: "I love compound movements" → ["compound", "preference"]
- Body parts: "I prefer upper body exercises" → ["upper_body", "preference"]
- Equipment: "I only have dumbbells" → ["dumbbell", "equipment", "constraint"]

EXERCISE TAG CATEGORIES:
- Exercise names: squat, deadlift, lunge, push_up, pull_up, bench_press, overhead_press, row, curl, extension, lateral_raise, tricep_dip, etc.
- Exercise types: compound, isolation, functional, cardio, plyometric, isometric
- Body parts: upper_body, lower_body, core, chest, back, shoulders, arms, legs, glutes, abs, quads, hamstrings, calves
- Equipment: bodyweight, dumbbell, barbell, kettlebell, machine, cable, resistance_band, medicine_ball
- Movement patterns: push, pull, squat, hinge, lunge, carry, rotation, lateral, vertical, horizontal

CRITICAL RESPONSE REQUIREMENTS:
1. RESPOND WITH PURE JSON ONLY - NO MARKDOWN, NO BACKTICKS, NO EXPLANATIONS
2. START IMMEDIATELY WITH { AND END WITH }
3. DO NOT WRAP IN TRIPLE BACKTICKS OR ANY OTHER FORMATTING
4. INCLUDE ALL REQUIRED FIELDS EXACTLY AS SPECIFIED

REQUIRED JSON STRUCTURE:
{
  "type": "preference|goal|constraint|instruction|context",
  "importance": "high|medium|low",
  "isCoachSpecific": boolean,
  "confidence": number (0.0 to 1.0),
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "exerciseTags": ["exercise1", "exercise2"],
  "reasoning": {
    "type": "brief explanation of type classification",
    "importance": "brief explanation of importance level",
    "scope": "brief explanation of why this is coach-specific or global",
    "tags": "brief explanation of tag choices",
    "exercises": "brief explanation of exercise tags"
  }
}

CRITICAL TYPE SELECTION RULE:
- You MUST choose EXACTLY ONE type from: preference, goal, constraint, instruction, context
- DO NOT use compound types like "preference|constraint" or "goal|preference"
- If a memory has multiple aspects, choose the PRIMARY/DOMINANT type
- For safety-related items (injuries, limitations), always choose "constraint"
- For training preferences (timing, style), choose "preference"

GUIDELINES:
- Default to "preference", "medium", and global (false) if unsure
- Safety/injury constraints are always "high" importance and global
- Goals are typically "medium" or "high" importance and global
- Coach-specific memories should have clear references to coaching relationship or style
- Be conservative: most user context should be global unless explicitly about coaching relationship
- Select tags that will help with memory retrieval and context understanding
- Prioritize tags that describe the content and context, not just the type
- Include 3-5 tags maximum to avoid tag bloat
- For exercise-related memories, include relevant exercise tags (exercise names, body parts, equipment, movement patterns)
- Exercise tags should capture the specific exercises mentioned and their characteristics
- If no exercises are mentioned, leave exerciseTags as an empty array []`;

  const userPrompt = `${coachName ? `COACH NAME: ${coachName}\n\n` : ""}MEMORY TO ANALYZE:\n"${memoryContent}"

Analyze this memory and respond with the JSON format specified.`;

  try {
    console.info("🎯 Detecting memory characteristics (combined):", {
      memoryContent:
        memoryContent.substring(0, 100) +
        (memoryContent.length > 100 ? "..." : ""),
      coachName: coachName || "unknown",
      contentLength: memoryContent.length,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_FULL
    );
    // Clean the response to handle potential markdown wrapping
    let cleanedResponse = response.trim();

    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    // Remove any leading/trailing whitespace again
    cleanedResponse = cleanedResponse.trim();

    let result;
    try {
      result = JSON.parse(cleanedResponse);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error("❌ JSON parsing failed for memory characteristics:", {
        originalResponse: response.substring(0, 500) + (response.length > 500 ? "..." : ""),
        cleanedResponse: cleanedResponse.substring(0, 500) + (cleanedResponse.length > 500 ? "..." : ""),
        originalLength: response.length,
        cleanedLength: cleanedResponse.length,
        parseError: errorMessage,
        startsWithJson: cleanedResponse.startsWith('```json'),
        startsWithBackticks: cleanedResponse.startsWith('```'),
        firstChar: cleanedResponse.charAt(0),
        lastChar: cleanedResponse.charAt(cleanedResponse.length - 1),
        memoryContent: memoryContent.substring(0, 100) + (memoryContent.length > 100 ? "..." : ""),
        coachName: coachName || "unknown"
      });
      throw new Error(
        `Invalid response format from memory characteristics detection: ${errorMessage}`
      );
    }

    // Validate the response structure
    const validTypes = [
      "preference",
      "goal",
      "constraint",
      "instruction",
      "context",
    ];
    const validImportance = ["high", "medium", "low"];

    if (
      !validTypes.includes(result.type) ||
      !validImportance.includes(result.importance) ||
      typeof result.isCoachSpecific !== "boolean" ||
      typeof result.confidence !== "number" ||
      result.confidence < 0 ||
      result.confidence > 1 ||
      !Array.isArray(result.suggestedTags) ||
      result.suggestedTags.length === 0 ||
      result.suggestedTags.length > 5 ||
      !Array.isArray(result.exerciseTags) ||
      !result.reasoning ||
      typeof result.reasoning.type !== "string" ||
      typeof result.reasoning.importance !== "string" ||
      typeof result.reasoning.scope !== "string" ||
      typeof result.reasoning.tags !== "string" ||
      typeof result.reasoning.exercises !== "string"
    ) {
      console.error("❌ Memory characteristics validation failed:", {
        type: result.type,
        validTypes: validTypes,
        typeValid: validTypes.includes(result.type)
      });
      throw new Error(
        "Invalid response format from memory characteristics detection"
      );
    }

    return result;
  } catch (error) {
    console.error("Error in memory characteristics detection:", error);

    // Log the error context for debugging
    console.error("❌ Memory characteristics detection failed:", {
      memoryContent: memoryContent.substring(0, 100) + (memoryContent.length > 100 ? "..." : ""),
      coachName: coachName || "unknown",
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    // Return safe fallback
    return {
      type: "preference",
      importance: "medium",
      isCoachSpecific: false,
      confidence: 0,
      suggestedTags: ["preference", "helpful"],
      exerciseTags: [],
      reasoning: {
        type: "Error occurred during analysis, using default type",
        importance: "Error occurred during analysis, using default importance",
        scope: "Error occurred during analysis, defaulting to global",
        tags: "Error occurred during analysis, using default tags",
        exercises:
          "Error occurred during analysis, using default exercise tags",
      },
    };
  }
}

/**
 * Consolidated Memory Analysis - Combines retrieval need detection and characteristics analysis
 * Replaces separate detectMemoryRetrievalNeed() and detectMemoryCharacteristics() calls
 *
 * @param userMessage - The user's message to analyze
 * @param messageContext - Optional context from recent conversation
 * @param coachName - Optional coach name for scope determination
 * @returns Promise with combined memory analysis results
 */
export async function analyzeMemoryNeeds(
  userMessage: string,
  messageContext?: string,
  coachName?: string
): Promise<{
  needsRetrieval: boolean;
  isMemoryRequest: boolean;
  memoryCharacteristics?: MemoryCharacteristicsResult;
  retrievalContext?: MemoryRetrievalNeedResult;
  processingTime: number;
}> {
  const startTime = Date.now();

  const systemPrompt = `You are an AI assistant that performs comprehensive memory analysis for fitness coaching conversations.

TASK: Analyze the user's message to determine:
1. Whether retrieving past memories would enhance the coaching response
2. Whether the user is requesting to save/remember something
3. If memory saving is needed, classify the memory characteristics

ANALYSIS FRAMEWORK:

=== MEMORY RETRIEVAL ASSESSMENT ===
Retrieval is beneficial for:
- Questions about past workouts, goals, or preferences
- References to previous conversations or coaching approaches
- Progress comparisons or trend analysis requests
- Personalized advice requests that benefit from context
- Form or technique questions that reference past issues
- Goal-setting discussions that build on previous conversations

Context Types for Retrieval:
- goals: Goal-setting, aspirations, targets
- preferences: Training preferences, communication style
- constraints: Physical limitations, time constraints, equipment
- progress: Past achievements, improvements, setbacks
- techniques: Form issues, technique preferences, coaching cues
- motivation: Motivational triggers, inspiration sources

=== MEMORY REQUEST DETECTION ===
User wants to save something when they:
- Explicitly ask: "Remember that I...", "I want you to know...", "For future reference..."
- Share important preferences: "I prefer...", "I don't like...", "I work best with..."
- Set goals or constraints: "My goal is...", "I can't do...", "I have limited time..."
- Give coaching instructions: "When I do X, remind me to...", "Always check my form on..."
- Use slash commands: "/save-memory [content]"

CRITICAL: DO NOT DETECT WORKOUT LOGS AS MEMORY REQUESTS
Workouts are already stored in two separate systems:
1. Pinecone: Stores workout summaries for semantic search and progress tracking
2. DynamoDB: Stores complete workout records with full details

DO NOT save as memories:
- Workout performance data (e.g., "I did Fran in 8:57", "Deadlifted 315 for 5 reps")
- Exercise logs with sets, reps, weights, times, or distances
- Training session reports or workout completions
- Slash commands like "/log-workout" (handled by workout system)
- Messages that are primarily about logging today's training activity

These are handled by the workout logging system (/log-workout) and should NEVER trigger memory saves.

EXCEPTION: Future workout goals ARE memories (e.g., "I want to deadlift 315 by June" = goal memory)
Only the GOAL is a memory, not the actual workout performance when achieved.

=== MEMORY CHARACTERISTICS (if memory request detected) ===
Memory Types:
- preference: Training preferences, communication style, workout timing
- goal: Fitness goals, targets, aspirations, milestones
- constraint: Physical limitations, time constraints, equipment limitations
- instruction: Specific coaching instructions, form cues, reminders

Importance Levels:
- high: Critical for safe and effective coaching (injuries, major goals, key preferences)
- medium: Important for personalized coaching (preferences, minor constraints)
- low: Nice-to-have context (casual preferences, general information)

Scope Determination:
- isCoachSpecific: true if the memory is specific to this coaching relationship
- isCoachSpecific: false if it's general user information applicable to any coach

Suggested Tags: Relevant keywords for easy retrieval (max 5 tags)

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

REQUIRED JSON STRUCTURE:
{
  "needsRetrieval": boolean,
  "retrievalReasoning": "brief explanation of retrieval decision",
  "contextTypes": ["goals", "preferences", "constraints", "progress", "techniques", "motivation"],
  "retrievalConfidence": number (0.0 to 1.0),
  "isMemoryRequest": boolean,
  "memoryRequestReasoning": "brief explanation of memory request detection",
  "memoryCharacteristics": {
    "type": "preference" | "goal" | "constraint" | "instruction" | null,
    "importance": "low" | "medium" | "high",
    "isCoachSpecific": boolean,
    "suggestedTags": ["tag1", "tag2", "tag3"],
    "reasoning": "brief explanation of characteristics analysis"
  } | null,
  "overallConfidence": number (0.0 to 1.0)
}`;

  const userPrompt = `ANALYZE THIS MESSAGE:
Message: "${userMessage}"
${messageContext ? `Recent Context: "${messageContext}"` : ""}
${coachName ? `Coach Name: ${coachName}` : ""}

Provide comprehensive memory analysis following the framework above.`;

  try {
    console.info("🧠 Consolidated Memory Analysis starting:", {
      messageLength: userMessage.length,
      hasContext: !!messageContext,
      hasCoachName: !!coachName,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_FULL, // Reliable for critical memory analysis
      { prefillResponse: "{" } // Force JSON output format
    );

    const result = parseJsonWithFallbacks(response);
    const processingTime = Date.now() - startTime;

    // Transform result to match expected interface
    const consolidatedResult = {
      needsRetrieval: result.needsRetrieval,
      isMemoryRequest: result.isMemoryRequest,
      memoryCharacteristics: result.memoryCharacteristics
        ? {
            type: result.memoryCharacteristics.type,
            importance: result.memoryCharacteristics.importance,
            isCoachSpecific: result.memoryCharacteristics.isCoachSpecific,
            confidence: result.overallConfidence,
            suggestedTags: result.memoryCharacteristics.suggestedTags,
            exerciseTags: [], // Not analyzed in consolidated version
            reasoning: {
              type: result.memoryCharacteristics.reasoning,
              importance: result.memoryCharacteristics.reasoning,
              scope: result.memoryCharacteristics.reasoning,
              tags: result.memoryCharacteristics.reasoning,
              exercises: "Not analyzed in consolidated version",
            },
          }
        : undefined,
      retrievalContext: result.needsRetrieval
        ? {
            needsSemanticRetrieval: result.needsRetrieval,
            confidence: result.retrievalConfidence,
            contextTypes: result.contextTypes,
            reasoning: result.retrievalReasoning,
          }
        : undefined,
      processingTime,
    };

    console.info("✅ Consolidated Memory Analysis completed:", {
      needsRetrieval: consolidatedResult.needsRetrieval,
      isMemoryRequest: consolidatedResult.isMemoryRequest,
      memoryType: consolidatedResult.memoryCharacteristics?.type,
      processingTime,
      confidence: result.overallConfidence,
    });

    return consolidatedResult;
  } catch (error) {
    console.error("❌ Consolidated Memory Analysis failed:", error);

    // Return safe fallback
    return {
      needsRetrieval: true, // Default to enabling retrieval
      isMemoryRequest: false,
      memoryCharacteristics: undefined,
      retrievalContext: {
        needsSemanticRetrieval: true,
        confidence: 0.5,
        contextTypes: ["preferences", "goals"],
        reasoning: "Fallback: Analysis failed, enabling basic retrieval",
      },
      processingTime: Date.now() - startTime,
    };
  }
}
