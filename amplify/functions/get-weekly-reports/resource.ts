import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from '../libs/configs';


export const getWeeklyReports = defineFunction({
  name: "get-weekly-reports",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
});
