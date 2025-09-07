import {
  queryMemories as queryMemoriesFromDb,
  saveMemory,
  updateMemory,
} from "../../../dynamodb/operations";
import { querySemanticMemories } from "../api-helpers";
import { storeMemoryInPinecone } from "../user/pinecone";
import {
  UserMemory,
  detectMemoryRequest,
  detectMemoryRetrievalNeed,
  generateMemoryId,
  detectMemoryCharacteristics,
} from "../memory";
import { parseSlashCommand } from "../workout/detection";

export interface MemoryRetrievalResult {
  memories: UserMemory[];
}

// Legacy interfaces - keeping for backward compatibility if needed elsewhere
export interface MemoryDetectionResult {
  memoryFeedback: string | null;
}

export interface MemoryProcessingResult {
  isMemoryProcessing: boolean;
  memoryContent: string;
  slashCommand: any;
  isSlashCommandMemory: boolean;
  isNaturalLanguageMemory: boolean;
  memoryFeedback: string | null;
}

/**
 * Supported memory slash commands
 */
export const MEMORY_SLASH_COMMANDS = ["save-memory"] as const;

/**
 * Checks if a slash command is a memory command
 */
export const isMemorySlashCommand = (slashCommandResult: any): boolean => {
  return (
    slashCommandResult.isSlashCommand &&
    slashCommandResult.command !== undefined &&
    MEMORY_SLASH_COMMANDS.includes(slashCommandResult.command as any)
  );
};

/**
 * Helper function to combine and deduplicate memories from different sources
 */
function combineAndDeduplicateMemories(
  semanticMemories: any[],
  importantMemories: UserMemory[]
): UserMemory[] {
  const memoryMap = new Map<string, UserMemory>();

  // Add semantic memories first (they have priority due to relevance)
  semanticMemories.forEach((memory) => {
    memoryMap.set(memory.memoryId, memory);
  });

  // Add important memories if not already included
  importantMemories.forEach((memory) => {
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
      const retrievalDetection = await detectMemoryRetrievalNeed(
        userMessage,
        messageContext
      );

      if (
        retrievalDetection.needsSemanticRetrieval &&
        retrievalDetection.confidence > 0.6
      ) {
        console.info("🧠 AI detected need for semantic memory retrieval:", {
          confidence: retrievalDetection.confidence,
          contextTypes: retrievalDetection.contextTypes,
          reasoning: retrievalDetection.reasoning,
        });

        // Use semantic + importance hybrid approach
        const [semanticMemories, importantMemories] = await Promise.all([
          querySemanticMemories(userId, userMessage, {
            topK: 10,
            contextTypes: retrievalDetection.contextTypes,
          }),
          queryMemoriesFromDb(userId, coachId, {
            limit: 4,
            importance: "high",
          }),
        ]);

        memories = combineAndDeduplicateMemories(
          semanticMemories,
          importantMemories
        );

        console.info("Retrieved hybrid memories:", {
          semanticCount: semanticMemories.length,
          importantCount: importantMemories.length,
          finalCount: memories.length,
        });
      } else {
        // AI determined semantic retrieval not beneficial - get top important memories only
        console.info(
          "🔄 AI determined semantic retrieval not needed, using importance-based:",
          {
            confidence: retrievalDetection.confidence,
            reasoning: retrievalDetection.reasoning,
          }
        );
        memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });
      }
    } else {
      // No user message provided - use standard importance-based approach
      memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });
    }

    // Update usage statistics for retrieved memories
    if (memories.length > 0) {
      // Don't await these - update in background
      memories.forEach((memory) => {
        updateMemory(memory.memoryId, userId).catch((err: any) =>
          console.warn("Failed to update memory usage:", err)
        );
      });
    }

    console.info("Retrieved memories for context:", {
      userId,
      coachId,
      memoryCount: memories.length,
      approach: userMessage ? "AI-guided" : "standard",
    });
  } catch (error) {
    console.error("Error retrieving memories:", error);
    throw error; // Simplified - let the error bubble up rather than silent fallback
  }

  return { memories };
}

/**
 * Unified memory processing function (natural language detection AND slash commands)
 * Follows the same pattern as detectAndProcessWorkout
 */
export async function detectAndProcessMemory(
  userMessage: string,
  userId: string,
  coachId: string,
  conversationId: string,
  existingMessages: any[],
  coachName?: string
): Promise<MemoryProcessingResult> {
  // Check for memory processing (natural language OR slash commands)
  let slashCommand,
    isSlashCommandMemory,
    isNaturalLanguageMemory,
    isMemoryProcessing;

  try {
    slashCommand = parseSlashCommand(userMessage);
    isSlashCommandMemory = isMemorySlashCommand(slashCommand);

    // Only check natural language detection if it's not a slash command
    isNaturalLanguageMemory = false;
    if (!slashCommand.isSlashCommand) {
      const memoryDetectionEvent = {
        userId,
        coachId,
        conversationId,
        userMessage: userMessage,
        messageContext: existingMessages
          .slice(-3)
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n"),
      };
      const memoryDetection = await detectMemoryRequest(memoryDetectionEvent);
      isNaturalLanguageMemory =
        memoryDetection.isMemoryRequest && memoryDetection.confidence > 0.7;
    }

    isMemoryProcessing = isSlashCommandMemory || isNaturalLanguageMemory;
  } catch (error) {
    console.error("❌ Error during memory detection:", error);
    slashCommand = { isSlashCommand: false };
    isSlashCommandMemory = false;
    isNaturalLanguageMemory = false;
    isMemoryProcessing = false;
  }

  let memoryContent = userMessage; // Default to full user response
  let memoryFeedback: string | null = null;

  if (isMemoryProcessing) {
    console.info("🧠 MEMORY PROCESSING DETECTED:", {
      userId,
      coachId,
      conversationId,
      userMessage: userMessage,
      detectionType: isSlashCommandMemory
        ? "slash_command"
        : "natural_language",
      slashCommand: isSlashCommandMemory ? slashCommand.command : null,
      timestamp: new Date().toISOString(),
    });

    // For slash commands, use just the content after the command
    if (isSlashCommandMemory && slashCommand.content) {
      memoryContent = slashCommand.content;
    }

    // Process the memory (unified logic for both types, just like workouts)
    try {
      let memory: UserMemory | null = null;

      if (isSlashCommandMemory) {
        // For slash commands, create memory directly with AI scope detection
        if (!memoryContent || memoryContent.trim().length === 0) {
          memoryFeedback =
            "❌ Please provide content to save as a memory. Example: /save-memory I prefer morning workouts";
        } else {
          // Use AI to determine memory characteristics (combined analysis)
          const memoryCharacteristics = await detectMemoryCharacteristics(
            memoryContent.trim(),
            coachName
          );

          console.info("🎯 Slash command memory characteristics detected:", {
            content:
              memoryContent.trim().substring(0, 50) +
              (memoryContent.length > 50 ? "..." : ""),
            type: memoryCharacteristics.type,
            importance: memoryCharacteristics.importance,
            isCoachSpecific: memoryCharacteristics.isCoachSpecific,
            confidence: memoryCharacteristics.confidence,
          });

          memory = {
            memoryId: generateMemoryId(),
            userId,
            coachId: memoryCharacteristics.isCoachSpecific ? coachId : undefined, // AI determines scope
            memoryType: memoryCharacteristics.type, // AI-determined type
            content: memoryContent.trim(),
            metadata: {
              importance: memoryCharacteristics.importance, // AI-determined importance
              source: "explicit_request",
              createdAt: new Date(),
              lastUsed: new Date(),
              usageCount: 0,
              tags: memoryCharacteristics.isCoachSpecific
                ? ["coach_specific"]
                : ["global"],
            },
          };
        }
      } else {
        // For natural language, use AI detection
        const memoryDetectionEvent = {
          userId,
          coachId,
          conversationId,
          userMessage: userMessage,
          messageContext: existingMessages
            .slice(-3)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n"),
        };
        const memoryDetection = await detectMemoryRequest(memoryDetectionEvent);

        if (
          memoryDetection.isMemoryRequest &&
          memoryDetection.extractedMemory
        ) {
          // Use AI to determine memory characteristics (combined analysis)
          const memoryCharacteristics = await detectMemoryCharacteristics(
            memoryDetection.extractedMemory.content,
            coachName
          );

          memory = {
            memoryId: generateMemoryId(),
            userId,
            coachId: memoryCharacteristics.isCoachSpecific ? coachId : undefined,
            content: memoryDetection.extractedMemory.content,
            memoryType: memoryCharacteristics.type, // AI-determined type
            metadata: {
              createdAt: new Date(),
              lastUsed: new Date(),
              usageCount: 0,
              source: "conversation",
              importance: memoryCharacteristics.importance, // AI-determined importance
              tags: memoryCharacteristics.isCoachSpecific
                ? ["coach_specific"]
                : ["global"],
            },
          };
        }
      }

      // Unified storage logic for both types
      if (memory) {
        await saveMemory(memory);
        try {
          await storeMemoryInPinecone(memory);
          console.info("Memory stored in both DynamoDB and Pinecone:", {
            type: isSlashCommandMemory ? "slash_command" : "natural_language",
            memoryId: memory.memoryId,
          });
        } catch (error) {
          console.warn(
            "Failed to store memory in Pinecone, continuing:",
            error
          );
        }
        memoryFeedback = `✅ I've remembered that for you: "${memory.content}"`;
        console.info("Memory saved:", {
          memoryId: memory.memoryId,
          userId,
          scope: memory.coachId
            ? `coach_specific (${memory.coachId})`
            : "global",
          type: isSlashCommandMemory ? "slash_command" : "natural_language",
        });
      }
    } catch (error) {
      console.error(
        "❌ Failed to process memory, but continuing conversation:",
        error
      );
      memoryFeedback = "❌ Sorry, I couldn't save that memory right now.";
    }
  }

  return {
    isMemoryProcessing,
    memoryContent,
    slashCommand,
    isSlashCommandMemory,
    isNaturalLanguageMemory,
    memoryFeedback,
  };
}
