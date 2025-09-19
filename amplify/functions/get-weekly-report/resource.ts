import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";


export const getWeeklyReport = defineFunction({
  name: "get-weekly-report",
  entry: "./handler.ts",
});
