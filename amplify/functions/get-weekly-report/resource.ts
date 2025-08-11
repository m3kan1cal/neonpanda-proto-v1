import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";

export const getWeeklyReport = defineFunction({
  name: "get-weekly-report",
  entry: "./handler.ts",
  environment: {
    DYNAMODB_TABLE_NAME:
      process.env.DYNAMODB_TABLE_NAME || "CoachForge-ProtoApi-AllItems-V2",
  },
});
