import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Stack } from "aws-cdk-lib";
import { createS3AnalyticsPolicy } from "../../iam-policies";


export const buildWeeklyAnalytics = defineFunction({
  name: "build-weekly-analytics",
  entry: "./handler.ts",
  timeoutSeconds: 900, // 15 minutes for processing all users
  memoryMB: 1024, // Standard memory for batch processing
});

/**
 * Create EventBridge rule for weekly analytics - to be called from backend.ts
 */
export function createWeeklyAnalyticsSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction
) {
  // Create EventBridge rule for weekly analytics (every Sunday at 6:00 AM UTC)
  const weeklyAnalyticsRule = new events.Rule(stack, "WeeklyAnalyticsRule", {
    description:
      "Trigger weekly analytics processing every Sunday at 6:00 AM UTC",
    schedule: events.Schedule.cron({
      minute: "0",
      hour: "6",
      weekDay: "1", // Sunday
    }),
  });

  // Add the Lambda function as a target for the EventBridge rule
  weeklyAnalyticsRule.addTarget(new targets.LambdaFunction(lambdaFunction));

  return weeklyAnalyticsRule;
}
