import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from '../libs/configs';


export const getMonthlyReport = defineFunction({
  name: "get-monthly-report",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
});
