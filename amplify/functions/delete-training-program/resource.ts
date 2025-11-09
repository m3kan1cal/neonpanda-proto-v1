import 'dotenv/config';
import { defineFunction } from "@aws-amplify/backend";

export const deleteTrainingProgram = defineFunction({
  name: "delete-training-program",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024,
});
