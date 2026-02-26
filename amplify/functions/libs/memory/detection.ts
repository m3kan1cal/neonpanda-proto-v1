/**
 * Memory detection logic using AI analysis
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import {
  MEMORY_REQUEST_DETECTION_SCHEMA,
  CONSOLIDATED_MEMORY_ANALYSIS_SCHEMA,
  MEMORY_CHARACTERISTICS_SCHEMA,
} from "../schemas/memory-detection-schemas";
import { SEMANTIC_RETRIEVAL_SCHEMA } from "../schemas/router-schemas";
import {
  MemoryDetectionEvent,
  MemoryDetectionResult,
  MemoryRetrievalNeedResult,
  MemoryCharacteristicsResult,
} from "./types";
import { logger } from "../logger";
import {
  parseJsonWithFallbacks,
  fixDoubleEncodedProperties,
} from "../response-utils";

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
  messageContext?: string,
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

GUIDELINES:
- CRITICAL: Any message asking "do you remember" or similar memory queries should ALWAYS trigger semantic retrieval
- Consider if knowing the user's past preferences, goals, or constraints would improve the coaching response
- Higher confidence for explicit personal references, lower for general fitness questions
- Include multiple context types if relevant
- Be generous - better to include memory context than miss important personalization`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Use the analyze_semantic_retrieval tool to provide your analysis of whether retrieving stored memories would enhance the coaching response.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.UTILITY_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "analyze_semantic_retrieval",
          description:
            "Analyze if semantic memory retrieval would enhance the coaching response",
          inputSchema: SEMANTIC_RETRIEVAL_SCHEMA,
        },
        expectedToolName: "analyze_semantic_retrieval",
      },
    );

    // Tool use returns structured data directly
    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    // Fix any double-encoded properties from Bedrock response
    const fixedInput = fixDoubleEncodedProperties(response.input);
    const result = fixedInput as MemoryRetrievalNeedResult;

    return result;
  } catch (error) {
    logger.error("Error in memory retrieval detection:", error);
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
  event: MemoryDetectionEvent,
): Promise<MemoryDetectionResult> {
  const { userMessage, messageContext } = event;

  const systemPrompt = `You are an AI assistant that analyzes user messages to detect when they want you to "remember" something about them for future conversations.

TASK: Determine if the user is asking you to remember something, and if so, extract the memory content using the detect_memory_request tool.

MEMORY REQUEST INDICATORS:
- "I want you to remember.."
- "Please remember that.."
- "Remember this about me.."
- "Don't forget that I.."
- "Keep in mind that.."
- "Note that I.."
- "For future reference.."
- "Always remember.."
- Similar phrases expressing desire for persistent memory

CRITICAL: DO NOT DETECT WORKOUT LOGS AS MEMORY REQUESTS
Workouts are already stored in two separate systems and should NEVER trigger memory saves.

DO NOT save as memories:
- Workout performance data or exercise logs
- Training session reports or workout completions
- Past-tense workout descriptions

EXCEPTION: Future workout goals ARE memories (e.g., "I want to deadlift 315 by June")

MEMORY TYPES:
- preference: Training preferences, communication style, etc.
- goal: Fitness goals, targets, aspirations
- constraint: Physical limitations, time constraints, equipment limitations
- instruction: Specific coaching instructions or approaches
- context: Personal context, background, lifestyle factors

GUIDELINES:
- Be conservative: only detect clear, explicit memory requests
- Content should be concise but capture the essential information
- Importance: high=critical for coaching, medium=helpful context, low=nice to know
- If unsure, set isMemoryRequest to false
- If isMemoryRequest is false, set extractedMemory to null`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message and use the detect_memory_request tool to provide your analysis.`;

  try {
    logger.info("🔍 Detecting memory request:", {
      userMessage:
        userMessage.substring(0, 100) + (userMessage.length > 100 ? "..." : ""),
      hasContext: !!messageContext,
      contextLength: messageContext?.length || 0,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.UTILITY_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "detect_memory_request",
          description:
            "Detect if the user is requesting to save something as a memory for future conversations",
          inputSchema: MEMORY_REQUEST_DETECTION_SCHEMA,
        },
        expectedToolName: "detect_memory_request",
      },
    );

    // Tool use returns structured data directly
    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    // Fix any double-encoded properties from Bedrock response
    const fixedInput = fixDoubleEncodedProperties(response.input);
    return fixedInput as MemoryDetectionResult;
  } catch (error) {
    logger.error("Error in memory request detection:", error);

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
  coachName?: string,
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

Use the detect_memory_characteristics tool to analyze this memory.`;

  try {
    logger.info("🎯 Detecting memory characteristics (combined):", {
      memoryContent:
        memoryContent.substring(0, 100) +
        (memoryContent.length > 100 ? "..." : ""),
      coachName: coachName || "unknown",
      contentLength: memoryContent.length,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.EXECUTOR_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "detect_memory_characteristics",
          description:
            "Analyze memory content to determine type, importance, scope, and relevant tags",
          inputSchema: MEMORY_CHARACTERISTICS_SCHEMA,
        },
        expectedToolName: "detect_memory_characteristics",
      },
    );

    // Tool use returns structured data directly
    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    // Fix any double-encoded properties from Bedrock response
    const fixedInput = fixDoubleEncodedProperties(response.input);
    return fixedInput as MemoryCharacteristicsResult;
  } catch (error) {
    logger.error("Error in memory characteristics detection:", error);

    // Log the error context for debugging
    logger.error("❌ Memory characteristics detection failed:", {
      memoryContent:
        memoryContent.substring(0, 100) +
        (memoryContent.length > 100 ? "..." : ""),
      coachName: coachName || "unknown",
      errorType: error instanceof Error ? error.constructor.name : typeof error,
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
  coachName?: string,
): Promise<{
  needsRetrieval: boolean;
  isMemoryRequest: boolean;
  memoryCharacteristics?: MemoryCharacteristicsResult;
  retrievalContext?: MemoryRetrievalNeedResult;
  processingTime: number;
}> {
  const startTime = Date.now();

  const systemPrompt = `You are an AI assistant that performs comprehensive memory analysis for fitness coaching conversations.

TASK: Analyze the user's message using the analyze_memory_needs tool to determine:
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
- Explicitly ask: "Remember that I..", "I want you to know..", "For future reference.."
- Share important preferences: "I prefer..", "I don't like..", "I work best with.."
- Set goals or constraints: "My goal is..", "I can't do..", "I have limited time.."
- Give coaching instructions: "When I do X, remind me to..", "Always check my form on.."
- Use slash commands: "/save-memory [content]"

CRITICAL: DO NOT DETECT WORKOUT LOGS AS MEMORY REQUESTS
Workouts are already stored separately and should NEVER trigger memory saves.

DO NOT save as memories:
- Workout performance data or exercise logs
- Training session reports or workout completions
- Past-tense workout descriptions

EXCEPTION: Future workout goals ARE memories (e.g., "I want to deadlift 315 by June")

=== MEMORY CHARACTERISTICS (if memory request detected) ===
Memory Types:
- preference: Training preferences, communication style, workout timing
- goal: Fitness goals, targets, aspirations, milestones
- constraint: Physical limitations, time constraints, equipment limitations
- instruction: Specific coaching instructions, form cues, reminders
- context: Personal context, background, lifestyle factors

Importance Levels:
- high: Critical for safe and effective coaching (injuries, major goals, key preferences)
- medium: Important for personalized coaching (preferences, minor constraints)
- low: Nice-to-have context (casual preferences, general information)

Scope Determination:
- isCoachSpecific: true if the memory is specific to this coaching relationship
- isCoachSpecific: false if it's general user information applicable to any coach

Suggested Tags: Relevant keywords for easy retrieval (max 5 tags)`;

  const userPrompt = `ANALYZE THIS MESSAGE:
Message: "${userMessage}"
${messageContext ? `Recent Context: "${messageContext}"` : ""}
${coachName ? `Coach Name: ${coachName}` : ""}

Use the analyze_memory_needs tool to provide comprehensive memory analysis following the framework above.`;

  try {
    logger.info("🧠 Consolidated Memory Analysis starting:", {
      messageLength: userMessage.length,
      hasContext: !!messageContext,
      hasCoachName: !!coachName,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.EXECUTOR_MODEL_FULL, // Reliable for critical memory analysis
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "analyze_memory_needs",
          description:
            "Comprehensive analysis of memory retrieval needs and memory save requests",
          inputSchema: CONSOLIDATED_MEMORY_ANALYSIS_SCHEMA,
        },
        expectedToolName: "analyze_memory_needs",
      },
    );

    // Tool use returns structured data directly
    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    // Fix any double-encoded properties from Bedrock response
    const fixedInput = fixDoubleEncodedProperties(response.input);
    const result = fixedInput as any;
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

    logger.info("✅ Consolidated Memory Analysis completed:", {
      needsRetrieval: consolidatedResult.needsRetrieval,
      isMemoryRequest: consolidatedResult.isMemoryRequest,
      memoryType: consolidatedResult.memoryCharacteristics?.type,
      processingTime,
      confidence: result.overallConfidence,
    });

    return consolidatedResult;
  } catch (error) {
    logger.error("❌ Consolidated Memory Analysis failed:", error);

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

/**
 * Filter memories for coach creator "clean slate" approach
 * Only returns stable, universal constraints (injuries, equipment) not goals or programs
 *
 * @param memories - Array of user memories
 * @returns Filtered array containing only clean slate-appropriate memories
 */
export function filterMemories(memories: any[]): any[] {
  if (!memories || memories.length === 0) {
    return [];
  }

  return memories.filter((memory) => {
    const memoryType = memory.type?.toLowerCase() || "";
    const coachId = memory.coachId;
    const tags = memory.tags || [];

    // ❌ EXCLUDE: Coach-specific memories (user is creating a NEW coach)
    if (coachId && coachId !== "all") {
      logger.info(`🚫 Filtering out coach-specific memory: ${memory.memoryId}`);
      return false;
    }

    // ❌ EXCLUDE: Goal-related memories (user is defining NEW goals)
    if (memoryType === "goal") {
      logger.info(`🚫 Filtering out goal memory: ${memory.memoryId}`);
      return false;
    }

    // ❌ EXCLUDE: Workout planning memories (tied to specific programs)
    if (
      memoryType === "workout_planning" ||
      tags.includes("workout_planning")
    ) {
      logger.info(
        `🚫 Filtering out workout planning memory: ${memory.memoryId}`,
      );
      return false;
    }

    // ❌ EXCLUDE: Instruction memories (coach-specific approaches)
    if (memoryType === "instruction") {
      logger.info(`🚫 Filtering out instruction memory: ${memory.memoryId}`);
      return false;
    }

    // ❌ EXCLUDE: Motivational memories (coach-specific patterns)
    if (memoryType === "motivational") {
      logger.info(`🚫 Filtering out motivational memory: ${memory.memoryId}`);
      return false;
    }

    // ❌ EXCLUDE: Competition/event memories (specific timebound goals)
    const competitionTags = ["competition", "meet", "event", "comp"];
    if (
      tags.some((tag: string) => competitionTags.includes(tag.toLowerCase()))
    ) {
      logger.info(`🚫 Filtering out competition memory: ${memory.memoryId}`);
      return false;
    }

    // ✅ ALLOW: Constraint memories with stable physical info
    if (memoryType === "constraint") {
      const allowedTags = [
        "injury",
        "mobility",
        "equipment",
        "scheduling",
        "recovery",
      ];
      const hasAllowedTag = tags.some((tag: string) =>
        allowedTags.some((allowed) => tag.toLowerCase().includes(allowed)),
      );

      if (hasAllowedTag) {
        logger.info(`✅ Including constraint memory: ${memory.memoryId}`);
        return true;
      }
    }

    // ❌ EXCLUDE: Everything else by default (clean slate approach)
    logger.info(
      `🚫 Filtering out memory (default exclusion): ${memory.memoryId}, type: ${memoryType}`,
    );
    return false;
  });
}
