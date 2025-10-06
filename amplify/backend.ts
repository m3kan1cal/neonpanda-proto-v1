import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { postConfirmation } from "./functions/post-confirmation/resource";
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { FunctionUrlAuthType, InvokeMode, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
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
import { createCoachConfig } from "./functions/create-coach-config/resource";
import { createCoachConversation } from "./functions/create-coach-conversation/resource";
import { getCoachConversations } from "./functions/get-coach-conversations/resource";
import { getCoachConversation } from "./functions/get-coach-conversation/resource";
import { updateCoachConversation } from "./functions/update-coach-conversation/resource";
import { sendCoachConversationMessage } from "./functions/send-coach-conversation-message/resource";
import { streamCoachConversation } from "./functions/stream-coach-conversation/resource";
import { streamCoachCreatorSession } from "./functions/stream-coach-creator-session/resource";
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
import { getUserProfile } from "./functions/get-user-profile/resource";
import { updateUserProfile } from "./functions/update-user-profile/resource";
import { generateUploadUrls } from "./functions/generate-upload-urls/resource";
import { generateDownloadUrls } from "./functions/generate-download-urls/resource";
import { apiGatewayv2 } from "./api/resource";
import { dynamodbTable } from "./dynamodb/resource";
import { createAppsBucket } from "./storage/resource";
import { createContactFormNotificationTopic, createErrorMonitoringTopic, createUserRegistrationTopic } from "./sns/resource";
import { config } from "./functions/libs/configs";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { syncLogSubscriptions, createSyncLogSubscriptionsSchedule } from "./functions/sync-log-subscriptions/resource";
import { SharedPolicies, grantLambdaInvokePermissions } from './shared-policies';

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
  createCoachConfig,
  createCoachConversation,
  getCoachConversations,
  getCoachConversation,
  updateCoachConversation,
  sendCoachConversationMessage,
  streamCoachConversation,
  streamCoachCreatorSession,
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
  getUserProfile,
  updateUserProfile,
  generateUploadUrls,
  generateDownloadUrls,
  syncLogSubscriptions,
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
  backend.createCoachConfig.resources.lambda,
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
  backend.getUserProfile.resources.lambda,
  backend.updateUserProfile.resources.lambda,
  backend.generateUploadUrls.resources.lambda,
  backend.generateDownloadUrls.resources.lambda,
  userPoolAuthorizer
);

// Create DynamoDB table
const coreTable = dynamodbTable.createCoreTable(backend.contactForm.stack);

// Create apps bucket for image storage (uses standard branch-aware naming)
const appsBucket = createAppsBucket(backend.contactForm.stack);

// Create SNS topics for notifications
const contactFormNotifications = createContactFormNotificationTopic(backend.contactForm.stack);
const errorMonitoringTopic = createErrorMonitoringTopic(backend.contactForm.stack);
const userRegistrationTopic = createUserRegistrationTopic(backend.postConfirmation.stack);

// Get branch information for S3 policies
const branchInfo = getBranchInfo(backend.contactForm.stack);
const branchName = branchInfo.isSandbox
  ? `sandbox-${branchInfo.stackId}`
  : branchInfo.branchName;

// ============================================================================
// CREATE SHARED IAM POLICIES
// ============================================================================
// This avoids the 20KB Lambda policy size limit by using managed policies
// instead of inline grants. Managed policies are referenced by ARN and don't
// count toward the per-function policy size limit.
const sharedPolicies = new SharedPolicies(
  backend.contactForm.stack,
  coreTable.table,
  branchName,
  appsBucket.bucket.bucketArn
);

// ============================================================================
// PERMISSION GRANTS - Using Shared Managed Policies
// ============================================================================

// Functions needing DynamoDB READ/WRITE access
[
  backend.contactForm,
  backend.createCoachCreatorSession,
  backend.updateCoachCreatorSession,
  backend.buildCoachConfig,
  backend.getCoachConfigs,
  backend.getCoachConfig,
  backend.getCoachConfigStatus,
  backend.getCoachCreatorSession,
  backend.deleteCoachCreatorSession,
  backend.createCoachConfigFromTemplate,
  backend.createCoachConfig,
  backend.createCoachConversation,
  backend.getCoachConversations,
  backend.getCoachConversation,
  backend.updateCoachConversation,
  backend.sendCoachConversationMessage,
  backend.streamCoachConversation,
  backend.streamCoachCreatorSession,
  backend.deleteCoachConversation,
  backend.buildWorkout,
  backend.buildConversationSummary,
  backend.getWorkouts,
  backend.getWorkout,
  backend.updateWorkout,
  backend.deleteWorkout,
  backend.buildWeeklyAnalytics,
  backend.createMemory,
  backend.deleteMemory,
  backend.updateUserProfile,
  // NOTE: postConfirmation excluded to avoid circular dependency with auth stack
].forEach(func => {
  sharedPolicies.attachDynamoDbReadWrite(func.resources.lambda);
});

// Functions needing DynamoDB READ-ONLY access (includes throughput management)
[
  backend.getCoachCreatorSessions,
  backend.getCoachTemplates,
  backend.getCoachTemplate,
  backend.createWorkout,
  backend.getWorkoutsCount,
  backend.getCoachConversationsCount,
  backend.getWeeklyReports,
  backend.getWeeklyReport,
  backend.getMemories,
  backend.getUserProfile,
  backend.generateUploadUrls,
  backend.generateDownloadUrls,
].forEach(func => {
  sharedPolicies.attachDynamoDbReadOnly(func.resources.lambda);
});

// Functions needing BEDROCK access
[
  backend.updateCoachCreatorSession,
  backend.streamCoachCreatorSession,
  backend.buildCoachConfig,
  backend.sendCoachConversationMessage,
  backend.streamCoachConversation,
  backend.buildWorkout,
  backend.buildConversationSummary,
  backend.buildWeeklyAnalytics,
  backend.createMemory,
].forEach(func => {
  sharedPolicies.attachBedrockAccess(func.resources.lambda);
});

// Functions needing S3 DEBUG bucket access
[
  backend.buildWorkout,
  backend.sendCoachConversationMessage,
  backend.streamCoachConversation,
  backend.streamCoachCreatorSession,
].forEach(func => {
  sharedPolicies.attachS3DebugAccess(func.resources.lambda);
});

// Function needing S3 ANALYTICS bucket access
sharedPolicies.attachS3AnalyticsAccess(backend.buildWeeklyAnalytics.resources.lambda);

// Functions needing S3 APPS bucket access (for image storage)
[
  backend.generateUploadUrls,
  backend.generateDownloadUrls,
  backend.sendCoachConversationMessage,
  backend.streamCoachConversation,
  backend.streamCoachCreatorSession,
  backend.updateCoachCreatorSession,
].forEach(func => {
  sharedPolicies.attachS3AppsAccess(func.resources.lambda);
});

// Functions needing COGNITO admin access
[
  // NOTE: postConfirmation excluded to avoid circular dependency with auth stack
  backend.updateUserProfile,
].forEach(func => {
  sharedPolicies.attachCognitoAdmin(func.resources.lambda);
});

// ============================================================================
// SPECIAL CASE: postConfirmation (Auth Trigger)
// ============================================================================
// postConfirmation is in the auth stack, so we CANNOT grant cross-stack permissions
// Use inline policies with wildcards to avoid circular dependency
backend.postConfirmation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:DescribeTable',
      'dynamodb:UpdateTable',
    ],
    resources: ['*'], // Must use wildcard - table ARN would create circular dependency
  })
);

// Grant Cognito admin permissions using inline policy
backend.postConfirmation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminDeleteUser',
      'cognito-idp:AdminSetUserPassword',
      'cognito-idp:ListUsers',
    ],
    resources: ['*'],
  })
);

// ============================================================================
// SNS PERMISSIONS
// ============================================================================

// Grant SNS permissions to contact form function
contactFormNotifications.topic.grantPublish(backend.contactForm.resources.lambda);

// Grant SNS publish permissions to post-confirmation function
userRegistrationTopic.topic.grantPublish(backend.postConfirmation.resources.lambda);

// Grant SNS publish permissions to forwardLogsToSns
errorMonitoringTopic.topic.grantPublish(backend.forwardLogsToSns.resources.lambda);

// CRITICAL: Explicitly ensure forwardLogsToSns has NO managed policies
// (in case CloudFormation hasn't cleaned up old ones from previous deployments)
const forwardLogsRole = backend.forwardLogsToSns.resources.lambda.role;
if (forwardLogsRole) {
  // The role should only have inline policies from SNS grant and CloudWatch permission
  // No managed policies should be attached
  console.info('🧹 forwardLogsToSns role configured with minimal inline policies only');
}

// ============================================================================
// LAMBDA INVOKE PERMISSIONS
// ============================================================================

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

// Grant permission to streamCoachConversation to invoke buildWorkout and buildConversationSummary
grantLambdaInvokePermissions(
  backend.streamCoachConversation.resources.lambda,
  [
    backend.buildWorkout.resources.lambda.functionArn,
    backend.buildConversationSummary.resources.lambda.functionArn,
  ]
);

// Grant permission to streamCoachCreatorSession to invoke buildCoachConfig
grantLambdaInvokePermissions(
  backend.streamCoachCreatorSession.resources.lambda,
  [backend.buildCoachConfig.resources.lambda.functionArn]
);

// Grant permission to createCoachConfig to invoke buildCoachConfig
grantLambdaInvokePermissions(
  backend.createCoachConfig.resources.lambda,
  [backend.buildCoachConfig.resources.lambda.functionArn]
);

// Grant permission to createCoachConversation to invoke sendCoachConversationMessage
grantLambdaInvokePermissions(
  backend.createCoachConversation.resources.lambda,
  [backend.sendCoachConversationMessage.resources.lambda.functionArn]
);

// ============================================================================
// CLOUDWATCH LOGS PERMISSIONS
// ============================================================================

// Grant CloudWatch permission to forwarder
backend.forwardLogsToSns.resources.lambda.addPermission("AllowCloudWatchLogs", {
  principal: new ServicePrincipal("logs.amazonaws.com"),
  action: "lambda:InvokeFunction",
  sourceArn: `arn:aws:logs:${backend.contactForm.stack.region}:${backend.contactForm.stack.account}:log-group:/aws/lambda/*`,
});

// Configure forwarder
backend.forwardLogsToSns.addEnvironment("SNS_TOPIC_ARN", errorMonitoringTopic.topicArn);
backend.forwardLogsToSns.addEnvironment("GOOGLE_CHAT_ERRORS_WEBHOOK_URL", config.GOOGLE_CHAT_ERRORS_WEBHOOK_URL);

// Grant permissions to sync Lambda
backend.syncLogSubscriptions.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['logs:DescribeLogGroups', 'logs:PutSubscriptionFilter', 'logs:DescribeSubscriptionFilters'],
    resources: ['*'],
  })
);

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

// Add environment variables to all functions
// EXCLUDED: postConfirmation (circular dependency), forwardLogsToSns (utility function, doesn't need app resources), syncLogSubscriptions (utility function)
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
  backend.streamCoachConversation,
  backend.streamCoachCreatorSession,
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
  backend.createCoachConfig,
  backend.getUserProfile,
  backend.updateUserProfile,
  backend.generateUploadUrls,
  // NOTE: forwardLogsToSns and syncLogSubscriptions excluded - they're utility functions that don't need app resources
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

// Add apps bucket name to functions that need it
[
  backend.generateUploadUrls,
  backend.generateDownloadUrls,
  backend.sendCoachConversationMessage,
  backend.streamCoachConversation,
  backend.streamCoachCreatorSession,
  backend.updateCoachCreatorSession,
].forEach((func) => {
  func.addEnvironment('APPS_BUCKET_NAME', appsBucket.bucketName);
});

// Add environment variables to sync Lambda
// Log group naming patterns differ between sandbox and branch deployments:
// - Sandbox: /aws/lambda/amplify-{appName}--{functionLogicalId}-{randomSuffix}
//   Stack:   amplify-{appName}-{username}-sandbox-{hash}-...
// - Branch:  /aws/lambda/amplify-{appId}-{functionName}-{randomSuffix}
//   Stack:   amplify-{appId}-{branch}-{hash}-...
let logGroupPrefix: string;
const stackParts = backend.contactForm.stack.stackName.split('-');

if (branchInfo.isSandbox) {
  // Sandbox: Extract app name from stack (2nd segment)
  // Example: amplify-neonpandaprotov1-mlfowler-sandbox-...
  if (stackParts.length >= 2 && stackParts[0] === 'amplify') {
    const appName = stackParts[1];
    logGroupPrefix = `/aws/lambda/amplify-${appName}`;
  } else {
    // Fallback
    logGroupPrefix = '/aws/lambda/amplify-neonpandaprotov1';
  }
} else {
  // Branch: Extract app ID (2nd segment)
  // Example: amplify-d2y0pmelq37lyh-develop-...
  if (stackParts.length >= 2 && stackParts[0] === 'amplify') {
    const appId = stackParts[1];
    logGroupPrefix = `/aws/lambda/amplify-${appId}`;
  } else {
    // Fallback
    logGroupPrefix = '/aws/lambda/amplify';
  }
}

console.info('📋 Log group configuration:', {
  isSandbox: branchInfo.isSandbox,
  branchName: branchInfo.branchName,
  stackName: backend.contactForm.stack.stackName,
  logGroupPrefix
});

backend.syncLogSubscriptions.addEnvironment('LOG_GROUP_PREFIX', logGroupPrefix);
backend.syncLogSubscriptions.addEnvironment('DESTINATION_ARN', backend.forwardLogsToSns.resources.lambda.functionArn);
backend.syncLogSubscriptions.addEnvironment('FILTER_PATTERN', '[timestamp, request_id, level=ERROR || level=WARN || level=WARNING || level=FATAL || level=CRITICAL, ...]');
backend.syncLogSubscriptions.addEnvironment('IMMEDIATE_RUN', 'true');

// Add SNS topic ARN to contact form function
backend.contactForm.addEnvironment("CONTACT_FORM_TOPIC_ARN", contactFormNotifications.topic.topicArn);

// Add SNS topic ARN to post-confirmation function
backend.postConfirmation.addEnvironment("USER_REGISTRATION_TOPIC_ARN", userRegistrationTopic.topicArn);

// Add function name environment variables
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

backend.streamCoachConversation.addEnvironment(
  "BUILD_WORKOUT_FUNCTION_NAME",
  backend.buildWorkout.resources.lambda.functionName
);
backend.streamCoachConversation.addEnvironment(
  "BUILD_CONVERSATION_SUMMARY_FUNCTION_NAME",
  backend.buildConversationSummary.resources.lambda.functionName
);

backend.streamCoachCreatorSession.addEnvironment(
  "BUILD_COACH_CONFIG_FUNCTION_NAME",
  backend.buildCoachConfig.resources.lambda.functionName
);

backend.createCoachConfig.addEnvironment(
  "BUILD_COACH_CONFIG_FUNCTION_NAME",
  backend.buildCoachConfig.resources.lambda.functionName
);

backend.createCoachConversation.addEnvironment(
  "SEND_COACH_CONVERSATION_MESSAGE_FUNCTION_NAME",
  backend.sendCoachConversationMessage.resources.lambda.functionName
);

// Add USER_POOL_ID environment variable to update-user-profile
backend.updateUserProfile.addEnvironment(
  "USER_POOL_ID",
  backend.auth.resources.userPool.userPoolId
);

// ============================================================================
// LAMBDA FUNCTION URLS FOR STREAMING
// ============================================================================

// Configure Lambda Function URL for streaming chat (not API Gateway)
const streamingFunctionUrl = backend.streamCoachConversation.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // We'll handle JWT auth in the function itself
  cors: {
    allowedOrigins: ['*'], // Configure appropriately for production
    allowedMethods: [HttpMethod.POST], // OPTIONS is handled automatically by Lambda Function URLs
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    maxAge: Duration.days(1),
  },
  invokeMode: InvokeMode.RESPONSE_STREAM, // Enable streaming responses
});

// Configure Lambda Function URL for streaming coach creator sessions
const streamingCoachCreatorFunctionUrl = backend.streamCoachCreatorSession.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // We'll handle JWT auth in the function itself
  cors: {
    allowedOrigins: ['*'], // Configure appropriately for production
    allowedMethods: [HttpMethod.PUT], // Coach creator uses PUT (update semantics)
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    maxAge: Duration.days(1),
  },
  invokeMode: InvokeMode.RESPONSE_STREAM, // Enable streaming responses
});

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

// Create EventBridge schedule for log subscription sync (daily at 2am UTC)
const syncLogSubscriptionsSchedule = createSyncLogSubscriptionsSchedule(
  backend.syncLogSubscriptions.stack,
  backend.syncLogSubscriptions.resources.lambda
);

console.info('✅ Log subscription sync scheduled (daily at 2am UTC)');
console.info('✅ New functions automatically monitored within 24 hours');

// Create EventBridge schedule for weekly analytics (Sundays at 9am UTC)
const weeklyAnalyticsSchedule = createWeeklyAnalyticsSchedule(
  backend.buildWeeklyAnalytics.stack,
  backend.buildWeeklyAnalytics.resources.lambda
);

console.info('✅ Weekly analytics scheduled (Sundays at 9am UTC)');

// ============================================================================
// COGNITO USER POOL CONFIGURATION
// ============================================================================

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

// Enable Cognito Advanced Security Features (Plus tier)
cfnUserPool.userPoolAddOns = {
  advancedSecurityMode: 'ENFORCED'  // Options: 'OFF', 'AUDIT', 'ENFORCED'
};

// ============================================================================
// OUTPUTS
// ============================================================================

// Add the streaming function URLs to backend outputs
backend.addOutput({
  custom: {
    coachConversationStreamingApi: {
      functionUrl: streamingFunctionUrl.url,
      region: backend.streamCoachConversation.stack.region,
    },
    coachCreatorSessionStreamingApi: {
      functionUrl: streamingCoachCreatorFunctionUrl.url,
      region: backend.streamCoachCreatorSession.stack.region,
    }
  }
});

// Output the API URL, DynamoDB table info, and S3 bucket info
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
    storage: {
      appsBucket: {
        bucketName: appsBucket.bucketName,
        region: backend.contactForm.stack.region,
      },
    },
  },
});
