/**
 * Memory detection logic using AI analysis
 */

import { callBedrockApi, MODEL_IDS } from "../api-helpers";
import {
  MemoryDetectionEvent,
  MemoryDetectionResult,
  MemoryRetrievalNeedResult,
  MemoryCharacteristicsResult
} from "./types";

/**
 * Detects if the user message requires semantic memory retrieval using AI analysis
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

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object:
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
      MODEL_IDS.NOVA_MICRO
    );
    const result = JSON.parse(response);

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

MEMORY TYPES:
- preference: Training preferences, communication style, etc.
- goal: Fitness goals, targets, aspirations
- constraint: Physical limitations, time constraints, equipment limitations
- instruction: Specific coaching instructions or approaches
- context: Personal context, background, lifestyle factors

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object with this exact structure:
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
      MODEL_IDS.NOVA_MICRO
    );
    const result = JSON.parse(response.trim());

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
export async function detectMemoryCharacteristics(
  memoryContent: string,
  coachName?: string
): Promise<MemoryCharacteristicsResult> {
  const systemPrompt = `You are an AI assistant that analyzes user memories to determine their type, importance, scope, and suggest relevant tags for fitness coaching.

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

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object with this exact structure:
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
      MODEL_IDS.NOVA_MICRO
    );
    const result = JSON.parse(response.trim());

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
      throw new Error("Invalid response format from memory characteristics detection");
    }

    return result;
  } catch (error) {
    console.error("Error in memory characteristics detection:", error);

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
        exercises: "Error occurred during analysis, using default exercise tags"
      }
    };
  }
}
