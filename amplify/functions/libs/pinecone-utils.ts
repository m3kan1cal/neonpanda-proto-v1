/**
 * Pinecone utility functions for semantic search and context formatting
 */

import { detectConversationMemoryNeeds } from './coach-conversation';

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
    // Basic methodology terms
    'why', 'approach', 'methodology', 'philosophy', 'strategy',
    'programming', 'periodization', 'training style', 'coaching style',

    // Training systems & approaches
    'linear progression', 'conjugate method', 'westside', '5/3/1', 'starting strength',
    'block periodization', 'undulating', 'dip', 'bulgarian method', 'sheiko',
    'high frequency', 'low frequency', 'volume', 'intensity', 'density',
    'autoregulation', 'rpe', 'rate of perceived exertion', 'rir', 'rep in reserve',
    'max effort', 'dynamic effort', 'repetition method', 'concurrent training',
    'conjugate', 'linear', 'non-linear', 'undulating periodization',

    // Fitness disciplines & specializations
    'crossfit', 'powerlifting', 'olympic lifting', 'weightlifting', 'bodybuilding', 'strongman',
    'calisthenics', 'gymnastics', 'endurance', 'cardio', 'hiit', 'conditioning',
    'functional fitness', 'athletic performance', 'sport specific', 'general fitness',
    'strength training', 'hypertrophy', 'power development', 'speed training',

    // Programming concepts
    'mesocycle', 'microcycle', 'macrocycle', 'phase', 'block', 'cycle',
    'progressive overload', 'adaptation', 'specificity', 'variation',
    'frequency', 'duration', 'load management', 'fatigue management',
    'peak', 'taper', 'deload', 'maintenance', 'offseason', 'preseason',

    // Recovery & lifestyle methodology
    'recovery', 'regeneration', 'sleep', 'stress management', 'hydration',
    'nutrition', 'supplementation', 'lifestyle', 'work-life balance',
    'cut', 'bulk', 'recomp', 'body composition', 'weight management'
  ];

  // Keywords that indicate asking about specific movements or techniques
  const techniqueKeywords = [
    // Basic technique terms
    'technique', 'form', 'movement', 'exercise', 'lift', 'skill',
    'mobility', 'flexibility', 'injury', 'pain', 'recovery',

    // Core movement patterns & exercises
    'squat', 'deadlift', 'bench press', 'overhead press', 'row', 'pull up',
    'clean', 'jerk', 'snatch', 'press', 'chin up', 'dip', 'lunge',
    'hip hinge', 'squat pattern', 'push', 'pull', 'carry', 'loaded carry',
    'unilateral', 'bilateral', 'compound', 'isolation', 'accessory',
    'primary', 'secondary', 'assistance', 'supplemental',

    // Technical execution & cues
    'cue', 'coaching cue', 'setup', 'breathing', 'bracing', 'tension',
    'tempo', 'pause', 'eccentric', 'concentric', 'isometric',
    'range of motion', 'rom', 'depth', 'lockout', 'sticking point',
    'bar path', 'grip', 'stance', 'foot position', 'hand position',
    'neutral spine', 'core stability', 'shoulder position', 'hip position',

    // Movement quality & assessment
    'mobility', 'stability', 'flexibility', 'balance', 'coordination',
    'motor control', 'movement pattern', 'compensation', 'dysfunction',
    'asymmetry', 'imbalance', 'restriction', 'limitation',
    'screen', 'assessment', 'evaluation', 'analysis',

    // Problem-solving & troubleshooting
    'plateau', 'stall', 'regression', 'weakness', 'imbalance', 'compensation',
    'troubleshoot', 'diagnose', 'fix', 'correct', 'adjust', 'modify',
    'alternative', 'substitute', 'variation', 'progression', 'regression',
    'scale', 'adapt', 'accommodate', 'work around',

    // Injury & rehabilitation
    'injury', 'pain', 'hurt', 'sore', 'ache', 'discomfort',
    'rehabilitation', 'rehab', 'prehab', 'prevention', 'recovery',
    'physical therapy', 'pt', 'doctor', 'medical', 'clearance',
    'inflammation', 'swelling', 'acute', 'chronic', 'overuse',

    // Equipment & environment
    'equipment', 'gear', 'barbell', 'dumbbell', 'kettlebell', 'machine',
    'cable', 'resistance band', 'bodyweight', 'home gym', 'commercial gym',
    'platform', 'rack', 'bench', 'safety', 'spotting'
  ];

  // Check if message contains relevant keywords
  const hasRelevantKeywords = [
    ...workoutHistoryKeywords,
    ...methodologyKeywords,
    ...techniqueKeywords
  ].some(keyword => message.includes(keyword));

  // Check if message indicates need for conversation memory/context
  const needsConversationMemory = detectConversationMemoryNeeds(userMessage);

  // Also use Pinecone for longer, more complex questions
  const isComplexQuery = userMessage.length > 50 && userMessage.includes('?');

  return hasRelevantKeywords || needsConversationMemory || isComplexQuery;
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

  const conversationContext = pineconeMatches
    .filter(match => match.recordType === 'conversation_summary')
    .map(match => `- ${match.content} (Score: ${match.score.toFixed(2)})`)
    .join('\n');

  const methodologyContext = pineconeMatches
    .filter(match => match.recordType === 'methodology')
    .map(match => {
      // Extract methodology title and source from metadata if available
      const title = match.metadata?.title || 'Methodology';
      const source = match.metadata?.source || '';
      const discipline = match.metadata?.discipline || '';

      // Truncate content for display (first 200 characters)
      const truncatedContent = match.content.length > 200
        ? match.content.substring(0, 200) + '...'
        : match.content;

      const sourceInfo = source && discipline
        ? ` (${source} - ${discipline})`
        : source ? ` (${source})`
        : discipline ? ` (${discipline})`
        : '';

      return `- **${title}${sourceInfo}**: ${truncatedContent} (Score: ${match.score.toFixed(2)})`;
    })
    .join('\n');

  let contextString = '';

  if (methodologyContext) {
    contextString += `\nRELEVANT METHODOLOGY KNOWLEDGE:\n${methodologyContext}`;
  }

  if (workoutContext) {
    contextString += `\nRELEVANT WORKOUT HISTORY:\n${workoutContext}`;
  }

  if (coachCreatorContext) {
    contextString += `\nCOACH CREATION CONTEXT:\n${coachCreatorContext}`;
  }

  if (conversationContext) {
    contextString += `\nCOACHING RELATIONSHIP MEMORY:\n${conversationContext}`;
  }

  return contextString;
}