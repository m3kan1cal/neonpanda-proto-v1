import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildProgram = defineFunction({
  name: "build-program",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes for agent loop with parallel phase generation
  // 1024 MB. Observed peak under load is ~165 MB (CloudWatch maxMemoryUsedMB)
  // across all 13 program archetypes, so 1024 leaves >5x headroom while
  // delivering ~8-12% Lambda CPU credit relative to 3072 (CPU scales with
  // memory in 1769 MB increments; under 1769 MB we share a single vCPU but
  // this Lambda is overwhelmingly Bedrock-bound, not CPU-bound).
  memoryMB: 1024,
  resourceGroupName: "jobs",
});
