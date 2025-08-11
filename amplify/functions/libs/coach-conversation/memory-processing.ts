import { queryUserMemories as queryUserMemoriesFromDb, saveUserMemory, updateUserMemory } from "../../../dynamodb/operations";
import { detectUserMemoryRequest, createUserMemory } from "./detection";
import { UserMemory } from '../user/types';



export interface MemoryRetrievalResult {
  userMemories: UserMemory[];
}

export interface MemoryDetectionResult {
  memoryFeedback: string | null;
}

/**
 * Retrieves existing user memories for context (BEFORE AI response generation)
 */
export async function queryUserMemories(
  userId: string,
  coachId: string
): Promise<MemoryRetrievalResult> {
  let userMemories: UserMemory[] = [];
  try {
    userMemories = await queryUserMemoriesFromDb(userId, coachId, { limit: 10 });

    // Update usage statistics for retrieved memories
    if (userMemories.length > 0) {
      // Don't await these - update in background
      userMemories.forEach(memory => {
        updateUserMemory(memory.memoryId, userId).catch((err: any) =>
          console.warn('Failed to update memory usage:', err)
        );
      });
    }

    console.info('Retrieved user memories for context:', {
      userId,
      coachId,
      memoryCount: userMemories.length
    });
  } catch (memoryRetrievalError) {
    console.error('Error retrieving user memories:', memoryRetrievalError);
    // Continue without memories
  }

  return { userMemories };
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

    const memoryDetection = await detectUserMemoryRequest(memoryDetectionEvent);

    if (memoryDetection.isMemoryRequest && memoryDetection.confidence > 0.7) {
      const userMemory = createUserMemory(memoryDetection, userId, coachId);

      if (userMemory) {
        await saveUserMemory(userMemory);
        memoryFeedback = `✅ I've remembered that for you: "${userMemory.content}"`;

        console.info('User memory saved:', {
          memoryId: userMemory.memoryId,
          userId,
          coachId,
          type: userMemory.memoryType,
          importance: userMemory.metadata.importance,
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

