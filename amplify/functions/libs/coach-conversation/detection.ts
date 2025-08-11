/**
 * Coach Conversation Detection
 *
 * This module contains detection logic for coach conversation events and triggers,
 * including complexity detection for conversation summarization.
 */

import { UserMemoryDetectionEvent, UserMemoryDetectionResult } from './types';
import { UserMemory } from '../user/types';
import { callBedrockApi, MODEL_IDS } from '../api-helpers';

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
export async function detectUserMemoryRequest(event: UserMemoryDetectionEvent): Promise<UserMemoryDetectionResult> {
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
    console.info('Detecting user memory request:', {
      userId: event.userId,
      coachId: event.coachId,
      messageLength: userMessage.length,
      hasContext: !!messageContext
    });

    const response = await callBedrockApi(systemPrompt, userPrompt, MODEL_IDS.NOVA_MICRO);

    // Parse the JSON response
    const result: UserMemoryDetectionResult = JSON.parse(response.trim());

    // Validate the response structure
    if (typeof result.isMemoryRequest !== 'boolean' ||
        typeof result.confidence !== 'number' ||
        result.confidence < 0 || result.confidence > 1) {
      throw new Error('Invalid response format from user memory detection');
    }

    console.info('User memory detection completed:', {
      userId: event.userId,
      isMemoryRequest: result.isMemoryRequest,
      confidence: result.confidence,
      extractedType: result.extractedMemory?.type,
      reasoning: result.reasoning
    });

    return result;
  } catch (error) {
    console.error('Error in user memory detection:', error);

    // Return safe fallback
    return {
      isMemoryRequest: false,
      confidence: 0,
      reasoning: 'Error occurred during user memory detection analysis'
    };
  }
}

/**
 * Create a UserMemory object from detection result
 */
export function createUserMemory(
  detectionResult: UserMemoryDetectionResult,
  userId: string,
  coachId?: string
): UserMemory | null {
  if (!detectionResult.isMemoryRequest || !detectionResult.extractedMemory) {
    return null;
  }

  const memoryId = `user_memory_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  return {
    memoryId,
    userId,
    coachId,
    content: detectionResult.extractedMemory.content,
    memoryType: detectionResult.extractedMemory.type,
    metadata: {
      createdAt: new Date(),
      usageCount: 0,
      source: 'explicit_request',
      importance: detectionResult.extractedMemory.importance,
      tags: []
    }
  };
}