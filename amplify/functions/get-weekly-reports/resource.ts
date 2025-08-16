import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";


export const getWeeklyReports = defineFunction({
  name: "get-weekly-reports",
  entry: "./handler.ts",
});
