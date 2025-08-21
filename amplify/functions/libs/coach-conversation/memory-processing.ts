import { queryMemories as queryMemoriesFromDb, saveMemory, updateMemory } from "../../../dynamodb/operations";
import { detectMemoryRequest, createMemory } from "./detection";
import { UserMemory } from '../user/types';



export interface MemoryRetrievalResult {
  memories: UserMemory[];
}

export interface MemoryDetectionResult {
  memoryFeedback: string | null;
}

/**
 * Retrieves existing memories for context (BEFORE AI response generation)
 */
export async function queryMemories(
  userId: string,
  coachId: string
): Promise<MemoryRetrievalResult> {
  let memories: UserMemory[] = [];
  try {
    memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });

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
      memoryCount: memories.length
    });
  } catch (memoryRetrievalError) {
    console.error('Error retrieving memories:', memoryRetrievalError);
    // Continue without memories
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
        await saveMemory(memory);
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

