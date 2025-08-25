import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { helloWorld } from "./functions/hello-world/resource";
import { contactForm } from "./functions/contact-form/resource";
import { createCoachCreatorSession } from "./functions/create-coach-creator-session/resource";
import { updateCoachCreatorSession } from "./functions/update-coach-creator-session/resource";
import { buildCoachConfig } from "./functions/build-coach-config/resource";
import { getCoachConfigs } from "./functions/get-coach-configs/resource";
import { getCoachConfig } from "./functions/get-coach-config/resource";
import { getCoachConfigStatus } from "./functions/get-coach-config-status/resource";
import { getCoachCreatorSession } from "./functions/get-coach-creator-session/resource";
import { getCoachTemplates } from "./functions/get-coach-templates/resource";
import { getCoachTemplate } from "./functions/get-coach-template/resource";
import { createCoachConfigFromTemplate } from "./functions/create-coach-config-from-template/resource";
import { createCoachConversation } from "./functions/create-coach-conversation/resource";
import { getCoachConversations } from "./functions/get-coach-conversations/resource";
import { getCoachConversation } from "./functions/get-coach-conversation/resource";
import { updateCoachConversation } from "./functions/update-coach-conversation/resource";
import { sendCoachConversationMessage } from "./functions/send-coach-conversation-message/resource";
import { buildWorkout } from "./functions/build-workout/resource";
import { buildConversationSummary } from "./functions/build-conversation-summary/resource";
import { getWorkouts } from "./functions/get-workouts/resource";
import { getWorkout } from "./functions/get-workout/resource";
import { updateWorkout } from "./functions/update-workout/resource";
import { deleteWorkout } from "./functions/delete-workout/resource";
import { getWorkoutsCount } from "./functions/get-workouts-count/resource";
import { getConversationsCount } from "./functions/get-conversations-count/resource";
import {
  buildWeeklyAnalytics,
  createWeeklyAnalyticsSchedule,
} from "./functions/build-weekly-analytics/resource";
import { getWeeklyReports } from "./functions/get-weekly-reports/resource";
import { getWeeklyReport } from "./functions/get-weekly-report/resource";
import { getMemories } from "./functions/get-memories/resource";
import { deleteMemory } from "./functions/delete-memory/resource";
import { deleteCoachConversation } from "./functions/delete-coach-conversation/resource";
import { apiGatewayv2 } from "./api/resource";
import { dynamodbTable } from "./dynamodb/resource";
import {
  grantBedrockPermissions,
  grantLambdaInvokePermissions,
  grantS3DebugPermissions,
  grantS3AnalyticsPermissions,
} from "./iam-policies";
import { config } from "./functions/libs/configs";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  helloWorld,
  contactForm,
  createCoachCreatorSession,
  updateCoachCreatorSession,
  buildCoachConfig,
  getCoachConfigs,
  getCoachConfig,
  getCoachConfigStatus,
  getCoachCreatorSession,
  getCoachTemplates,
  getCoachTemplate,
  createCoachConfigFromTemplate,
  createCoachConversation,
  getCoachConversations,
  getCoachConversation,
  updateCoachConversation,
  sendCoachConversationMessage,
  buildWorkout,
  buildConversationSummary,
  getWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutsCount,
  getConversationsCount,
  buildWeeklyAnalytics,
  getWeeklyReports,
  getWeeklyReport,
  getMemories,
  deleteMemory,
  deleteCoachConversation,
});

// Create the Core API with all endpoints
const coreApi = apiGatewayv2.createCoreApi(
  backend.helloWorld.stack,
  backend.helloWorld.resources.lambda,
  backend.contactForm.resources.lambda,
  backend.createCoachCreatorSession.resources.lambda,
  backend.updateCoachCreatorSession.resources.lambda,
  backend.getCoachConfigs.resources.lambda,
  backend.getCoachConfig.resources.lambda,
  backend.getCoachConfigStatus.resources.lambda,
  backend.getCoachCreatorSession.resources.lambda,
  backend.getCoachTemplates.resources.lambda,
  backend.getCoachTemplate.resources.lambda,
  backend.createCoachConfigFromTemplate.resources.lambda,
  backend.createCoachConversation.resources.lambda,
  backend.getCoachConversations.resources.lambda,
  backend.getCoachConversation.resources.lambda,
  backend.updateCoachConversation.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
  backend.getWorkouts.resources.lambda,
  backend.getWorkout.resources.lambda,
  backend.updateWorkout.resources.lambda,
  backend.deleteWorkout.resources.lambda,
  backend.getWorkoutsCount.resources.lambda,
  backend.getConversationsCount.resources.lambda,
  backend.getWeeklyReports.resources.lambda,
  backend.getWeeklyReport.resources.lambda,
  backend.getMemories.resources.lambda,
  backend.deleteMemory.resources.lambda,
  backend.deleteCoachConversation.resources.lambda
);

// Create DynamoDB table
const coreTable = dynamodbTable.createCoreTable(backend.helloWorld.stack);

// Grant DynamoDB permissions to contact form function
coreTable.table.grantWriteData(backend.contactForm.resources.lambda);

// Grant DynamoDB permissions to coach creator functions (read and write)
coreTable.table.grantReadWriteData(
  backend.createCoachCreatorSession.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.updateCoachCreatorSession.resources.lambda
);
coreTable.table.grantReadWriteData(backend.buildCoachConfig.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfigs.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfig.resources.lambda);
coreTable.table.grantReadWriteData(
  backend.getCoachConfigStatus.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.getCoachCreatorSession.resources.lambda
);

// Grant DynamoDB permissions to coach template functions (read and write)
coreTable.table.grantReadData(backend.getCoachTemplates.resources.lambda);
coreTable.table.grantReadData(backend.getCoachTemplate.resources.lambda);
coreTable.table.grantReadWriteData(
  backend.createCoachConfigFromTemplate.resources.lambda
);

// Grant DynamoDB permissions to coach conversation functions (read and write)
coreTable.table.grantReadWriteData(
  backend.createCoachConversation.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.getCoachConversations.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.getCoachConversation.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.updateCoachConversation.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.sendCoachConversationMessage.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.deleteCoachConversation.resources.lambda
);

// Grant DynamoDB permissions to workout functions (read and write)
coreTable.table.grantReadWriteData(backend.buildWorkout.resources.lambda);
coreTable.table.grantReadWriteData(
  backend.buildConversationSummary.resources.lambda
);
coreTable.table.grantReadWriteData(backend.getWorkouts.resources.lambda);
coreTable.table.grantReadWriteData(backend.getWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.updateWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.deleteWorkout.resources.lambda);
coreTable.table.grantReadData(backend.getWorkoutsCount.resources.lambda);
coreTable.table.grantReadData(backend.getConversationsCount.resources.lambda);
coreTable.table.grantReadWriteData(
  backend.buildWeeklyAnalytics.resources.lambda
);
coreTable.table.grantReadData(backend.getWeeklyReports.resources.lambda);
coreTable.table.grantReadData(backend.getWeeklyReport.resources.lambda);

// Grant DynamoDB permissions to memory functions
coreTable.table.grantReadData(backend.getMemories.resources.lambda);
coreTable.table.grantReadWriteData(backend.deleteMemory.resources.lambda);

// Add environment variables to all functions
const allFunctions = [
  backend.helloWorld,
  backend.contactForm,
  backend.createCoachCreatorSession,
  backend.updateCoachCreatorSession,
  backend.buildCoachConfig,
  backend.getCoachConfigs,
  backend.getCoachConfig,
  backend.getCoachConfigStatus,
  backend.getCoachCreatorSession,
  backend.createCoachConversation,
  backend.getCoachConversations,
  backend.getCoachConversation,
  backend.updateCoachConversation,
  backend.sendCoachConversationMessage,
  backend.buildWorkout,
  backend.buildConversationSummary,
  backend.getWorkouts,
  backend.getWorkout,
  backend.updateWorkout,
  backend.deleteWorkout,
  backend.getWorkoutsCount,
  backend.getConversationsCount,
  backend.buildWeeklyAnalytics,
  backend.getWeeklyReports,
  backend.getWeeklyReport,
  backend.getMemories,
  backend.deleteMemory,
  backend.deleteCoachConversation,
  backend.getCoachTemplates,
  backend.getCoachTemplate,
  backend.createCoachConfigFromTemplate,
];

allFunctions.forEach((func) => {
  func.addEnvironment("DYNAMODB_TABLE_NAME", coreTable.table.tableName);
  func.addEnvironment("PINECONE_API_KEY", config.PINECONE_API_KEY);
});

// Grant Bedrock permissions to functions that need it
grantBedrockPermissions([
  backend.helloWorld.resources.lambda,
  backend.updateCoachCreatorSession.resources.lambda,
  backend.buildCoachConfig.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
  backend.buildWorkout.resources.lambda,
  backend.buildConversationSummary.resources.lambda,
  backend.buildWeeklyAnalytics.resources.lambda,
]);

// Grant S3 debug permissions to functions that need it
grantS3DebugPermissions([
  backend.buildWorkout.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
]);

// Grant S3 analytics permissions to functions that need it
grantS3AnalyticsPermissions([backend.buildWeeklyAnalytics.resources.lambda]);

// Grant permission to updateCoachCreatorSession to invoke buildCoachConfig
grantLambdaInvokePermissions(
  backend.updateCoachCreatorSession.resources.lambda,
  [backend.buildCoachConfig.resources.lambda.functionArn]
);

// Grant permission to sendCoachConversationMessage to invoke buildWorkout and buildConversationSummary
grantLambdaInvokePermissions(
  backend.sendCoachConversationMessage.resources.lambda,
  [
    backend.buildWorkout.resources.lambda.functionArn,
    backend.buildConversationSummary.resources.lambda.functionArn,
  ]
);

backend.updateCoachCreatorSession.addEnvironment(
  "BUILD_COACH_CONFIG_FUNCTION_NAME",
  backend.buildCoachConfig.resources.lambda.functionName
);
backend.sendCoachConversationMessage.addEnvironment(
  "BUILD_WORKOUT_FUNCTION_NAME",
  backend.buildWorkout.resources.lambda.functionName
);
backend.sendCoachConversationMessage.addEnvironment(
  "BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME",
  backend.buildConversationSummary.resources.lambda.functionName
);

// Create EventBridge schedule for weekly analytics
const weeklyAnalyticsSchedule = createWeeklyAnalyticsSchedule(
  backend.buildWeeklyAnalytics.stack,
  backend.buildWeeklyAnalytics.resources.lambda
);

// Output the API URL and DynamoDB table info
backend.addOutput({
  custom: {
    api: {
      [coreApi.httpApi.httpApiId!]: {
        endpoint: coreApi.httpApi.apiEndpoint,
        customEndpoint: `https://${coreApi.domainName}`,
        region: backend.helloWorld.stack.region,
        apiName: coreApi.httpApi.httpApiName,
        domainName: coreApi.domainName,
      },
    },
    dynamodb: {
      coreTable: {
        tableName: coreTable.table.tableName,
        tableArn: coreTable.table.tableArn,
        region: backend.helloWorld.stack.region,
      },
    },
  },
});
