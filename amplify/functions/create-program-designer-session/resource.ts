import { defineFunction } from "@aws-amplify/backend";

export const createProgramDesignerSession = defineFunction({
  name: "create-program-designer-session",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  runtime: 22,
});
