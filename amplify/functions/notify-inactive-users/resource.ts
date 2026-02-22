import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Stack, Duration } from "aws-cdk-lib";

export const notifyInactiveUsers = defineFunction({
  name: "notify-inactive-users",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes (for processing many users)
  memoryMB: 2048,
});

/**
 * Create EventBridge rule for inactive user notifications - to be called from backend.ts
 */
export function createInactiveUsersNotificationSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction,
) {
  // Create EventBridge rule to run daily
  // Runs both general inactivity check (self-rate-limited to 28 days) and
  // program adherence check (self-rate-limited to 7 days)
  const inactiveUsersRule = new events.Rule(
    stack,
    "InactiveUsersNotificationRule",
    {
      description:
        "Daily user notification check: general inactivity reminders and program adherence reminders",
      schedule: events.Schedule.rate(Duration.days(1)), // Every 24 hours
    },
  );

  // Add the Lambda function as a target for the EventBridge rule
  inactiveUsersRule.addTarget(new targets.LambdaFunction(lambdaFunction));

  return inactiveUsersRule;
}
