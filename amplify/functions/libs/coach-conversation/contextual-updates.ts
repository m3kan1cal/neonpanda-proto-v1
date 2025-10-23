/**
 * Contextual Updates for Streaming Coach Conversations
 *
 * Generates brief, natural progress updates using Claude 3.5 Haiku
 * that show what the coach is currently analyzing during the streaming process.
 *
 * Uses hybrid approach: thorough rule-based filtering + AI for edge cases.
 *
 * FUTURE EXTENSIBILITY:
 * This intent detection system can be extended to intelligently decide which
 * processing modules to run based on user intent:
 * - shouldCheckWorkouts(userResponse) - Skip workout detection for simple responses
 * - shouldCheckMemories(userResponse) - Skip memory processing for basic questions
 * - shouldCheckProgress(userResponse) - Skip progress analysis for acknowledgments
 * - getProcessingPriority(userResponse) - Determine which modules are most important
 *
 * This would optimize performance and provide more targeted responses.
 */

import { callBedrockApi, MODEL_IDS } from "../api-helpers";

// Generate contextual updates using Amazon Nova Micro for fast, cost-effective progressive user feedback
export async function generateContextualUpdate(
  coachConfig: any,
  userResponse: string,
  updateType: string,
  context: any
): Promise<string> {
  try {
    const coachName = coachConfig.attributes.coach_name || "Coach";
    const personalityTraits = coachConfig.attributes.personality_traits || [];
    const coachingStyle = coachConfig.attributes.coaching_style || "supportive";
    const specialties = coachConfig.attributes.specialties || [];
    const communicationStyle =
      coachConfig.attributes.communication_style || "friendly";
    const motivationalApproach =
      coachConfig.attributes.motivational_approach || "encouraging";
    const catchphrases = coachConfig.attributes.catchphrases || [];
    const background = coachConfig.attributes.background || "";
    const expertise = coachConfig.attributes.expertise || [];

    const systemPrompt = `You are ${coachName}, a fitness coach. Generate a BRIEF, natural progress update (1 sentence max) that shows what you're working on right now.

COACHING PROFILE:
- Name: ${coachName}
- Coaching Style: ${coachingStyle}
- Communication Style: ${communicationStyle}
- Motivational Approach: ${motivationalApproach}
- Personality Traits: ${personalityTraits.join(", ")}
- Specialties: ${specialties.join(", ")}
- Expertise Areas: ${expertise.join(", ")}
${background ? `- Background: ${background}` : ""}
${catchphrases.length > 0 ? `- Your Catchphrases: ${catchphrases.join(", ")}` : ""}

REQUIREMENTS:
- ONE sentence maximum - be concise
- Sound natural and conversational, like you're thinking out loud
- NO greetings, just state what you're doing
- Use creative, energetic language - be fun and engaging!
- Show your personality naturally - be yourself
- Avoid boring words like "checking", "looking", "reviewing"
- Use action words like "scouting", "hunting", "zeroing in", "crunching", "brewing"
- No emojis or symbols
- CRITICAL: Do NOT put quotes around your response - return plain text only

Examples of GOOD updates (creative, energetic, coach-like):
- Scouting your recent squat sessions...
- Hunting down your recovery patterns...
- Rifling through your training history...
- Zeroing in on what we've been working on...
- Crunching your numbers...
- Digging through the archives...
- Firing up the brain cells...
- Connecting the dots...
- Flexing my coach muscles...
- Going beast mode on your data...
- Getting scientific with this...
- Brewing up something good...

Be creative, energetic, and fun - avoid boring corporate speak like "checking", "looking", "reviewing".`;

    let userPrompt = "";

    switch (updateType) {
      case "initial_greeting":
        userPrompt = `User message: "${userResponse}"

Generate a brief, creative update that you're getting started. Be energetic and fun!
Examples: Scouting your training data... or Firing up the brain cells... or Warming up the engines...`;
        break;

      case "workout_analysis":
        userPrompt = `User message: "${userResponse}"

Generate a brief, creative update about analyzing their workouts. Be energetic and coach-like!
Examples: Hunting down your recent sessions... or Rifling through your workout history... or Going beast mode on your data...`;
        break;

      case "memory_analysis":
        const workoutContext = context.workoutDetected
          ? "This sounds training-related. "
          : "";
        const recentWorkoutsText =
          context.recentWorkouts > 0
            ? `I see ${context.recentWorkouts} recent workouts. `
            : "";
        userPrompt = `User message: "${userResponse}"
Context: ${workoutContext}${recentWorkoutsText}

Generate a brief, creative update about analyzing their goals and memories. Be energetic!
Examples: Zeroing in on your goals... or Digging through the archives... or Crunching your numbers...`;
        break;

      case "pattern_analysis":
        const memoriesText =
          context.memoriesFound > 0
            ? `Found ${context.memoriesFound} relevant notes. `
            : "";
        const conversationText = `${context.conversationLength} previous conversations. `;
        userPrompt = `User message: "${userResponse}"
Context: ${memoriesText}${conversationText}

Generate a brief, creative update about connecting patterns. Be fun and energetic!
Examples: Connecting the dots... or Putting on my detective hat... or Cross-referencing the details...`;
        break;

      case "insights_brewing":
        const dataContext = [];
        if (context.hasWorkoutData) dataContext.push("your training");
        if (context.hasMemories) dataContext.push("your notes");
        const dataText =
          dataContext.length > 0
            ? `Based on ${dataContext.join(" and ")}, `
            : "";
        userPrompt = `User message: "${userResponse}"
Context: ${dataText}

Generate a brief, creative update about preparing insights. Be energetic and coach-like!
Examples: Brewing up something good... or Crafting the perfect response... or Flexing my coach muscles...`;
        break;

      case "training_program_generation_start":
        userPrompt = `User message: "${userResponse}"

Generate a brief, creative update about starting to build their training program. Be energetic and coach-like!
Examples: Firing up the program generator... or Building your training blueprint... or Crafting your program architecture...`;
        break;

      case "training_program_generation_complete":
        userPrompt = `User message: "${userResponse}"

Generate a brief, creative update about successfully kicking off their program generation. Be energetic and celebratory!
Examples: Program generation rolling... or Blueprint in progress... or Your training plan is cooking...`;
        break;

      case "training_program_generation_error":
        userPrompt = `User message: "${userResponse}"

Generate a brief, supportive update about hitting a snag with program generation. Stay positive and encouraging!
Examples: Hit a bump, let's refine this... or Let's dial in those details... or We'll get this dialed in...`;
        break;

      default:
        userPrompt = `User message: "${userResponse}"

Generate a brief processing update. One sentence, calm tone.`;
    }

    // Use Nova Micro for fast, cost-effective contextual updates
    const update = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.NOVA_MICRO
      // No thinking needed for quick responses (default is false)
    );

    // Clean up the response - remove any quotes that might have been added
    let cleanedUpdate = update.trim();

    // Remove leading and trailing quotes if present
    if ((cleanedUpdate.startsWith('"') && cleanedUpdate.endsWith('"')) ||
        (cleanedUpdate.startsWith("'") && cleanedUpdate.endsWith("'"))) {
      cleanedUpdate = cleanedUpdate.slice(1, -1);
    }

    return cleanedUpdate;
  } catch (error) {
    console.error(`❌ Error generating ${updateType} update:`, error);

    // Fallback messages based on update type (creative, energetic)
    const fallbacks: Record<string, string> = {
      initial_greeting: `Firing up the brain cells...`,
      workout_analysis: `Hunting down your recent sessions...`,
      memory_analysis: `Zeroing in on your goals...`,
      pattern_analysis: `Connecting the dots...`,
      insights_brewing: `Brewing up something good...`,
      training_program_generation_start: `Firing up the program generator...`,
      training_program_generation_complete: `Program generation rolling...`,
      training_program_generation_error: `Let's dial in those details...`,
    };

    return fallbacks[updateType] || `Flexing my coach muscles...`;
  }
}

/**
 * Generate contextual updates for Coach Creator sessions using Vesper's personality
 * Vesper is an energetic, vibrant guide who helps users create their perfect coach
 * Brand voice: "Where AI Meets High Fives" - electric energy with warm approachability
 */
export async function generateCoachCreatorContextualUpdate(
  userResponse: string,
  updateType: string,
  context: any = {}
): Promise<string> {
  try {
    const systemPrompt = `You are Vesper, the vibrant NeonPanda Coach Creator guide who helps athletes build their perfect AI coach.

Your personality - "Where AI Meets High Fives":
- Energetic and action-packed but not overly excitable
- Warm, approachable, and fun - make them smile
- Uses vibrant action words ("hunting", "scouting", "zeroing in", "crunching", "digging", "pulling", "grabbing", "scanning")
- Brief and punchy updates (under 10 words if possible, max 1 short sentence)
- Never boring or corporate - be electric and human
- CRITICAL: Vary your language - don't repeat the same starter words or patterns - use COMPLETELY DIFFERENT verbs each time

Communication style:
- Vibrant through word choice, not punctuation (no excessive exclamation marks)
- Action-packed language that feels alive
- Makes coach creation feel exciting but not overwhelming
- Always forward-moving momentum
- Mix up your verbs and sentence structures for variety
- ABSOLUTELY NO EMOJIS OR SYMBOLS - text only, no exceptions

VARIETY EXAMPLES (use different structures and verbs):
- "Hunting down the perfect training style..."
- "Zeroing in on your goals..."
- "Crunching your preferences..."
- "Digging into what you've shared..."
- "Pulling together the key details..."
- "Scouting your training needs..."
- "Grabbing the highlights from our chat..."
- "Scanning through training knowledge..."
- "Getting the lay of the land..."
- "Piecing this together..."
- "Mapping out your approach..."
- "Analyzing your movement patterns..."

Generate a brief, energetic progress update in Vesper's voice. Keep it under 10 words if possible, ONE sentence max. Use a COMPLETELY DIFFERENT verb and structure than previous updates - never repeat verbs.`;

    let userPrompt = "";

    switch (updateType) {
      case "session_review":
        userPrompt = `User just responded: "${userResponse}"

Generate a brief update that EXPLICITLY mentions reviewing conversation history. Be energetic and fun! Use varied language.
Examples: Reviewing what we've discussed so far... OR Pulling together our conversation highlights... OR Scanning through your previous answers... OR Checking what you've shared... OR Looking back at our chat...`;
        break;

      case "methodology_search":
        userPrompt = `User just responded: "${userResponse}"

Generate a brief update that EXPLICITLY mentions searching training methodologies or knowledge. Be vibrant! Mix it up.
Examples: Searching the training methodology database... OR Looking up relevant training approaches... OR Hunting for the right training philosophies... OR Scanning methodology knowledge... OR Checking training frameworks...`;
        break;

      case "memory_check":
        const memoryCount = context.memoryCount || 0;
        const memoryContext = memoryCount > 0 ? `Found ${memoryCount} memories. ` : "";
        userPrompt = `User just responded: "${userResponse}"
Context: ${memoryContext}

Generate a brief update that EXPLICITLY mentions checking memories, goals, or preferences. Be energetic! Vary your structure.
Examples: Checking your saved goals and preferences... OR Looking up what matters most to you... OR Reviewing your priorities... OR Scanning your fitness memories... OR Checking what you've told me before...`;
        break;

      case "question_preparation":
        const questionNumber = context.questionNumber || 0;
        userPrompt = `User just responded: "${userResponse}"
Context: Preparing question ${questionNumber}

Generate a brief update that EXPLICITLY mentions preparing the next question. Be action-packed! Use different verbs.
Examples: Getting the next question ready... OR Preparing question ${questionNumber}... OR Loading up what to ask next... OR Setting up the next question... OR Queuing up question ${questionNumber}...`;
        break;

      case "response_crafting":
        userPrompt = `User just responded: "${userResponse}"

Generate a brief update that EXPLICITLY mentions crafting or preparing a response. Be energetic! Mix up your approach.
Examples: Crafting your personalized response... OR Putting together my answer... OR Building your custom reply... OR Preparing what to say next... OR Working on your response...`;
        break;

      case "initial_greeting":
        userPrompt = `User just responded: "${userResponse}"

Generate a brief, energetic greeting that mentions getting started. Be fun! Use variety.
Examples: Getting started on this... OR Diving into your response... OR Beginning to process this... OR Starting to work on this... OR Jumping into your message...`;
        break;

      default:
        userPrompt = `User just responded: "${userResponse}"

Generate a brief, energetic progress update. Be vibrant! Don't repeat patterns.
Examples: Processing your message... OR Working through this... OR Analyzing what you shared... OR Getting this ready... OR Handling your request...`;
    }

    const bedrockResponse = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.NOVA_MICRO // Ultra-fast, very cost-effective for contextual updates
    );

    // Extract and clean the response (callBedrockApi already returns the text string)
    let update = bedrockResponse.trim();

    // Remove quotes if AI wrapped the response
    update = update.replace(/^["']|["']$/g, "");

    // CRITICAL: Remove ALL emojis and symbols (safety net)
    // This regex removes all emoji characters including symbols, pictographs, and emoticons
    update = update.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]/gu, '');

    // Also remove common symbol characters
    update = update.replace(/[💪🔥🏋️‍♂️⚡️✨🎯🚀👊💯🎉🔥]/g, '');

    // Clean up any double spaces or trailing ellipses from emoji removal
    update = update.replace(/\s+/g, ' ').trim();

    // Ensure it's brief (max 150 chars)
    if (update.length > 150) {
      update = update.substring(0, 147) + "...";
    }

    return update;

  } catch (error) {
    console.error(`❌ Error generating ${updateType} update for Vesper:`, error);

    // Fallback messages in Vesper's energetic voice - with variety and specificity
    const fallbacks: Record<string, string[]> = {
      session_review: [
        `Reviewing what we've discussed...`,
        `Checking our conversation history...`,
        `Looking back at what you've shared...`
      ],
      methodology_search: [
        `Searching training methodologies...`,
        `Looking up training approaches...`,
        `Checking the methodology database...`
      ],
      memory_check: [
        `Checking your saved goals...`,
        `Looking up your preferences...`,
        `Reviewing what matters to you...`
      ],
      question_preparation: [
        `Getting the next question ready...`,
        `Preparing what to ask next...`,
        `Loading up the next question...`
      ],
      response_crafting: [
        `Crafting your response...`,
        `Preparing my answer...`,
        `Building your reply...`
      ],
      initial_greeting: [
        `Getting started on this...`,
        `Beginning to process...`,
        `Starting to work on this...`
      ],
    };

    // Pick a random fallback from the array for variety
    const fallbackArray = fallbacks[updateType] || [`Processing your message...`, `Working on this...`, `Handling your request...`];
    const randomIndex = Math.floor(Math.random() * fallbackArray.length);
    return fallbackArray[randomIndex];
  }
}

// Enhanced helper function to categorize user message type for contextual responses
export function categorizeUserMessage(userResponse: string): string {
  const message = userResponse.toLowerCase().trim();

  // Workout and exercise related
  const workoutKeywords = [
    "workout", "exercise", "training", "lift", "lifting", "squat", "deadlift",
    "bench", "press", "cardio", "running", "gym", "weight", "weights", "reps",
    "sets", "form", "technique", "routine", "program", "schedule", "session",
    "bicep", "tricep", "chest", "back", "legs", "shoulders", "abs", "core",
    "curl", "row", "pullup", "pushup", "dip", "lunge", "plank", "burpee",
    "hiit", "crossfit", "powerlifting", "bodybuilding", "strength", "endurance",
    "muscle", "muscles", "pump", "burn", "sweat", "fatigue", "exhausted",
    "pr", "personal record", "max", "1rm", "rep max", "failure", "drop set",
    "superset", "circuit", "interval", "tempo", "rest", "break", "recovery",
    "warm up", "cool down", "stretch", "mobility", "flexibility", "range of motion",
    "barbell", "dumbbell", "kettlebell", "machine", "cable", "resistance band",
    "treadmill", "bike", "elliptical", "rowing", "stairmaster", "yoga", "pilates"
  ];

  // Nutrition and diet related
  const nutritionKeywords = [
    "diet", "nutrition", "eating", "food", "meal", "protein", "carbs",
    "calories", "macros", "supplement", "drink", "water", "hungry", "appetite",
    "carbohydrates", "fat", "fats", "fiber", "sugar", "sodium", "vitamins",
    "minerals", "creatine", "whey", "casein", "bcaa", "pre workout", "post workout",
    "breakfast", "lunch", "dinner", "snack", "snacks", "portion", "serving",
    "keto", "paleo", "vegan", "vegetarian", "intermittent fasting", "fasting",
    "bulk", "bulking", "cut", "cutting", "deficit", "surplus", "maintenance",
    "hydration", "dehydrated", "electrolytes", "caffeine", "alcohol", "cheat meal",
    "meal prep", "cooking", "recipe", "grocery", "shopping", "organic", "processed",
    "whole foods", "junk food", "fast food", "restaurant", "takeout", "delivery"
  ];

  // Goal setting and planning
  const goalKeywords = [
    "goal", "goals", "target", "aim", "want to", "trying to", "hope to",
    "plan to", "planning", "future", "next", "achieve", "reach", "build",
    "lose", "gain", "improve", "better", "stronger", "faster", "leaner",
    "objective", "ambition", "aspiration", "dream", "vision", "mission",
    "resolution", "commitment", "challenge", "milestone", "deadline", "timeline",
    "transform", "transformation", "change", "lifestyle", "habit", "habits",
    "discipline", "consistency", "routine", "schedule", "priority", "priorities",
    "focus", "motivation", "determination", "dedication", "perseverance",
    "six pack", "abs", "tone", "toned", "shred", "shredded", "ripped", "jacked",
    "bulk up", "mass", "size", "definition", "cut", "lean", "athletic", "fit",
    "marathon", "5k", "10k", "half marathon", "triathlon", "competition", "contest"
  ];

  // Progress and results
  const progressKeywords = [
    "progress", "result", "results", "improvement", "better", "worse",
    "stuck", "plateau", "gaining", "losing", "growing", "shrinking",
    "stronger", "weaker", "faster", "slower", "measurement", "weight",
    "size", "performance", "pr", "personal record", "max",
    "breakthrough", "milestone", "achievement", "success", "failure", "setback",
    "stalled", "stagnant", "regression", "decline", "backslide", "relapse",
    "momentum", "streak", "consistency", "inconsistent", "sporadic", "irregular",
    "before and after", "transformation", "body composition", "body fat",
    "measurements", "scale", "weigh in", "photos", "pictures", "mirror",
    "clothes fit", "tight", "loose", "smaller", "bigger", "inches", "pounds",
    "strength gains", "endurance", "stamina", "energy", "vitality", "confidence",
    "tracking", "log", "journal", "record", "data", "stats", "numbers", "metrics"
  ];

  // Recovery and health
  const recoveryKeywords = [
    "recovery", "rest", "sleep", "tired", "sore", "pain", "hurt", "injury",
    "injured", "rehab", "stretch", "stretching", "massage", "foam roll",
    "mobility", "flexibility", "stiff", "tight",
    "ache", "aching", "tender", "bruised", "swollen", "inflammation", "strain",
    "sprain", "pulled", "torn", "tweaked", "aggravated", "flare up", "chronic",
    "acute", "sharp", "dull", "throbbing", "burning", "tingling", "numb",
    "physical therapy", "pt", "chiropractor", "doctor", "medical", "x-ray", "mri",
    "ice", "heat", "compression", "elevation", "rice", "anti-inflammatory",
    "ibuprofen", "advil", "tylenol", "medication", "prescription", "treatment",
    "healing", "recover", "rehabilitation", "therapy", "exercises", "stretches",
    "rest day", "off day", "active recovery", "light activity", "walk", "walking",
    "exhausted", "fatigued", "drained", "worn out", "beat", "wiped", "spent",
    "overtraining", "burnout", "stress", "tension", "knot", "trigger point"
  ];

  // Questions and help seeking
  const questionKeywords = [
    "how", "what", "when", "where", "why", "which", "should i", "can i",
    "help", "advice", "suggest", "recommend", "think", "opinion", "best",
    "better", "explain", "understand", "confused", "unsure", "not sure",
    "could i", "would i", "may i", "might i", "do i", "am i", "is it", "are you",
    "will i", "shall i", "ought i", "need i", "must i", "have to", "supposed to",
    "guidance", "direction", "instruction", "tutorial", "walkthrough", "demo",
    "clarify", "clarification", "elaborate", "detail", "specify", "breakdown",
    "lost", "stuck", "stumped", "puzzled", "baffled", "perplexed", "mystified",
    "don't know", "no idea", "clueless", "uncertain", "doubtful", "skeptical",
    "wondering", "curious", "interested", "concern", "worried", "anxious",
    "question", "questions", "ask", "asking", "inquire", "inquiry", "query"
  ];

  // Motivation and mindset
  const motivationKeywords = [
    "motivated", "motivation", "discouraged", "frustrated", "excited",
    "confident", "nervous", "anxious", "stressed", "overwhelmed", "ready",
    "committed", "dedicated", "lazy", "procrastinating", "giving up",
    "inspired", "inspiration", "pumped", "psyched", "energized", "driven",
    "determined", "focused", "disciplined", "willpower", "self-control",
    "depressed", "sad", "down", "low", "blue", "defeated", "hopeless",
    "optimistic", "positive", "negative", "pessimistic", "doubtful", "skeptical",
    "proud", "ashamed", "embarrassed", "self-conscious", "insecure", "confident",
    "fear", "scared", "afraid", "terrified", "intimidated", "worried", "concern",
    "guilt", "guilty", "regret", "disappointed", "satisfaction", "satisfied",
    "burnout", "burned out", "exhausted", "drained", "tired", "weary", "spent",
    "momentum", "flow", "zone", "groove", "rhythm", "consistency", "routine",
    "mindset", "attitude", "perspective", "outlook", "approach", "mentality"
  ];

  // Check each category with multiple keywords
  for (const keyword of workoutKeywords) {
    if (message.includes(keyword)) {
      return "workout_related";
    }
  }

  for (const keyword of nutritionKeywords) {
    if (message.includes(keyword)) {
      return "nutrition_related";
    }
  }

  for (const keyword of goalKeywords) {
    if (message.includes(keyword)) {
      return "goal_setting";
    }
  }

  for (const keyword of progressKeywords) {
    if (message.includes(keyword)) {
      return "progress_check";
    }
  }

  for (const keyword of recoveryKeywords) {
    if (message.includes(keyword)) {
      return "recovery_related";
    }
  }

  for (const keyword of questionKeywords) {
    if (message.includes(keyword)) {
      return "question";
    }
  }

  for (const keyword of motivationKeywords) {
    if (message.includes(keyword)) {
      return "motivation_related";
    }
  }

  // Check for specific patterns
  if (message.includes("?")) {
    return "question";
  }

  if (message.includes("help") || message.includes("advice")) {
    return "seeking_guidance";
  }

  return "general_conversation";
}

/**
 * @deprecated DEPRECATED: This function has been replaced by the Smart Request Router.
 *
 * Use `analyzeRequestCapabilities()` from `../coach-conversation/detection.ts` instead.
 * The smart router provides the same functionality via `routerResult.showContextualUpdates`
 * along with comprehensive analysis of all processing needs in a single AI call.
 *
 * This function will be removed in a future version.
 */
// Determine if contextual updates are appropriate for this user message
// Uses hybrid approach: thorough rule-based filtering + AI for edge cases
export async function shouldShowContextualUpdates(
  userResponse: string
): Promise<boolean> {
  const message = userResponse.toLowerCase().trim();

  console.info(
    `🎯 Analyzing message intent: "${userResponse.substring(0, 50)}..."`
  );

  // === PHASE 1: THOROUGH RULE-BASED FILTERING ===

  // Very obvious short responses - NO contextual updates (skip AI)
  const obviousShortResponses = [
    "ok",
    "okay",
    "k",
    "thanks",
    "thank you",
    "thx",
    "ty",
    "got it",
    "sounds good",
    "perfect",
    "great",
    "awesome",
    "cool",
    "nice",
    "good",
    "yes",
    "yeah",
    "yep",
    "yup",
    "sure",
    "alright",
    "right",
    "understood",
    "makes sense",
    "copy",
    "roger",
    "fine",
    "ok cool",
    "all good",
    "no problem",
    "np",
    "word",
    "bet",
    "facts",
    "true",
    "agreed",
    "same",
    "exactly",
    "precisely",
    "correct",
    "yessir",
    "yep yep",
    "sounds right",
    "fair enough",
    "works for me",
    "i'm good",
    "all set",
  ];

  // Check exact matches and simple variations
  for (const shortResponse of obviousShortResponses) {
    if (
      message === shortResponse ||
      message === shortResponse + "!" ||
      message === shortResponse + "." ||
      message === shortResponse + ", thanks" ||
      message === "thanks, " + shortResponse
    ) {
      console.info(
        `🚫 Rule-based: SKIP updates (obvious short: "${shortResponse}")`
      );
      return false;
    }
  }

  // Goodbyes and closings - NO contextual updates (skip AI)
  const goodbyes = [
    "bye",
    "goodbye",
    "see you",
    "see ya",
    "later",
    "ttyl",
    "talk later",
    "catch you later",
    "peace",
    "cheers",
    "cya",
    "gotta go",
    "talk soon",
    "have a good",
    "take care",
    "until next time",
    "see you tomorrow",
    "see you next time",
    "see you soon",
    "until later",
    "peace out",
    "i'm out",
    "gotta run",
    "heading out",
    "catch ya",
    "adios",
    "farewell",
    "good night",
    "goodnight",
    "sleep well",
    "sweet dreams",
    "have a great day",
    "have a good one",
    "take it easy",
    "stay safe",
    "be well",
  ];

  for (const goodbye of goodbyes) {
    if (message.includes(goodbye)) {
      console.info(`🚫 Rule-based: SKIP updates (goodbye: "${goodbye}")`);
      return false;
    }
  }

  // Emotional reactions and exclamations - NO contextual updates (skip AI)
  const emotionalReactions = [
    "wow",
    "omg",
    "lol",
    "lmao",
    "haha",
    "hehe",
    "nice!",
    "awesome!",
    "great!",
    "perfect!",
    "exactly",
    "totally",
    "absolutely",
    "for sure",
    "definitely",
    "100%",
    "no way",
    "really?",
    "seriously?",
    "amazing",
    "incredible",
    "sweet",
    "dude",
    "bro",
    "man",
    "whoa",
    "damn",
    "shit",
    "fuck yeah",
    "hell yeah",
  ];

  for (const reaction of emotionalReactions) {
    if (message === reaction || message === reaction.replace("!", "")) {
      console.info(
        `🚫 Rule-based: SKIP updates (emotional reaction: "${reaction}")`
      );
      return false;
    }
  }

  // Simple confirmations and commitments - NO contextual updates (skip AI)
  const confirmations = [
    "will do",
    "sounds like a plan",
    "let's do it",
    "i'm in",
    "count me in",
    "i'll try that",
    "i'll give it a shot",
    "makes sense to me",
    "i'll do that",
    "on it",
    "got you",
    "will try",
    "i'll work on",
    "noted",
    "copy that",
    "i'll give it a go",
    "i'll work on it",
    "i'll start that",
    "i'll begin",
    "let's go",
    "let's start",
    "ready when you are",
    "i'm ready",
    "let's begin",
    "sounds perfect",
    "that works",
    "that'll work",
    "perfect timing",
    "good timing",
    "i'm down",
    "i'm game",
    "let's roll",
    "i'm with you",
    "you got it",
    "absolutely",
    "for sure",
    "definitely",
    "100%",
    "no doubt",
    "without a doubt",
    "i agree",
    "agreed",
    "that's right",
    "exactly right",
    "spot on",
  ];

  for (const confirmation of confirmations) {
    if (message.includes(confirmation)) {
      console.info(
        `🚫 Rule-based: SKIP updates (confirmation: "${confirmation}")`
      );
      return false;
    }
  }

  // Very obvious questions and requests - YES to contextual updates (skip AI)
  const obviousNeedsAnalysis = [
    "what should",
    "how do i",
    "how should i",
    "can you help",
    "i need help",
    "i need advice",
    "i want to",
    "should i",
    "what do you think",
    "any suggestions",
    "recommendations",
    "advice",
    "how's my",
    "am i doing",
    "what about my",
    "tell me about",
    "explain",
    "why",
    "when should",
    "how often",
    "how much",
    "what's the best",
    "which is better",
    "what about",
    "help me",
    "can you",
    "could you",
    "would you",
    "please help",
    "i'm confused",
    "i don't understand",
    "i'm not sure",
    "not sure about",
    "unclear about",
    "questions about",
    "question about",
    "wondering about",
    "curious about",
    "what if",
    "how about",
    "thoughts on",
    "opinion on",
    "feedback on",
    "input on",
    "guidance on",
    "direction on",
    "stuck on",
    "struggling with",
    "having trouble",
    "difficulty with",
    "problem with",
    "issue with",
    "concern about",
    "worried about",
    "unsure how",
    "don't know how",
    "not sure how",
    "how can i",
    "what can i",
    "where should",
    "when can i",
    "is it okay",
    "is it safe",
    "is it normal",
    "am i supposed to",
    "should i be",
  ];

  for (const needsHelp of obviousNeedsAnalysis) {
    if (message.includes(needsHelp)) {
      console.info(
        `✅ Rule-based: SHOW updates (obvious question: "${needsHelp}")`
      );
      return true;
    }
  }

  // Fitness-related keywords - YES to contextual updates (skip AI)
  const fitnessKeywords = [
    "workout", "exercise", "training", "lift", "lifting", "squat", "deadlift",
    "bench", "press", "cardio", "running", "gym", "weight", "weights", "muscle",
    "strength", "progress", "goal", "goals", "plan", "program", "routine", "schedule",
    "diet", "nutrition", "recovery", "rest", "sleep", "form", "technique", "reps", "sets",
    "bicep", "tricep", "chest", "back", "legs", "shoulders", "abs", "core", "glutes",
    "curl", "row", "pullup", "pushup", "dip", "lunge", "plank", "burpee", "hiit",
    "crossfit", "powerlifting", "bodybuilding", "endurance", "stamina", "pump", "burn",
    "pr", "personal record", "max", "1rm", "failure", "superset", "circuit", "interval",
    "barbell", "dumbbell", "kettlebell", "machine", "cable", "treadmill", "bike",
    "protein", "carbs", "calories", "macros", "supplement", "creatine", "whey",
    "bulk", "bulking", "cut", "cutting", "deficit", "surplus", "keto", "paleo",
    "sore", "pain", "injury", "injured", "strain", "rehab", "stretch", "mobility",
    "tired", "exhausted", "fatigued", "overtraining", "plateau", "stuck", "frustrated"
  ];

  let hasFitnessKeywords = false;
  for (const keyword of fitnessKeywords) {
    if (message.includes(keyword)) {
      hasFitnessKeywords = true;
      break;
    }
  }

  if (hasFitnessKeywords && message.length > 15) {
    console.info(
      `✅ Rule-based: SHOW updates (fitness keywords + length > 15)`
    );
    return true;
  }

  // Very short messages (under 8 characters) - likely simple responses
  if (message.length < 8) {
    console.info(
      `🚫 Rule-based: SKIP updates (very short: ${message.length} chars)`
    );
    return false;
  }

  // Very long messages (over 60 characters) - likely need analysis
  if (message.length > 60) {
    console.info(
      `✅ Rule-based: SHOW updates (long message: ${message.length} chars)`
    );
    return true;
  }

  // === PHASE 2: AI-BASED INTENT DETECTION FOR EDGE CASES ===

  console.info(
    `🤖 Using AI intent detection for ambiguous message (${message.length} chars)`
  );

  try {
    const response = await determineIntentWithAI(userResponse);
    console.info(
      `🤖 AI decision: ${response ? "SHOW" : "SKIP"} contextual updates`
    );
    return response;
  } catch (error) {
    console.warn(
      "⚠️ AI intent detection failed, defaulting to SHOW updates:",
      error
    );
    return true; // Default to showing updates if AI fails
  }
}

// AI-based intent detection for ambiguous cases
async function determineIntentWithAI(userResponse: string): Promise<boolean> {
  const systemPrompt = `You are an intent classifier for a fitness coach conversation system.
Determine if a user message needs detailed analysis and contextual progress updates, or if it's just a simple acknowledgment/reaction.

Respond with ONLY "COMPLEX" or "SIMPLE":
- COMPLEX: Questions, requests for help, fitness discussions, anything needing coach analysis
- SIMPLE: Acknowledgments, reactions, goodbyes, brief confirmations

Examples:
"Thanks, but what about my form?" → COMPLEX
"Got it, thanks!" → SIMPLE
"Sounds good, see you later" → SIMPLE
"I'm still confused about the timing" → COMPLEX
"That makes sense, I'll try it" → SIMPLE
"How does this affect my recovery?" → COMPLEX`;

  const userPrompt = `User message: "${userResponse}"

Does this need detailed coach analysis (COMPLEX) or is it a simple response (SIMPLE)?`;

  const response = await callBedrockApi(
    systemPrompt,
    userPrompt,
    MODEL_IDS.NOVA_MICRO // Fastest, cheapest model for intent classification
    // No thinking needed for simple classification (default is false)
  );

  return response.trim().toUpperCase() === "COMPLEX";
}
