import { MODEL_IDS, callBedrockApi } from "../../libs/api-helpers";
import {
  queryMemories,
  updateMemory,
  saveMemory,
  queryEmotionalSnapshots,
  saveEmotionalTrend,
} from "../../../dynamodb/memory";
import { queryCoachConversationSummaries } from "../../../dynamodb/coach-conversation";
import {
  shouldCompressMemory,
  shouldArchiveMemory,
  initializeLifecycle,
} from "../../libs/memory/lifecycle";
import { findExpiredProspectiveMemories } from "../../libs/memory/prospective";
import {
  detectBehavioralPatterns,
  buildBehavioralMemories,
} from "../../libs/memory/behavioral";
import { calculateEmotionalTrends } from "../../libs/memory/emotional";
import {
  storeMemoryInPinecone,
  deleteMemoryFromPinecone,
} from "../../libs/user/pinecone";
import { UserMemory } from "../../libs/memory/types";
import { logger } from "../../libs/logger";

interface ProcessMemoryLifecycleEvent {
  userId: string;
  includeWeeklyTasks: boolean;
}

const COMPRESSION_CONCURRENCY = 5;

async function compressMemory(memory: UserMemory): Promise<UserMemory> {
  const result = await callBedrockApi(
    "You are a memory compression assistant. Given a coaching memory, produce a single concise sentence that captures the essential fact for future coaching use. Return ONLY the compressed sentence, no preamble.",
    `Memory to compress:\n${memory.content}`,
    MODEL_IDS.UTILITY_MODEL_FULL,
  );

  const compressed =
    typeof result === "string" ? result.trim() : memory.content;

  return {
    ...memory,
    content: compressed,
    metadata: {
      ...memory.metadata,
      lifecycle: {
        ...memory.metadata.lifecycle!,
        state: "compressed" as const,
        originalContent: memory.content,
        compressedAt: new Date().toISOString(),
      },
    },
  };
}

async function processDailyLifecycle(
  userId: string,
  memories: UserMemory[],
): Promise<void> {
  // Compress decayed memories in concurrent batches
  const toCompress = memories.filter(shouldCompressMemory);
  const toArchive = memories.filter(shouldArchiveMemory);
  const expiredProspective = findExpiredProspectiveMemories(memories);

  logger.info("Daily lifecycle tasks:", {
    userId,
    toCompress: toCompress.length,
    toArchive: toArchive.length,
    expiredProspective: expiredProspective.length,
  });

  // Compress in batches of COMPRESSION_CONCURRENCY
  for (let i = 0; i < toCompress.length; i += COMPRESSION_CONCURRENCY) {
    const batch = toCompress.slice(i, i + COMPRESSION_CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (memory) => {
        try {
          const compressed = await compressMemory(memory);
          await updateMemory(userId, memory.memoryId, {
            content: compressed.content,
            metadata: compressed.metadata,
          });
          await storeMemoryInPinecone(compressed).catch((err) => {
            logger.warn("Pinecone re-index failed for compressed memory:", {
              memoryId: memory.memoryId,
              err,
            });
          });
          logger.info("Memory compressed:", { memoryId: memory.memoryId });
        } catch (err) {
          logger.error("Compression failed for memory:", {
            memoryId: memory.memoryId,
            err,
          });
        }
      }),
    );
  }

  // Archive forgotten memories
  await Promise.allSettled(
    toArchive.map(async (memory) => {
      try {
        await updateMemory(userId, memory.memoryId, {
          metadata: {
            ...memory.metadata,
            lifecycle: {
              ...memory.metadata.lifecycle!,
              state: "archived" as const,
              archivedAt: new Date().toISOString(),
            },
          },
        });
        await deleteMemoryFromPinecone(userId, memory.memoryId).catch((err) => {
          logger.warn("Pinecone delete failed for archived memory:", {
            memoryId: memory.memoryId,
            err,
          });
        });
        logger.info("Memory archived:", { memoryId: memory.memoryId });
      } catch (err) {
        logger.error("Archive failed for memory:", {
          memoryId: memory.memoryId,
          err,
        });
      }
    }),
  );

  // Expire stale prospective memories
  await Promise.allSettled(
    expiredProspective.map(async (memory) => {
      try {
        await updateMemory(userId, memory.memoryId, {
          metadata: {
            ...memory.metadata,
            prospective: {
              ...memory.metadata.prospective!,
              status: "expired" as const,
            },
          },
        });
        logger.info("Prospective memory expired:", {
          memoryId: memory.memoryId,
        });
      } catch (err) {
        logger.error("Expiry failed for prospective memory:", {
          memoryId: memory.memoryId,
          err,
        });
      }
    }),
  );
}

async function processWeeklyTasks(userId: string): Promise<void> {
  // Load conversation summaries from the last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const allSummaries = await queryCoachConversationSummaries(userId);
  const recentSummaries = allSummaries.filter((summary: any) => {
    const summaryDate = new Date(
      summary.metadata?.createdAt || summary.createdAt || 0,
    );
    return summaryDate >= twoWeeksAgo;
  });

  // Extract narrative text from each summary (handles both string and object formats)
  const narratives: string[] = recentSummaries
    .map((summary: any) => {
      if (typeof summary.narrative === "string") return summary.narrative;
      if (typeof summary.summary === "string") return summary.summary;
      return null;
    })
    .filter(Boolean) as string[];

  logger.info("Weekly tasks — summaries loaded:", {
    userId,
    totalSummaries: allSummaries.length,
    recentSummaries: recentSummaries.length,
    narrativesExtracted: narratives.length,
  });

  // Detect and save behavioral patterns
  if (narratives.length > 0) {
    const existingBehavioral = await queryMemories(userId, undefined, {
      memoryType: "behavioral",
    });

    const detection = await detectBehavioralPatterns(
      narratives,
      existingBehavioral,
    );
    const behavioralMemories = buildBehavioralMemories(detection, userId);

    let updatedCount = 0;
    let createdCount = 0;

    await Promise.allSettled(
      behavioralMemories.map(async (item) => {
        try {
          // Check if this is an update or a new memory
          if ("updates" in item) {
            // Update existing memory
            const updatedMemory = await updateMemory(
              userId,
              item.memoryId,
              item.updates,
            );
            await storeMemoryInPinecone(updatedMemory).catch((err) => {
              logger.warn("Pinecone sync failed for updated behavioral memory:", {
                memoryId: item.memoryId,
                err,
              });
            });
            updatedCount++;
          } else {
            // Save new memory
            const memory = item as UserMemory;
            memory.metadata.lifecycle = initializeLifecycle(
              memory.metadata.importance,
            );
            await saveMemory(memory);
            await storeMemoryInPinecone(memory).catch((err) => {
              logger.warn("Pinecone sync failed for behavioral memory:", {
                memoryId: memory.memoryId,
                err,
              });
            });
            createdCount++;
          }
        } catch (err) {
          logger.error("Failed to process behavioral memory:", { err });
        }
      }),
    );

    logger.info("Behavioral memories processed:", {
      userId,
      created: createdCount,
      updated: updatedCount,
      total: behavioralMemories.length,
    });
  }

  // Calculate and save emotional trends
  const recentSnapshots = await queryEmotionalSnapshots(userId, undefined, {
    limit: 20,
  });

  if (recentSnapshots.length > 0) {
    const trend = calculateEmotionalTrends(recentSnapshots, "weekly");
    if (trend) {
      await saveEmotionalTrend(trend, userId);
      logger.info("Emotional trend saved:", {
        userId,
        period: trend.period,
        periodStart: trend.periodStart,
      });
    }
  }
}

export const handler = async (event: ProcessMemoryLifecycleEvent) => {
  const { userId, includeWeeklyTasks } = event;

  logger.info("Process memory lifecycle starting:", {
    userId,
    includeWeeklyTasks,
  });

  try {
    // Load all active (non-archived) memories for daily tasks
    const memories = await queryMemories(userId);

    const dailyWork = processDailyLifecycle(userId, memories);
    const weeklyWork = includeWeeklyTasks
      ? processWeeklyTasks(userId)
      : Promise.resolve();

    const results = await Promise.allSettled([dailyWork, weeklyWork]);

    const dailyResult = results[0];
    const weeklyResult = results[1];

    if (dailyResult.status === "rejected") {
      logger.error("Daily lifecycle failed:", {
        userId,
        error: dailyResult.reason,
      });
    }
    if (weeklyResult.status === "rejected") {
      logger.error("Weekly tasks failed:", {
        userId,
        error: weeklyResult.reason,
      });
    }

    logger.info("Process memory lifecycle complete:", {
      userId,
      dailySuccess: dailyResult.status === "fulfilled",
      weeklySuccess: weeklyResult.status === "fulfilled",
    });

    return {
      success: true,
      userId,
      dailySuccess: dailyResult.status === "fulfilled",
      weeklySuccess: weeklyResult.status === "fulfilled",
    };
  } catch (error) {
    logger.error("Process memory lifecycle failed:", { userId, error });
    return { success: false, userId, error: String(error) };
  }
};
