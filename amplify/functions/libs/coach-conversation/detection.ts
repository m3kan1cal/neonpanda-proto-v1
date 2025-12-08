/**
 * Coach Conversation Detection
 *
 * This module contains detection logic for coach conversation events and triggers,
 * including complexity detection for conversation summarization.
 */

import { invokeAsyncLambda, callBedrockApi, MODEL_IDS } from "../api-helpers";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";
import { SmartRequestRouter } from "../streaming/business-types";
import { parseJsonWithFallbacks } from "../response-utils";

/**
 * @deprecated DEPRECATED: This function has been replaced by the Smart Request Router.
 *
 * Use `analyzeRequestCapabilities()` from this same file instead.
 * The smart router provides the same functionality via `routerResult.conversationComplexity.hasComplexity`
 * along with comprehensive analysis of all processing needs in a single AI call.
 *
 * This function will be removed in a future version.
 *
 * @param userMessage - The user's message to analyze
 * @param messageContext - Optional context from the conversation
 * @returns Promise<boolean> indicating if complexity triggers are present
 */
export async function detectConversationComplexity(
  userMessage: string,
  messageContext?: string
): Promise<boolean> {
  const systemPrompt = `You are an AI assistant that analyzes user messages in fitness coaching conversations to detect complexity that warrants immediate conversation summarization.

TASK: Determine if the user's message contains complexity triggers that indicate the conversation has reached a point where summarization would be valuable for maintaining context and coaching effectiveness.

COMPLEXITY INDICATORS:
- Goal-setting and planning language ("my goal", "working toward", "trying to achieve", "planning to")
- Strong emotional language (positive: "stoked", "crushed it", "breakthrough"; negative: "frustrated", "devastated", "struggling")
- Major changes or setbacks ("injury", "can't do", "switching to", "plateau", "not working")
- Significant achievements ("PR", "first time", "milestone", "breakthrough", "major improvement")
- Coaching relationship dynamics ("you understand", "your approach", "coaching style", "connection")
- Life/schedule changes ("busy", "new job", "time constraints", "life change", "priorities")
- Health/physical status changes ("pain", "recovery", "energy levels", "feeling strong/weak")
- Program/approach modifications ("different approach", "new program", "methodology change")
- Motivation/mindset shifts ("giving up", "losing motivation", "inspired", "committed")
- Social/support context changes ("family", "accountability", "support", "pressure")
- Learning breakthroughs ("clicked", "figured it out", "makes sense now", "epiphany")
- Competition/performance context ("competition", "event", "performance", "season")
- Nutrition/lifestyle factors ("diet", "lifestyle", "habits", "body composition")

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

RESPONSE SCHEMA:
{
  "hasComplexity": boolean,
  "confidence": number (0.0 to 1.0),
  "complexityTypes": ["emotional", "goal", "achievement", "setback", "relationship", "lifestyle", "learning", "health"],
  "reasoning": "brief explanation of complexity detected or why none found"
}

GUIDELINES:
- Look for emotional intensity, significant changes, achievements, or relationship dynamics
- Consider if the message indicates a meaningful shift in the user's journey
- Higher confidence for clear emotional language or major life/training changes
- Be generous - better to trigger summarization than miss important context shifts`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message for complexity triggers that would warrant conversation summarization.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL,
      { prefillResponse: "{" } // Force JSON output format
    ) as string; // No tools used, always returns string
    const result = parseJsonWithFallbacks(response);

    return result.hasComplexity || false;
  } catch (error) {
    console.error("Error in conversation complexity detection:", error);
    // Conservative fallback - assume no complexity to avoid unnecessary summaries
    return false;
  }
}

/**
 * Detect if conversation summary should be triggered and trigger it if needed
 * @param userId - User ID
 * @param coachId - Coach ID
 * @param conversationId - Conversation ID
 * @param userMessage - The user's message to analyze for complexity
 * @param currentMessageCount - Current total message count in conversation
 * @param messageContext - Optional context from the conversation
 * @returns Object indicating if summary was triggered and the reason
 */
export async function detectAndProcessConversationSummary(
  userId: string,
  coachId: string,
  conversationId: string,
  userMessage: string,
  currentMessageCount: number,
  messageContext?: string
): Promise<{
  triggered: boolean;
  triggerReason?: "message_count" | "complexity";
  complexityDetected: boolean;
}> {
  const hasComplexityTriggers = await detectConversationComplexity(
    userMessage,
    messageContext
  );
  const shouldTriggerSummary =
    currentMessageCount % 6 === 0 || hasComplexityTriggers;

  if (!shouldTriggerSummary) {
    return {
      triggered: false,
      complexityDetected: hasComplexityTriggers,
    };
  }

  const triggerReason =
    currentMessageCount % 6 === 0 ? "message_count" : "complexity";

  console.info("🔄 Conversation summary trigger detected:", {
    conversationId,
    totalMessages: currentMessageCount,
    triggeredBy: triggerReason,
    complexityDetected: hasComplexityTriggers,
  });

  try {
    // Trigger async conversation summary generation
    const summaryFunction =
      process.env.BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME;
    if (!summaryFunction) {
      console.warn(
        "⚠️ BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME environment variable not set"
      );
      return {
        triggered: false,
        triggerReason,
        complexityDetected: hasComplexityTriggers,
      };
    }

    await invokeAsyncLambda(
      summaryFunction,
      {
        userId,
        coachId,
        conversationId,
        triggerReason,
        messageCount: currentMessageCount,
        complexityIndicators: hasComplexityTriggers
          ? ["complexity_detected"]
          : undefined,
      },
      "conversation summary generation"
    );

    return {
      triggered: true,
      triggerReason,
      complexityDetected: hasComplexityTriggers,
    };
  } catch (error) {
    console.error(
      "❌ Failed to trigger conversation summary generation:",
      error
    );
    return {
      triggered: false,
      triggerReason,
      complexityDetected: hasComplexityTriggers,
    };
  }
}

/**
 * Smart Request Router - Analyzes user message to determine all processing capabilities needed
 * Consolidates multiple AI detection calls into a single intelligent routing decision
 *
 * @param userMessage - The user's message to analyze
 * @param messageContext - Optional context from recent conversation
 * @param conversationLength - Number of messages in conversation for complexity assessment
 * @param userTimezone - Optional user timezone for temporal context (e.g., 'America/Los_Angeles')
 * @param criticalTrainingDirective - Optional critical training directive for context
 * @returns Promise<SmartRequestRouter> with all processing decisions
 */
export async function analyzeRequestCapabilities(
  userMessage: string,
  messageContext?: string,
  conversationLength: number = 0,
  userTimezone?: string,
  criticalTrainingDirective?: { content: string; enabled: boolean }
): Promise<SmartRequestRouter> {
  const startTime = Date.now();

  // Build temporal context section if timezone is provided
  const effectiveTimezone = userTimezone || 'America/Los_Angeles';
  const currentDateTime = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: effectiveTimezone,
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: effectiveTimezone,
    timeZoneName: "short",
  };
  const formattedDate = currentDateTime.toLocaleDateString("en-US", dateOptions);
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", timeOptions);

  const temporalContextSection = userTimezone ? `

📅 TEMPORAL CONTEXT:
**Current Date**: ${formattedDate}
**Current Time**: ${formattedTime}
**User Timezone**: ${effectiveTimezone}

CRITICAL: Use this temporal context when analyzing workout detection and temporal references:
- "this morning" means earlier TODAY (${formattedDate}), not yesterday
- "yesterday" means the calendar day before today
- "earlier" or "earlier today" means earlier on ${formattedDate}
- Consider current time (${formattedTime}) when interpreting time-based references

` : '';

  // Build directive context section if enabled
  const directiveContextSection = criticalTrainingDirective?.enabled && criticalTrainingDirective?.content ? `

🚨 CRITICAL TRAINING DIRECTIVE:
${criticalTrainingDirective.content}

IMPORTANT: This directive provides crucial context about the user's training priorities and constraints. Consider it when analyzing their message intent, especially for workout logging and goal-related discussions.

` : '';

  const systemPrompt = `You are an AI assistant that analyzes user messages in fitness coaching conversations to determine ALL processing capabilities needed in a single comprehensive analysis.
${temporalContextSection}${directiveContextSection}
TASK: Analyze the user's message and determine:
1. User intent and whether contextual updates should be shown
2. Workout logging detection and classification
3. Memory processing needs (retrieval and saving)
4. Context search requirements
5. Conversation complexity and summary needs
6. Processing priorities for optimal performance

ANALYSIS FRAMEWORK:

=== USER INTENT CLASSIFICATION ===
- workout_logging: Message describes a completed workout with specific details (past tense)
- program_design: User wants to design/create a new training program (future intent)
- memory_request: User wants to save/remember something for future reference
- question: User is asking for advice, guidance, or information
- progress_check: User is discussing progress, results, or performance
- acknowledgment: Simple responses like "ok", "thanks", "got it"
- general: General conversation, motivation, or other topics

=== CONTEXTUAL UPDATES DECISION ===
Skip contextual updates for:
- Simple acknowledgments: "ok", "okay", "thanks", "thank you", "got it", "sounds good", "perfect", "great", "awesome", "cool", "nice", "good", "yes", "yeah", "sure", "alright", "understood", "makes sense", "copy", "fine", "all good", "no problem", "word", "bet", "facts", "true", "agreed", "exactly", "correct", "sounds right", "fair enough", "works for me", "all set"
- Goodbyes and closings: "bye", "goodbye", "see you", "later", "ttyl", "talk later", "peace", "cheers", "gotta go", "talk soon", "have a good", "take care", "until next time", "see you tomorrow", "peace out", "heading out", "good night", "goodnight", "sleep well", "sweet dreams", "have a great day", "take it easy", "stay safe", "be well"
- Emotional reactions without substance: "wow", "omg", "lol", "haha", "nice!", "awesome!", "exactly", "totally", "absolutely", "for sure", "definitely", "100%", "no way", "really?", "amazing", "incredible", "sweet", "dude", "bro", "whoa"
- Simple confirmations: "will do", "sounds like a plan", "let's do it", "i'm in", "count me in", "i'll try that", "makes sense to me", "i'll do that", "on it", "got you", "will try", "noted", "copy that", "i'll give it a go", "let's go", "i'm ready", "sounds perfect"
- Very short responses (<8 characters)
- Length-based filtering: messages under 8 characters unless they contain fitness keywords

Show contextual updates for:
- Workout logging or fitness questions
- Goal setting or progress discussions
- Complex questions requiring analysis
- Memory requests or personal sharing
- Anything requiring coach expertise
- Fitness-related content regardless of length
- Questions about training, nutrition, recovery, or performance
- Progress updates, achievements, or setbacks
- Requests for advice, guidance, or explanations

=== WORKOUT DETECTION ===
STRICT CRITERIA - ALL THREE must be met:

1. PAST TENSE COMPLETION: Message must explicitly indicate a workout WAS COMPLETED
  REQUIRED language patterns:
  - "I did [workout]", "Did [workout]"
  - "I finished [workout]", "Just finished [workout]", "Finished [workout]"
  - "I completed [workout]", "Completed [workout]"
  - "I crushed [workout]", "Crushed [workout]"
  - "I performed [workout]", "Performed [workout]"
  - "I trained [workout]", "Trained [workout]"
  - "I got through [workout]", "Got through [workout]"
  - "I knocked out [workout]", "Knocked out [workout]"
  AVOID: "will do", "going to", "planning", "want to", "should I", "might do"

2. SPECIFIC WORKOUT CONTENT: Must contain concrete workout details (at least one):
  - Specific times: "8:57", "30 minutes", "45 seconds"
  - Weights/loads: "315 lbs", "50kg", "bodyweight", "135#"
  - Reps/rounds: "5 rounds", "20 reps", "3 sets", "AMRAP"
  - Named workouts: "Fran", "Murph", "Cindy", "Helen"
  - Distances: "3 miles", "5k", "400m"
  - Specific exercises: "deadlifts", "thrusters", "pull-ups"
  - Workout structures: "21-15-9", "EMOM", "tabata"
  AVOID: Vague references like "worked out", "exercised", "trained hard"

3. EXPLICIT LOGGING INTENT: Clear intent to record/document the completed workout
  REQUIRED intent patterns:
  - "I did [specific workout details]"
  - "Just finished [specific workout details]"
  - "Completed [specific workout details]"
  - "Today's workout: [specific details]"
  - "My workout today: [specific details]"
  - "This morning I did [specific details]"
  - "Workout done: [specific details]"
  - "Training session complete: [specific details]"
  LOGGING REQUEST language (even more explicit):
  - "Log this workout:", "Track this:", "Record my workout:"
  - "Add this to my log:", "Save this workout:", "Document this session:"
  AVOID: Questions, discussions, experiences, feelings, commentary

Workout Types (must match workout schema):
- strength: Weightlifting, powerlifting, bodybuilding, resistance training
- cardio: Running, cycling, swimming, rowing, endurance work
- flexibility: Stretching, yoga, mobility work
- skill: Gymnastics movements, Olympic lift technique, skill practice
- competition: Competition workouts, benchmark tests, PRs
- recovery: Active recovery, light movement, deload sessions
- hybrid: Mixed modality workouts combining multiple types (e.g., CrossFit metcons)

SLASH COMMAND DETECTION:
- "/log-workout" slash command
- If detected, ALWAYS set isWorkoutLog = true with confidence 1.0
- Set isSlashCommand = true when slash command is present
- Slash commands bypass all other criteria (explicit user intent)

Workout Detection Response:
{
  "isWorkoutLog": boolean,
  "confidence": number (0.0 to 1.0),
  "workoutType": "strength" | "cardio" | "flexibility" | "skill" | "competition" | "recovery" | "hybrid" | null,
  "reasoning": "brief explanation of workout detection decision",
  "isSlashCommand": boolean  // true if /log-workout command detected
}

=== PROGRAM DESIGN DETECTION ===
STRICT CRITERIA - ALL THREE must be met (OR slash command used):

SLASH COMMAND DETECTION:
- "/design-program" slash command
- If detected, ALWAYS set isProgramDesign = true with confidence 1.0
- Slash commands bypass all other criteria (explicit user intent)

NATURAL LANGUAGE DETECTION (ALL THREE required):
1. EXPLICIT PROGRAM DESIGN INTENT: Message must clearly indicate wanting to CREATE/DESIGN a training program
   REQUIRED language patterns:
   - "I want to design/create/build a [training] program"
   - "Create/design/build me a program"
   - "Help me design/create/build a program"
   - "I need a new [training] program"
   - "Can you create/design/build a program for me"
   - "Let's design/create/build a program"
   - "Design me a program for [goal]"
   AVOID: Questions about programs ("what's a good program?"), discussions, feedback

2. STRUCTURED PROGRAM REQUEST: Must indicate wanting a COMPLETE, STRUCTURED training program
   Required context:
   - NOT a single workout ("give me a workout" = WORKOUT_LOG, not PROGRAM_DESIGN)
   - NOT asking for advice ("how should I program?" = question, not PROGRAM_DESIGN)
   - NOT discussing existing program ("my program isn't working" = question, not PROGRAM_DESIGN)
   - MUST be requesting a NEW, MULTI-WEEK program artifact

3. CREATION INTENT: Clear intent to start the program design process NOW
   REQUIRED intent patterns:
   - Active request to begin designing
   - Willingness to answer questions about goals, equipment, schedule
   - Forward-looking language ("I want to", "let's", "can you")
   AVOID: Past tense ("I had a program"), hypotheticals ("would a program work?"), research ("tell me about programs")

Program Design Detection:
{
  "isProgramDesign": boolean,
  "confidence": number (0.0 to 1.0),
  "reasoning": "brief explanation of program design detection decision",
  "isSlashCommand": boolean  // Track if this was slash command triggered
}

=== MEMORY PROCESSING ===
Memory Retrieval Needed:
- Direct memory queries: "do you remember", "remember my", "what do you remember about", "did I tell you about"
- References to personal preferences: "I like/hate", "works for me", "my preference"
- Goal-related discussions: "my goal", "trying to", "working towards", "want to achieve"
- Constraint mentions: "I can't", "limited time", "only have", "schedule constraints"
- Emotional/motivational states that might have past patterns: "feeling frustrated", "struggling", "motivated"
- Past reference patterns: "remember when", "you told me", "we discussed", "like before"
- Requests for personalized advice that would benefit from knowing user context
- Questions about progress, patterns, or consistency
- Mentions of specific preferences, limitations, or approaches

Memory Request Detection:
- Explicit requests: "Remember that I..", "I want you to know..", "For future reference.."
- Sharing preferences, constraints, or goals: "I prefer..", "I don't like..", "I work best with.."
- Goal setting: "My goal is..", "I can't do..", "I have limited time.."
- Coaching instructions: "When I do X, remind me to..", "Always check my form on.."
- /save-memory slash commands

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

Memory Characteristics (if memory request detected):
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
- isCoachSpecific: true if specific to this coaching relationship
  COACH-SPECIFIC memories: coaching style preferences, communication preferences, methodology interactions, coach relationship dynamics, coaching technique feedback
- isCoachSpecific: false if general user information applicable to any coach
  GLOBAL memories: physical constraints/injuries, equipment/time/location constraints, goals and aspirations, personal context/lifestyle, general training preferences, dietary restrictions, past training history

Suggested Tags: Relevant keywords for easy retrieval (max 5 tags)

=== CONTEXT SEARCH NEEDS ===
Pinecone Search Beneficial For:
- Workout history references: "last time", "previous workouts", "what did I do", "show me my", "when did I"
- Performance tracking & comparison: "progress", "improvement", "better than", "compared to", "PR", "personal record"
- Methodology questions: "why", "approach", "programming", "periodization", "training philosophy", "strategy"
- Training system inquiries: "5/3/1", "conjugate", "linear progression", "block periodization", "RPE"
- Technique & form questions: "squat form", "deadlift technique", "movement pattern", "coaching cues"
- Exercise-specific guidance: "bench press", "overhead press", "clean", "snatch", "pull-ups"
- Problem-solving requests: "plateau", "stall", "fix", "troubleshoot", "alternative", "substitute"
- Injury & rehabilitation: "pain", "hurt", "injury", "rehab", "work around", "modification"
- Equipment & setup questions: "barbell", "dumbbell", "home gym", "equipment", "setup"
- Pattern analysis: "usually", "typically", "pattern", "trend", "habit", "routine"
- Complex questions requiring background knowledge or context
- Requests for explanations that would benefit from stored methodology content

Search Types:
- methodology: Training methods, techniques, principles
- workouts: Past workout history and patterns
- progress: Performance trends and improvements
- techniques: Form, safety, execution guidance

=== CONVERSATION COMPLEXITY ===
Complexity Indicators:
- Goal-setting and planning language ("my goal", "working toward", "trying to achieve", "planning to")
- Strong emotional language (positive: "stoked", "crushed it", "breakthrough"; negative: "frustrated", "devastated", "struggling")
- Major changes or setbacks ("injury", "can't do", "switching to", "plateau", "not working")
- Significant achievements ("PR", "first time", "milestone", "breakthrough", "major improvement")
- Coaching relationship dynamics ("you understand", "your approach", "coaching style", "connection")
- Life/schedule changes ("busy", "new job", "time constraints", "life change", "priorities")
- Health/physical status changes ("pain", "recovery", "energy levels", "feeling strong/weak")
- Program/approach modifications ("different approach", "new program", "methodology change")
- Motivation/mindset shifts ("giving up", "losing motivation", "inspired", "committed")
- Social/support context changes ("family", "accountability", "support", "pressure")
- Learning breakthroughs ("clicked", "figured it out", "makes sense now", "epiphany")
- Competition/performance context ("competition", "event", "performance", "season")
- Nutrition/lifestyle factors ("diet", "lifestyle", "habits", "body composition")

Complexity Types: emotional, goal, achievement, setback, relationship, lifestyle, learning, health, program, motivation, social, competition, nutrition

=== DEEP REASONING REQUIREMENTS ===
requiresDeepReasoning: true ONLY for conversations requiring sophisticated analysis, nuanced understanding, or complex synthesis:
- Multi-faceted program design questions combining multiple training variables
- Complex injury/limitation scenarios requiring careful exercise substitutions and progressions
- Deep methodology debates or philosophical training discussions (e.g., "Why periodization vs linear?")
- Sophisticated performance analysis with multiple confounding factors
- Nuanced coaching relationship issues requiring emotional intelligence
- Complex goal hierarchies with competing priorities and tradeoffs
- Advanced technique breakdowns requiring detailed biomechanical understanding
- Strategic periodization planning with multiple overlapping training cycles
- Mental performance coaching for competition/high-stakes events
- Complex life-training integration with major life changes

requiresDeepReasoning: false for standard coaching interactions (90-95% of messages):
- Simple workout logging (e.g., "Did 5x5 squats at 225")
- Basic questions with straightforward answers (e.g., "What's a good warmup?")
- Encouragement and motivation (e.g., "Great work!", "Keep it up!")
- Progress check-ins without complex analysis needed
- Memory requests (e.g., "Remember I prefer evening workouts")
- Standard form checks that don't require deep biomechanical analysis
- Routine programming questions with clear methodology context available
- Simple acknowledgments and conversational exchanges
- Workout modifications with obvious alternatives

GUIDELINE: Be conservative - default to false unless the message truly requires sophisticated reasoning that goes beyond conversational coaching responses.

=== PROCESSING PRIORITIES ===
Determine optimal processing order:
- workoutFirst: true if workout logging is primary intent
- memoryFirst: true if memory processing is most important
- contextFirst: true if context search should happen first

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

REQUIRED JSON STRUCTURE:
{
  "userIntent": "workout_logging" | "program_design" | "memory_request" | "question" | "progress_check" | "acknowledgment" | "general",
  "showContextualUpdates": boolean,
  "workoutDetection": {
    "isWorkoutLog": boolean,
    "confidence": number (0.0 to 1.0),
    "workoutType": "strength" | "cardio" | "flexibility" | "skill" | "competition" | "recovery" | "hybrid" | null,
    "reasoning": "brief explanation of workout detection decision",
    "isSlashCommand": boolean
  },
  "programDesignDetection": {
    "isProgramDesign": boolean,
    "confidence": number (0.0 to 1.0),
    "reasoning": "brief explanation of program design detection decision",
    "isSlashCommand": boolean
  },
  "memoryProcessing": {
    "needsRetrieval": boolean,
    "isMemoryRequest": boolean,
    "memoryCharacteristics": {
      "type": "preference" | "goal" | "constraint" | "instruction",
      "importance": "low" | "medium" | "high",
      "isCoachSpecific": boolean,
      "suggestedTags": ["tag1", "tag2"]
    } | null,
    "reasoning": "brief explanation of memory processing needs"
  },
  "contextNeeds": {
    "needsPineconeSearch": boolean,
    "searchTypes": ["methodology", "workouts", "progress", "techniques"],
    "reasoning": "brief explanation of context search decision"
  },
  "conversationComplexity": {
    "hasComplexity": boolean,
    "complexityTypes": ["emotional", "goal", "achievement", "setback", "relationship", "lifestyle", "learning", "health", "program", "motivation", "social", "competition", "nutrition"],
    "needsSummary": boolean,
    "requiresDeepReasoning": boolean,
    "confidence": number (0.0 to 1.0),
    "reasoning": "brief explanation of complexity assessment"
  },
  "processingPriority": {
    "workoutFirst": boolean,
    "memoryFirst": boolean,
    "contextFirst": boolean
  },
  "routerMetadata": {
    "confidence": number (0.0 to 1.0),
    "processingTime": null,
    "fallbackUsed": false
  }
}

FIELD REQUIREMENTS:
- workoutType: Set to null if isWorkoutLog is false, otherwise specify the workout type
- memoryCharacteristics: Set to null if isMemoryRequest is false, otherwise provide the full object
- All arrays can be empty [] but must be present
- All confidence/number fields must be between 0.0 and 1.0
- All reasoning fields must be brief (under 100 characters)`;

  const userPrompt = `ANALYZE THIS MESSAGE:
Message: "${userMessage}"
${messageContext ? `Recent Context: "${messageContext}"` : ""}
Conversation Length: ${conversationLength} messages

Provide comprehensive analysis following the framework above.`;

  try {
    console.info("🧠 Smart Router analyzing request capabilities:", {
      messageLength: userMessage.length,
      hasContext: !!messageContext,
      conversationLength,
      hasTimezone: !!userTimezone,
      timezone: effectiveTimezone,
      hasCriticalDirective: criticalTrainingDirective?.enabled || false,
    });

    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL, // More accurate for complex routing decisions
      { prefillResponse: "{" } // Force JSON output format
    ) as string; // No tools used, always returns string

    const result: SmartRequestRouter = parseJsonWithFallbacks(response);

    // Add processing time metadata
    result.routerMetadata.processingTime = Date.now() - startTime;

    console.info("✅ Smart Router analysis completed:", {
      userIntent: result.userIntent,
      showContextualUpdates: result.showContextualUpdates,
      isWorkoutLog: result.workoutDetection.isWorkoutLog,
      needsMemoryRetrieval: result.memoryProcessing.needsRetrieval,
      needsPineconeSearch: result.contextNeeds.needsPineconeSearch,
      hasComplexity: result.conversationComplexity.hasComplexity,
      requiresDeepReasoning: result.conversationComplexity.requiresDeepReasoning,
      processingTime: result.routerMetadata.processingTime,
      confidence: result.routerMetadata.confidence,
    });

    return result;
  } catch (error) {
    console.error("❌ Smart Router analysis failed:", error);
    throw error; // Let the caller handle the error
  }
}
