import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { helloWorld } from './functions/hello-world/resource';
import { contactForm } from './functions/contact-form/resource';
import { createCoachCreatorSession } from './functions/create-coach-creator-session/resource';
import { updateCoachCreatorSession } from './functions/update-coach-creator-session/resource';
import { buildCoachConfig } from './functions/build-coach-config/resource';
import { getCoachConfigs } from './functions/get-coach-configs/resource';
import { getCoachConfig } from './functions/get-coach-config/resource';
import { getCoachConfigStatus } from './functions/get-coach-config-status/resource';
import { getCoachCreatorSession } from './functions/get-coach-creator-session/resource';
import { createCoachConversation } from './functions/create-coach-conversation/resource';
import { getCoachConversations } from './functions/get-coach-conversations/resource';
import { getCoachConversation } from './functions/get-coach-conversation/resource';
import { updateCoachConversation } from './functions/update-coach-conversation/resource';
import { sendCoachConversationMessage } from './functions/send-coach-conversation-message/resource';
import { buildWorkout } from './functions/build-workout/resource';
import { getWorkouts } from './functions/get-workouts/resource';
import { getWorkout } from './functions/get-workout/resource';
import { updateWorkout } from './functions/update-workout/resource';
import { getWorkoutsCount } from './functions/get-workouts-count/resource';
import { apiGatewayv2 } from './api/resource';
import { dynamodbTable } from './dynamodb/resource';
import { grantBedrockPermissions, grantLambdaInvokePermissions } from './iam-policies';


/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  helloWorld,
  contactForm,
  createCoachCreatorSession,
  updateCoachCreatorSession,
  buildCoachConfig,
  getCoachConfigs,
  getCoachConfig,
  getCoachConfigStatus,
  getCoachCreatorSession,
  createCoachConversation,
  getCoachConversations,
  getCoachConversation,
  updateCoachConversation,
  sendCoachConversationMessage,
  buildWorkout,
  getWorkouts,
  getWorkout,
  updateWorkout,
  getWorkoutsCount,
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
  backend.createCoachConversation.resources.lambda,
  backend.getCoachConversations.resources.lambda,
  backend.getCoachConversation.resources.lambda,
  backend.updateCoachConversation.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
  backend.getWorkouts.resources.lambda,
  backend.getWorkout.resources.lambda,
  backend.updateWorkout.resources.lambda,
  backend.getWorkoutsCount.resources.lambda
);

// Create DynamoDB table
const coreTable = dynamodbTable.createCoreTable(backend.helloWorld.stack);

// Grant DynamoDB permissions to contact form function
coreTable.table.grantWriteData(backend.contactForm.resources.lambda);

// Grant DynamoDB permissions to coach creator functions (read and write)
coreTable.table.grantReadWriteData(backend.createCoachCreatorSession.resources.lambda);
coreTable.table.grantReadWriteData(backend.updateCoachCreatorSession.resources.lambda);
coreTable.table.grantReadWriteData(backend.buildCoachConfig.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfigs.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfig.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfigStatus.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachCreatorSession.resources.lambda);

// Grant DynamoDB permissions to coach conversation functions (read and write)
coreTable.table.grantReadWriteData(backend.createCoachConversation.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConversations.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConversation.resources.lambda);
coreTable.table.grantReadWriteData(backend.updateCoachConversation.resources.lambda);
coreTable.table.grantReadWriteData(backend.sendCoachConversationMessage.resources.lambda);

// Grant DynamoDB permissions to workout session functions (read and write)
coreTable.table.grantReadWriteData(backend.buildWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.getWorkouts.resources.lambda);
coreTable.table.grantReadWriteData(backend.getWorkout.resources.lambda);
coreTable.table.grantReadWriteData(backend.updateWorkout.resources.lambda);
coreTable.table.grantReadData(backend.getWorkoutsCount.resources.lambda);

// Add environment variable for table name
backend.contactForm.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.createCoachCreatorSession.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.updateCoachCreatorSession.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachCreatorSession.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.buildCoachConfig.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConfigs.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConfig.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConfigStatus.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);

// Add environment variables for coach conversation functions
backend.createCoachConversation.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConversations.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConversation.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.updateCoachConversation.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.sendCoachConversationMessage.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);

// Add environment variables for workout session functions
backend.buildWorkout.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getWorkouts.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getWorkout.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.updateWorkout.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getWorkoutsCount.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);

// Grant Bedrock permissions to functions that need it
grantBedrockPermissions([
  backend.helloWorld.resources.lambda,
  backend.updateCoachCreatorSession.resources.lambda,
  backend.buildCoachConfig.resources.lambda,
  backend.sendCoachConversationMessage.resources.lambda,
  backend.buildWorkout.resources.lambda
]);

// Grant permission to updateCoachCreatorSession to invoke buildCoachConfig
grantLambdaInvokePermissions(
  backend.updateCoachCreatorSession.resources.lambda,
  [backend.buildCoachConfig.resources.lambda.functionArn]
);

// Grant permission to sendCoachConversationMessage to invoke buildWorkout
grantLambdaInvokePermissions(
  backend.sendCoachConversationMessage.resources.lambda,
  [backend.buildWorkout.resources.lambda.functionArn]
);

// Add environment variable for the coach config function name
backend.updateCoachCreatorSession.addEnvironment('BUILD_COACH_CONFIG_FUNCTION_NAME', backend.buildCoachConfig.resources.lambda.functionName);

// Add environment variable for the workout extraction function name
backend.sendCoachConversationMessage.addEnvironment('BUILD_WORKOUT_SESSION_FUNCTION_NAME', backend.buildWorkout.resources.lambda.functionName);

// Output the API URL and DynamoDB table info
backend.addOutput({
  custom: {
    api: {
      [coreApi.httpApi.httpApiId!]: {
        endpoint: coreApi.httpApi.apiEndpoint,
        customEndpoint: `https://${coreApi.domainName}`,
        region: backend.helloWorld.stack.region,
        apiName: coreApi.httpApi.httpApiName,
        domainName: coreApi.domainName
      }
    },
    dynamodb: {
      coreTable: {
        tableName: coreTable.table.tableName,
        tableArn: coreTable.table.tableArn,
        region: backend.helloWorld.stack.region
      }
    }
  }
});
