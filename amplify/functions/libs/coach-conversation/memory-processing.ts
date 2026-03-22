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
  extractProspectiveMemories,
  buildProspectiveMemories,
  filterActiveProspectiveMemories,
  formatProspectiveMemoriesForPrompt,
  reinforceMemory,
} from "../memory";
import { parseSlashCommand } from "../workout/detection";
import { logger } from "../logger";

export interface MemoryRetrievalResult {
  memories: UserMemory[];
  /** Active prospective memories within their trigger window */
  prospectiveMemories?: UserMemory[];
  /** Pre-formatted prompt section for prospective memories */
  prospectivePromptSection?: string;
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
  importantMemories: UserMemory[],
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
  messageContext?: string,
  options?: { enableReranking?: boolean; minScore?: number },
): Promise<MemoryRetrievalResult> {
  let memories: UserMemory[] = [];
  let retrievalDetection: any = null;

  try {
    if (userMessage) {
      // Use AI to determine if semantic memory retrieval is beneficial
      retrievalDetection = await detectMemoryRetrievalNeed(
        userMessage,
        messageContext,
      );

      if (
        retrievalDetection.needsSemanticRetrieval &&
        retrievalDetection.confidence > 0.6
      ) {
        logger.info("🧠 AI detected need for semantic memory retrieval:", {
          confidence: retrievalDetection.confidence,
          contextTypes: retrievalDetection.contextTypes,
          reasoning: retrievalDetection.reasoning,
        });

        // Use semantic + importance hybrid approach
        const [semanticMemories, importantMemories] = await Promise.all([
          querySemanticMemories(userId, userMessage, {
            topK: 10,
            contextTypes: retrievalDetection.contextTypes,
            enableReranking: options?.enableReranking,
            minScore: options?.minScore,
          }),
          queryMemoriesFromDb(userId, coachId, {
            limit: 4,
            importance: "high",
          }),
        ]);

        memories = combineAndDeduplicateMemories(
          semanticMemories,
          importantMemories,
        );

        logger.info("Retrieved hybrid memories:", {
          semanticCount: semanticMemories.length,
          importantCount: importantMemories.length,
          finalCount: memories.length,
        });
      } else {
        // AI determined semantic retrieval not beneficial - get top important memories only
        logger.info(
          "🔄 AI determined semantic retrieval not needed, using importance-based:",
          {
            confidence: retrievalDetection.confidence,
            reasoning: retrievalDetection.reasoning,
          },
        );
        memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });
      }
    } else {
      // No user message provided - use standard importance-based approach
      memories = await queryMemoriesFromDb(userId, coachId, { limit: 10 });
    }

    // Update usage statistics for retrieved memories with enhanced context
    // Also ensure memories are indexed in Pinecone (auto-heal if missing)
    if (memories.length > 0) {
      // Don't await these - update in background
      memories.forEach((memory) => {
        // Skip non-memory records without a valid memoryId
        if (!memory.memoryId) {
          logger.info(
            "ℹ️ Skipping usage update for non-memory record (expected behavior):",
            {
              pineconeId: (memory as any).pineconeId,
              recordType: memory.memoryType,
              contentPreview: memory.content?.substring(0, 100),
            },
          );
          return;
        }

        const usageContext = {
          userMessage,
          messageContext,
          contextTypes: retrievalDetection?.contextTypes || [],
          retrievalMethod: (() => {
            if (
              retrievalDetection?.needsSemanticRetrieval &&
              retrievalDetection.confidence > 0.6
            ) {
              return "hybrid"; // Both semantic and importance-based
            } else if (retrievalDetection?.needsSemanticRetrieval) {
              return "semantic";
            } else {
              return "importance";
            }
          })() as "semantic" | "importance" | "hybrid",
        };

        // Reinforce lifecycle if present (update stability + reset decay clock)
        const lifecycleUpdate: Partial<UserMemory> = {};
        if (memory.metadata.lifecycle) {
          const lastReinforced = memory.metadata.lifecycle.lastReinforcedAt
            ? new Date(memory.metadata.lifecycle.lastReinforcedAt).getTime()
            : new Date(memory.metadata.createdAt).getTime();
          const elapsedDays =
            (Date.now() - lastReinforced) / (1000 * 60 * 60 * 24);
          const reinforced = reinforceMemory(
            memory.metadata.lifecycle,
            memory.metadata.importance,
            elapsedDays,
          );
          lifecycleUpdate.metadata = {
            ...memory.metadata,
            lifecycle: reinforced,
          };
        }

        // Update memory usage + tags + lifecycle in DynamoDB, then sync to Pinecone
        updateMemory(userId, memory.memoryId, lifecycleUpdate, usageContext)
          .then((updatedMemory) => storeMemoryInPinecone(updatedMemory))
          .catch((err: any) =>
            logger.warn(
              "Failed to update memory usage or sync to Pinecone:",
              err,
            ),
          );
      });
    }

    logger.info("Retrieved memories for context:", {
      userId,
      coachId,
      memoryCount: memories.length,
      approach: userMessage ? "AI-guided" : "standard",
    });
  } catch (error) {
    logger.error("Error retrieving memories:", error);
    throw error; // Simplified - let the error bubble up rather than silent fallback
  }

  // Query prospective memories (fast DynamoDB-only, no AI call)
  let prospectiveMemories: UserMemory[] = [];
  let prospectivePromptSection: string | undefined;
  try {
    const allUserMemories = await queryMemoriesFromDb(userId, coachId, {
      memoryType: "prospective",
    });
    prospectiveMemories = filterActiveProspectiveMemories(allUserMemories);

    if (prospectiveMemories.length > 0) {
      prospectivePromptSection =
        formatProspectiveMemoriesForPrompt(prospectiveMemories);
      logger.info("Active prospective memories found:", {
        userId,
        coachId,
        activeCount: prospectiveMemories.length,
        totalProspective: allUserMemories.length,
      });
    }
  } catch (error) {
    logger.warn("Error querying prospective memories, continuing:", error);
  }

  return { memories, prospectiveMemories, prospectivePromptSection };
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
  coachName?: string,
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
    logger.error("❌ Error during memory detection:", error);
    slashCommand = { isSlashCommand: false };
    isSlashCommandMemory = false;
    isNaturalLanguageMemory = false;
    isMemoryProcessing = false;
  }

  let memoryContent = userMessage; // Default to full user response
  let memoryFeedback: string | null = null;

  if (isMemoryProcessing) {
    logger.info("🧠 MEMORY PROCESSING DETECTED:", {
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
            coachName,
          );

          logger.info("🎯 Slash command memory characteristics detected:", {
            content:
              memoryContent.trim().substring(0, 50) +
              (memoryContent.length > 50 ? "..." : ""),
            type: memoryCharacteristics.type,
            importance: memoryCharacteristics.importance,
            isCoachSpecific: memoryCharacteristics.isCoachSpecific,
            confidence: memoryCharacteristics.confidence,
            suggestedTags: memoryCharacteristics.suggestedTags,
            exerciseTags: memoryCharacteristics.exerciseTags,
          });

          memory = {
            memoryId: generateMemoryId(userId),
            userId,
            coachId: memoryCharacteristics.isCoachSpecific
              ? coachId
              : undefined, // AI determines scope
            memoryType: memoryCharacteristics.type, // AI-determined type
            content: memoryContent.trim(),
            metadata: {
              importance: memoryCharacteristics.importance, // AI-determined importance
              source: "explicit_request",
              createdAt: new Date(),
              lastUsed: new Date(),
              usageCount: 0,
              tags: [
                ...(memoryCharacteristics.suggestedTags || []),
                ...(memoryCharacteristics.exerciseTags || []),
              ], // Combine regular and exercise tags
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
            coachName,
          );

          memory = {
            memoryId: generateMemoryId(userId),
            userId,
            coachId: memoryCharacteristics.isCoachSpecific
              ? coachId
              : undefined,
            content: memoryDetection.extractedMemory.content,
            memoryType: memoryCharacteristics.type, // AI-determined type
            metadata: {
              createdAt: new Date(),
              lastUsed: new Date(),
              usageCount: 0,
              source: "conversation",
              importance: memoryCharacteristics.importance, // AI-determined importance
              tags: [
                ...(memoryCharacteristics.suggestedTags || []),
                ...(memoryCharacteristics.exerciseTags || []),
              ], // Combine regular and exercise tags
            },
          };
        }
      }

      // Unified storage logic for both types
      if (memory) {
        await saveMemory(memory);
        try {
          await storeMemoryInPinecone(memory);
          logger.info("Memory stored in both DynamoDB and Pinecone:", {
            type: isSlashCommandMemory ? "slash_command" : "natural_language",
            memoryId: memory.memoryId,
          });
        } catch (error) {
          logger.warn("Failed to store memory in Pinecone, continuing:", error);
        }
        memoryFeedback = `✅ I've remembered that for you: "${memory.content}"`;
        logger.info("Memory saved:", {
          memoryId: memory.memoryId,
          userId,
          scope: memory.coachId
            ? `coach_specific (${memory.coachId})`
            : "global",
          type: isSlashCommandMemory ? "slash_command" : "natural_language",
          tags: memory.metadata.tags,
          tagCount: memory.metadata.tags?.length || 0,
        });
      }
    } catch (error) {
      logger.error(
        "❌ Failed to process memory, but continuing conversation:",
        error,
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

/**
 * Extract and save prospective memories from a conversation turn.
 * This runs as a fire-and-forget async call AFTER the AI response is generated.
 *
 * Analyzes both the user message and AI response to capture:
 * - Future events the user mentioned
 * - Commitments the user made (including in response to coach suggestions)
 * - Milestones with timeframes
 */
export async function extractAndSaveProspectiveMemories(
  userMessage: string,
  aiResponse: string,
  userId: string,
  coachId: string,
  conversationId: string,
): Promise<void> {
  try {
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const extraction = await extractProspectiveMemories(
      userMessage,
      aiResponse,
      currentDate,
    );

    if (!extraction.hasProspectiveElements || !extraction.items?.length) {
      return;
    }

    const prospectiveMemories = buildProspectiveMemories(
      extraction,
      userId,
      coachId,
      conversationId,
    );

    // Save each prospective memory to DynamoDB and Pinecone
    for (const memory of prospectiveMemories) {
      try {
        await saveMemory(memory);
        try {
          await storeMemoryInPinecone(memory);
        } catch (pineconeError) {
          logger.warn(
            "Failed to store prospective memory in Pinecone, continuing:",
            pineconeError,
          );
        }
        logger.info("Prospective memory saved:", {
          memoryId: memory.memoryId,
          content: memory.content.substring(0, 80),
          followUpType: memory.metadata.prospective?.followUpType,
          targetDate: memory.metadata.prospective?.targetDate,
          status: memory.metadata.prospective?.status,
        });
      } catch (saveError) {
        logger.error("Failed to save prospective memory:", saveError);
      }
    }

    logger.info("Prospective memory extraction complete:", {
      userId,
      coachId,
      conversationId,
      extracted: prospectiveMemories.length,
    });
  } catch (error) {
    // Fire-and-forget: log but don't throw
    logger.error("Error in prospective memory extraction pipeline:", error);
  }
}

/**
 * Create fallback memory retrieval result
 * Used when memory processing is disabled or fails
 *
 * @returns Empty memory retrieval result with no memories
 */
export function getFallbackMemory(): MemoryRetrievalResult {
  return { memories: [] };
}
