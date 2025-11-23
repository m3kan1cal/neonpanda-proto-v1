import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from '../libs/configs';


export const getMonthlyReports = defineFunction({
  name: "get-monthly-reports",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
});
