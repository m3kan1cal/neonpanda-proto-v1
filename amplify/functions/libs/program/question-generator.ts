/**
 * AI-powered question generation for training program creation
 * Generates next question based on conversation context and to-do list
 *
 * Pattern: Same structure as coach-creator/question-generator.ts
 */

import { callBedrockApi, callBedrockApiStream, MODEL_IDS } from '../api-helpers';
import { ConversationMessage } from '../todo-types';
import { ProgramCreatorTodoList } from './types';
import { getTodoSummary, getTodoItemLabel, isRequiredField } from './todo-list-utils';

/**
 * Generate the next question based on conversation context and to-do list
 * Returns null if session is complete
 */
export async function generateNextQuestion(
  conversationHistory: ConversationMessage[],
  todoList: ProgramCreatorTodoList,
  coachPersonality?: string
): Promise<string | null> {
  console.info('🎯 Generating next training program question');

  // Get summary of what's collected and what's missing
  const summary = getTodoSummary(todoList);

  // If all required items are complete, return completion message
  if (summary.requiredPending.length === 0) {
    console.info('✅ All required information collected, generating completion message');
    return generateCompletionMessage(todoList, coachPersonality);
  }

  // Check if this is the initial message (no conversation history)
  const isInitialMessage = conversationHistory.length === 0;

  // Build the prompt for question generation
  const systemPrompt = buildQuestionPrompt(summary, coachPersonality);

  // Get recent conversation context
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  const conversationContext = recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const userPrompt = isInitialMessage
    ? `
🎬 THIS IS THE INITIAL MESSAGE - SPECIAL INSTRUCTIONS:

This is the very first message in BUILD MODE. You need to:

1. **Greet them warmly** - They just switched to Build mode, ready to create a training program
2. **Set expectations** - This conversation will gather everything needed for their perfect training program
3. **Start with the most important question** - What are they training for? (their goals)

TONE: Energetic, supportive, and coach-like. Think: trusted coach who's excited to design their training program.

EXAMPLES OF GOOD INITIAL MESSAGES:
- "Alright! Let's build your training program! 💪 I'm going to ask you a few questions so I can design something perfect for you. First things first - what are you training for? What's the main goal?"
- "Time to create your training program! This is going to be good. I'll ask you some questions about your goals, schedule, and setup so I can build something that actually fits your life. Let's start with the big one - what are you working towards?"

Keep it to 2-3 sentences of intro, then ask about their training goals.

Generate your initial message now:
`
    : `
CONVERSATION SO FAR:
${conversationContext}

INFORMATION COLLECTED:
${summary.completed.join(', ')}

STILL NEEDED (REQUIRED):
${summary.requiredPending.join(', ')}

${summary.optionalPending.length > 0 ? `STILL NEEDED (OPTIONAL):\n${summary.optionalPending.join(', ')}` : ''}

Generate your next response:
1. Acknowledge what they just shared (if appropriate) with genuine warmth
2. Ask about the MOST IMPORTANT missing piece of information
3. Be conversational, supportive, and coach-like
4. ${coachPersonality ? `Match the coach personality: ${coachPersonality}` : 'Be professional but friendly'}

🚨 CRITICAL: Ask EXACTLY ONE QUESTION. Not two, not "and also...", just ONE.
- ✅ Good: "How many days per week can you train?"
- ❌ Bad: "How many days can you train? And what equipment do you have?"

Remember: You're helping them create a training program that will actually work for their life.
`;

  try {
    // Call Bedrock with Sonnet 4 (high quality for conversation)
    const questionResponse = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_SONNET_4_FULL
    ) as string;

    console.info('✅ Generated next training program question');

    return questionResponse.trim();

  } catch (error) {
    console.error('❌ Error generating training program question:', error);

    // Special fallback for initial message
    if (isInitialMessage) {
      console.warn('⚠️ Using fallback for initial message');
      return `Alright! Let's build your training program! 💪 I'm going to ask you a few questions so I can design something perfect for you. First things first - what are you training for? What's the main goal?`;
    }

    // Fallback: Ask about the first missing required item
    const firstMissing = summary.requiredPending[0];
    return generateFallbackQuestion(firstMissing);
  }
}

/**
 * STREAMING version: Generate the next question with real-time streaming
 * Yields chunks as they arrive from Bedrock
 */
export async function* generateNextQuestionStream(
  conversationHistory: ConversationMessage[],
  todoList: ProgramCreatorTodoList,
  coachPersonality?: string
): AsyncGenerator<string, string, unknown> {
  console.info('🎯 Generating next training program question (STREAMING)');

  // Get summary of what's collected and what's missing
  const summary = getTodoSummary(todoList);

  // If all required items are complete, generate completion message (non-streaming for simplicity)
  if (summary.requiredPending.length === 0) {
    console.info('✅ All required information collected, generating completion message');
    const completionMsg = await generateCompletionMessage(todoList, coachPersonality);

    // Simulate streaming by yielding word-by-word
    const words = completionMsg.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield (i === 0 ? '' : ' ') + words[i];
    }

    return completionMsg;
  }

  // Check if this is the initial message (no conversation history)
  const isInitialMessage = conversationHistory.length === 0;

  // Build the prompt for question generation
  const systemPrompt = buildQuestionPrompt(summary, coachPersonality);

  // Get recent conversation context
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  const conversationContext = recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const userPrompt = isInitialMessage
    ? `
🎬 THIS IS THE INITIAL MESSAGE - SPECIAL INSTRUCTIONS:

This is the very first message in BUILD MODE. You need to:

1. **Greet them warmly** - They just switched to Build mode, ready to create a training program
2. **Set expectations** - This conversation will gather everything needed for their perfect training program
3. **Start with the most important question** - What are they training for? (their goals)

TONE: Energetic, supportive, and coach-like. Think: trusted coach who's excited to design their training program.

EXAMPLES OF GOOD INITIAL MESSAGES:
- "Alright! Let's build your training program! 💪 I'm going to ask you a few questions so I can design something perfect for you. First things first - what are you training for? What's the main goal?"
- "Time to create your training program! This is going to be good. I'll ask you some questions about your goals, schedule, and setup so I can build something that actually fits your life. Let's start with the big one - what are you working towards?"

Keep it to 2-3 sentences of intro, then ask about their training goals.

Generate your initial message now:
`
    : `
CONVERSATION SO FAR:
${conversationContext}

INFORMATION COLLECTED:
${summary.completed.join(', ')}

STILL NEEDED (REQUIRED):
${summary.requiredPending.join(', ')}

${summary.optionalPending.length > 0 ? `STILL NEEDED (OPTIONAL):\n${summary.optionalPending.join(', ')}` : ''}

Generate your next response:
1. Acknowledge what they just shared (if appropriate) with genuine warmth
2. Ask about the MOST IMPORTANT missing piece of information
3. Be conversational, supportive, and coach-like
4. ${coachPersonality ? `Match the coach personality: ${coachPersonality}` : 'Be professional but friendly'}

🚨 CRITICAL: Ask EXACTLY ONE QUESTION. Not two, not "and also...", just ONE.
- ✅ Good: "How many days per week can you train?"
- ❌ Bad: "How many days can you train? And what equipment do you have?"

Remember: You're helping them create a training program that will actually work for their life.
`;

  try {
    // Call Bedrock with STREAMING enabled (await the promise to get the generator)
    const questionStream = await callBedrockApiStream(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_SONNET_4_FULL
    );

    let fullResponse = '';

    // Yield chunks as they arrive from Bedrock
    for await (const chunk of questionStream) {
      fullResponse += chunk;
      yield chunk;
    }

    console.info('✅ Generated next training program question (streaming complete)');

    return fullResponse.trim();

  } catch (error) {
    console.error('❌ Error generating training program question (streaming):', error);

    // Special fallback for initial message
    if (isInitialMessage) {
      console.warn('⚠️ Using fallback for initial message');
      const fallback = `Alright! Let's build your training program! 💪 I'm going to ask you a few questions so I can design something perfect for you. First things first - what are you training for? What's the main goal?`;

      // Simulate streaming for fallback
      const words = fallback.split(' ');
      for (let i = 0; i < words.length; i++) {
        yield (i === 0 ? '' : ' ') + words[i];
      }

      return fallback;
    }

    // Fallback: Ask about the first missing required item
    const firstMissing = summary.requiredPending[0];
    const fallbackQuestion = generateFallbackQuestion(firstMissing);

    // Simulate streaming for fallback
    const words = fallbackQuestion.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield (i === 0 ? '' : ' ') + words[i];
    }

    return fallbackQuestion;
  }
}

/**
 * Generate completion message when all required info is collected
 */
async function generateCompletionMessage(
  todoList: ProgramCreatorTodoList,
  coachPersonality?: string
): Promise<string> {
  console.info('🎉 Generating training program completion message');

  const systemPrompt = `You're wrapping up a conversation to create a training program!

The user just shared everything you need to build their perfect training program. Generate an energetic, exciting completion message that:

1. Celebrates what they've shared (with genuine enthusiasm!)
2. Briefly highlights 1-2 key things about their training program (e.g., their goal, their setup)
3. **CRITICAL: Tell them the training program build is starting NOW and will take 3-5 minutes**
4. Explain what they'll see: progress updates as the AI generates their full training program
5. **Tell them WHERE to find it: Head to the Training Grounds and their training program will appear in the training programs list once ready**
6. Make them feel excited to wait for something custom-built for them
${coachPersonality ? `7. Match the coach personality: ${coachPersonality}` : ''}

TONE: Supportive and professional, like a coach who just finished designing a training program plan.

STRUCTURE (5-6 sentences):
- Sentence 1-2: Celebrate what they shared + highlight 1-2 specific things
- Sentence 3: Tell them the build is starting now and takes 3-5 minutes
- Sentence 4: Mention they'll see progress updates
- Sentence 5: Tell them to head to Training Grounds where it'll appear in their training programs list
- Sentence 6: Get them excited for their custom training program

EXAMPLE:
"Perfect! I've got everything I need to build your training program. 🎯 I'm excited to create something tailored for your [specific goal] with your [specific setup]. **The AI is firing up now to generate your full training program - this takes about 3-5 minutes.** You'll see progress updates as it builds out all your phases and workouts. Head to the Training Grounds and your program will appear in your programs list once it's ready! This is going to be built specifically for YOU! 💪"

NO MORE QUESTIONS - we're done gathering info and the build process is STARTING NOW! 🔥`;

  const summary = getTodoSummary(todoList);
  const userPrompt = `
Generate a completion message for this training program build.

WHAT THEY SHARED:
${summary.completed.join(', ')}

Generate an enthusiastic completion message (5-6 sentences) that:
1. Celebrates their specific goals/setup (mention 1-2 actual things they shared)
2. TELLS THEM the training program is being built NOW and takes 3-5 minutes
3. Mentions they'll see progress updates
4. Tells them to head to Training Grounds where it'll appear in their training programs list once ready
5. Gets them excited for their custom training program

CRITICAL: Make sure to tell them about the 3-5 minute build time, progress updates, AND where to find their training program (Training Grounds)!
`;

  try {
    const completionMessage = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_SONNET_4_FULL
    ) as string;

    return completionMessage.trim();

  } catch (error) {
    console.error('❌ Error generating completion message, using fallback');

    // Fallback completion message
    return "Perfect! I've got everything I need to build your training program. 🔥\n\n**The AI is firing up now to generate your training program - this takes about 3-5 minutes.** You'll see progress updates as it works. Head to the Training Grounds and your program will appear in your programs list once it's ready! 💪";
  }
}

/**
 * Build the system prompt for question generation
 */
function buildQuestionPrompt(
  summary: {
    completed: string[];
    pending: string[];
    requiredPending: string[];
    optionalPending: string[];
  },
  coachPersonality?: string
): string {
  return `You are an AI coach helping to create a custom training program through conversation.

${coachPersonality ? `COACH PERSONALITY:\n${coachPersonality}\n\n` : ''}CONVERSATION GUIDELINES:

1. **Flow Like a Real Conversation**
   - This isn't a form - it's a chat with a coach who cares
   - Acknowledge what they've shared with warmth
   - Build confidence in the program you're designing

2. **Ask ONE Question at a Time**
   🚨 CRITICAL: Ask EXACTLY ONE QUESTION per response.
   - ✅ Good: "How many days per week can you train?"
   - ❌ Bad: "How many days can you train? And what equipment do you have?"

   If they answer multiple things at once, great! But YOU only ask one thing.

3. **Priority Order for Missing Information**
   - First: Training goals (why they're here)
   - Then: Program duration and frequency (timeline)
   - Then: Equipment and environment (what's possible)
   - Then: Experience level (safety and progression)
   - Then: Preferences and context (personalization)
   - Last: Optional advanced preferences

4. **Acknowledge Before Moving On**
   - Always validate what they shared before asking the next question
   - Show you're listening and designing for THEM
   - Example: "Got it - 8 weeks to prep for that competition. That's a solid timeline. What equipment do you have access to?"

5. **Be Practical and Supportive**
   - Keep questions clear and actionable
   - Help them think through their answers if needed
   - Make them feel confident in the training program you'll build

Your goal: Gather the information needed to design a training program that actually works for their life.`;
}

/**
 * Generate a fallback question when AI generation fails
 */
function generateFallbackQuestion(missingField: string): string {
  const fallbackQuestions: Record<string, string> = {
    'Training Goals': "What are your main training goals? What are you working towards?",
    'Program Duration': "How long do you want this program to run? (e.g., 8 weeks, 12 weeks)",
    'Training Frequency': "How many days per week can you train?",
    'Equipment Access': "What equipment do you have access to?",
    'Experience Level': "What's your experience level with training? (beginner, intermediate, or advanced)",
    'Target Event': "Are you training for a specific event or competition?",
    'Session Duration': "How long are your typical training sessions?",
    'Start Date': "When do you want to start this program?",
    'Rest Days Preference': "Do you have preferred rest days? (e.g., weekends, specific days)",
    'Training Environment': "Where do you train? (home gym, commercial gym, CrossFit box, etc.)",
    'Current Fitness Baseline': "Can you give me a sense of your current fitness level? Any recent performance benchmarks?",
    'Injury Considerations': "Do you have any injuries or limitations I should know about?",
    'Movement Preferences': "Are there specific movements or exercises you really enjoy?",
    'Movement Dislikes': "Are there movements you'd prefer to minimize or avoid?",
    'Program Focus': "What should the program focus on? (strength, conditioning, mixed, etc.)",
    'Intensity Preference': "What intensity level works best for you? (conservative, moderate, or aggressive)",
    'Volume Tolerance': "How much training volume can you handle? (low, moderate, or high)",
  };

  return fallbackQuestions[missingField] || `Tell me about your ${missingField.toLowerCase()}.`;
}
