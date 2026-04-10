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
  timeoutSeconds: 300, // 5 minutes -- enough for parallel Bedrock grammar compilations + container pings
  memoryMB: 2048, // Large memory for parallel execution
  resourceGroupName: "scheduled",
});

/**
 * Create EventBridge rules for platform warmup -- to be called from backend.ts.
 *
 * Two schedules:
 * 1. Container warmup: every 5 minutes — invokes critical Lambda functions to keep
 *    execution environments alive and avoid cold starts. Cost: ~130K invocations/month
 *    (well within Lambda free tier of 1M/month).
 * 2. Grammar warmup: every 12 hours — pre-compiles Bedrock constrained-decoding grammar
 *    caches. Grammars expire after 24 hours; running every 12h minimizes the uncached window.
 */
export function createWarmupPlatformSchedule(
  stack: Stack,
  lambdaFunction: lambda.IFunction,
) {
  // Schedule 1: Lambda container warming every 5 minutes
  const containerWarmupRule = new events.Rule(stack, "WarmupContainersRule", {
    description:
      "Keep critical Lambda containers warm by invoking them every 5 minutes",
    schedule: events.Schedule.rate(Duration.minutes(5)),
  });

  containerWarmupRule.addTarget(
    new targets.LambdaFunction(lambdaFunction, {
      event: events.RuleTargetInput.fromObject({
        warmupType: "containers",
      }),
    }),
  );

  // Schedule 2: Bedrock grammar warmup every 12 hours
  const grammarWarmupRule = new events.Rule(stack, "WarmupGrammarsRule", {
    description:
      "Pre-compile Bedrock grammar caches every 12 hours to eliminate first-request latency",
    schedule: events.Schedule.rate(Duration.hours(12)),
  });

  grammarWarmupRule.addTarget(
    new targets.LambdaFunction(lambdaFunction, {
      event: events.RuleTargetInput.fromObject({
        warmupType: "grammars",
      }),
    }),
  );

  return { containerWarmupRule, grammarWarmupRule };
}
