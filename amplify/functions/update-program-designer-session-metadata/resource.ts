import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const updateProgramDesignerSessionMetadata = defineFunction({
  name: "update-program-designer-session-metadata",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 15,
  memoryMB: 512,
});
