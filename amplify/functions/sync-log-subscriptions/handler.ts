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

const hasExistingFilter = async (logGroupName: string): Promise<boolean> => {
  const { subscriptionFilters } = await logs.send(
    new DescribeSubscriptionFiltersCommand({ logGroupName })
  );
  return (subscriptionFilters?.length || 0) > 0;
};

const addSubscriptionFilter = async (
  logGroupName: string,
  filterPattern: string,
  destinationArn: string
): Promise<boolean> => {
  try {
    await logs.send(
      new PutSubscriptionFilterCommand({
        logGroupName,
        filterName: "error-monitoring-filter",
        filterPattern,
        destinationArn,
      })
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

      if (await hasExistingFilter(logGroupName)) {
        skipped++;
        continue;
      }

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
