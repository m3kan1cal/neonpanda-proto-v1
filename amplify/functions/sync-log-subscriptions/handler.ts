import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  PutSubscriptionFilterCommand,
  DescribeSubscriptionFiltersCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const logs = new CloudWatchLogsClient({});

// System functions that should not have log subscriptions (to avoid circular dependencies)
const EXCLUDED_FUNCTIONS = ["forwardlogs", "synclogs"];

const shouldSkipLogGroup = (logGroupName: string): boolean => {
  return EXCLUDED_FUNCTIONS.some(excluded => logGroupName.includes(excluded));
};

// Add delay to avoid throttling (CloudWatch Logs: 5 requests/second)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff for throttling errors
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isThrottling = error.name === 'ThrottlingException' || error.$metadata?.httpStatusCode === 400;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isThrottling && !isLastAttempt) {
        const delayMs = baseDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
        console.warn(`⏱️ Throttled, retrying in ${delayMs}ms.. (attempt ${attempt + 1}/${maxRetries})`);
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

const hasExistingFilter = async (logGroupName: string): Promise<boolean> => {
  const { subscriptionFilters } = await retryWithBackoff(() =>
    logs.send(new DescribeSubscriptionFiltersCommand({ logGroupName }))
  );
  return (subscriptionFilters?.length || 0) > 0;
};

const addSubscriptionFilter = async (
  logGroupName: string,
  filterPattern: string,
  destinationArn: string
): Promise<boolean> => {
  try {
    await retryWithBackoff(() =>
      logs.send(
        new PutSubscriptionFilterCommand({
          logGroupName,
          filterName: "error-monitoring-filter",
          filterPattern,
          destinationArn,
        })
      )
    );
    console.info("✅ Added filter to:", logGroupName);
    return true;
  } catch (err) {
    console.error("❌ Failed to add filter to:", logGroupName, err);
    return false;
  }
};

export const handler = async () => {
  const { LOG_GROUP_PREFIX, DESTINATION_ARN, FILTER_PATTERN } = process.env;

  console.info("🔄 Syncing log subscriptions for prefix:", LOG_GROUP_PREFIX);

  try {
    const { logGroups } = await logs.send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: LOG_GROUP_PREFIX })
    );

    let added = 0;
    let skipped = 0;

    for (const logGroup of logGroups || []) {
      const logGroupName = logGroup.logGroupName!;

      if (shouldSkipLogGroup(logGroupName)) {
        console.info("⏭️ Skipping system function:", logGroupName);
        skipped++;
        continue;
      }

      // Add delay before checking for existing filter (to avoid throttling)
      // CloudWatch Logs rate limit: 5 req/sec
      // 250ms delay = 4 req/sec (safe margin)
      await delay(250);

      if (await hasExistingFilter(logGroupName)) {
        skipped++;
        continue;
      }

      // Add delay before adding filter (to avoid throttling)
      await delay(250);

      const success = await addSubscriptionFilter(logGroupName, FILTER_PATTERN!, DESTINATION_ARN!);
      if (success) added++;
    }

    console.info(`✅ Sync complete. Added: ${added}, Skipped: ${skipped}`);
    return { added, skipped };
  } catch (error) {
    console.error("❌ Error syncing subscriptions:", error);
    throw error;
  }
};
