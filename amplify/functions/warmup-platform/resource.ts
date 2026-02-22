import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration, Stack } from "aws-cdk-lib";

export const warmupPlatform = defineFunction({
  name: "warmup-platform",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // 5 minutes -- enough for ~25 parallel Bedrock grammar compilations
  memoryMB: 2048, // Large memory for parallel execution
});

/**
 * Create EventBridge rule for platform warmup -- to be called from backend.ts.
 * Runs every 12 hours to keep Bedrock grammar caches warm.
 * This minimizes the uncached window regardless of whether Bedrock's grammar
 * cache TTL is fixed or sliding (AWS documentation is ambiguous on this point).
 */
export function createWarmupPlatformSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction,
) {
  const warmupPlatformRule = new events.Rule(stack, "WarmupPlatformRule", {
    description:
      "Pre-compile Bedrock grammar caches every 12 hours to eliminate first-request latency",
    schedule: events.Schedule.rate(Duration.hours(12)),
  });

  warmupPlatformRule.addTarget(new targets.LambdaFunction(lambdaFunction));

  return warmupPlatformRule;
}
