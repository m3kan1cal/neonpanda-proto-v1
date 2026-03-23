import { invokeAsyncLambda, LambdaContext } from "../../libs/api-helpers";
import { queryAllUserMemoryPartitions } from "../../../dynamodb/memory";
import { logger } from "../../libs/logger";

const MIN_REMAINING_MS = 30_000; // stop dispatching if < 30 seconds remain

export const handler = async (event: any, context: LambdaContext) => {
  const isSunday = new Date().getUTCDay() === 0;
  const processLifecycleFunctionName =
    process.env.PROCESS_MEMORY_LIFECYCLE_FUNCTION_NAME;

  if (!processLifecycleFunctionName) {
    logger.error("PROCESS_MEMORY_LIFECYCLE_FUNCTION_NAME env var not set");
    return { success: false, error: "Missing function name env var" };
  }

  const userPartitions = await queryAllUserMemoryPartitions();

  logger.info("Memory lifecycle dispatcher starting:", {
    totalUsers: userPartitions.length,
    isSunday,
  });

  let invoked = 0;
  let skipped = 0;

  for (const userPk of userPartitions) {
    // Time guard — stop dispatching if Lambda is about to time out
    if (context.getRemainingTimeInMillis() < MIN_REMAINING_MS) {
      skipped = userPartitions.length - invoked;
      logger.warn("Time guard triggered — stopping dispatch early:", {
        invoked,
        skipped,
        remainingUsers: userPartitions
          .slice(invoked)
          .map((pk) => pk.replace("user#", "")),
      });
      break;
    }

    const userId = userPk.replace("user#", "");
    await invokeAsyncLambda(
      processLifecycleFunctionName,
      { userId, includeWeeklyTasks: isSunday },
      `process-memory-lifecycle:${userId}`,
    );
    invoked++;
  }

  logger.info("Memory lifecycle dispatcher complete:", {
    totalUsers: userPartitions.length,
    invoked,
    skipped,
    isSunday,
  });

  return {
    success: true,
    usersInvoked: invoked,
    usersSkipped: skipped,
    isSunday,
  };
};
