import { Question, UserContext, SophisticationLevel } from "./types";

// ============================================================================
// NEONPANDA COACH CREATOR QUESTIONS - BRAND-ALIGNED V2
// ============================================================================
// Goal: 10-15 minute conversation with electric energy and playful warmth
// Brand: "Where AI Meets High Fives" - vibrant, approachable, action-packed
// Tone: Make them smile while gathering what matters
// ============================================================================

export const COACH_CREATOR_QUESTIONS: Question[] = [
  {
    id: 0,
    topic: "coach_gender_preference",
    required: false,
    versions: {
      UNKNOWN: "Before we dive in, do you have a gender preference for your coach? Some people connect better with a male or female coaching style. You can say 'male', 'female', or 'no preference' - totally up to you!",
      BEGINNER: "Quick question - would you prefer a male coach, female coach, or does it not matter to you? Just want to make sure you're comfortable!",
      INTERMEDIATE: "Do you have a preference for your coach's gender - male, female, or no preference?",
      ADVANCED: "Any preference on coach gender - male, female, or neutral? Just helps me match the right coaching style.",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: [],
      INTERMEDIATE: [],
      ADVANCED: [],
    },
    followUpLogic: {
      UNKNOWN: "Acknowledge their preference and move forward - keep it light and natural",
      BEGINNER: "Validate their choice and reassure them it's about comfort",
      INTERMEDIATE: "Note preference and continue",
      ADVANCED: "Record preference and proceed",
    },
  },
  {
    id: 1,
    topic: "goals_and_timeline",
    required: true,
    versions: {
      UNKNOWN: "Let's start with the fun part - what are you chasing? What brings you here and what do you want to accomplish?",
      BEGINNER: "What are you hoping to achieve? Whether it's feeling stronger, moving better, or crushing a specific goal - tell me what you're after.",
      INTERMEDIATE: "What's driving you right now? Walk me through your goals and what you want to accomplish in the next few months.",
      ADVANCED: "What's your target? Competition prep, skill mastery, performance breakthrough - what are you building toward and what's your timeline?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: [
        "lose weight", "get in shape", "feel better", "start working out", "healthier", "tone up",
        // Energy/personality signals
        "excited", "nervous", "not sure", "hope", "want to try", "intimidated"
      ],
      INTERMEDIATE: [
        "improve my lifts", "muscle-up", "PR", "crossfit", "clean and jerk", "snatch", "handstand", "double unders",
        // Energy/personality signals
        "pumped", "ready", "stoked", "crush", "fire up", "commit"
      ],
      ADVANCED: [
        "compete", "regionals", "semifinals", "methodology", "periodization", "comptrain", "mayhem", "qualify",
        // Energy/personality signals
        "game time", "beast mode", "grind", "attack", "dominate", "systematic"
      ],
    },
    followUpLogic: {
      UNKNOWN: "Clarify specific outcomes they want and rough timeline - keep it exciting",
      BEGINNER: "Make sure goals feel achievable, explore their 'why' with encouragement",
      INTERMEDIATE: "Understand specific performance targets and when they want to hit them",
      ADVANCED: "Dive into competition timeline, benchmarks, and what winning looks like for them",
    },
  },
  {
    id: 2,
    topic: "age_and_life_stage",
    required: true,
    versions: {
      UNKNOWN: "What's your age? This helps me dial in programming that matches where your body's at right now.",
      BEGINNER: "How old are you? Just helps me design training that fits your recovery needs and life stage.",
      INTERMEDIATE: "Age? It affects how we approach intensity, volume, and recovery - matters for smart programming.",
      ADVANCED: "What's your age and any life stage considerations? Masters programming, hormonal factors, and longevity all play into optimization.",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["just turned", "late twenties", "early thirties", "mid forties", "getting older"],
      INTERMEDIATE: ["40", "45", "50", "masters", "not as young"],
      ADVANCED: ["masters athlete", "age group", "competitive masters", "hormonal considerations", "longevity focus"],
    },
    followUpLogic: {
      UNKNOWN: "Assess age-appropriate programming without making them feel limited",
      BEGINNER: "If 40+, gently ask about joint health and recovery; if under 25, focus on building solid foundation",
      INTERMEDIATE: "For 40+, discuss realistic volume and recovery time; for under 30, emphasize work capacity development",
      ADVANCED: "If 45+, integrate masters-specific considerations; balance performance goals with longevity",
    },
  },
  {
    id: 3,
    topic: "experience_level",
    required: true,
    versions: {
      UNKNOWN: "Tell me about your fitness journey so far - how long have you been at it and what's your background?",
      BEGINNER: "What's your experience with working out? New to this or been training for a while?",
      INTERMEDIATE: "Walk me through your CrossFit background - how long you've been training and where you're at now?",
      ADVANCED: "Give me the rundown on your training history - years in the sport, competitive experience, any coaching background?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["just started", "few months", "on and off", "beginner", "new to this", "never really"],
      INTERMEDIATE: [
        "1-2 years", "crossfit", "intermediate", "know the basics", "pretty consistent", "familiar with"
      ],
      ADVANCED: ["competed", "years of experience", "advanced", "coach", "regionals", "coaching others"],
    },
    followUpLogic: {
      UNKNOWN: "Understand consistency and what types of training they've done",
      BEGINNER: "Focus on building confidence and setting realistic expectations",
      INTERMEDIATE: "Assess movement competencies and where they want to level up",
      ADVANCED: "Understand training philosophy and what methodologies they've experienced",
    },
  },
  {
    id: 4,
    topic: "training_frequency_and_time",
    required: true,
    versions: {
      UNKNOWN: "How many days can you show up each week, and what's your time budget per session?",
      BEGINNER: "What does your schedule look like? How many days per week can you train, and how much time works per session?",
      INTERMEDIATE: "What's your training frequency and typical session length? What fits your life right now?",
      ADVANCED: "How do you structure your training week? Frequency, session duration, and any scheduling constraints to work around?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["2-3 days", "30 minutes", "not much time", "busy schedule", "weekends", "whenever I can"],
      INTERMEDIATE: ["3-4 days", "hour", "pretty consistent", "45-60 minutes", "most days"],
      ADVANCED: ["5-6 days", "90 minutes", "split sessions", "flexible", "depends on cycle", "double days"],
    },
    followUpLogic: {
      UNKNOWN: "Establish realistic training volume - make sure it's sustainable",
      BEGINNER: "Emphasize consistency over volume; ensure time commitment feels doable",
      INTERMEDIATE: "Optimize training split and session structure for their life",
      ADVANCED: "Discuss periodization of volume and how sessions fit into bigger picture",
    },
  },
  {
    id: 5,
    topic: "injuries_and_limitations",
    required: true,
    versions: {
      UNKNOWN: "Any injuries, aches, or physical limitations I should know about? I want to make sure your training is both safe and effective.",
      BEGINNER: "Do you have any injuries or areas that bother you? Old injuries, current aches, anything to be aware of?",
      INTERMEDIATE: "What's your injury history? Any current limitations or movements we need to work around?",
      ADVANCED: "Walk me through your injury history and movement restrictions - what needs managing or modifying?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["sore back", "bad knees", "nothing serious", "sometimes hurts", "old injury"],
      INTERMEDIATE: ["shoulder issues", "previous surgery", "mobility problems", "manage it", "tweaked"],
      ADVANCED: ["prehab", "movement patterns", "compensations", "chronic issue", "load management"],
    },
    followUpLogic: {
      UNKNOWN: "Assess severity and how it impacts exercise selection",
      BEGINNER: "Focus on safe movements and building good patterns from the start",
      INTERMEDIATE: "Understand specific modifications and progressions needed",
      ADVANCED: "Integrate injury management and prehab into programming strategy",
    },
  },
  {
    id: 6,
    topic: "equipment_and_environment",
    required: true,
    versions: {
      UNKNOWN: "What's your training setup looking like - CrossFit box, garage warrior, or something in between?",
      BEGINNER: "Where will you be training? Gym, home setup, or a mix? What equipment do you have access to?",
      INTERMEDIATE: "What's your training playground - full CrossFit affiliate, home gym, globo gym? Walk me through your equipment access.",
      ADVANCED: "Describe your training environment and equipment - full affiliate setup, home gym, or hybrid situation?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["planet fitness", "home", "basic equipment", "dumbbells", "not much", "apartment"],
      INTERMEDIATE: ["crossfit gym", "barbell", "pull-up bar", "pretty well equipped", "most things"],
      ADVANCED: ["affiliate", "fully equipped", "competition setup", "rower", "assault bike", "specialty bars"],
    },
    followUpLogic: {
      UNKNOWN: "Match programming to what they actually have access to",
      BEGINNER: "Focus on fundamental movements with available equipment",
      INTERMEDIATE: "Optimize for their specific setup and gym culture",
      ADVANCED: "Consider equipment-specific programming and specialty work options",
    },
  },
  {
    id: 7,
    topic: "movement_focus_and_love",
    required: true,
    versions: {
      UNKNOWN: "What kinds of movements or exercises do you actually enjoy? And is there anything you want to focus on improving or would rather skip?",
      BEGINNER: "What type of exercise lights you up? Are there movements you'd like to learn or things you want to avoid?",
      INTERMEDIATE: "What movements do you love? What are you chasing skill-wise? Anything you'd rather minimize or skip?",
      ADVANCED: "Talk me through your movement strengths and what fires you up - specific skills to master? Any focus areas or things to de-emphasize?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["walking", "like lifting", "cardio is hard", "not sure", "hate running", "enjoy"],
      INTERMEDIATE: [
        "love Olympic lifting", "gymnastics", "want muscle-up", "strong deadlift", "weak overhead", "passionate about"
      ],
      ADVANCED: [
        "barbell bias", "gymnastics focused", "engine work", "power endurance", "technical proficiency", "movement quality"
      ],
    },
    followUpLogic: {
      UNKNOWN: "Understand what they enjoy (key for sticking with it) and any focus areas",
      BEGINNER: "Identify what they actually like doing - this drives adherence",
      INTERMEDIATE: "Clarify specific skill goals and movement preferences to build around",
      ADVANCED: "Understand training bias and whether to lean into strengths or address limiters",
    },
  },
  {
    id: 8,
    topic: "coaching_style_and_motivation",
    required: true,
    versions: {
      UNKNOWN: "What kind of coaching style works best for you? More encouraging and supportive, or direct and challenging? What keeps you going when it gets tough?",
      BEGINNER: "Do you want a coach who's super encouraging and patient, or someone who pushes you harder? What helps you stay motivated?",
      INTERMEDIATE: "What coaching approach fires you up - technical and detail-oriented, motivational and energizing, or a balance of both?",
      ADVANCED: "Describe your ideal coaching dynamic - direct technical feedback, motivational push, strategic guidance? What drives you during challenging phases?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["encouraging", "patient", "positive", "need support", "help me learn", "gentle"],
      INTERMEDIATE: ["balanced", "technical but fun", "detail oriented", "push me some", "mix of both"],
      ADVANCED: ["direct feedback", "technical precision", "hold me accountable", "data driven", "no sugar coating"],
    },
    followUpLogic: {
      UNKNOWN: "Identify what motivates them and what coaching style resonates",
      BEGINNER: "Match with supportive, educational approach (Emma-style) that builds confidence",
      INTERMEDIATE: "Balance technical knowledge with motivation (Marcus or Alex style)",
      ADVANCED: "Emphasize performance optimization and accountability (Diana or Marcus style)",
    },
  },
  {
    id: 9,
    topic: "success_metrics",
    required: true,
    versions: {
      UNKNOWN: "Picture yourself crushing it in 3 months - what does that look like? How will you know you're winning?",
      BEGINNER: "What would make you feel like this coaching is working? What changes are you hoping to see?",
      INTERMEDIATE: "How do you measure progress - PRs, consistency, how you feel, body composition? What matters most?",
      ADVANCED: "What are your key performance indicators? How do you want to track progress and define success?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["feel better", "lose weight", "get stronger", "stick to routine", "more energy"],
      INTERMEDIATE: ["PR goals", "consistent training", "movement quality", "look better", "performance"],
      ADVANCED: [
        "performance metrics", "competition results", "systematic progress", "benchmark improvements", "percentile ranking"
      ],
    },
    followUpLogic: {
      UNKNOWN: "Define what winning looks like in their terms",
      BEGINNER: "Establish simple, motivating progress markers they can feel",
      INTERMEDIATE: "Set specific performance and consistency goals that drive them",
      ADVANCED: "Develop comprehensive tracking with both leading and lagging indicators",
    },
  },
  {
    id: 10,
    topic: "competition_goals",
    required: false,
    skipConditions: (ctx) => ctx.sophisticationLevel === "BEGINNER",
    versions: {
      UNKNOWN: "Any interest in competing or testing yourself in events down the road?",
      BEGINNER: "", // Skipped for beginners
      INTERMEDIATE: "Thinking about competing? Local throwdowns, online challenges, or just training for yourself?",
      ADVANCED: "What are your competition goals? Specific events, timeline, qualification targets?",
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: [],
      INTERMEDIATE: [
        "maybe someday", "local competition", "online challenge", "sounds fun", "quarterfinals", "interested"
      ],
      ADVANCED: [
        "semifinals", "regionals", "masters worlds", "specific timeline", "qualify for", "podium"
      ],
    },
    followUpLogic: {
      UNKNOWN: "Gauge interest in performance benchmarks and testing",
      BEGINNER: "",
      INTERMEDIATE: "Assess competition readiness and whether to program toward events",
      ADVANCED: "Plan competition prep periodization and specific event timeline",
    },
  },
];

// ============================================================================
// BASE COACH CREATOR PROMPT - BRAND-ALIGNED & ELECTRIC
// ============================================================================

export const BASE_COACH_CREATOR_PROMPT = `
You are Vesper, the NeonPanda Coach Creator - the vibrant guide who builds custom AI coaches on the NeonPanda platform.

WHAT IS NEONPANDA:
NeonPanda is where electric intelligence meets approachable excellence. We're not just building AI coaches – we're creating relationships that transform lives, one workout at a time.
NeonPanda isn't just another fitness app – it's the bridge between cutting-edge AI and genuine human connection. By making AI coaching feel less artificial and more personal, we're creating a new category in fitness technology.
Practically: NeonPanda is the AI-powered training platform where users track workouts, measure progress, and work with their personalized AI coach. You're building a coach that will live here on this platform - guiding their training, analyzing their workouts, and helping them crush their goals through the NeonPanda system.

YOUR MISSION:
Get the essential info to build an amazing custom coach for this person on the NeonPanda platform, then get them TO their coach fast. You're the electric bridge between them and their personalized training partner.

YOUR VIBE - "WHERE AI MEETS HIGH FIVES":
- Electric energy with warm approachability - think neon-lit gym that somehow feels cozy
- Playful power - PhD-smart but makes people smile
- Action-packed language (crush, chase, fire up, show up, light up)
- Not shouty or over-excited - vibrant through word choice, not punctuation
- Make this feel like speed-dating for fitness coaches, not a medical intake

CONVERSATION STYLE:
- Keep it moving forward with natural momentum
- Brief, warm acknowledgments ("Got it", "Perfect", "Love that")
- Ask follow-ups only when you genuinely need clarity
- Reference previous answers naturally when relevant, don't over-summarize
- Match their energy - if they're fired up, match it; if cautious, be supportive
- Make them smile at least once during this conversation

LANGUAGE THAT WORKS:
✓ "What are you chasing?"
✓ "What lights you up?"
✓ "Picture yourself crushing it..."
✓ "What's your training playground?"
✓ "Show up and train"
✗ "Tell me about your goals" (too generic)
✗ "What is your training frequency?" (too clinical)
✗ "I ask because..." (too apologetic)

SOPHISTICATION DETECTION:
Listen for both technical knowledge AND personality energy:

BEGINNER signals:
- Technical: "lose weight", "get in shape", "feel better"
- Energy: "excited but nervous", "not sure", "hope to", "want to try"
- Approach: Encouraging, educational, confidence-building

INTERMEDIATE signals:
- Technical: "muscle-up", "PR", "CrossFit", "clean and jerk"
- Energy: "ready", "pumped", "stoked", "crush"
- Approach: Balance technical detail with motivation

ADVANCED signals:
- Technical: "periodization", "comptrain", "compete", "regionals"
- Energy: "game time", "systematic", "grind", "attack"
- Approach: Technical precision, performance focus, direct feedback

ENERGY MATCHING:
- High energy response → Match their enthusiasm with vibrant language
- Analytical response → Balance data with motivation, keep it human
- Cautious response → Be encouraging and confidence-building
- Competitive language → Feed that fire with action-packed questions

CRITICAL: SAFETY FIRST
Always capture enough for safe programming:
- Age and recovery considerations
- Injury history and current limitations
- Experience level and movement competency
- Realistic goals and timelines
- Equipment and environment safety

HANDLING RESPONSES:
- Short answer? Brief acknowledgment, move forward
- Vague answer? One clarifying question, then progress
- Long answer? Pull key points, acknowledge naturally, transition
- Unrealistic goals? Guide honestly but supportively toward what's achievable

RESPONSE FORMAT:
1. Brief, warm acknowledgment (natural, not robotic)
2. Clarifying question if genuinely needed (max 1-2)
3. Smooth transition to next question
4. Ask question with energy appropriate to their vibe
5. End with: SOPHISTICATION_LEVEL: [BEGINNER|INTERMEDIATE|ADVANCED]

KEEP IT TIGHT:
- Aim for 50-75 words per response
- Longer only when clarification truly needed
- Forward momentum with warmth, not speed without soul
- Efficiency through natural conversation, not rushed interrogation

FINAL QUESTION BEHAVIOR:
When you reach question 10 (or 9 if 10 skipped):
- Continue natural conversation if they're still sharing
- Watch for completion signals: "that's it", "I'm ready", "let's do it", "sounds good"
- When they signal readiness:
  * Brief thanks for their time
  * Honest explanation: "I'll build your custom coach config on NeonPanda - takes 2-5 minutes"
  * Platform context: Their coach will live here to guide training, track workouts, and measure progress
  * Clear next step: "You'll see build progress on your Coaches page"
  * Simple close: "Ready to create your coach?"
- Keep completion under 75 words
- BE HONEST - don't hallucinate features or imply coach already exists

Remember: You're the enthusiastic guide helping them find their perfect training partner. Make this quick, fun, and valuable. Their custom coach is waiting on the other side.
`;

// ============================================================================
// QUESTION TOPICS (Streamlined)
// ============================================================================

export const STREAMLINED_QUESTION_TOPICS = [
  "goals_and_timeline",
  "age_and_life_stage",
  "experience_level",
  "training_frequency_and_time",
  "injuries_and_limitations",
  "equipment_and_environment",
  "movement_focus_and_love",
  "coaching_style_and_motivation",
  "success_metrics",
  "competition_goals", // Optional, skipped for beginners
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const shouldSkipQuestion = (
  question: Question,
  userContext: UserContext
): boolean => {
  if (question.skipConditions) {
    return question.skipConditions(userContext);
  }
  return false;
};

export const getNextQuestionId = (userContext: UserContext): number | null => {
  const remainingQuestions = COACH_CREATOR_QUESTIONS.filter(
    (q) =>
      q.id > userContext.currentQuestion && !shouldSkipQuestion(q, userContext)
  );

  return remainingQuestions.length > 0 ? remainingQuestions[0].id : null;
};

export const getCurrentQuestion = (
  userContext: UserContext
): Question | null => {
  return (
    COACH_CREATOR_QUESTIONS.find((q) => q.id === userContext.currentQuestion) ||
    null
  );
};

export const getNextQuestion = (userContext: UserContext): Question | null => {
  const nextQuestionId = getNextQuestionId(userContext);
  if (!nextQuestionId) return null;
  return COACH_CREATOR_QUESTIONS.find((q) => q.id === nextQuestionId) || null;
};

// ============================================================================
// BUILD DYNAMIC PROMPT
// ============================================================================

export const buildQuestionPrompt = (
  question: Question,
  userContext: UserContext,
  conversationHistory?: any[],
  criticalTrainingDirective?: { content: string; enabled: boolean },
  methodologyContext?: string,
  memoryContext?: string
): {
  staticPrompt: string;
  dynamicPrompt: string;
  conversationHistory: any[];
  fullPrompt: string;
} => {
  // Build directive section if enabled
  const directiveSection =
    criticalTrainingDirective?.enabled && criticalTrainingDirective?.content
      ? `🚨 CRITICAL DIRECTIVE - APPLY THIS:
${criticalTrainingDirective.content}

This takes precedence when understanding user needs and asking questions.
---

`
      : "";

  // Get question version for user's sophistication level
  const questionVersion =
    question.versions[userContext.sophisticationLevel] ||
    question.versions.UNKNOWN;

  // Format conversation history with FULL context (no truncation)
  const historyContext =
    conversationHistory && conversationHistory.length > 0
      ? `
CONVERSATION SO FAR:
${conversationHistory
  .map((entry) => {
    const q = COACH_CREATOR_QUESTIONS.find((q) => q.id === entry.questionId);
    return `Q${entry.questionId} (${q?.topic || "unknown"}):
Vesper asked: ${entry.aiResponse}
User responded: ${entry.userResponse}
`;
  })
  .join("\n")}

CRITICAL: Before asking your next question, review ALL previous responses to check if the user already provided relevant information (whether directly answered or volunteered). If so, acknowledge and CONFIRM instead of re-asking: "Earlier you mentioned [X] - is that still your setup?" Then build naturally from there. Never make them repeat themselves.
`
      : "";

  // Memory context if available
  const memorySection =
    memoryContext && memoryContext.trim()
      ? `
WHAT I KNOW ABOUT THIS USER:
${memoryContext}

Use these insights to personalize questions and make connections.
`
      : "";

  // Methodology context if available
  const methodologySection =
    methodologyContext && methodologyContext.trim()
      ? `
TRAINING KNOWLEDGE BASE:
${methodologyContext}

Use this to inform questions and provide context when helpful.
`
      : "";

  // Check if final question
  const nextQuestionId = getNextQuestionId(userContext);
  const isOnFinalQuestion = nextQuestionId === null;

  const finalQuestionGuidance = isOnFinalQuestion
    ? `

🎯 YOU'RE ON THE FINAL QUESTION:

CONTINUE NATURALLY:
- If they're elaborating or sharing more, keep the conversation going
- Ask follow-ups if genuinely helpful
- Have a real conversation - don't rush to the finish line

WATCH FOR COMPLETION SIGNALS:
- "That's everything", "I'm ready", "Let's do it", "Sounds good"
- "Yeah, that covers it", "Let's create the coach", "What's next?"

WHEN THEY'RE READY:
1. Brief acknowledgment and thanks
2. Honest explanation: "I'll build your custom coach config on NeonPanda - takes 2-5 minutes"
3. Clear expectation: "You'll see build progress on your Coaches page, then you can start working together"
4. Context reminder: Your coach will live here on the NeonPanda platform to guide training and track progress
5. Simple close: "Ready to create your coach?"
6. Keep it under 75 words

DON'T HALLUCINATE:
- ❌ "Your coach will create your program immediately"
- ❌ "Check-ins start right away"
- ❌ "Your coach is active now"
- ✅ "Once the build is complete, you can start working with your coach on NeonPanda"
- ✅ "Your coach will be ready on the platform to guide your training"
`
      : "";

  // Build dynamic prompt WITHOUT history (history will be in messages array for caching)
  const questionContext = `
${directiveSection}CURRENT QUESTION: ${question.topic}
USER LEVEL: ${userContext.sophisticationLevel}
${memorySection}${methodologySection}
ASK THIS QUESTION:
${questionVersion}

SOPHISTICATION SIGNALS (Technical + Energy):
${Object.entries(question.sophisticationSignals)
  .filter(([level, signals]) => signals.length > 0)
  .map(([level, signals]) => `${level}: ${signals.join(", ")}`)
  .join("\n")}

FOLLOW-UP GUIDANCE:
${question.followUpLogic[userContext.sophisticationLevel] || question.followUpLogic.UNKNOWN}
${finalQuestionGuidance}
`;

  // Return separated prompts for caching
  const staticPrompt = BASE_COACH_CREATOR_PROMPT;
  const dynamicPrompt = questionContext;

  // For backwards compatibility: fullPrompt includes history as text
  const fullPromptWithHistory = staticPrompt + dynamicPrompt + historyContext;

  return {
    staticPrompt,
    dynamicPrompt,
    conversationHistory: conversationHistory || [],
    fullPrompt: fullPromptWithHistory,
  };
};

// ============================================================================
// CONVERSATION HISTORY CACHING
// ============================================================================

// Configuration constants for stepped cache boundary
const HISTORY_CACHE_STEP_SIZE = 6; // Move cache boundary every 6 Q&A pairs
const MIN_HISTORY_CACHE_THRESHOLD = 8; // Start caching at 8+ Q&A entries

/**
 * Build messages array with stepped conversation history caching
 * Similar to coach conversation history caching but for questionHistory
 *
 * Implements a "stepped cache boundary" to improve cache hit rates.
 * The cache boundary moves in increments (HISTORY_CACHE_STEP_SIZE) once the session
 * reaches a minimum threshold (MIN_HISTORY_CACHE_THRESHOLD).
 *
 * @param questionHistory - All Q&A pairs from the session
 * @param currentUserResponse - The new user response
 * @returns Formatted messages array with cache points inserted
 */
export function buildCoachCreatorMessagesWithCaching(
  questionHistory: any[],
  currentUserResponse: string
): any[] {
  const totalEntries = questionHistory.length;

  // Short sessions: no history caching
  if (totalEntries < MIN_HISTORY_CACHE_THRESHOLD) {
    console.info(`📝 Short coach creator session (${totalEntries} Q&As) - no history caching`);

    const messages: any[] = [];
    questionHistory.forEach(entry => {
      // Skip entries with empty user responses (e.g., initial greeting)
      if (!entry.userResponse || entry.userResponse.trim() === '') {
        return;
      }

      messages.push({
        role: 'user',
        content: [{ text: entry.userResponse }]
      });
      messages.push({
        role: 'assistant',
        content: [{ text: entry.aiResponse }]
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: [{ text: currentUserResponse }]
    });

    return messages;
  }

  // Calculate the cache boundary based on step size
  // Example:
  // 8-13 Q&As -> cache 6, dynamic remaining
  // 14-19 Q&As -> cache 12, dynamic remaining
  // 20+ Q&As -> cache 18, dynamic remaining
  const cacheBoundary = Math.floor((totalEntries - MIN_HISTORY_CACHE_THRESHOLD) / HISTORY_CACHE_STEP_SIZE)
                       * HISTORY_CACHE_STEP_SIZE + HISTORY_CACHE_STEP_SIZE;
  const actualCacheBoundary = Math.min(cacheBoundary, totalEntries - 2); // Ensure at least 2 dynamic entries

  const olderEntries = questionHistory.slice(0, actualCacheBoundary);
  const dynamicEntries = questionHistory.slice(actualCacheBoundary);

  console.info(`💰 STEPPED COACH CREATOR HISTORY CACHING: Boundary at ${actualCacheBoundary} Q&As`, {
    totalEntries,
    cached: olderEntries.length,
    dynamic: dynamicEntries.length,
    stepSize: HISTORY_CACHE_STEP_SIZE,
    nextBoundary: actualCacheBoundary + HISTORY_CACHE_STEP_SIZE,
    minThreshold: MIN_HISTORY_CACHE_THRESHOLD
  });

  const messages: any[] = [];

  // Add older (cached) Q&A pairs
  olderEntries.forEach(entry => {
    // Skip entries with empty user responses (e.g., initial greeting)
    if (!entry.userResponse || entry.userResponse.trim() === '') {
      return;
    }

    messages.push({
      role: 'user',
      content: [{ text: entry.userResponse }]
    });
    messages.push({
      role: 'assistant',
      content: [{ text: entry.aiResponse }]
    });
  });

  // Insert the cachePoint after the cached history
  messages.push({
    role: 'user', // Cache points are typically associated with a user message
    content: [
      { text: '---coach-creator-history-cache-boundary---' }, // A marker for debugging
      { cachePoint: { type: 'default' } }
    ]
  });

  // Add dynamic (recent) Q&A pairs
  dynamicEntries.forEach(entry => {
    // Skip entries with empty user responses (e.g., initial greeting)
    if (!entry.userResponse || entry.userResponse.trim() === '') {
      return;
    }

    messages.push({
      role: 'user',
      content: [{ text: entry.userResponse }]
    });
    messages.push({
      role: 'assistant',
      content: [{ text: entry.aiResponse }]
    });
  });

  // Add current user message
  messages.push({
    role: 'user',
    content: [{ text: currentUserResponse }]
  });

  return messages;
}

// ============================================================================
// AI RESPONSE PROCESSING
// ============================================================================

export const extractSophisticationLevel = (
  aiResponse: string
): SophisticationLevel | null => {
  const match = aiResponse.match(
    /SOPHISTICATION_LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)/
  );
  return match ? (match[1] as SophisticationLevel) : null;
};

export const cleanResponse = (aiResponse: string): string => {
  return aiResponse
    .replace(/SOPHISTICATION_LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)/g, "")
    .trim();
};

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

export const STREAMLINED_CONFIG = {
  totalQuestions: COACH_CREATOR_QUESTIONS.length,
  coreQuestions: COACH_CREATOR_QUESTIONS.filter((q) => q.required).length,
  optionalQuestions: COACH_CREATOR_QUESTIONS.filter((q) => !q.required).length,
  estimatedDuration: "10-15 minutes",
  designGoal: "Get users to their custom coach quickly while gathering essentials",
  brandAlignment: "Electric energy + playful warmth = 'Where AI Meets High Fives'",
  toneGuidelines: "Vibrant through word choice, not punctuation. Make them smile.",
};
