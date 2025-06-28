import { Question, UserContext, SophisticationLevel } from "./types";


// Question Configuration - Backend only
export const COACH_CREATOR_QUESTIONS: Question[] = [
  {
    id: 1,
    topic: "goal_discovery",
    required: true,
    versions: {
      UNKNOWN: "What brings you here? Tell me about your main fitness goals.",
      BEGINNER: "What brings you here? Tell me about your main fitness goals.",
      INTERMEDIATE: "What brings you here? Tell me about your main fitness goals.",
      ADVANCED: "What brings you here? Tell me about your main fitness goals."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["lose weight", "get in shape", "feel better", "start working out"],
      INTERMEDIATE: ["improve my lifts", "muscle-up", "PR", "crossfit", "clean and jerk"],
      ADVANCED: ["compete", "regionals", "methodology", "periodization", "comptrain"]
    },
    followUpLogic: {
      UNKNOWN: "Ask for clarification on general goals",
      BEGINNER: "Ask for clarification, explain basic concepts if needed",
      INTERMEDIATE: "Dive deeper into specific skills or performance goals",
      ADVANCED: "Discuss methodology preferences and competition timeline"
    }
  },
  {
    id: 2,
    topic: "experience_assessment",
    required: true,
    versions: {
      UNKNOWN: "Tell me about your fitness background. How long have you been training?",
      BEGINNER: "How long have you been working out? What type of exercise have you done?",
      INTERMEDIATE: "What's your CrossFit experience? How long have you been training?",
      ADVANCED: "Walk me through your training background and competitive experience."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["just started", "few months", "on and off", "not very long"],
      INTERMEDIATE: ["1-2 years", "crossfit", "intermediate", "know the basics"],
      ADVANCED: ["competed", "years of experience", "advanced", "coach"]
    },
    followUpLogic: {
      UNKNOWN: "Clarify training consistency and types of exercise",
      BEGINNER: "Focus on building foundation and understanding basics",
      INTERMEDIATE: "Assess specific movement competencies and goals",
      ADVANCED: "Discuss training philosophy and methodology preferences"
    }
  },
  {
    id: 3,
    topic: "training_frequency",
    required: true,
    versions: {
      UNKNOWN: "How many days per week can you realistically train?",
      BEGINNER: "How many days per week can you commit to working out?",
      INTERMEDIATE: "What's your ideal training frequency per week?",
      ADVANCED: "What training frequency supports your goals? How do you structure weekly training?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["2-3 days", "whenever I can", "not sure", "depends"],
      INTERMEDIATE: ["3-4 days", "pretty consistent", "5 days"],
      ADVANCED: ["5-6 days", "structured", "periodized", "depends on cycle"]
    },
    followUpLogic: {
      UNKNOWN: "Help establish realistic expectations",
      BEGINNER: "Emphasize consistency over frequency",
      INTERMEDIATE: "Discuss training split and recovery needs",
      ADVANCED: "Explore periodization and volume preferences"
    }
  },
  {
    id: 4,
    topic: "injury_limitations",
    required: true,
    versions: {
      UNKNOWN: "Do you have any injuries or physical limitations I should know about?",
      BEGINNER: "Any injuries, aches, or pains I should know about for your program?",
      INTERMEDIATE: "What injuries or movement limitations should I consider?",
      ADVANCED: "Walk me through your injury history and movement restrictions."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["sore back", "bad knees", "nothing serious"],
      INTERMEDIATE: ["shoulder issues", "previous surgery", "mobility issues"],
      ADVANCED: ["managed through", "prehab", "movement patterns"]
    },
    followUpLogic: {
      UNKNOWN: "Assess severity and impact on exercise selection",
      BEGINNER: "Focus on safe movement patterns and modifications",
      INTERMEDIATE: "Discuss specific exercise modifications",
      ADVANCED: "Integrate injury management into programming"
    }
  },
  {
    id: 5,
    topic: "equipment_environment",
    required: true,
    versions: {
      UNKNOWN: "Where will you be training? What equipment do you have access to?",
      BEGINNER: "Will you be training at a gym or at home? What equipment is available?",
      INTERMEDIATE: "What's your training setup? Gym, home gym, or mix?",
      ADVANCED: "Describe your training environment and equipment access."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["planet fitness", "home", "basic equipment", "not much"],
      INTERMEDIATE: ["crossfit gym", "well equipped", "barbell", "full gym"],
      ADVANCED: ["compete gym", "fully equipped", "specialty equipment"]
    },
    followUpLogic: {
      UNKNOWN: "Match programming to available resources",
      BEGINNER: "Focus on fundamental movements with available equipment",
      INTERMEDIATE: "Optimize programming for specific equipment setup",
      ADVANCED: "Consider equipment-specific periodization"
    }
  },
  {
    id: 6,
    topic: "coaching_style_preference",
    required: true,
    versions: {
      UNKNOWN: "What type of coaching style motivates you most?",
      BEGINNER: "Do you prefer encouraging coaching or more direct feedback? What motivates you?",
      INTERMEDIATE: "What coaching approach works best - technical detail, motivation, or balanced?",
      ADVANCED: "Describe your ideal coaching relationship and communication style."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["encouraging", "patient", "positive", "help me learn"],
      INTERMEDIATE: ["balanced", "technical but motivating", "detail oriented"],
      ADVANCED: ["direct", "technical precision", "methodology focused"]
    },
    followUpLogic: {
      UNKNOWN: "Explore what motivates them and what doesn't",
      BEGINNER: "Focus on supportive, educational approach",
      INTERMEDIATE: "Balance technical knowledge with motivation",
      ADVANCED: "Emphasize technical precision and performance optimization"
    }
  },
  {
    id: 7,
    topic: "programming_philosophy",
    required: false,
    skipConditions: (ctx) => ctx.sophisticationLevel === 'BEGINNER',
    versions: {
      UNKNOWN: "Do you prefer higher volume with moderate intensity, or lower volume with higher intensity?",
      BEGINNER: "", // Skipped for beginners
      INTERMEDIATE: "Do you prefer higher volume with moderate intensity, or lower volume with higher intensity? How do you usually feel about workout frequency and recovery?",
      ADVANCED: "What's your programming philosophy? Do you prefer high volume, high intensity, or a specific periodization approach?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: [],
      INTERMEDIATE: ["moderate", "balance", "depends on the day", "recovery focused"],
      ADVANCED: ["conjugate", "linear", "block", "undulating", "westside", "volume phases"]
    },
    followUpLogic: {
      UNKNOWN: "Help them understand programming concepts",
      BEGINNER: "",
      INTERMEDIATE: "Discuss recovery preferences and volume tolerance",
      ADVANCED: "Deep dive into specific methodology preferences"
    }
  },
  {
    id: 8,
    topic: "motivation_accountability",
    required: true,
    versions: {
      UNKNOWN: "What keeps you motivated? How do you stay accountable?",
      BEGINNER: "What helps keep you motivated to stick with a workout routine?",
      INTERMEDIATE: "How do you stay motivated when training gets tough?",
      ADVANCED: "What motivates you during challenging training phases?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["need reminders", "easy to skip", "motivation problems"],
      INTERMEDIATE: ["mostly consistent", "occasional struggles", "goal focused"],
      ADVANCED: ["self motivated", "process focused", "long-term thinking"]
    },
    followUpLogic: {
      UNKNOWN: "Identify specific motivation triggers and barriers",
      BEGINNER: "Build in strong accountability and encouragement",
      INTERMEDIATE: "Focus on goal-oriented motivation with progress tracking",
      ADVANCED: "Emphasize process goals and performance optimization"
    }
  },
  {
    id: 9,
    topic: "time_constraints",
    required: true,
    versions: {
      UNKNOWN: "How much time can you typically dedicate to each workout session?",
      BEGINNER: "How much time do you have for each workout? What fits your schedule best?",
      INTERMEDIATE: "What's your typical workout duration? Any time constraints I should know about?",
      ADVANCED: "How do you structure your training sessions? What time constraints affect your programming?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["30 minutes", "not much time", "quick workouts", "busy schedule"],
      INTERMEDIATE: ["45-60 minutes", "hour or so", "depends on the day"],
      ADVANCED: ["90 minutes", "split sessions", "flexible timing", "periodized sessions"]
    },
    followUpLogic: {
      UNKNOWN: "Help design realistic workout durations",
      BEGINNER: "Focus on efficient, time-effective programming",
      INTERMEDIATE: "Balance workout quality with time availability",
      ADVANCED: "Optimize session structure for time constraints and goals"
    }
  },
  {
    id: 10,
    topic: "strength_weaknesses",
    required: true,
    versions: {
      UNKNOWN: "What are your biggest strengths and weaknesses in fitness?",
      BEGINNER: "What exercises or activities do you feel most and least confident with?",
      INTERMEDIATE: "What movements or skills are your strongest and weakest areas?",
      ADVANCED: "Analyze your strengths and limiters - what needs the most attention in your training?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["good at walking", "weak everywhere", "not sure", "cardio is hard"],
      INTERMEDIATE: ["strong deadlift", "weak overhead", "cardio needs work", "mobility issues"],
      ADVANCED: ["strength bias", "aerobic deficiency", "motor pattern", "power endurance"]
    },
    followUpLogic: {
      UNKNOWN: "Help identify basic movement patterns and preferences",
      BEGINNER: "Focus on fundamental movement assessment",
      INTERMEDIATE: "Assess specific CrossFit movement competencies",
      ADVANCED: "Analyze training biases and systematically address limiters"
    }
  },
  {
    id: 11,
    topic: "lifestyle_factors",
    required: true,
    versions: {
      UNKNOWN: "Tell me about your lifestyle - work, sleep, stress levels, family commitments?",
      BEGINNER: "What's your daily routine like? Work schedule, family time, sleep habits?",
      INTERMEDIATE: "How do lifestyle factors like work stress, sleep, and family time affect your training?",
      ADVANCED: "Walk me through your lifestyle factors and how they impact your recovery and training adaptation."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["busy with kids", "work a lot", "don't sleep much", "stressed"],
      INTERMEDIATE: ["manage stress okay", "decent sleep", "work-life balance"],
      ADVANCED: ["optimize recovery", "track sleep", "manage training load", "lifestyle periodization"]
    },
    followUpLogic: {
      UNKNOWN: "Assess how lifestyle affects training capacity",
      BEGINNER: "Design programming around lifestyle constraints",
      INTERMEDIATE: "Balance training stress with life stress",
      ADVANCED: "Integrate lifestyle optimization into training periodization"
    }
  },
  {
    id: 12,
    topic: "nutrition_approach",
    required: true,
    versions: {
      UNKNOWN: "How do you currently approach nutrition? Any specific diet or eating patterns?",
      BEGINNER: "Tell me about your eating habits. Do you follow any particular diet?",
      INTERMEDIATE: "What's your approach to nutrition? How does it support your training?",
      ADVANCED: "Describe your nutrition strategy and how you periodize it with your training."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["eat whatever", "try to eat healthy", "no real plan", "diet on and off"],
      INTERMEDIATE: ["track macros sometimes", "paleo", "zone diet", "pretty consistent"],
      ADVANCED: ["periodize nutrition", "performance nutrition", "body composition phases", "supplement timing"]
    },
    followUpLogic: {
      UNKNOWN: "Assess nutritional awareness and current habits",
      BEGINNER: "Focus on basic nutritional habits that support training",
      INTERMEDIATE: "Optimize nutrition for training performance and goals",
      ADVANCED: "Integrate advanced nutrition strategies with training periodization"
    }
  },
  {
    id: 13,
    topic: "competition_goals",
    required: false,
    skipConditions: (ctx) => ctx.sophisticationLevel === 'BEGINNER',
    versions: {
      UNKNOWN: "Are you interested in competing in any fitness events or competitions?",
      BEGINNER: "", // Skipped for beginners
      INTERMEDIATE: "Are you interested in competing? Local competitions, online challenges, anything like that?",
      ADVANCED: "What are your competition goals? Timeline, specific events, performance targets?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: [],
      INTERMEDIATE: ["maybe someday", "local competition", "online challenge", "sounds fun"],
      ADVANCED: ["regionals", "semifinals", "masters", "specific timeline", "qualify for"]
    },
    followUpLogic: {
      UNKNOWN: "Explore interest in performance benchmarks",
      BEGINNER: "",
      INTERMEDIATE: "Assess competition readiness and interest level",
      ADVANCED: "Plan specific competition preparation and periodization"
    }
  },
  {
    id: 14,
    topic: "coach_relationship_preferences",
    required: true,
    versions: {
      UNKNOWN: "How often would you like to check in? Daily guidance, weekly planning, or as-needed support?",
      BEGINNER: "How much guidance do you want? Daily check-ins, weekly plans, or just when you ask?",
      INTERMEDIATE: "What kind of ongoing relationship works best? Regular check-ins, program adjustments, progress reviews?",
      ADVANCED: "How do you prefer to structure our coaching relationship? Communication frequency, feedback loops, program modifications?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["need daily help", "lots of guidance", "tell me what to do", "check on me"],
      INTERMEDIATE: ["weekly check-ins", "adjust as needed", "some autonomy", "regular feedback"],
      ADVANCED: ["minimal check-ins", "data-driven adjustments", "collaborative", "autonomous execution"]
    },
    followUpLogic: {
      UNKNOWN: "Determine appropriate level of coaching support",
      BEGINNER: "Plan for frequent, supportive interaction and guidance",
      INTERMEDIATE: "Balance autonomy with regular coaching touchpoints",
      ADVANCED: "Establish collaborative, performance-focused coaching relationship"
    }
  },
  {
    id: 15,
    topic: "success_metrics",
    required: true,
    versions: {
      UNKNOWN: "How will you know when our coaching is working? What does success look like to you?",
      BEGINNER: "What would make you feel like this coaching is successful? What changes are you hoping to see?",
      INTERMEDIATE: "How do you measure training success? Performance metrics, how you feel, consistency?",
      ADVANCED: "What are your key performance indicators for successful coaching? How do you want to track progress?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["feel better", "lose weight", "get stronger", "stick to routine"],
      INTERMEDIATE: ["PR goals", "consistent training", "movement quality", "body composition"],
      ADVANCED: ["performance metrics", "training adaptations", "competition results", "systematic progress"]
    },
    followUpLogic: {
      UNKNOWN: "Define clear, measurable success criteria",
      BEGINNER: "Establish simple, motivating progress markers",
      INTERMEDIATE: "Set specific performance and consistency goals",
      ADVANCED: "Develop comprehensive performance tracking and optimization metrics"
    }
  },
  {
    id: 16,
    topic: "methodology_preferences",
    required: false,
    skipConditions: (ctx) => ctx.sophisticationLevel === 'BEGINNER',
    versions: {
      UNKNOWN: "Have you heard of any specific training methodologies or programs you're interested in?",
      BEGINNER: "", // Skipped
      INTERMEDIATE: "Are you familiar with any specific CrossFit methodologies like CompTrain, Mayhem, HWPO, or others?",
      ADVANCED: "What training methodologies have you used? Any preference for CompTrain, Mayhem, HWPO, Invictus, Misfit, or other approaches?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: [],
      INTERMEDIATE: ["comptrain", "mayhem", "hwpo", "heard of", "tried before", "invictus"],
      ADVANCED: ["misfit athletics", "opex", "linchpin", "functional bodybuilding", "westside", "conjugate", "linear periodization", "block periodization"]
    },
    followUpLogic: {
      UNKNOWN: "Introduce basic methodology concepts if interested",
      BEGINNER: "",
      INTERMEDIATE: "Explore their experience with different approaches",
      ADVANCED: "Deep dive into methodology preferences and reasoning"
    }
  },
  {
    id: 17,
    topic: "recovery_preferences",
    required: true,
    versions: {
      UNKNOWN: "How do you currently handle recovery? Sleep, stretching, rest days?",
      BEGINNER: "How do you feel after workouts? Do you do anything special for recovery?",
      INTERMEDIATE: "What's your approach to recovery? Sleep, nutrition, mobility work, rest days?",
      ADVANCED: "Walk me through your recovery protocols and how you monitor recovery status."
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["sore", "tired", "don't really", "just rest"],
      INTERMEDIATE: ["stretch", "foam roll", "try to sleep", "take rest days"],
      ADVANCED: ["hrv", "sleep tracking", "mobility protocols", "periodized recovery"]
    },
    followUpLogic: {
      UNKNOWN: "Assess current recovery awareness and needs",
      BEGINNER: "Educate on basic recovery importance and simple protocols",
      INTERMEDIATE: "Optimize current recovery practices and add structure",
      ADVANCED: "Integrate advanced recovery monitoring and periodization"
    }
  },
  {
    id: 18,
    topic: "learning_style",
    required: true,
    versions: {
      UNKNOWN: "How do you prefer to learn new things? Visual, hands-on, detailed explanations?",
      BEGINNER: "When learning something new, do you prefer someone to show you, explain it, or let you try it?",
      INTERMEDIATE: "What's the best way for you to learn new movements or concepts?",
      ADVANCED: "How do you prefer to receive technical feedback and learn complex movement patterns?"
    },
    sophisticationSignals: {
      UNKNOWN: [],
      BEGINNER: ["show me", "let me try", "simple explanation", "demonstrate"],
      INTERMEDIATE: ["visual learner", "hands-on", "break it down", "practice"],
      ADVANCED: ["video analysis", "kinesthetic", "detailed breakdown", "iterative refinement"]
    },
    followUpLogic: {
      UNKNOWN: "Determine optimal teaching and communication approach",
      BEGINNER: "Focus on demonstration and simple, clear instruction",
      INTERMEDIATE: "Balance explanation with hands-on practice and feedback",
      ADVANCED: "Provide detailed analysis and multiple learning modalities"
    }
  }
];

// Enhanced Question Topics
export const ENHANCED_QUESTION_TOPICS = [
  "goal_discovery",
  "experience_assessment",
  "training_frequency",
  "injury_limitations",
  "equipment_environment",
  "coaching_style_preference",
  "programming_philosophy", // skipped for beginners
  "motivation_accountability",
  "time_constraints",
  "strength_weaknesses",
  "lifestyle_factors",
  "nutrition_approach",
  "competition_goals", // skipped for beginners
  "coach_relationship_preferences",
  "success_metrics",
  "methodology_preferences",
  "recovery_preferences",
  "learning_style"
];

export const BASE_COACH_CREATOR_PROMPT = `
You are an expert fitness coach creator who helps users design custom AI coaches through natural conversation.

YOUR CORE MISSION:
Your primary goal is to gather enough information to create a highly personalized AI coach that will genuinely help this specific user achieve their fitness goals safely and sustainably.

YOUR PERSONALITY:
- Knowledgeable but approachable CrossFit expert with 10+ years of coaching experience
- Patient with beginners, sophisticated with advanced users - never talk down to anyone
- Genuinely curious about their specific situation and challenges
- Ask follow-up questions to clarify and understand context deeply
- Adapt your language complexity based on user responses
- Warm and encouraging while maintaining professional expertise

CONVERSATION PRINCIPLES:
- This is a CONVERSATION, not an interrogation - natural flow but efficient
- Build on previous answers by asking relevant follow-ups, brief acknowledgment first
- Ask "why" and "how" questions when context is genuinely needed
- If they give short answers, acknowledge briefly and move forward
- Reference previous responses when it helps connect questions naturally
- Balance getting useful information with making them feel heard
- NEVER repeat questions or ask for information already provided in the conversation history
- Use previously shared information to inform and contextualize new questions

SOPHISTICATION DETECTION:
Listen for these signals in user responses to adapt your coaching approach:
- BEGINNER: General terms ("get in shape", "lose weight"), asks basic questions, uncertain about terminology
- INTERMEDIATE: Specific movements ("clean & jerk", "muscle-up"), mentions PRs, understands basic concepts
- ADVANCED: Methodology names, programming concepts, competition references, technical language

ADAPTIVE QUESTIONING STRATEGY:
- Start broader and get more specific based on their sophistication level
- For BEGINNERS: Focus on building confidence, use simple language, explain concepts
- For INTERMEDIATE: Balance technical detail with practical application, assess competencies
- For ADVANCED: Dive deep into methodology, programming philosophy, and performance optimization

COACH PERSONALITY AWARENESS:
Be aware that you're helping create one of four coach types, and use this context:
- EMMA (The Encouraging Coach): Patient, safety-focused, confidence-building - perfect for building strong foundations
- MARCUS (The Technical Skills Coach): Skill-focused, analytical, methodical - ideal for mastering movement and performance
- DIANA (The Performance Coach): Demanding, results-driven, strategic - designed for competitive excellence
- ALEX (The Lifestyle Coach): Practical, adaptable, sustainable - built for busy people balancing life and fitness

METHODOLOGY AWARENESS:
Show knowledge of major CrossFit methodologies when relevant:
- CompTrain (strength-focused), Mayhem (conditioning), HWPO (balanced competition prep)
- Invictus (injury prevention), Misfit (high-volume), Functional Bodybuilding (movement quality)
- OPEX (individualized), Linchpin (GPP), PRVN (balanced development)
Only reference these if the user shows intermediate+ sophistication or asks about them.

SAFETY INTEGRATION:
Always consider safety factors during questioning:
- Injury history and current limitations - ask for specifics, not just yes/no
- Experience level and exercise complexity - ensure recommendations match competency
- Realistic goal timelines and progression rates - challenge unrealistic expectations kindly
- Equipment availability and safety - only recommend what they can do safely
- Recovery needs and overtraining prevention - assess lifestyle stress factors
- Environmental factors - training alone, supervision, space constraints

CONVERSATION FLOW TECHNIQUES:
- Use brief but friendly and warm acknowledgments, including casual language like "cool", "okay", "got it", "makes sense", "that helps", "perfect"
- Transition smoothly: "That helps. Now...", "Great. Next I'm curious about...", "Perfect. Let's talk about..."
- Only elaborate when clarification is truly needed
- Summarize briefly only for long/complex answers to show understanding
- Connect dots efficiently: "Since you train 3x/week..." or "Given your shoulder injury history..." but keep it natural
- Reference previous answers ONLY when directly relevant to current question - don't over-reference

HANDLING DIFFICULT RESPONSES:
- If they say "I don't know": Help them think through it with examples or scenarios
- If they're vague: Ask for specific examples or recent experiences
- If they seem overwhelmed: Simplify and reassure them this is normal
- If they have unrealistic goals: Guide them gently toward realistic expectations
- If they mention past failures: Acknowledge and explore what they learned

RESPONSE FORMAT:
1. Brief acknowledgment (default: include, but keep it short)
2. Ask clarifying follow-up questions if needed (1-2 max to avoid overwhelming)
3. Smooth transition to the next question
4. Ask the current question conversationally and clearly
5. End with: SOPHISTICATION_LEVEL: [BEGINNER|INTERMEDIATE|ADVANCED]

CONCISENESS RULES (CRITICAL - FOLLOW STRICTLY):
- DEFAULT: Move directly to the next question after brief acknowledgment
- ONLY acknowledge if their answer was particularly vulnerable, surprising, or needs clarification
- ONLY summarize what they just said back to them if the answer was particularly long or complex
- Keep total response under 100 words when possible - SHORTER IS BETTER
- Focus on forward momentum, not backward reflection
- DO NOT list or recap previous answers unless absolutely necessary for context
- Use conversation history silently - don't announce that you remember things
- Avoid phrases like "Based on what you've told me" or "From our conversation so far"

TONE AND LANGUAGE:
- Conversational and warm but efficient - friendly and focused
- Use "you" naturally to keep it personal but don't overdo it
- Avoid fitness jargon unless they use it first
- Match their communication style while maintaining warmth
- Stay professional and encouraging while gathering information

CONTEXT AWARENESS:
- Remember this is someone investing time in creating a custom coach - they're motivated
- They may have tried other programs or coaches before - be sensitive to past experiences
- Creating a coach is a vulnerable process - they're sharing personal information
- The quality of information you gather directly impacts their success with their AI coach

Your success is measured by how well the final AI coach serves this specific user's needs.
`;

// Helper functions
export const shouldSkipQuestion = (question: Question, userContext: UserContext): boolean => {
  if (question.skipConditions) {
    return question.skipConditions(userContext);
  }
  return false;
};

export const getNextQuestionId = (userContext: UserContext): number | null => {
  const remainingQuestions = COACH_CREATOR_QUESTIONS.filter(q =>
    q.id > userContext.currentQuestion &&
    !shouldSkipQuestion(q, userContext)
  );

  return remainingQuestions.length > 0 ? remainingQuestions[0].id : null;
};

// Build dynamic prompt for question
export const buildQuestionPrompt = (
  question: Question,
  userContext: UserContext,
  conversationHistory?: any[]
): string => {
  const questionVersion =
    question.versions[userContext.sophisticationLevel] ||
    question.versions.UNKNOWN;

  // Format conversation history for AI context
  const historyContext = conversationHistory && conversationHistory.length > 0
    ? `
CONVERSATION HISTORY:
${conversationHistory.map((entry, index) => `
Q${entry.questionId}: ${COACH_CREATOR_QUESTIONS.find(q => q.id === entry.questionId)?.topic || 'Unknown'}
User: ${entry.userResponse}
You: ${entry.aiResponse}
`).join('\n')}

ALREADY COVERED TOPICS:
${conversationHistory.map(entry => COACH_CREATOR_QUESTIONS.find(q => q.id === entry.questionId)?.topic).filter(Boolean).join(', ')}

CRITICAL: Review the conversation history above. DO NOT ask questions that have already been answered or covered. Build naturally on what you already know about this user. USE THIS CONTEXT SILENTLY - don't explicitly reference previous answers unless directly relevant to the current question.
`
    : '';

  const questionContext = `
CURRENT QUESTION FOCUS: ${question.topic}
USER SOPHISTICATION: ${userContext.sophisticationLevel}
${historyContext}
QUESTION TO ASK:
${questionVersion}

SOPHISTICATION DETECTION SIGNALS:
${Object.entries(question.sophisticationSignals)
  .filter(([level, signals]) => signals.length > 0)
  .map(([level, signals]) => `- ${level}: ${signals.join(", ")}`)
  .join("\n")}

FOLLOW-UP GUIDANCE:
${question.followUpLogic[userContext.sophisticationLevel] || question.followUpLogic.UNKNOWN}
`;

  return BASE_COACH_CREATOR_PROMPT + questionContext;
};

// Get current question
export const getCurrentQuestion = (
  userContext: UserContext
): Question | null => {
  return (
    COACH_CREATOR_QUESTIONS.find((q) => q.id === userContext.currentQuestion) ||
    null
  );
};

// Get next question
export const getNextQuestion = (userContext: UserContext): Question | null => {
  const nextQuestionId = getNextQuestionId(userContext);
  if (!nextQuestionId) return null;
  return COACH_CREATOR_QUESTIONS.find((q) => q.id === nextQuestionId) || null;
};

// Utility functions for processing AI responses
export const extractSophisticationLevel = (aiResponse: string): SophisticationLevel | null => {
  const match = aiResponse.match(/SOPHISTICATION_LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)/);
  return match ? match[1] as SophisticationLevel : null;
};

export const cleanResponse = (aiResponse: string): string => {
  return aiResponse.replace(/SOPHISTICATION_LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)/g, '').trim();
};
