/**
 * Pinecone utility functions for semantic search and context formatting
 */

import { callBedrockApi, MODEL_IDS, getPineconeClient } from './api-helpers';
import { MethodologyIntent, EnhancedMethodologyOptions } from './coach-conversation/types';

// Configuration
const PINECONE_QUERY_ENABLED = true;

/**
 * Determine if the user's message would benefit from Pinecone semantic search using AI analysis
 * @param userMessage - The user's message to analyze
 * @param messageContext - Optional context from the conversation
 * @returns Promise<boolean> indicating if Pinecone search should be used
 */
export async function shouldUsePineconeSearch(
  userMessage: string,
  messageContext?: string
): Promise<boolean> {
  if (!PINECONE_QUERY_ENABLED) return false;

  const systemPrompt = `You are an AI assistant that analyzes user messages in fitness coaching conversations to determine if semantic search through stored workout history and methodology content would enhance the coaching response.

TASK: Determine if the user's message would benefit from accessing stored workout history, methodology explanations, or technique guidance through semantic search.

SEMANTIC SEARCH INDICATORS:
- Workout history references ("last time", "previous workouts", "what did I do", "show me my", "when did I")
- Performance tracking & comparison ("progress", "improvement", "better than", "compared to", "PR", "personal record")
- Methodology questions ("why", "approach", "programming", "periodization", "training philosophy", "strategy")
- Training system inquiries ("5/3/1", "conjugate", "linear progression", "block periodization", "RPE")
- Technique & form questions ("squat form", "deadlift technique", "movement pattern", "coaching cues")
- Exercise-specific guidance ("bench press", "overhead press", "clean", "snatch", "pull-ups")
- Problem-solving requests ("plateau", "stall", "fix", "troubleshoot", "alternative", "substitute")
- Injury & rehabilitation ("pain", "hurt", "injury", "rehab", "work around", "modification")
- Equipment & setup questions ("barbell", "dumbbell", "home gym", "equipment", "setup")
- Pattern analysis ("usually", "typically", "pattern", "trend", "habit", "routine")
- Complex questions requiring background knowledge or context
- Requests for explanations that would benefit from stored methodology content

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object:
{
  "shouldUseSemanticSearch": boolean,
  "confidence": number (0.0 to 1.0),
  "searchTypes": ["workout_history", "methodology", "technique", "problem_solving", "equipment"],
  "reasoning": "brief explanation of why semantic search would/wouldn't help"
}

GUIDELINES:
- Consider if accessing stored workout data, methodology content, or technique guidance would improve the response
- Higher confidence for specific exercise names, methodology terms, or historical references
- Complex questions often benefit from semantic search even without obvious keywords
- Be generous - better to include semantic context than miss valuable information`;

  const userPrompt = `${messageContext ? `CONVERSATION CONTEXT:\n${messageContext}\n\n` : ""}USER MESSAGE TO ANALYZE:\n"${userMessage}"

Analyze this message and determine if semantic search would enhance the coaching response.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.NOVA_MICRO
    );
    const result = JSON.parse(response);

    return result.shouldUseSemanticSearch || false;
  } catch (error) {
    console.error("Error in Pinecone search decision:", error);
    // Conservative fallback - use semantic search for complex questions
    const isComplexQuery = userMessage.length > 50 && userMessage.includes('?');
    return isComplexQuery;
  }
}

/**
 * Analyzes user message to determine methodology-related intent using AI
 */
const analyzeMethodologyIntent = async (userMessage: string): Promise<MethodologyIntent> => {
  const analysisPrompt = `
Analyze this user message about fitness methodologies and return a JSON response.

USER MESSAGE: "${userMessage}"

Determine:
1. Is this asking to compare different methodologies?
2. Is this asking about how to implement/program a methodology?
3. Is this asking about the principles/philosophy behind a methodology?
4. What methodology(ies) are mentioned?

Return ONLY valid JSON in this format:
{
  "isComparison": boolean,
  "isImplementationQuestion": boolean,
  "isPrincipleQuestion": boolean,
  "methodologies": ["methodology1", "methodology2"],
  "primaryMethodology": "primary_methodology_mentioned"
}

Examples:
- "Why does CrossFit use constantly varied workouts?" → {"isComparison": false, "isImplementationQuestion": false, "isPrincipleQuestion": true, "methodologies": ["crossfit"], "primaryMethodology": "crossfit"}
- "How do I program Westside conjugate method?" → {"isComparison": false, "isImplementationQuestion": true, "isPrincipleQuestion": false, "methodologies": ["westside"], "primaryMethodology": "westside"}
- "What's better, 5/3/1 or Starting Strength?" → {"isComparison": true, "isImplementationQuestion": false, "isPrincipleQuestion": false, "methodologies": ["5/3/1", "starting_strength"], "primaryMethodology": "5/3/1"}`;

  try {
    const response = await callBedrockApi(analysisPrompt, userMessage, MODEL_IDS.NOVA_MICRO);
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to analyze methodology intent:', error);
    return {
      isComparison: false,
      isImplementationQuestion: false,
      isPrincipleQuestion: false,
      methodologies: [],
      primaryMethodology: null
    };
  }
};

/**
 * Gets enhanced methodology context using AI-based intent analysis
 */
export const getEnhancedMethodologyContext = async (
  userMessage: string,
  userId: string,
  options: EnhancedMethodologyOptions = {}
): Promise<any[]> => {
  const { topK = 6 } = options;

  // Use AI to analyze the user's message intent
  const messageAnalysis = await analyzeMethodologyIntent(userMessage);

  const queries = [userMessage]; // Always include the original query

  // Add targeted queries based on AI analysis
  if (messageAnalysis.isComparison && messageAnalysis.methodologies.length > 1) {
    queries.push(`${messageAnalysis.methodologies.join(' vs ')} comparison benefits drawbacks`);
  }

  if (messageAnalysis.isImplementationQuestion && messageAnalysis.primaryMethodology) {
    queries.push(`${messageAnalysis.primaryMethodology} programming implementation weekly structure`);
  }

  if (messageAnalysis.isPrincipleQuestion && messageAnalysis.primaryMethodology) {
    queries.push(`${messageAnalysis.primaryMethodology} philosophy principles approach`);
  }

    // Get Pinecone client
  const { index } = await getPineconeClient();

  // Run multiple targeted queries and combine results
  const allResults: any[] = [];

  for (const query of queries) {
    try {
      const searchQuery = {
        query: {
          inputs: { text: query },
          topK: Math.ceil(topK / queries.length)
        }
      };

      const response = await index.namespace('methodology').searchRecords(searchQuery);
      const matches = response.result.hits.map((match: any) => ({
        ...match,
        metadata: {
          ...match.metadata,
          record_type: 'methodology',
          query_type: getQueryType(messageAnalysis, query === userMessage)
        }
      }));

      allResults.push(...matches);
    } catch (error) {
      console.error(`Failed to query methodology with: ${query}`, error);
    }
  }

  // Remove duplicates and sort by score
  const uniqueResults = removeDuplicateResults(allResults);
  return uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, topK);
};

/**
 * Determines query type based on AI analysis
 */
const getQueryType = (analysis: MethodologyIntent, isOriginal: boolean): string => {
  if (isOriginal) return 'original';
  if (analysis.isComparison) return 'comparison';
  if (analysis.isImplementationQuestion) return 'implementation';
  if (analysis.isPrincipleQuestion) return 'principles';
  return 'enhanced';
};

/**
 * Removes duplicate results based on title or ID
 */
const removeDuplicateResults = (results: any[]): any[] => {
  const seen = new Set();
  return results.filter(result => {
    const key = result.metadata?.title || result.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Enhanced formatting for methodology context with categorization
 */
export function formatEnhancedMethodologyContext(methodologyMatches: any[]): string {
  if (methodologyMatches.length === 0) return '';

  const contextByType = {
    principles: methodologyMatches.filter(m => m.metadata?.query_type === 'principles'),
    implementation: methodologyMatches.filter(m => m.metadata?.query_type === 'implementation'),
    comparison: methodologyMatches.filter(m => m.metadata?.query_type === 'comparison'),
    general: methodologyMatches.filter(m => !m.metadata?.query_type || m.metadata.query_type === 'original')
  };

  let contextString = '';

  if (contextByType.principles.length > 0) {
    contextString += `\nMETHODOLOGY PRINCIPLES & PHILOSOPHY:\n${contextByType.principles.map(formatMethodologyMatch).join('\n')}`;
  }

  if (contextByType.implementation.length > 0) {
    contextString += `\nPROGRAMMING & IMPLEMENTATION:\n${contextByType.implementation.map(formatMethodologyMatch).join('\n')}`;
  }

  if (contextByType.comparison.length > 0) {
    contextString += `\nMETHODOLOGY COMPARISONS:\n${contextByType.comparison.map(formatMethodologyMatch).join('\n')}`;
  }

  if (contextByType.general.length > 0) {
    contextString += `\nRELEVANT METHODOLOGY KNOWLEDGE:\n${contextByType.general.map(formatMethodologyMatch).join('\n')}`;
  }

  return contextString;
}

/**
 * Formats individual methodology match
 */
const formatMethodologyMatch = (match: any): string => {
  const title = match.metadata?.title || 'Methodology';
  const source = match.metadata?.source || '';
  const discipline = match.metadata?.discipline || '';

  const truncatedContent = match.content.length > 200
    ? match.content.substring(0, 200) + '...'
    : match.content;

  const sourceInfo = source && discipline
    ? ` (${source} - ${discipline})`
    : source ? ` (${source})`
    : discipline ? ` (${discipline})`
    : '';

  return `- **${title}${sourceInfo}**: ${truncatedContent} (Score: ${match.score.toFixed(2)})`;
};

/**
 * Format Pinecone context for inclusion in the system prompt with enhanced methodology formatting
 * @param pineconeMatches - The matches from Pinecone query
 * @returns formatted context string
 */
export function formatPineconeContext(pineconeMatches: any[]): string {
  if (pineconeMatches.length === 0) return '';

  // Separate methodology matches for enhanced formatting
  const methodologyMatches = pineconeMatches.filter(match => match.recordType === 'methodology');
  const otherMatches = pineconeMatches.filter(match => match.recordType !== 'methodology');

  let contextString = '';

  // Use enhanced formatting for methodology context
  if (methodologyMatches.length > 0) {
    contextString += formatEnhancedMethodologyContext(methodologyMatches);
  }

  // Keep existing formatting for other context types
  const workoutContext = otherMatches
    .filter(match => match.recordType === 'workout_summary')
    .map(match => `- ${match.content} (Score: ${match.score.toFixed(2)})`)
    .join('\n');

  const coachCreatorContext = otherMatches
    .filter(match => match.recordType === 'coach_creator_summary')
    .map(match => `- ${match.content} (Score: ${match.score.toFixed(2)})`)
    .join('\n');

  const conversationContext = otherMatches
    .filter(match => match.recordType === 'conversation_summary')
    .map(match => `- ${match.content} (Score: ${match.score.toFixed(2)})`)
    .join('\n');

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