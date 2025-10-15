import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";


export const getMonthlyReports = defineFunction({
  name: "get-monthly-reports",
  entry: "./handler.ts",
});
