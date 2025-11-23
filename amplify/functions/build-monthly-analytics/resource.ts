import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from '../libs/configs';
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Stack } from "aws-cdk-lib";


export const buildMonthlyAnalytics = defineFunction({
  name: "build-monthly-analytics",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes for processing all users
  memoryMB: 1024, // Standard memory for batch processing
});

/**
 * Create EventBridge rule for monthly analytics - to be called from backend.ts
 */
export function createMonthlyAnalyticsSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction
) {
  // Create EventBridge rule for monthly analytics (1st of each month at 9:00 AM UTC)
  const monthlyAnalyticsRule = new events.Rule(stack, "MonthlyAnalyticsRule", {
    description:
      "Trigger monthly analytics processing on the 1st of each month at 9:00 AM UTC",
    schedule: events.Schedule.cron({
      minute: "0",
      hour: "9",
      day: "1", // 1st day of the month
    }),
  });

  // Add the Lambda function as a target for the EventBridge rule
  monthlyAnalyticsRule.addTarget(new targets.LambdaFunction(lambdaFunction));

  return monthlyAnalyticsRule;
}
