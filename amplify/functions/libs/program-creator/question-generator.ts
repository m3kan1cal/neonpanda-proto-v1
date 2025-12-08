/**
 * AI-powered question generation for training program creation
 * Generates next question based on conversation context and to-do list
 *
 * Pattern: Same structure as coach-creator/question-generator.ts
 */

import {
  callBedrockApi,
  callBedrockApiStream,
  MODEL_IDS,
} from "../api-helpers";
import { ConversationMessage } from "../todo-types";
import { ProgramCreatorTodoList } from "./types";
import {
  getTodoSummary,
  getTodoItemLabel,
  isRequiredField,
} from "./todo-list-utils";

/**
 * Generate the next question based on conversation context and to-do list
 * Returns null if session is complete
 */
export async function generateNextQuestion(
  conversationHistory: ConversationMessage[],
  todoList: ProgramCreatorTodoList,
  coachPersonality?: string,
): Promise<string | null> {
  console.info("🎯 Generating next program question");

  // Get summary of what's collected and what's missing
  const summary = getTodoSummary(todoList);

  // If all required items are complete, signal completion (caller handles completion message)
  if (summary.requiredPending.length === 0) {
    console.info("✅ All required information collected, session complete");
    return null;
  }

  // Check if this is the initial message (no conversation history)
  const isInitialMessage = conversationHistory.length === 0;

  // Build the prompt for question generation
  const systemPrompt = buildQuestionPrompt(summary, coachPersonality);

  // Get recent conversation context
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  const conversationContext = recentMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

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
${summary.completed.join(", ")}

STILL NEEDED (REQUIRED):
${summary.requiredPending.join(", ")}

${summary.optionalPending.length > 0 ? `STILL NEEDED (OPTIONAL):\n${summary.optionalPending.join(", ")}` : ""}

🚨 CRITICAL - AVOID DUPLICATE QUESTIONS:
BEFORE asking about something, CHECK THE CONVERSATION HISTORY ABOVE.
- If the user ALREADY answered a question (even if not yet in "INFORMATION COLLECTED"), DO NOT ask it again
- Example: If they said "6 weeks" earlier, DON'T ask "How long do you want the program?"
- If they repeat themselves or say "I already answered this", acknowledge it and move to the next question
- The "STILL NEEDED" list shows what hasn't been extracted yet, but they may have already mentioned it

Generate your next response:
1. Acknowledge what they just shared (if appropriate) with genuine warmth
2. Ask about the MOST IMPORTANT missing piece of information that HASN'T been mentioned yet
3. Be conversational, supportive, and coach-like
4. ${coachPersonality ? `Match the coach personality: ${coachPersonality}` : "Be professional but friendly"}

🚨 CRITICAL: Ask EXACTLY ONE QUESTION. Not two, not "and also...", just ONE.
- ✅ Good: "How many days per week can you train?"
- ❌ Bad: "How many days can you train? And what equipment do you have?"

Remember: You're helping them create a training program that will actually work for their life.
`;

  try {
    // Call Bedrock with Haiku 4.5 (fast and cost-effective for simple Q&A)
    const questionResponse = (await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL,
    )) as string;

    console.info("✅ Generated next program question");

    return questionResponse.trim();
  } catch (error) {
    console.error("❌ Error generating program question:", error);

    // Special fallback for initial message
    if (isInitialMessage) {
      console.warn("⚠️ Using fallback for initial message");
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
 * Pattern: Matches workout-creator/question-generator.ts exactly
 */
export async function* generateNextQuestionStream(
  conversationHistory: ConversationMessage[],
  todoList: ProgramCreatorTodoList,
  coachPersonality?: string,
  userContext?: {
    recentWorkouts?: any[];
    pineconeMemories?: any[];
    userProfile?: any;
    activeProgram?: any;
  },
): AsyncGenerator<string, string, unknown> {
  console.info("🎯 Generating next program question (STREAMING)");

  // Get summary of what's collected and what's missing
  const summary = getTodoSummary(todoList);

  // If all required items are complete, generate completion message (streaming)
  if (summary.requiredPending.length === 0) {
    console.info(
      "✅ All required information collected, generating completion message",
    );

    let fullResponse = "";
    const completionStream = generateCompletionMessage(
      todoList,
      coachPersonality,
      userContext,
    );

    for await (const chunk of completionStream) {
      fullResponse += chunk;
      yield chunk;
    }

    return fullResponse;
  }

  // Check if this is the initial message (no conversation history)
  const isInitialMessage = conversationHistory.length === 0;

  // Build the prompt for question generation
  const systemPrompt = buildQuestionPrompt(summary, coachPersonality);

  // Get recent conversation context
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  const conversationContext = recentMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

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
${summary.completed.join(", ")}

STILL NEEDED (REQUIRED):
${summary.requiredPending.join(", ")}

${summary.optionalPending.length > 0 ? `STILL NEEDED (OPTIONAL):\n${summary.optionalPending.join(", ")}` : ""}

🚨 CRITICAL - AVOID DUPLICATE QUESTIONS:
BEFORE asking about something, CHECK THE CONVERSATION HISTORY ABOVE.
- If the user ALREADY answered a question (even if not yet in "INFORMATION COLLECTED"), DO NOT ask it again
- Example: If they said "6 weeks" earlier, DON'T ask "How long do you want the program?"
- If they repeat themselves or say "I already answered this", acknowledge it and move to the next question
- The "STILL NEEDED" list shows what hasn't been extracted yet, but they may have already mentioned it

Generate your next response:
1. Acknowledge what they just shared (if appropriate) with genuine warmth
2. Ask about the MOST IMPORTANT missing piece of information that HASN'T been mentioned yet
3. Be conversational, supportive, and coach-like
4. ${coachPersonality ? `Match the coach personality: ${coachPersonality}` : "Be professional but friendly"}

🚨 CRITICAL: Ask EXACTLY ONE QUESTION. Not two, not "and also...", just ONE.
- ✅ Good: "How many days per week can you train?"
- ❌ Bad: "How many days can you train? And what equipment do you have?"

Remember: You're helping them create a training program that will actually work for their life.
`;

  try {
    // Call Bedrock with STREAMING enabled using Haiku 4.5 (fast and cost-effective for simple Q&A)
    const questionStream = await callBedrockApiStream(
      systemPrompt,
      userPrompt,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL,
    );

    let fullResponse = "";

    // Yield chunks as they arrive from Bedrock
    for await (const chunk of questionStream) {
      fullResponse += chunk;
      yield chunk;
    }

    console.info("✅ Generated next program question (streaming complete)");

    return fullResponse.trim();
  } catch (error) {
    console.error("❌ Error generating program question (streaming):", error);

    // Special fallback for initial message
    if (isInitialMessage) {
      console.warn("⚠️ Using fallback for initial message");
      const fallback = `Alright! Let's build your training program! 💪 I'm going to ask you a few questions so I can design something perfect for you. First things first - what are you training for? What's the main goal?`;

      // Simulate streaming for fallback
      const words = fallback.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield (i === 0 ? "" : " ") + words[i];
      }

      return fallback;
    }

    // Fallback: Ask about the first missing required item
    const firstMissing = summary.requiredPending[0];
    const fallbackQuestion = generateFallbackQuestion(firstMissing);

    // Simulate streaming for fallback
    const words = fallbackQuestion.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield (i === 0 ? "" : " ") + words[i];
    }

    return fallbackQuestion;
  }
}

/**
 * Generate completion message when all required info is collected
 */
/**
 * Generate completion message (streaming) when all required info is collected
 * Dynamic, AI-generated message with coach personality
 */
export async function* generateCompletionMessage(
  todoList: ProgramCreatorTodoList,
  coachPersonality?: string,
  userContext?: any,
): AsyncGenerator<string, void, unknown> {
  console.info("🎉 Generating program completion message (streaming)");

  // Build system prompt with coach personality
  const systemPrompt = coachPersonality
    ? `You are an AI coach helping users design training programs.\n\nCOACH PERSONALITY:\n${coachPersonality}\n\nUse this personality in your response.`
    : `You are an AI coach helping users design training programs. Be encouraging and supportive.`;

  const completionPrompt = `The user has provided all the information needed to design their training program.

USER'S PROGRAM REQUIREMENTS:
${JSON.stringify(todoList, null, 2)}

YOUR TASK:
1. Acknowledge that you have everything you need
2. Summarize the key program parameters (duration, frequency, goals)
3. Tell them you're starting the program generation NOW
4. Provide clear instructions about what happens next:
   - "I'm generating your personalized training program now"
   - "This will take 3-5 minutes"
   - "Head to the Training Grounds and your program will appear in your programs list once it's ready!"

IMPORTANT:
- Be encouraging and excited about their program
- Keep it concise (2-3 paragraphs max)
- End with clear next steps
- Use YOUR personality and coaching style
- DO NOT say "I'll remember this" (memory handling is separate)

Generate the completion message now:
`;

  try {
    // Stream the completion message using coach's personality
    const stream = await callBedrockApiStream(
      systemPrompt,
      completionPrompt,
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    console.error("❌ Error generating completion message, using fallback");

    // Fallback completion message
    const fallback =
      "Perfect! I've got everything I need to build your training program. 🔥\n\n**The AI is firing up now to generate your training program - this takes about 3-5 minutes.** You'll see progress updates as it works. Head to the Training Grounds and your program will appear in your programs list once it's ready! 💪";
    yield fallback;
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
  coachPersonality?: string,
): string {
  return `You are an AI coach helping to create a custom training program through conversation.

${coachPersonality ? `COACH PERSONALITY:\n${coachPersonality}\n\n` : ""}CONVERSATION GUIDELINES:

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
    "Training Goals":
      "What are your main training goals? What are you working towards?",
    "Program Duration":
      "How long do you want this program to run? (e.g., 8 weeks, 12 weeks)",
    "Training Frequency": "How many days per week can you train?",
    "Equipment Access": "What equipment do you have access to?",
    "Experience Level":
      "What's your experience level with training? (beginner, intermediate, or advanced)",
    "Target Event": "Are you training for a specific event or competition?",
    "Session Duration": "How long are your typical training sessions?",
    "Start Date": "When do you want to start this program?",
    "Rest Days Preference":
      "Do you have preferred rest days? (e.g., weekends, specific days)",
    "Training Environment":
      "Where do you train? (home gym, commercial gym, CrossFit box, etc.)",
    "Current Fitness Baseline":
      "Can you give me a sense of your current fitness level? Any recent performance benchmarks?",
    "Injury Considerations":
      "Do you have any injuries or limitations I should know about?",
    "Movement Preferences":
      "Are there specific movements or exercises you really enjoy?",
    "Movement Dislikes":
      "Are there movements you'd prefer to minimize or avoid?",
    "Program Focus":
      "What should the program focus on? (strength, conditioning, mixed, etc.)",
    "Intensity Preference":
      "What intensity level works best for you? (conservative, moderate, or aggressive)",
    "Volume Tolerance":
      "How much training volume can you handle? (low, moderate, or high)",
  };

  return (
    fallbackQuestions[missingField] ||
    `Tell me about your ${missingField.toLowerCase()}.`
  );
}
