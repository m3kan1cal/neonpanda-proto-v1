/**
 * Coach Conversation Detection
 *
 * This module contains detection logic for coach conversation events and triggers,
 * including complexity detection for conversation summarization.
 */

import { MemoryDetectionEvent, MemoryDetectionResult } from './types';
import { UserMemory } from '../user/types';
import { callBedrockApi, MODEL_IDS, invokeAsyncLambda } from '../api-helpers';

/**
 * Detect if the user's message contains complexity triggers that warrant immediate conversation summarization
 * @param userMessage - The user's message to analyze
 * @returns boolean indicating if complexity triggers are present
 */
export const detectConversationComplexity = (userMessage: string): boolean => {
  const message = userMessage.toLowerCase();

  // Goal-setting and planning language
  const goalKeywords = [
    'my goal', 'i want to', 'i\'m working toward', 'trying to achieve', 'hoping to',
    'planning to', 'aiming for', 'working towards', 'goal is', 'objective',
    'target', 'vision', 'dream', 'aspiration', 'ambition'
  ];

  // Emotional language indicators (including strong/super adjectives)
  const emotionalKeywords = [
    'frustrated', 'excited', 'breakthrough', 'struggling', 'motivated', 'discouraged',
    'proud', 'disappointed', 'confident', 'nervous', 'stressed', 'overwhelmed',
    'anxious', 'worried', 'happy', 'sad', 'angry', 'grateful', 'thankful',
    'emotional', 'feeling', 'mood', 'mindset', 'mentally',
    // Strong positive emotions
    'stoked', 'pumped', 'thrilled', 'ecstatic', 'elated', 'euphoric', 'amazing',
    'incredible', 'fantastic', 'awesome', 'outstanding', 'phenomenal', 'brilliant',
    'spectacular', 'wonderful', 'magnificent', 'superb', 'excellent', 'perfect',
    'unbelievable', 'mind-blowing', 'jaw-dropping', 'epic', 'legendary',
    // Strong negative emotions
    'devastated', 'crushed', 'destroyed', 'shattered', 'heartbroken', 'defeated',
    'hopeless', 'desperate', 'miserable', 'terrible', 'awful', 'horrible',
    'devastating', 'crushing', 'overwhelming', 'unbearable', 'exhausting',
    // Intensity modifiers
    'absolutely', 'completely', 'totally', 'utterly', 'extremely', 'incredibly',
    'unbelievably', 'ridiculously', 'insanely', 'massively', 'hugely'
  ];

  // Major changes or setbacks
  const changeKeywords = [
    'injury', 'injured', 'can\'t do', 'unable to', 'switching to', 'changing',
    'stopping', 'quitting', 'new approach', 'different way', 'modified',
    'plateau', 'stuck', 'stalled', 'progress stopped', 'not working'
  ];

  // Achievement and progress language (including super achievement words)
  const achievementKeywords = [
    'pr', 'personal record', 'first time', 'finally did', 'breakthrough',
    'milestone', 'achievement', 'accomplished', 'succeeded', 'improved',
    'progress', 'better', 'stronger', 'faster', 'victory', 'success',
    // Super achievement words
    'crushed it', 'killed it', 'nailed it', 'smashed', 'destroyed', 'dominated',
    'obliterated', 'annihilated', 'demolished', 'conquered', 'mastered',
    'owned', 'beast mode', 'unleashed', 'unstoppable', 'invincible',
    'champion', 'warrior', 'legend', 'hero', 'superstar', 'rockstar',
    // Strong progress indicators
    'massive improvement', 'huge gains', 'incredible progress', 'major breakthrough',
    'game changer', 'life changing', 'transformative', 'revolutionary',
    'next level', 'leveled up', 'upgraded', 'evolved', 'transformed'
  ];

  // Relationship/Communication with coach
  const relationshipKeywords = [
    'you understand', 'you get it', 'you don\'t understand', 'not working for me',
    'your advice', 'your suggestion', 'what you said', 'like you mentioned',
    'you helped', 'you\'re right', 'you\'re wrong', 'trust you', 'doubt',
    'coaching style', 'approach works', 'connection'
  ];

  // Schedule/Life changes
  const scheduleKeywords = [
    'busy', 'schedule changed', 'new job', 'traveling', 'vacation',
    'time constraints', 'less time', 'more time', 'availability',
    'work stress', 'life change', 'moving', 'family', 'priorities'
  ];

  // Physical/Health status
  const healthKeywords = [
    'pain', 'sore', 'tired', 'exhausted', 'recovery', 'sleep',
    'feeling strong', 'feeling weak', 'energy levels', 'sick',
    'health', 'doctor', 'physical therapy', 'medication', 'symptoms'
  ];

  // Program/Approach changes
  const programKeywords = [
    'different approach', 'new program', 'switch things up', 'routine',
    'methodology', 'system', 'plan', 'strategy', 'technique',
    'form check', 'movement pattern', 'progression', 'regression'
  ];

  // Motivation/Mindset shifts
  const motivationKeywords = [
    'giving up', 'want to quit', 'losing motivation', 'burnt out',
    'inspired', 'ready', 'committed', 'determined', 'focused',
    'discipline', 'consistency', 'dedication', 'willpower', 'drive'
  ];

  // Social/Support context
  const socialKeywords = [
    'partner', 'family', 'gym buddy', 'accountability', 'support',
    'encouragement', 'pressure', 'community', 'friends', 'spouse',
    'kids', 'children', 'relationship', 'social'
  ];

  // Technique/Learning breakthroughs
  const learningKeywords = [
    'clicked', 'figured it out', 'makes sense now', 'understanding',
    'learned', 'realized', 'discovered', 'insight', 'clarity',
    'connection', 'lightbulb moment', 'epiphany'
  ];

  // Competition/Performance context
  const competitionKeywords = [
    'competition', 'compete', 'event', 'race', 'meet', 'tournament',
    'performance', 'athlete', 'training camp', 'season', 'off-season'
  ];

  // Nutrition/Lifestyle factors
  const lifestyleKeywords = [
    'diet', 'nutrition', 'eating', 'weight', 'body composition',
    'lifestyle', 'habits', 'routine', 'discipline', 'balance'
  ];

  // Check if message contains any complexity triggers
  const allTriggers = [
    ...goalKeywords, ...emotionalKeywords, ...changeKeywords, ...achievementKeywords,
    ...relationshipKeywords, ...scheduleKeywords, ...healthKeywords, ...programKeywords,
    ...motivationKeywords, ...socialKeywords, ...learningKeywords, ...competitionKeywords,
    ...lifestyleKeywords
  ];

  return allTriggers.some(keyword => message.includes(keyword));
};

/**
 * Detect if the user's message indicates they need conversation memory/context from past interactions
 * @param userMessage - The user's message to analyze
 * @returns boolean indicating if conversation memory retrieval would be helpful
 */
export const detectConversationMemoryNeeds = (userMessage: string): boolean => {
  const message = userMessage.toLowerCase();

  // Direct conversation references
  const conversationReferenceKeywords = [
    'remember', 'recall', 'you said', 'you mentioned', 'we talked about',
    'we discussed', 'you told me', 'you suggested', 'our conversation',
    'last time we', 'when we spoke', 'you understand', 'you know me',
    'you know', 'as we discussed', 'like we talked about', 'you remember',
    'remind me', 'think back', 'look back', 'previous conversation',
    'earlier conversation', 'before we', 'when you', 'you always say',
    'you usually', 'your advice', 'what you think', 'your opinion'
  ];

  // Emotional/relationship context seeking
  const emotionalContextKeywords = [
    'feeling like', 'same feeling', 'similar to', 'like before',
    'again', 'still', 'continue to feel', 'keep feeling', 'pattern',
    'trend', 'usually feel', 'typically', 'normally', 'often',
    'relationship', 'connection', 'trust', 'understanding', 'support',
    'guidance', 'help me understand', 'why do i', 'what causes',
    'emotional', 'mentally', 'psychologically', 'mindset', 'attitude'
  ];

  // Goal/progress continuity references
  const goalContinuityKeywords = [
    'my goal', 'our goal', 'working toward', 'progress on', 'still working on',
    'continue working', 'keep working', 'objective', 'target', 'plan we made',
    'what we planned', 'strategy', 'approach we', 'method we', 'system we',
    'program we', 'routine we', 'schedule we', 'timeline', 'milestone',
    'next step', 'moving forward', 'building on', 'foundation we'
  ];

  // Preference/constraint references
  const preferenceKeywords = [
    'prefer', 'like', 'dislike', 'hate', 'love', 'enjoy', 'avoid',
    'schedule', 'constraints', 'limitations', 'availability', 'busy',
    'time', 'family', 'work', 'lifestyle', 'routine', 'habits',
    'comfortable with', 'struggle with', 'good at', 'bad at',
    'strength', 'weakness', 'challenge', 'difficulty', 'easy',
    'hard', 'difficult', 'comfortable', 'uncomfortable'
  ];

  // Personal context/situation references
  const personalContextKeywords = [
    'situation', 'context', 'background', 'personal', 'life',
    'what\'s been going on', 'update you', 'catch up', 'fill you in',
    'let you know', 'inform you', 'tell you about', 'share with you',
    'happening in my', 'going through', 'dealing with', 'facing',
    'experiencing', 'current situation', 'right now', 'lately',
    'recently', 'these days', 'currently'
  ];

  // Coaching relationship/style references
  const coachingRelationshipKeywords = [
    'coaching style', 'approach works', 'method works', 'way you',
    'how you', 'your style', 'your approach', 'your method',
    'connection', 'chemistry', 'fit', 'match', 'compatibility',
    'understanding', 'communication', 'feedback', 'guidance',
    'support', 'encouragement', 'motivation', 'inspiration',
    'accountability', 'partnership', 'team', 'together'
  ];

  // Progress/comparison references
  const progressComparisonKeywords = [
    'compared to', 'versus', 'vs', 'different from', 'similar to',
    'like when', 'unlike when', 'better than', 'worse than',
    'same as', 'improvement from', 'decline from', 'change from',
    'progress since', 'regress since', 'since we', 'from when',
    'back then', 'now vs', 'then vs', 'used to', 'before'
  ];

  // Question patterns that often need context
  const contextualQuestionKeywords = [
    'why', 'how', 'what', 'when', 'where', 'which', 'who',
    'should i', 'would you', 'do you think', 'what do you',
    'how do you', 'why do you', 'can you', 'will you',
    'help me', 'explain', 'clarify', 'understand', 'make sense'
  ];

  // Check if message contains any memory retrieval triggers
  const allMemoryTriggers = [
    ...conversationReferenceKeywords,
    ...emotionalContextKeywords,
    ...goalContinuityKeywords,
    ...preferenceKeywords,
    ...personalContextKeywords,
    ...coachingRelationshipKeywords,
    ...progressComparisonKeywords,
    ...contextualQuestionKeywords
  ];

  // Also check for longer, more complex messages that might benefit from context
  const isComplexMessage = userMessage.length > 100;
  const hasQuestionMark = userMessage.includes('?');
  const isComplexQuery = isComplexMessage && hasQuestionMark;

  const hasMemoryTriggers = allMemoryTriggers.some(keyword => message.includes(keyword));

  return hasMemoryTriggers || isComplexQuery;
};

/**
 * Memory Detection Logic
 * Uses Amazon Bedrock to detect when users want to store memories
 */

/**
 * Detect if user message contains a memory request using Bedrock API
 */
export async function detectMemoryRequest(event: MemoryDetectionEvent): Promise<MemoryDetectionResult> {
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

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ''}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message and respond with the JSON format specified.`;

  try {
    console.info('Detecting memory request:', {
      userId: event.userId,
      coachId: event.coachId,
      messageLength: userMessage.length,
      hasContext: !!messageContext
    });

    const response = await callBedrockApi(systemPrompt, userPrompt, MODEL_IDS.NOVA_MICRO);

    // Parse the JSON response
    const result: MemoryDetectionResult = JSON.parse(response.trim());

    // Validate the response structure
    if (typeof result.isMemoryRequest !== 'boolean' ||
        typeof result.confidence !== 'number' ||
        result.confidence < 0 || result.confidence > 1) {
      throw new Error('Invalid response format from memory detection');
    }

    return result;
  } catch (error) {
    console.error('Error in memory detection:', error);

    // Return safe fallback
    return {
      isMemoryRequest: false,
      confidence: 0,
      reasoning: 'Error occurred during memory detection analysis'
    };
  }
}

/**
 * Detects if the user message requires semantic memory retrieval using AI analysis
 * Follows same pattern as detectMemoryRequest
 */
export async function detectMemoryRetrievalNeed(
  userMessage: string,
  messageContext?: string
): Promise<{
  needsSemanticRetrieval: boolean;
  confidence: number;
  contextTypes: string[];
  reasoning: string;
}> {
  const systemPrompt = `You are an AI assistant that analyzes user messages to determine if retrieving past memories would enhance the coaching response.

TASK: Determine if the user's message would benefit from accessing their stored preferences, goals, constraints, or past context.

MEMORY CONTEXT INDICATORS:
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
- Consider if knowing the user's past preferences, goals, or constraints would improve the coaching response
- Higher confidence for explicit personal references, lower for general fitness questions
- Include multiple context types if relevant
- Be generous - better to include memory context than miss important personalization`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ''}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message and determine if retrieving stored memories would enhance the coaching response.`;

  try {
    const response = await callBedrockApi(systemPrompt, userPrompt, MODEL_IDS.NOVA_MICRO);
    const result = JSON.parse(response);

    return result;
  } catch (error) {
    console.error('Error in memory retrieval detection:', error);
    // Conservative fallback - assume no semantic retrieval needed
    return {
      needsSemanticRetrieval: false,
      confidence: 0.0,
      contextTypes: [],
      reasoning: 'Error in AI detection, defaulting to no semantic retrieval'
    };
  }
}

/**
 * Detect if a memory should be coach-specific or global using AI analysis
 */
export async function detectMemoryScope(
  memoryContent: string,
  coachName?: string
): Promise<{
  isCoachSpecific: boolean;
  confidence: number;
  reasoning: string;
}> {
  const systemPrompt = `You are an AI assistant that analyzes user memories to determine if they should be coach-specific or apply globally to all coaches.

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

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object with this exact structure:
{
  "isCoachSpecific": boolean,
  "confidence": number (0.0 to 1.0),
  "reasoning": "brief explanation of why this memory is coach-specific or global"
}

GUIDELINES:
- Default to global unless there's clear evidence the memory is about the coaching relationship
- Be conservative: most user context should be global
- Look for direct references to coaching style, communication, or methodology-specific interactions
- Personal constraints, goals, and context are typically global`;

  const userPrompt = `${coachName ? `COACH NAME: ${coachName}\n\n` : ''}MEMORY TO ANALYZE:\n"${memoryContent}"

Analyze this memory and respond with the JSON format specified.`;

  try {
    console.info('🎯 Detecting memory scope:', {
      memoryContent: memoryContent.substring(0, 100) + (memoryContent.length > 100 ? '...' : ''),
      coachName: coachName || 'unknown',
      contentLength: memoryContent.length
    });

    const response = await callBedrockApi(systemPrompt, userPrompt, MODEL_IDS.NOVA_MICRO);

    // Parse the JSON response
    const result = JSON.parse(response.trim());

    // Validate the response structure
    if (typeof result.isCoachSpecific !== 'boolean' ||
        typeof result.confidence !== 'number' ||
        result.confidence < 0 || result.confidence > 1) {
      throw new Error('Invalid response format from memory scope detection');
    }

    return result;
  } catch (error) {
    console.error('Error in memory scope detection:', error);

    // Return safe fallback (default to global)
    return {
      isCoachSpecific: false,
      confidence: 0,
      reasoning: 'Error occurred during scope detection analysis, defaulting to global'
    };
  }
}

/**
 * Create a UserMemory object from detection result
 */
export async function createMemory(
  detectionResult: MemoryDetectionResult,
  userId: string,
  coachId?: string,
  coachName?: string
): Promise<UserMemory | null> {
  if (!detectionResult.isMemoryRequest || !detectionResult.extractedMemory) {
    return null;
  }

  const memoryId = `user_memory_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Use AI to determine if memory should be coach-specific or global
  const scopeDetection = await detectMemoryScope(detectionResult.extractedMemory.content, coachName);

  return {
    memoryId,
    userId,
    coachId: scopeDetection.isCoachSpecific ? coachId : undefined, // Global if not coach-specific
    content: detectionResult.extractedMemory.content,
    memoryType: detectionResult.extractedMemory.type,
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      source: 'conversation',
      importance: detectionResult.extractedMemory.importance,
      tags: scopeDetection.isCoachSpecific ? ['coach_specific'] : ['global']
    }
  };
}

/**
 * Detect if conversation summary should be triggered and trigger it if needed
 * @param userId - User ID
 * @param coachId - Coach ID
 * @param conversationId - Conversation ID
 * @param userMessage - The user's message to analyze for complexity
 * @param currentMessageCount - Current total message count in conversation
 * @returns Object indicating if summary was triggered and the reason
 */
export async function detectAndProcessConversationSummary(
  userId: string,
  coachId: string,
  conversationId: string,
  userMessage: string,
  currentMessageCount: number
): Promise<{
  triggered: boolean;
  triggerReason?: 'message_count' | 'complexity';
  complexityDetected: boolean;
}> {
  const hasComplexityTriggers = detectConversationComplexity(userMessage);
  const shouldTriggerSummary =
    currentMessageCount % 6 === 0 || hasComplexityTriggers;

  if (!shouldTriggerSummary) {
    return {
      triggered: false,
      complexityDetected: hasComplexityTriggers
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
    const summaryFunction = process.env.BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME;
    if (!summaryFunction) {
      console.warn(
        "⚠️ BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME environment variable not set"
      );
      return {
        triggered: false,
        triggerReason,
        complexityDetected: hasComplexityTriggers
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
      complexityDetected: hasComplexityTriggers
    };
  } catch (error) {
    console.error(
      "❌ Failed to trigger conversation summary generation:",
      error
    );
    return {
      triggered: false,
      triggerReason,
      complexityDetected: hasComplexityTriggers
    };
  }
}