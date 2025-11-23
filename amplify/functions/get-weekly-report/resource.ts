import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from '../libs/configs';


export const getWeeklyReport = defineFunction({
  name: "get-weekly-report",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
});
