import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";


export const getMonthlyReport = defineFunction({
  name: "get-monthly-report",
  entry: "./handler.ts",
});
