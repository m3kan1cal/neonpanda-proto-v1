import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildProgramV2 = defineFunction({
  name: "build-program-v2",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes (same as build-program)
  memoryMB: 3072, // More memory than build-program (2048) for agent overhead and parallel phase generation
});
