import { queryMemories as queryMemoriesFromDb, saveMemory, updateMemory } from "../../../dynamodb/operations";
import { detectMemoryRequest, createMemory, detectMemoryRetrievalNeed } from "./detection";
import { querySemanticMemories } from '../api-helpers';
import { storeMemoryInPinecone } from '../user/pinecone';
import { UserMemory } from '../user/types';



export interface MemoryRetrievalResult {
  memories: UserMemory[];
}

export interface MemoryDetectionResult {
  memoryFeedback: string | null;
}

/**
 * Helper function to combine and deduplicate memories from different sources
 */
function combineAndDeduplicateMemories(semanticMemories: any[], importantMemories: UserMemory[]): UserMemory[] {
  const memoryMap = new Map<string, UserMemory>();

  // Add semantic memories first (they have priority due to relevance)
  semanticMemories.forEach(memory => {
    memoryMap.set(memory.memoryId, memory);
  });

  // Add important memories if not already included
  importantMemories.forEach(memory => {
    if (!memoryMap.has(memory.memoryId)) {
      memoryMap.set(memory.memoryId, memory);
    }
  });

  return Array.from(memoryMap.values());
}

/**
 * Retrieves existing memories for context using AI-guided approach (BEFORE AI response generation)
 * Simplified for prototype - uses AI detection to determine semantic vs standard retrieval
 */
export async function queryMemories(
  userId: string,
  coachId: string,
  userMessage?: string,
  messageContext?: string
): Promise<MemoryRetrievalResult> {
  let memories: UserMemory[] = [];

  try {
    if (userMessage) {
      // Use AI to determine if semantic memory retrieval is beneficial
      const retrievalDetection = await detectMemoryRetrievalNeed(userMessage, messageContext);

      if (retrievalDetection.needsSemanticRetrieval && retrievalDetection.confidence > 0.6) {
        console.info('🧠 AI detected need for semantic memory retrieval:', {
          confidence: retrievalDetection.confidence,
          contextTypes: retrievalDetection.contextTypes,
          reasoning: retrievalDetection.reasoning
        });

        // Use semantic + importance hybrid approach
        const [semanticMemories, importantMemories] = await Promise.all([
          querySemanticMemories(userId, userMessage, {
            topK: 6,
            contextTypes: retrievalDetection.contextTypes
          }),
          queryMemoriesFromDb(userId, coachId, { limit: 4, importance: 'high' })
        ]);

        memories = combineAndDeduplicateMemories(semanticMemories, importantMemories);

        console.info('Retrieved hybrid memories:', {
          semanticCount: semanticMemories.length,
          importantCount: importantMemories.length,
          finalCount: memories.length
        });
      } else {
        // AI determined semantic retrieval not beneficial - get top important memories only
        console.info('🔄 AI determined semantic retrieval not needed, using importance-based:', {
          confidence: retrievalDetection.confidence,
          reasoning: retrievalDetection.reasoning
        });
        memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });
      }
    } else {
      // No user message provided - use standard importance-based approach
      memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });
    }

    // Update usage statistics for retrieved memories
    if (memories.length > 0) {
      // Don't await these - update in background
      memories.forEach(memory => {
        updateMemory(memory.memoryId, userId).catch((err: any) =>
          console.warn('Failed to update memory usage:', err)
        );
      });
    }

    console.info('Retrieved memories for context:', {
      userId,
      coachId,
      memoryCount: memories.length,
      approach: userMessage ? 'AI-guided' : 'standard'
    });

  } catch (error) {
    console.error('Error retrieving memories:', error);
    throw error; // Simplified - let the error bubble up rather than silent fallback
  }

  return { memories };
}

/**
 * Detects and saves new memory requests (AFTER AI response generation)
 */
export async function detectAndSaveMemories(
  userId: string,
  coachId: string,
  userMessage: string,
  conversationId: string,
  existingMessages: any[]
): Promise<MemoryDetectionResult> {
  let memoryFeedback: string | null = null;
  try {
    const memoryDetectionEvent = {
      userId,
      coachId,
      conversationId,
      userMessage: userMessage,
      messageContext: existingMessages.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')
    };

    const memoryDetection = await detectMemoryRequest(memoryDetectionEvent);

    if (memoryDetection.isMemoryRequest && memoryDetection.confidence > 0.7) {
      const memory = createMemory(memoryDetection, userId, coachId);

      if (memory) {
        // Save to DynamoDB (existing)
        await saveMemory(memory);

        // NEW: Also store in Pinecone for semantic search
        try {
          await storeMemoryInPinecone(memory);
          console.info('Memory stored in both DynamoDB and Pinecone');
        } catch (error) {
          console.warn('Failed to store memory in Pinecone, continuing:', error);
          // Don't fail the conversation for Pinecone errors
        }

        memoryFeedback = `✅ I've remembered that for you: "${memory.content}"`;

        console.info('Memory saved:', {
          memoryId: memory.memoryId,
          userId,
          coachId,
          type: memory.memoryType,
          importance: memory.metadata.importance,
          confidence: memoryDetection.confidence
        });
      }
    } else if (memoryDetection.isMemoryRequest) {
      console.info('Memory request detected but confidence too low:', {
        confidence: memoryDetection.confidence,
        reasoning: memoryDetection.reasoning
      });
    }
  } catch (memoryError) {
    console.error('Error in memory detection/saving:', memoryError);
    // Don't fail the conversation for memory errors
  }

  return { memoryFeedback };
}

