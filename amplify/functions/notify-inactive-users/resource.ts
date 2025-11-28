import "dotenv/config";
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Stack, Duration } from 'aws-cdk-lib';


export const notifyInactiveUsers = defineFunction({
  name: 'notify-inactive-users',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes (for processing many users)
  memoryMB: 2048
});

/**
 * Create EventBridge rule for inactive user notifications - to be called from backend.ts
 */
export function createInactiveUsersNotificationSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction
) {
  // Create EventBridge rule to run every 2 weeks (every 14 days)
  const inactiveUsersRule = new events.Rule(stack, "InactiveUsersNotificationRule", {
    description:
      "Trigger inactive user email notifications every 2 weeks (every 14 days)",
    // EventBridge doesn't have native bi-weekly support, so we use a rate expression
    schedule: events.Schedule.rate(Duration.days(14)), // Every 14 days
  });

  // Add the Lambda function as a target for the EventBridge rule
  inactiveUsersRule.addTarget(new targets.LambdaFunction(lambdaFunction));

  return inactiveUsersRule;
}
