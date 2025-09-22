import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { postConfirmation } from "./functions/post-confirmation/resource";
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { getBranchInfo, createBranchAwareResourceName } from "./functions/libs/branch-naming";
import { contactForm } from "./functions/contact-form/resource";
import { createCoachCreatorSession } from "./functions/create-coach-creator-session/resource";
import { updateCoachCreatorSession } from "./functions/update-coach-creator-session/resource";
import { buildCoachConfig } from "./functions/build-coach-config/resource";
import { getCoachConfigs } from "./functions/get-coach-configs/resource";
import { getCoachConfig } from "./functions/get-coach-config/resource";
import { getCoachConfigStatus } from "./functions/get-coach-config-status/resource";
import { getCoachCreatorSession } from "./functions/get-coach-creator-session/resource";
import { getCoachCreatorSessions } from "./functions/get-coach-creator-sessions/resource";
import { deleteCoachCreatorSession } from "./functions/delete-coach-creator-session/resource";
import { getCoachTemplates } from "./functions/get-coach-templates/resource";
import { getCoachTemplate } from "./functions/get-coach-template/resource";
import { createCoachConfigFromTemplate } from "./functions/create-coach-config-from-template/resource";
import { createCoachConversation } from "./functions/create-coach-conversation/resource";
import { getCoachConversations } from "./functions/get-coach-conversations/resource";
import { getCoachConversation } from "./functions/get-coach-conversation/resource";
import { updateCoachConversation } from "./functions/update-coach-conversation/resource";
import { sendCoachConversationMessage } from "./functions/send-coach-conversation-message/resource";
import { createWorkout } from "./functions/create-workout/resource";
import { buildWorkout } from "./functions/build-workout/resource";
import { buildConversationSummary } from "./functions/build-conversation-summary/resource";
import { getWorkouts } from "./functions/get-workouts/resource";
import { getWorkout } from "./functions/get-workout/resource";
import { updateWorkout } from "./functions/update-workout/resource";
import { deleteWorkout } from "./functions/delete-workout/resource";
import { getWorkoutsCount } from "./functions/get-workouts-count/resource";
import { getCoachConversationsCount } from "./functions/get-coach-conversations-count/resource";
import {
  buildWeeklyAnalytics,
  createWeeklyAnalyticsSchedule,
} from "./functions/build-weekly-analytics/resource";
import { getWeeklyReports } from "./functions/get-weekly-reports/resource";
import { getWeeklyReport } from "./functions/get-weekly-report/resource";
import { getMemories } from "./functions/get-memories/resource";
import { createMemory } from "./functions/create-memory/resource";
import { deleteMemory } from "./functions/delete-memory/resource";
import { deleteCoachConversation } from "./functions/delete-coach-conversation/resource";
import { forwardLogsToSns } from "./functions/forward-logs-to-sns/resource";
import { apiGatewayv2 } from "./api/resource";
import { dynamodbTable } from "./dynamodb/resource";
import { createContactFormNotificationTopic, createErrorMonitoringTopic } from "./sns/resource";
import {
  grantBedrockPermissions,
  grantLambdaInvokePermissions,
  grantS3DebugPermissions,
  grantS3AnalyticsPermissions,
  grantCognitoAdminPermissions,
  grantDynamoDBPermissions,
  grantDynamoDBThroughputPermissions,
} from "./iam-policies";
import { config } from "./functions/libs/configs";
import { ErrorMonitoring } from "./functions/libs/error-monitoring";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  postConfirmation,
  contactForm,
  createCoachCreatorSession,
  updateCoachCreatorSession,
  buildCoachConfig,
  getCoachConfigs,
  getCoachConfig,
  getCoachConfigStatus,
  getCoachCreatorSession,
  getCoachCreatorSessions,
  deleteCoachCreatorSession,
  getCoachTemplates,
  getCoachTemplate,
  createCoachConfigFromTemplate,
  createCoachConversation,
  getCoachConversations,
  getCoachConversation,
  updateCoachConversation,
  sendCoachConversationMessage,
  createWorkout,
  buildWorkout,
  buildConversationSummary,
  getWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutsCount,
  getCoachConversationsCount,
  buildWeeklyAnalytics,
  getWeeklyReports,
  getWeeklyReport,
  getMemories,
  createMemory,
  deleteMemory,
  deleteCoachConversation,
  forwardLogsToSns,
});

// Create User Pool authorizer
const userPoolAuthorizer = new HttpUserPoolAuthorizer(
  'UserPoolAuthorizer',
  backend.auth.resources.userPool,
  {
    userPoolClients: [backend.auth.resources.userPoolClient],
  }
);

// Create the Core API with all endpoints
const coreApi = apiGatewayv2.createCoreApi(
  backend.contactForm.stack,
  backend.contactForm.resources.lambda,
  backend.createCoachCreatorSession.resources.lambda,
  backend.updateCoachCreatorSession.resources.lambda,
  backend.getCoachConfigs.resources.lambda,
  backend.getCoachConfig.resources.lambda,
  backend.getCoachConfigStatus.resources.lambda,
  backend.getCoachCreatorSession.resources.lambda,
  backend.getCoachCreatorSessions.resources.lambda,
  backend.deleteCoachCreatorSession.resources.lambda,
  backend.getCoachTemplates.resources.lambda,
  backend.getCoachTemplate.resources.lambda,
  backend.createCoachConfigFromTemplate.resources.lambda,
  backend.createCoachConversation.resources.lambda,
  backend.getCoachConversations.resources.lambda,
  backend.getCoachConversation.resources.lambda,
  backend.updateCoachConversation.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
  backend.createWorkout.resources.lambda,
  backend.getWorkouts.resources.lambda,
  backend.getWorkout.resources.lambda,
  backend.updateWorkout.resources.lambda,
  backend.deleteWorkout.resources.lambda,
  backend.getWorkoutsCount.resources.lambda,
  backend.getCoachConversationsCount.resources.lambda,
  backend.getWeeklyReports.resources.lambda,
  backend.getWeeklyReport.resources.lambda,
  backend.getMemories.resources.lambda,
  backend.createMemory.resources.lambda,
  backend.deleteMemory.resources.lambda,
  backend.deleteCoachConversation.resources.lambda,
  userPoolAuthorizer
);

// Create DynamoDB table
const coreTable = dynamodbTable.createCoreTable(backend.contactForm.stack);

// Create SNS topics for notifications
const contactFormNotifications = createContactFormNotificationTopic(backend.contactForm.stack);
const errorMonitoringTopic = createErrorMonitoringTopic(backend.contactForm.stack);

// Set up centralized error monitoring for all Lambda functions
const errorMonitoring = new ErrorMonitoring(
  backend.contactForm.stack,
  'ErrorMonitoring',
  {
    errorTopic: errorMonitoringTopic.topic,
    forwarderFunction: backend.forwardLogsToSns.resources.lambda,
  }
);

// Get branch information for S3 policies
const branchInfo = getBranchInfo(backend.contactForm.stack);
const branchName = branchInfo.isSandbox
  ? `sandbox-${branchInfo.stackId}`
  : branchInfo.branchName;

// Grant DynamoDB permissions to contact form function
coreTable.table.grantWriteData(backend.contactForm.resources.lambda);

// Grant SNS permissions to contact form function
contactFormNotifications.topic.grantPublish(backend.contactForm.resources.lambda);

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
coreTable.table.grantReadData(
  backend.getCoachCreatorSessions.resources.lambda
);
coreTable.table.grantReadWriteData(
  backend.deleteCoachCreatorSession.resources.lambda
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
coreTable.table.grantReadData(backend.createWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.buildWorkout.resources.lambda);
coreTable.table.grantReadWriteData(
  backend.buildConversationSummary.resources.lambda
);
coreTable.table.grantReadWriteData(backend.getWorkouts.resources.lambda);
coreTable.table.grantReadWriteData(backend.getWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.updateWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.deleteWorkout.resources.lambda);
coreTable.table.grantReadData(backend.getWorkoutsCount.resources.lambda);
coreTable.table.grantReadData(backend.getCoachConversationsCount.resources.lambda);
coreTable.table.grantReadWriteData(
  backend.buildWeeklyAnalytics.resources.lambda
);
coreTable.table.grantReadData(backend.getWeeklyReports.resources.lambda);
coreTable.table.grantReadData(backend.getWeeklyReport.resources.lambda);

// Grant DynamoDB permissions to memory functions
coreTable.table.grantReadData(backend.getMemories.resources.lambda);
coreTable.table.grantReadWriteData(backend.createMemory.resources.lambda);
coreTable.table.grantReadWriteData(backend.deleteMemory.resources.lambda);

// Add environment variables to all functions (excluding post-confirmation due to circular dependency)
const allFunctions = [
  backend.contactForm,
  backend.createCoachCreatorSession,
  backend.updateCoachCreatorSession,
  backend.buildCoachConfig,
  backend.getCoachConfigs,
  backend.getCoachConfig,
  backend.getCoachConfigStatus,
  backend.getCoachCreatorSession,
  backend.getCoachCreatorSessions,
  backend.deleteCoachCreatorSession,
  backend.createCoachConversation,
  backend.getCoachConversations,
  backend.getCoachConversation,
  backend.updateCoachConversation,
  backend.sendCoachConversationMessage,
  backend.createWorkout,
  backend.buildWorkout,
  backend.buildConversationSummary,
  backend.getWorkouts,
  backend.getWorkout,
  backend.updateWorkout,
  backend.deleteWorkout,
  backend.getWorkoutsCount,
  backend.getCoachConversationsCount,
  backend.buildWeeklyAnalytics,
  backend.getWeeklyReports,
  backend.getWeeklyReport,
  backend.getMemories,
  backend.createMemory,
  backend.deleteMemory,
  backend.deleteCoachConversation,
  backend.getCoachTemplates,
  backend.getCoachTemplate,
  backend.createCoachConfigFromTemplate,
];

allFunctions.forEach((func) => {
  func.addEnvironment("DYNAMODB_TABLE_NAME", coreTable.table.tableName);
  func.addEnvironment("PINECONE_API_KEY", config.PINECONE_API_KEY);
  func.addEnvironment("BRANCH_NAME", branchName);

  // DynamoDB throughput scaling configuration
  func.addEnvironment("DYNAMODB_BASE_READ_CAPACITY", "5");
  func.addEnvironment("DYNAMODB_BASE_WRITE_CAPACITY", "5");
  func.addEnvironment("DYNAMODB_MAX_READ_CAPACITY", "100");
  func.addEnvironment("DYNAMODB_MAX_WRITE_CAPACITY", "50");
  func.addEnvironment("DYNAMODB_SCALE_UP_FACTOR", "2.0");
  func.addEnvironment("DYNAMODB_MAX_RETRIES", "5");
  func.addEnvironment("DYNAMODB_INITIAL_RETRY_DELAY", "1000");
  func.addEnvironment("DYNAMODB_SCALE_DOWN_DELAY_MINUTES", "10");
});

// Set up error monitoring for all Lambda functions using allFunctions array
console.info('🔍 Setting up error monitoring for all Lambda functions...');
errorMonitoring.monitorFunctions(allFunctions);
console.info(`✅ Error monitoring configured for ${allFunctions.length} Lambda functions (excluding forwarder)`);

// Handle post-confirmation separately due to circular dependency
// It's in the auth stack but needs to reference the DynamoDB table in contactForm stack
backend.postConfirmation.addEnvironment("BRANCH_NAME", branchName);

// Add error monitoring for post-confirmation function (in auth stack)
errorMonitoring.monitorFunction(backend.postConfirmation.resources.lambda, 'postConfirmation');
console.info('✅ Error monitoring configured for postConfirmation function');

// Configure the log-to-SNS forwarder function (not monitored to avoid circular reference)
backend.forwardLogsToSns.addEnvironment("SNS_TOPIC_ARN", errorMonitoringTopic.topicArn);
errorMonitoringTopic.topic.grantPublish(backend.forwardLogsToSns.resources.lambda);
console.info('✅ Log-to-SNS forwarder configured (excluded from error monitoring)');

// Add SNS topic ARN to contact form function
backend.contactForm.addEnvironment("CONTACT_FORM_TOPIC_ARN", contactFormNotifications.topic.topicArn);

// Grant Bedrock permissions to functions that need it
grantBedrockPermissions([
  backend.updateCoachCreatorSession.resources.lambda,
  backend.buildCoachConfig.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
  backend.buildWorkout.resources.lambda,
  backend.buildConversationSummary.resources.lambda,
  backend.buildWeeklyAnalytics.resources.lambda,
  backend.createMemory.resources.lambda, // Added for AI scope detection
]);

// Grant S3 debug permissions to functions that need it
grantS3DebugPermissions([
  backend.buildWorkout.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
], branchName);

// Grant S3 analytics permissions to functions that need it
grantS3AnalyticsPermissions([backend.buildWeeklyAnalytics.resources.lambda], branchName);

// Grant DynamoDB throughput management permissions to high-volume functions
grantDynamoDBThroughputPermissions([
  backend.getWorkouts.resources.lambda,
  backend.getWorkoutsCount.resources.lambda,
  backend.buildWeeklyAnalytics.resources.lambda,
  backend.getWeeklyReports.resources.lambda,
  backend.getCoachConversationsCount.resources.lambda,
  backend.getCoachConversations.resources.lambda,
]);

// Grant permission to updateCoachCreatorSession to invoke buildCoachConfig
grantLambdaInvokePermissions(
  backend.updateCoachCreatorSession.resources.lambda,
  [backend.buildCoachConfig.resources.lambda.functionArn]
);

// Grant permission to createWorkout to invoke buildWorkout
grantLambdaInvokePermissions(
  backend.createWorkout.resources.lambda,
  [backend.buildWorkout.resources.lambda.functionArn]
);

// Grant permission to sendCoachConversationMessage to invoke buildWorkout and buildConversationSummary
grantLambdaInvokePermissions(
  backend.sendCoachConversationMessage.resources.lambda,
  [
    backend.buildWorkout.resources.lambda.functionArn,
    backend.buildConversationSummary.resources.lambda.functionArn,
  ]
);

// Grant permission to createCoachConversation to invoke sendCoachConversationMessage
grantLambdaInvokePermissions(
  backend.createCoachConversation.resources.lambda,
  [backend.sendCoachConversationMessage.resources.lambda.functionArn]
);

backend.updateCoachCreatorSession.addEnvironment(
  "BUILD_COACH_CONFIG_FUNCTION_NAME",
  backend.buildCoachConfig.resources.lambda.functionName
);

backend.createWorkout.addEnvironment(
  "BUILD_WORKOUT_FUNCTION_NAME",
  backend.buildWorkout.resources.lambda.functionName
);

backend.sendCoachConversationMessage.addEnvironment(
  "BUILD_WORKOUT_FUNCTION_NAME",
  backend.buildWorkout.resources.lambda.functionName
);
backend.sendCoachConversationMessage.addEnvironment(
  "BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME",
  backend.buildConversationSummary.resources.lambda.functionName
);

backend.createCoachConversation.addEnvironment(
  "SEND_COACH_CONVERSATION_MESSAGE_FUNCTION_NAME",
  backend.sendCoachConversationMessage.resources.lambda.functionName
);

// Create EventBridge schedule for weekly analytics
const weeklyAnalyticsSchedule = createWeeklyAnalyticsSchedule(
  backend.buildWeeklyAnalytics.stack,
  backend.buildWeeklyAnalytics.resources.lambda
);

// Configure password policy and advanced security via CDK
const { cfnUserPool } = backend.auth.resources.cfnResources;

// Apply branch-aware naming to User Pool
const { resourceName: userPoolName } = createBranchAwareResourceName(
  backend.contactForm.stack,
  'NeonPanda-UserPool',
  'Cognito User Pool'
);
cfnUserPool.userPoolName = userPoolName;

// Apply branch-aware naming to User Pool Client
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;
const { resourceName: userPoolClientName } = createBranchAwareResourceName(
  backend.contactForm.stack,
  'NeonPanda-UserPoolClient',
  'Cognito User Pool Client'
);
cfnUserPoolClient.clientName = userPoolClientName;

// Configure User Pool Client with additional auth flows for API testing
const baseAuthFlows = [
  "ALLOW_USER_SRP_AUTH",      // Current default (what your React app uses)
  "ALLOW_CUSTOM_AUTH",        // For custom auth flows
  "ALLOW_REFRESH_TOKEN_AUTH"  // For token refresh
];

// Add API testing flows only for non-production environments
const apiTestingFlows = [
  "ALLOW_USER_PASSWORD_AUTH",      // For simple Postman automation
  "ALLOW_ADMIN_USER_PASSWORD_AUTH" // For AWS CLI (bonus)
];

// Only enable API testing flows for sandbox and develop branches
const shouldEnableApiTesting = branchInfo.isSandbox || branchInfo.branchName === 'develop';

cfnUserPoolClient.explicitAuthFlows = shouldEnableApiTesting
  ? [...baseAuthFlows, ...apiTestingFlows]
  : baseAuthFlows;

console.info('🔐 Auth Flows Configuration:', {
  branch: branchInfo.branchName,
  isSandbox: branchInfo.isSandbox,
  apiTestingEnabled: shouldEnableApiTesting,
  authFlows: cfnUserPoolClient.explicitAuthFlows
});

cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,  // Keep user-friendly for fitness enthusiasts
  },
};

// Configure post-confirmation Lambda IAM permissions via CDK
const postConfirmationLambda = backend.postConfirmation.resources.lambda;

// Grant permissions using centralized policy helpers
grantCognitoAdminPermissions([postConfirmationLambda]);
grantDynamoDBPermissions([postConfirmationLambda]);
grantDynamoDBThroughputPermissions([postConfirmationLambda]);

// Enable Cognito Advanced Security Features (Plus tier)
cfnUserPool.userPoolAddOns = {
  advancedSecurityMode: 'ENFORCED'  // Options: 'OFF', 'AUDIT', 'ENFORCED'
};

// Output the API URL and DynamoDB table info
backend.addOutput({
  custom: {
    api: {
      [coreApi.httpApi.httpApiId!]: {
        endpoint: coreApi.httpApi.apiEndpoint,
        customEndpoint: `https://${coreApi.domainName}`,
        region: backend.contactForm.stack.region,
        apiName: coreApi.httpApi.httpApiName,
        domainName: coreApi.domainName,
      },
    },
    dynamodb: {
      coreTable: {
        tableName: coreTable.table.tableName,
        tableArn: coreTable.table.tableArn,
        region: backend.contactForm.stack.region,
      },
    },
  },
});
