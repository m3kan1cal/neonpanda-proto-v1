import { queryUserMemories, saveUserMemory, updateUserMemory } from "../../../dynamodb/operations";
import { detectUserMemoryRequest, createUserMemory } from "./detection";
import { UserMemory } from "./types";

export interface MemoryProcessingResult {
  userMemories: UserMemory[];
  memoryFeedback: string | null;
}

/**
 * Retrieves existing memories and detects/saves new memory requests
 */
export async function processUserMemories(
  userId: string,
  coachId: string,
  userMessage: string,
  conversationId: string,
  existingMessages: any[]
): Promise<MemoryProcessingResult> {
  // Retrieve user memories for context (BEFORE prompt generation)
  let userMemories: UserMemory[] = [];
  try {
    userMemories = await queryUserMemories(userId, coachId, { limit: 10 });

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

  // Detect and handle memory requests
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

  return {
    userMemories,
    memoryFeedback
  };
}