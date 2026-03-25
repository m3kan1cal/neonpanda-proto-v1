import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../../libs/configs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Stack } from "aws-cdk-lib";

export const dispatchMemoryLifecycle = defineFunction({
  name: "dispatch-memory-lifecycle",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes — dispatches per-user processors for all users
  memoryMB: 512,
});

export function createMemoryLifecycleSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction,
) {
  const memoryLifecycleRule = new events.Rule(stack, "MemoryLifecycleRule", {
    description:
      "Daily memory lifecycle: dispatcher fans out per-user processing (3am UTC)",
    schedule: events.Schedule.cron({
      minute: "0",
      hour: "3",
    }),
  });
  memoryLifecycleRule.addTarget(new targets.LambdaFunction(lambdaFunction));
  return memoryLifecycleRule;
}
