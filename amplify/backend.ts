import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { helloWorld } from './functions/hello-world/resource';
import { contactForm } from './functions/contact-form/resource';
import { apiGatewayv2 } from './api/resource';
import { dynamodbTable } from './dynamodb/resource';


/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  helloWorld,
  contactForm,
});


// Create the Core API with all endpoints
const coreApi = apiGatewayv2.createCoreApi(
  backend.helloWorld.stack,
  backend.helloWorld.resources.lambda,
  backend.contactForm.resources.lambda
);

// Create DynamoDB table
const coreTable = dynamodbTable.createCoreTable(backend.helloWorld.stack);

// Grant DynamoDB permissions to contact form function
coreTable.table.grantWriteData(backend.contactForm.resources.lambda);

// Add environment variable for table name
backend.contactForm.addEnvironment('DYNAMODB_TABLE_NAME', coreTable.table.tableName);

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
