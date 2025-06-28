import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { helloWorld } from './functions/hello-world/resource';
import { contactForm } from './functions/contact-form/resource';
import { createCoachCreatorSession } from './functions/create-coach-creator-session/resource';
import { updateCoachCreatorSession } from './functions/update-coach-creator-session/resource';
import { createCoachConfig } from './functions/create-coach-config/resource';
import { getCoachConfigs } from './functions/get-coach-configs/resource';
import { getCoachConfig } from './functions/get-coach-config/resource';
import { getCoachConfigStatus } from './functions/get-coach-config-status/resource';
import { getCoachCreatorSession } from './functions/get-coach-creator-session/resource';
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
  createCoachConfig,
  getCoachConfigs,
  getCoachConfig,
  getCoachConfigStatus,
  getCoachCreatorSession,
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
  backend.getCoachCreatorSession.resources.lambda
);

// Create DynamoDB table
const coreTable = dynamodbTable.createCoreTable(backend.helloWorld.stack);

// Grant DynamoDB permissions to contact form function
coreTable.table.grantWriteData(backend.contactForm.resources.lambda);

// Grant DynamoDB permissions to coach creator functions (read and write)
coreTable.table.grantReadWriteData(backend.createCoachCreatorSession.resources.lambda);
coreTable.table.grantReadWriteData(backend.updateCoachCreatorSession.resources.lambda);
coreTable.table.grantReadWriteData(backend.createCoachConfig.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfigs.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfig.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachConfigStatus.resources.lambda);
coreTable.table.grantReadWriteData(backend.getCoachCreatorSession.resources.lambda);

// Add environment variable for table name
backend.contactForm.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.createCoachCreatorSession.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.updateCoachCreatorSession.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachCreatorSession.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.createCoachConfig.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConfigs.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConfig.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);
backend.getCoachConfigStatus.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);

// Grant Bedrock permissions to functions that need it
grantBedrockPermissions([
  backend.helloWorld.resources.lambda,
  backend.updateCoachCreatorSession.resources.lambda,
  backend.createCoachConfig.resources.lambda
]);

// Grant permission to updateCoachCreatorSession to invoke createCoachConfig
grantLambdaInvokePermissions(
  backend.updateCoachCreatorSession.resources.lambda,
  [backend.createCoachConfig.resources.lambda.functionArn]
);

// Add environment variable for the coach config function name
backend.updateCoachCreatorSession.addEnvironment('CREATE_COACH_CONFIG_FUNCTION_NAME', backend.createCoachConfig.resources.lambda.functionName);

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
