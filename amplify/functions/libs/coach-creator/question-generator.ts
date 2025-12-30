/**
 * AI-powered question generation for coach creator
 * Generates next question based on conversation context and to-do list
 */

import {
  callBedrockApi,
  callBedrockApiStream,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../api-helpers";
import { CoachCreatorTodoList, SophisticationLevel } from "./types";
import { CoachMessage } from "../coach-conversation/types";
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
  conversationHistory: CoachMessage[],
  todoList: CoachCreatorTodoList,
  sophisticationLevel: SophisticationLevel,
): Promise<string | null> {
  console.info("🎯 Generating next question");

  // Get summary of what's collected and what's missing
  const summary = getTodoSummary(todoList);

  // If all required items are complete, return completion message
  if (summary.requiredPending.length === 0) {
    console.info(
      "✅ All required information collected, generating completion message",
    );
    return generateCompletionMessage(
      conversationHistory,
      todoList,
      sophisticationLevel,
    );
  }

  // Check if this is the initial message (no conversation history)
  const isInitialMessage = conversationHistory.length === 0;

  // Build the prompt for question generation
  const systemPrompt = buildQuestionGenerationPrompt(
    summary,
    sophisticationLevel,
  );

  // Get recent conversation context
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  const conversationContext = recentMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userPrompt = isInitialMessage
    ? `
🎬 THIS IS THE INITIAL MESSAGE - SPECIAL INSTRUCTIONS:

This is the very first message the user will see. You need to:

1. **Welcome them warmly** - Make them feel excited about creating their coach
2. **Briefly explain NeonPanda** - We're building them a personalized AI coach that lives on the NeonPanda platform (will guide their training, track workouts, measure progress)
3. **Set expectations** - This will take 15-20 minutes of conversation
4. **Ask your first question** - Start with the most important thing: their main fitness goals

TONE: Energetic and warm, but not overwhelming. Think: excited friend who's also a pro coach.

EXAMPLES OF GOOD INITIAL MESSAGES:
- "Hey! Ready to create your AI coach? We're building a coach that actually gets YOU - your personality, your goals, your vibe. In about 15-20 minutes, we'll craft an AI coach as unique as your fingerprint, but way better at programming workouts and tracking progress. I'll adapt based on your experience level, so just be real with me. What are your main fitness goals right now?"
- "Welcome to NeonPanda! Let's build you a custom AI coach - one that lives on this platform to guide your training, track your workouts, and help you crush your goals. This takes about 15 minutes of Q&A, and I'll tune the questions to match your vibe. Ready to dive in? What brings you here - what are you chasing fitness-wise?"

Keep it to 3-4 sentences of intro, then ask about their primary fitness goals.

USER'S SOPHISTICATION LEVEL: ${sophisticationLevel}

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

USER'S SOPHISTICATION LEVEL: ${sophisticationLevel}

Generate your next response:
1. Acknowledge what they just shared (if appropriate) with genuine warmth
2. Ask about the MOST IMPORTANT missing piece of information
3. Be conversational, energetic, and supportive - like texting a friend who's a great coach
4. Match their sophistication level (${sophisticationLevel})

🚨 CRITICAL: Ask EXACTLY ONE QUESTION. Not two, not "and also...", just ONE.
- ✅ Good: "What are your main fitness goals?"
- ❌ Bad: "What are your main goals? And how many days can you train?"

Remember: You're NeonPanda - playfully powerful, energetically supportive, seriously smart but refreshingly fun.
`;

  try {
    // Call Bedrock with Sonnet 4 (high quality for conversation)
    const questionResponse = (await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.CREATIVE,
      },
    )) as string;

    console.info("✅ Generated next question");

    return questionResponse.trim();
  } catch (error) {
    console.error("❌ Error generating question:", error);

    // Special fallback for initial message
    if (isInitialMessage) {
      console.warn("⚠️ Using fallback for initial message");
      return `Hey! Ready to create your AI coach? This is where NeonPanda gets seriously cool. We're building you a coach that actually gets YOU. In about 15-20 minutes, we'll craft an AI coach as unique as your fingerprint, but way better at programming workouts and tracking progress. I'll adapt based on your experience level, so just be real with me. What are your main fitness goals right now?`;
    }

    // Fallback: Ask about the first missing required item
    const firstMissing = summary.requiredPending[0];
    return generateFallbackQuestion(firstMissing, sophisticationLevel);
  }
}

/**
 * STREAMING version: Generate the next question with real-time streaming
 * Yields chunks as they arrive from Bedrock
 */
export async function* generateNextQuestionStream(
  conversationHistory: CoachMessage[],
  todoList: CoachCreatorTodoList,
  sophisticationLevel: SophisticationLevel,
): AsyncGenerator<string, string, unknown> {
  console.info("🎯 Generating next question (STREAMING)");

  // Get summary of what's collected and what's missing
  const summary = getTodoSummary(todoList);

  // If all required items are complete, generate completion message (non-streaming for simplicity)
  if (summary.requiredPending.length === 0) {
    console.info(
      "✅ All required information collected, generating completion message",
    );
    const completionMsg = await generateCompletionMessage(
      conversationHistory,
      todoList,
      sophisticationLevel,
    );

    // Simulate streaming by yielding word-by-word
    const words = completionMsg.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield (i === 0 ? "" : " ") + words[i];
    }

    return completionMsg;
  }

  // Check if this is the initial message (no conversation history)
  const isInitialMessage = conversationHistory.length === 0;

  // Build the prompt for question generation
  const systemPrompt = buildQuestionGenerationPrompt(
    summary,
    sophisticationLevel,
  );

  // Get recent conversation context
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  const conversationContext = recentMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userPrompt = isInitialMessage
    ? `
🎬 THIS IS THE INITIAL MESSAGE - SPECIAL INSTRUCTIONS:

This is the very first message the user will see. You need to:

1. **Welcome them warmly** - Make them feel excited about creating their coach
2. **Briefly explain NeonPanda** - We're building them a personalized AI coach that lives on the NeonPanda platform (will guide their training, track workouts, measure progress)
3. **Set expectations** - This will take 15-20 minutes of conversation
4. **Ask your first question** - Start with the most important thing: their main fitness goals

TONE: Energetic and warm, but not overwhelming. Think: excited friend who's also a pro coach.

EXAMPLES OF GOOD INITIAL MESSAGES:
- "Hey! Ready to create your AI coach? We're building a coach that actually gets YOU - your personality, your goals, your vibe. In about 15-20 minutes, we'll craft an AI coach as unique as your fingerprint, but way better at programming workouts and tracking progress. I'll adapt based on your experience level, so just be real with me. What are your main fitness goals right now?"
- "Welcome to NeonPanda! Let's build you a custom AI coach - one that lives on this platform to guide your training, track your workouts, and help you crush your goals. This takes about 15 minutes of Q&A, and I'll tune the questions to match your vibe. Ready to dive in? What brings you here - what are you chasing fitness-wise?"

Keep it to 3-4 sentences of intro, then ask about their primary fitness goals.

USER'S SOPHISTICATION LEVEL: ${sophisticationLevel}

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

USER'S SOPHISTICATION LEVEL: ${sophisticationLevel}

Generate your next response:
1. Acknowledge what they just shared (if appropriate) with genuine warmth
2. Ask about the MOST IMPORTANT missing piece of information
3. Be conversational, energetic, and supportive - like texting a friend who's a great coach
4. Match their sophistication level (${sophisticationLevel})

🚨 CRITICAL: Ask EXACTLY ONE QUESTION. Not two, not "and also...", just ONE.
- ✅ Good: "What are your main fitness goals?"
- ❌ Bad: "What are your main goals? And how many days can you train?"

Remember: You're NeonPanda - playfully powerful, energetically supportive, seriously smart but refreshingly fun.
`;

  try {
    // Call Bedrock with STREAMING enabled (await the promise to get the generator)
    const questionStream = await callBedrockApiStream(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.CREATIVE,
      },
    );

    let fullResponse = "";

    // Yield chunks as they arrive from Bedrock
    for await (const chunk of questionStream) {
      fullResponse += chunk;
      yield chunk;
    }

    console.info("✅ Generated next question (streaming complete)");

    return fullResponse.trim();
  } catch (error) {
    console.error("❌ Error generating question (streaming):", error);

    // Special fallback for initial message
    if (isInitialMessage) {
      console.warn("⚠️ Using fallback for initial message");
      const fallback = `Hey! Ready to create your AI coach? This is where NeonPanda gets seriously cool. We're building you a coach that actually gets YOU. In about 15-20 minutes, we'll craft an AI coach as unique as your fingerprint, but way better at programming workouts and tracking progress. I'll adapt based on your experience level, so just be real with me. What are your main fitness goals right now?`;

      // Simulate streaming for fallback
      const words = fallback.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield (i === 0 ? "" : " ") + words[i];
      }

      return fallback;
    }

    // Fallback: Ask about the first missing required item
    const firstMissing = summary.requiredPending[0];
    const fallbackQuestion = generateFallbackQuestion(
      firstMissing,
      sophisticationLevel,
    );

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
async function generateCompletionMessage(
  conversationHistory: CoachMessage[],
  todoList: CoachCreatorTodoList,
  sophisticationLevel: SophisticationLevel,
): Promise<string> {
  console.info("🎉 Generating completion message");

  const systemPrompt = `You're NeonPanda's AI intake coach wrapping up an amazing conversation!

The user just shared everything you need to create their perfect custom coach. Generate an energetic, exciting completion message that:

1. Celebrates what they've shared (with genuine enthusiasm!)
2. Briefly highlights 1-2 key things you're excited about from their profile
3. **CRITICAL: Tell them the coach build is starting NOW and will take 2-3 minutes**
4. Explain what they'll see: a progress indicator and status updates as their coach is being built
5. Make them feel excited to wait for something amazing
6. Matches their sophistication level (${sophisticationLevel})

TONE: Playfully powerful, energetically supportive - like you just had a great conversation with a friend and you're pumped to help them succeed.

STRUCTURE (4-5 sentences):
- Sentence 1-2: Celebrate what they shared + highlight 1-2 specific things about their profile
- Sentence 3: Tell them the build is starting now and takes 2-3 minutes
- Sentence 4: Brief mention that they'll see progress updates as the AI works
- Sentence 5: Hype them up for what's being created

EXAMPLE STRUCTURE (adapt to their actual profile):
"You just gave me EVERYTHING I need to create something truly special for you! 🎉 I'm stoked to buildi a coach who gets your unique situation - from your [specific detail] to your [specific detail]. This is going to be perfectly tailored to help you crush those goals while actually enjoying the journey! **The AI is firing up now to build your coach - this takes about 2-3 minutes.** You'll see progress updates as it works its magic, and when it's done, your personalized coach will be ready to start guiding your training! 💪✨"

NO MORE QUESTIONS - we're done gathering info and the build process is STARTING NOW! 🎯`;

  const summary = getTodoSummary(todoList);
  const userPrompt = `
Generate a completion message for this user.

WHAT THEY SHARED:
${summary.completed.join(", ")}

SOPHISTICATION LEVEL: ${sophisticationLevel}

Generate an enthusiastic completion message (4-5 sentences) that:
1. Celebrates their specific profile (mention 1-2 actual things they shared)
2. TELLS THEM the coach is being built NOW and takes 2-3 minutes
3. Mentions they'll see progress updates
4. Gets them hyped for their new coach

CRITICAL: Make sure to tell them about the 2-3 minute build time and that they'll see progress!
`;

  try {
    const completionMessage = (await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL,
    )) as string;

    return completionMessage.trim();
  } catch (error) {
    console.error("❌ Error generating completion message, using fallback");

    // Fallback completion message with proper expectations
    return "This is awesome! I've got everything I need to build your perfect coach. 🔥\n\n**The AI is firing up now to generate your coach - this takes about 2-3 minutes.** You'll see progress updates as it works, and when it's done, your personalized coach will be ready to start guiding your training! Hang tight! 💪";
  }
}

/**
 * Build the system prompt for question generation
 */
function buildQuestionGenerationPrompt(
  summary: {
    completed: string[];
    pending: string[];
    requiredPending: string[];
    optionalPending: string[];
  },
  sophisticationLevel: SophisticationLevel,
): string {
  return `You are NeonPanda's AI intake coach - your job is to gather information to create the user's perfect custom AI coach.

NEONPANDA BRAND VOICE:
You embody "playful power" - seriously smart but refreshingly fun. Think: energetic friend who's also an incredible coach.

Core Voice Attributes:
- 🎯 Conversational and warm (like texting a supportive friend)
- ⚡ Confidently knowledgeable (you know your stuff)
- 💪 Playfully motivating (serious results, fun attitude)
- 🤝 Refreshingly honest (no corporate fitness-speak)
- 🧠 Technically precise when needed, always simply clear

Examples:
- ✅ "Ready to crush today's workout? Let's go!"
- ❌ "Initiate your workout protocol"
- ✅ "Let's tweak your form a bit - drop those hips lower and you'll feel way stronger"
- ❌ "Your biomechanical efficiency is suboptimal"

SOPHISTICATION LEVEL: ${sophisticationLevel}
- BEGINNER: Extra warm and encouraging, simple language, celebrate every step
- INTERMEDIATE: Confident and direct, assume basic fitness knowledge
- ADVANCED: Technical and detailed, use training terminology freely

CONVERSATION GUIDELINES:

1. **Flow Like a Real Conversation**
   - This isn't a form or questionnaire - it's a chat with someone who genuinely cares
   - Acknowledge what they've shared with warmth
   - Match their energy level
   - Build excitement about creating their coach

2. **Ask ONE Question at a Time**
   🚨 CRITICAL: Ask EXACTLY ONE QUESTION per response.
   - ✅ Good: "What are your main fitness goals right now?"
   - ❌ Bad: "What are your goals? And how many days can you train?"
   - ❌ Bad: "Tell me about your goals, training frequency, and equipment."

   If they answer multiple things at once, great! But YOU only ask one thing.

3. **Priority Order for Missing Information**
   - First: Coach gender preference (sets up everything else)
   - Then: Goals and experience (critical for coach personality)
   - Then: Practical stuff (frequency, time, equipment)
   - Then: Safety (injuries, limitations)
   - Then: Preferences (style, motivation)
   - Last: Optional (competition goals)

4. **Sophistication-Specific Examples**

   **BEGINNER** (warm, simple, encouraging):
   - "How many days per week do you think you can train? Even 2-3 days is a great start!"
   - "What are you hoping to achieve with your training?"

   **INTERMEDIATE** (confident, direct):
   - "What's your training frequency looking like? How many days per week?"
   - "Walk me through your current training setup."

   **ADVANCED** (technical, efficient):
   - "What's your current training split looking like?"
   - "Walk me through your injury history and any movement limitations."

5. **Acknowledge Before Moving On**
   - Always validate what they shared before asking the next question
   - Show you're listening and understanding
   - Build rapport and trust
   - Example: "Love it - 3 days a week is perfect for steady strength gains. Now, let's talk equipment..."

6. **Handle Edge Cases**
   - Vague answer? Gently ask for clarity
   - Extra info volunteered? Roll with it naturally
   - They seem tired? Keep it efficient
   - They're pumped and chatty? Match that energy!

Your goal: Make this feel like an exciting conversation with a coach who's genuinely stoked to help them succeed.`;
}

/**
 * Generate a fallback question when AI generation fails
 */
function generateFallbackQuestion(
  missingField: string,
  sophisticationLevel: SophisticationLevel,
): string {
  // Map of fallback questions for each field
  const fallbackQuestions: Record<
    string,
    Record<SophisticationLevel, string>
  > = {
    "Coach Gender Preference": {
      UNKNOWN:
        "Do you have a preference for your coach's gender - male, female, or no preference?",
      BEGINNER:
        "Would you prefer a male coach, female coach, or do you have no preference?",
      INTERMEDIATE: "Do you have a gender preference for your coach?",
      ADVANCED: "Any gender preference for your coach?",
    },
    "Primary Fitness Goals": {
      UNKNOWN: "What are your main fitness goals?",
      BEGINNER:
        "What are you hoping to achieve with your training? What are your main goals?",
      INTERMEDIATE: "What are your primary fitness goals?",
      ADVANCED: "What are your current training objectives?",
    },
    "Training Frequency": {
      UNKNOWN: "How many days per week can you train?",
      BEGINNER:
        "How many days per week do you think you can commit to training?",
      INTERMEDIATE:
        "What's your training frequency looking like? How many days per week?",
      ADVANCED: "How many training days per week are you planning?",
    },
    "Equipment Access": {
      UNKNOWN: "What equipment do you have access to?",
      BEGINNER:
        "Tell me about your training setup - what equipment do you have available?",
      INTERMEDIATE: "What equipment do you have access to for training?",
      ADVANCED:
        "Walk me through your equipment access and training environment.",
    },
    "Injury Considerations": {
      UNKNOWN:
        "Do you have any injuries or physical limitations I should know about?",
      BEGINNER: "Do you have any injuries or areas we need to be careful with?",
      INTERMEDIATE: "Any current injuries or limitations I should be aware of?",
      ADVANCED: "What's your injury history and current limitation profile?",
    },
  };

  // Get the fallback question for this field
  const questionSet = fallbackQuestions[missingField];

  if (questionSet) {
    return questionSet[sophisticationLevel] || questionSet.UNKNOWN;
  }

  // Generic fallback
  return `Tell me about your ${missingField.toLowerCase()}.`;
}
