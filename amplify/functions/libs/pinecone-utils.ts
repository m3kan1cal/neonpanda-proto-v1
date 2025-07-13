/**
 * Pinecone utility functions for semantic search and context formatting
 */

// Configuration
const PINECONE_QUERY_ENABLED = true;

/**
 * Determine if the user's message would benefit from Pinecone semantic search
 * @param userMessage - The user's message to analyze
 * @returns boolean indicating if Pinecone search should be used
 */
export function shouldUsePineconeSearch(userMessage: string): boolean {
  if (!PINECONE_QUERY_ENABLED) return false;

  const message = userMessage.toLowerCase();

    // Keywords that indicate the user is asking about past workouts or patterns
  const workoutHistoryKeywords = [
    // Time-based references
    'last time', 'last week', 'last month', 'last year', 'yesterday', 'recently',
    'earlier', 'ago', 'back', 'since', 'until', 'during', 'while',
    'this week', 'this month', 'today', 'few days ago', 'couple days ago',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',

    // Past tense indicators
    'before', 'previous', 'history', 'pattern', 'trend', 'past', 'already',
    'used to', 'have been', 'was doing', 'did', 'done', 'finished',
    'completed', 'attempted', 'tried', 'worked on', 'performed',
    'achieved', 'reached', 'hit', 'made', 'got', 'went',

    // Performance tracking & comparison
    'improvement', 'progress', 'compare', 'similar', 'when did',
    'how often', 'frequency', 'consistently', 'struggle', 'challenge',
    'strength', 'weakness', 'pr', 'personal record', 'best', 'worst',
    'better', 'worse', 'faster', 'slower', 'heavier', 'lighter',
    'stronger', 'weaker', 'improved', 'declined', 'increased', 'decreased',

    // Workout query patterns
    'what workouts', 'which workouts', 'workouts i did', 'workouts i have done',
    'show me', 'tell me about', 'remind me', 'recap', 'summary',
    'logged', 'recorded', 'tracked', 'entered', 'documented',

    // Reflection & analysis keywords
    'remember', 'recall', 'think back', 'look back', 'reflect',
    'analyze', 'review', 'check', 'see', 'find', 'search',
    'how was', 'how did', 'what was', 'where was', 'when was',

    // Conditional/hypothetical past references
    'if i', 'when i', 'after i', 'once i', 'whenever i',
    'every time', 'each time', 'usually', 'typically', 'normally',

    // Habit/routine indicators
    'routine', 'schedule', 'regular', 'usual', 'habit', 'pattern',
    'cycle', 'sequence', 'order', 'rotation', 'plan',

    // Emotional/subjective past references
    'felt', 'feeling', 'thought', 'seemed', 'appeared', 'looked',
    'sore', 'tired', 'energized', 'motivated', 'struggled', 'enjoyed',

    // Negation patterns (often indicate past experience)
    'never', 'not', 'didnt', "didn't", 'havent', "haven't", 'wasnt', "wasn't",
    'couldnt', "couldn't", 'wouldnt', "wouldn't", 'shouldnt', "shouldn't"
  ];

  // Keywords that indicate asking about methodology or coaching approach
  const methodologyKeywords = [
    'why', 'approach', 'methodology', 'philosophy', 'strategy',
    'programming', 'periodization', 'training style', 'coaching style'
  ];

  // Keywords that indicate asking about specific movements or techniques
  const techniqueKeywords = [
    'technique', 'form', 'movement', 'exercise', 'lift', 'skill',
    'mobility', 'flexibility', 'injury', 'pain', 'recovery'
  ];

  // Check if message contains relevant keywords
  const hasRelevantKeywords = [
    ...workoutHistoryKeywords,
    ...methodologyKeywords,
    ...techniqueKeywords
  ].some(keyword => message.includes(keyword));

  // Also use Pinecone for longer, more complex questions
  const isComplexQuery = userMessage.length > 50 && userMessage.includes('?');

  return hasRelevantKeywords || isComplexQuery;
}

/**
 * Format Pinecone context for inclusion in the system prompt
 * @param pineconeMatches - The matches from Pinecone query
 * @returns formatted context string
 */
export function formatPineconeContext(pineconeMatches: any[]): string {
  if (pineconeMatches.length === 0) return '';

  const workoutContext = pineconeMatches
    .filter(match => match.recordType === 'workout_summary')
    .map(match => `- ${match.content} (Score: ${match.score.toFixed(2)})`)
    .join('\n');

  const coachCreatorContext = pineconeMatches
    .filter(match => match.recordType === 'coach_creator_summary')
    .map(match => `- ${match.content} (Score: ${match.score.toFixed(2)})`)
    .join('\n');

  let contextString = '';

  if (workoutContext) {
    contextString += `\nRELEVANT WORKOUT HISTORY:\n${workoutContext}`;
  }

  if (coachCreatorContext) {
    contextString += `\nCOACH CREATION CONTEXT:\n${coachCreatorContext}`;
  }

  return contextString;
}