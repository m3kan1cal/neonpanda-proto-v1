import { defineFunction } from "@aws-amplify/backend";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Stack } from "aws-cdk-lib";

export const syncLogSubscriptions = defineFunction({
  name: "sync-log-subscriptions",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 2048,
});

/**
 * Create EventBridge rule for log subscription sync - to be called from backend.ts
 */
export function createSyncLogSubscriptionsSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction
) {
  // Create EventBridge rule for daily log subscription sync (daily at 2:00 AM UTC)
  const syncLogSubscriptionsRule = new events.Rule(stack, "SyncLogSubscriptionsRule", {
    description:
      "Sync CloudWatch Log subscription filters daily at 2:00 AM UTC to ensure all Lambda functions forward errors to SNS",
    schedule: events.Schedule.cron({
      minute: "0",
      hour: "2",
    }),
  });

  // Add the Lambda function as a target for the EventBridge rule
  syncLogSubscriptionsRule.addTarget(new targets.LambdaFunction(lambdaFunction));

  return syncLogSubscriptionsRule;
}
