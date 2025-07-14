/**
 * Coach Conversation Detection
 *
 * This module contains detection logic for coach conversation events and triggers,
 * including complexity detection for conversation summarization.
 */

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