/**
 * Workout Creator Question Generator
 *
 * Generates natural, conversational follow-up questions to collect missing workout information.
 * Uses the coach's personality to make the data collection feel like a natural conversation.
 *
 * Pattern: Similar to coach-creator/question-generator.ts
 */

import { callBedrockApi, callBedrockApiStream, MODEL_IDS } from '../api-helpers';
import { ConversationMessage } from '../todo-types';
import { WorkoutCreatorTodoList } from './types';
import {
  getMissingFieldsSummary,
  getCollectedDataSummary,
  isSessionComplete,
  getPendingRequiredFields,
  getPendingHighPriorityFields,
  getPendingLowPriorityFields,
  formatFieldName,
  shouldPromptHighPriorityRecommendedFields,
  shouldPromptLowPriorityRecommendedFields,
} from './todo-list-utils';

/**
 * Generate the next question or completion message based on workout creator progress
 * Returns a streaming response from Bedrock
 */
export async function* generateNextQuestionStream(
  conversationHistory: ConversationMessage[],
  todoList: WorkoutCreatorTodoList,
  coachPersonality?: string,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
  turnCount?: number
): AsyncGenerator<string, string, unknown> {
  console.info('🎯 Generating next workout creator question (streaming)', { turnCount });

  const systemPrompt = buildQuestionGeneratorPrompt(todoList, coachPersonality, userContext, turnCount);
  const userPrompt = buildConversationContext(conversationHistory);

  // Check if we should generate completion message:
  // - Required fields must be done
  // - No high or low priority recommended fields pending
  const requiredComplete = isSessionComplete(todoList);
  const highPriorityRecommendedPending = shouldPromptHighPriorityRecommendedFields(todoList);
  const lowPriorityRecommendedPending = shouldPromptLowPriorityRecommendedFields(todoList);
  const complete = requiredComplete && !highPriorityRecommendedPending && !lowPriorityRecommendedPending;

  try {
    // Use Haiku 4.5 for fast, cost-effective question generation
    // Simple structured questions don't need Sonnet's complexity
    const responseStream = await callBedrockApiStream(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL
    );

    let fullResponse = '';
    for await (const chunk of responseStream) {
      fullResponse += chunk;
      yield chunk;
    }

    console.info('✅ Question generation streaming complete');
    return fullResponse;
  } catch (error) {
    console.error('❌ Error generating question stream:', error);

    // Fallback: return a simple question
    const pendingFields = getPendingRequiredFields(todoList);
    const fallback = complete
      ? "Great! I have all the details I need. Let me log this workout for you!"
      : pendingFields.length > 0
        ? `Thanks for sharing! Can you tell me about ${formatFieldName(pendingFields[0] as keyof WorkoutCreatorTodoList)}?`
        : "Thanks for sharing! Can you tell me a bit more about your workout?";

    yield fallback;
    return fallback;
  }
}

/**
 * Build the system prompt for question generation
 */
function buildQuestionGeneratorPrompt(
  todoList: WorkoutCreatorTodoList,
  coachPersonality?: string,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
  turnCount?: number
): string {
  // Check completion: required + no high/low priority recommended pending
  const requiredComplete = isSessionComplete(todoList);
  const highPriorityRecommendedPending = shouldPromptHighPriorityRecommendedFields(todoList);
  const lowPriorityRecommendedPending = shouldPromptLowPriorityRecommendedFields(todoList);
  const complete = requiredComplete && !highPriorityRecommendedPending && !lowPriorityRecommendedPending;

  const collectedData = getCollectedDataSummary(todoList);
  const missingSummary = getMissingFieldsSummary(todoList);

  const personalitySection = coachPersonality
    ? `COACH PERSONALITY:\n${coachPersonality}\n\n`
    : '';

  // Build context section for smarter questions
  let contextSection = '';
  if (userContext) {
    if (userContext.activeProgram) {
      contextSection += `\nUSER'S ACTIVE PROGRAM: ${userContext.activeProgram.name || 'Unknown'} - ${userContext.activeProgram.goal || userContext.activeProgram.trainingGoals || 'fitness'}`;
    }
    if (userContext.pineconeMemories && userContext.pineconeMemories.length > 0) {
      const relevantMemories = userContext.pineconeMemories.slice(0, 2);
      contextSection += `\nRELEVANT USER INFO:\n${relevantMemories.map((m: any) => `- ${m.text || m.content}`).join('\n')}`;
    }
    if (userContext.recentWorkouts && userContext.recentWorkouts.length > 0) {
      const recent = userContext.recentWorkouts[0];
      contextSection += `\nTYPICAL WORKOUT PATTERNS: ${recent.discipline || 'various'} at ${recent.location || 'usual location'}`;
    }
  }

  // Add turn count warning if approaching limit
  const turnWarning = turnCount && turnCount >= 5
    ? `\n⚠️ CONVERSATION LENGTH: This is turn ${turnCount}/7. If approaching 7 turns, wrap up and log what you have.`
    : '';

  if (complete) {
    return `You are an AI coach helping a user log their workout. They've provided all the essential details you need.

${personalitySection}${contextSection ? `${contextSection}\n\n` : ''}COLLECTED INFORMATION:
${JSON.stringify(collectedData, null, 2)}

YOUR TASK:
Generate a brief, enthusiastic confirmation message that you're logging their workout. Keep it natural and conversational.

⚠️ CRITICAL RULE: This is THE FINAL MESSAGE before the workout is logged. DO NOT generate completion messages ("I'll log this", "logging now", "all set") UNLESS this is truly the completion phase where all data collection is done.

GUIDELINES:
- Be brief (1-2 sentences max)
- Show genuine enthusiasm about their workout
- Confirm you're logging it now
- If they hit a PR or mentioned something impressive, acknowledge it
- Reference their program or typical patterns if relevant
- NO questions - they've given you everything you need

Example tone:
- "Awesome work! Let me get that logged for you right now."
- "Nice! Logging that for you - those split squats sound brutal!"
- "That's a great session! I'll get this in your log immediately."
- "Solid! That's everything I need - logging it now."`;
  }

  // Check if we're at the recommended fields phase
  const atHighPriorityPhase = highPriorityRecommendedPending;
  const atLowPriorityPhase = !highPriorityRecommendedPending && lowPriorityRecommendedPending;
  const pendingHighPriority = getPendingHighPriorityFields(todoList);
  const pendingLowPriority = getPendingLowPriorityFields(todoList);

  return `You are an AI coach helping a user log their workout through a natural conversation.

${personalitySection}${contextSection ? `${contextSection}\n\n` : ''}WHAT WE'VE COLLECTED SO FAR:
${JSON.stringify(collectedData, null, 2)}

WHAT WE STILL NEED:
${missingSummary}${turnWarning}

⚠️ CRITICAL RULE: DO NOT say "You're all logged!", "I'll log this now", "Logging that for you", or similar completion phrases. You are STILL COLLECTING DATA. Only ask for the next piece of information. The system will tell you when it's time to complete.

${atHighPriorityPhase ? `
⚠️ IMPORTANT - HIGH-PRIORITY OPTIONAL FIELDS:
All REQUIRED fields are complete. You're now asking for HIGH-VALUE optional metrics that unlock deeper training insights:
${pendingHighPriority.map(formatFieldName).join(', ')}

WHY THESE FIELDS MATTER (emphasize the value):
- **Weights**: Track strength progression over time, identify plateaus, compare similar workouts accurately (e.g., "same workout but 10lbs heavier")
- **RPE & Intensity**: Track fatigue patterns, identify overtraining risk, optimize recovery timing, measure training load trends
- **Workout Type**: Compare similar formats (AMRAPs vs EMOMs), identify which styles yield best results, track progression within specific formats
- **Location**: Discover environment impact on performance, compare home gym vs. box sessions, identify optimal training conditions

Make it CLEAR these are optional but VALUABLE:
- Frame as "one more thing that unlocks better insights" or "quick question that helps me coach you better"
- Explain the SPECIFIC INSIGHT it provides (e.g., "RPE helps me know if you're recovering properly between sessions")
- Emphasize how it helps YOU coach THEM better, not just data collection
- Let them know they can say "skip", "that's all", or "log it now" to finish immediately

Example approaches (with value propositions):
- "Quick question - what was your RPE (1-10)? This helps me spot if you're pushing too hard or need more intensity. Or say 'skip' to log it now."
- "What was the intensity level (1-10)? I use this to track your weekly training load and make sure you're not overreaching. Or we can log as-is."
- "What type of workout was this (AMRAP, For Time, EMOM)? Helps me see which formats you excel at and where there's room to grow."
- "Any weights on those movements? This helps me track your strength progression over time. Or was it bodyweight?"
- "Where did you work out? I'm tracking if location affects your performance - sometimes home vs. gym makes a difference!"
` : atLowPriorityPhase ? `
⚠️ OPTIONAL - LOW-PRIORITY FIELDS (Still Valuable!):
Required and high-priority fields are complete. These additional metrics help reveal hidden patterns:
${pendingLowPriority.map(formatFieldName).join(', ')}

WHY THESE STILL MATTER (frame the value):
- **Session Duration**: See the full picture - warmup/cooldown time affects recovery planning
- **Enjoyment & Difficulty**: Identify which workouts you love vs. dread - helps me program smarter
- **Sleep Hours**: Huge performance predictor - spot correlations between rest and output
- **Heart Rate & Calories**: Track cardiovascular adaptations and energy expenditure trends
- **Temperature**: Environmental factors matter - heat affects performance more than you think
- **Performance Notes**: The "why" behind the numbers - injuries, PRs, how you felt

Ask in a casual but VALUE-FOCUSED way:
- "Got time for one more? How much did you enjoy that session (1-10)? Helps me program workouts you'll actually look forward to!"
- "Any other details worth tracking? Sleep, how you felt, temperature? These help spot patterns you might not notice."
- "Quick one - how many hours of sleep did you get? I'm tracking if there's a correlation with your performance."
- Always emphasize: "These help me coach you better" or "unlock better insights"
- Make it VERY clear they can skip: "or we can log it as-is - you've already given me the key stuff"
` : `
YOUR TASK:
Ask a natural, conversational follow-up question to collect ONE or TWO of the missing REQUIRED pieces of information.

REQUIRED FIELDS VALUE:
These are the minimum needed to create a meaningful workout log that you can analyze and compare over time. Without these, the workout becomes just a note rather than actionable training data.

EFFICIENCY TIP:
If two required fields are related (e.g., sets + reps, or date + duration), ask them together in one natural sentence. This speeds up data collection without overwhelming the user.
`}

GUIDELINES:
- Ask for ONE or TWO related things at a time to speed up data collection (don't ask more than 2)
- Be conversational and natural (like texting a friend)
- Reference what they've already shared to show you're listening
- Keep it brief (1-3 sentences max)
- When asking 2 questions, make them related or in natural sequence (e.g., sets + reps, or intensity + RPE)
${(atHighPriorityPhase || atLowPriorityPhase) ? '- Make it VERY CLEAR these fields are optional BUT emphasize the SPECIFIC VALUE/INSIGHT they provide\n- Frame it as "helps me coach you better" not just "more data to collect"\n- Lead with the benefit/insight, then ask the question' : '- Focus on required fields (exercises, sets/rounds, reps/time, when completed, discipline, duration)'}

Example approaches for required fields (1-2 questions):
- "Got it! How many sets/rounds did you do, and what was the rep scheme?"
- "Nice! When did you knock this out, and how long did it take?"
- "Awesome - what type of training was this? CrossFit, strength, running?"
- "Sweet! How many rounds did you complete?"
- "What exercises did you do, and how many reps/rounds?"

Example approaches for optional fields (1-2 questions):
- "Quick question - what was your RPE (1-10)? And how was the intensity?"
- "What weights did you use on those lifts? And where did you work out?"
- "How much did you enjoy it (1-10)? And how difficult was it?"

AVOID:
- Asking more than 2 questions at once (overwhelming)
- Formal or robotic language
- Asking for things they already provided
- Unrelated question pairs (keep them thematically connected)`;
}

/**
 * Build conversation context from history
 */
function buildConversationContext(conversationHistory: ConversationMessage[]): string {
  if (conversationHistory.length === 0) {
    return "Generate the first question to start collecting workout information.";
  }

  // Include FULL conversation history so AI doesn't repeat questions
  // This matches the extraction function which also uses full history
  return conversationHistory
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
}
