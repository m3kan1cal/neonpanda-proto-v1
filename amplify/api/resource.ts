import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { addAllRoutes, RouteIntegrations } from './routes';

export function createCoreApi(
  stack: Stack,
  helloWorldLambda: lambda.IFunction,
  contactFormLambda: lambda.IFunction,
  createCoachCreatorSessionLambda: lambda.IFunction,
  updateCoachCreatorSessionLambda: lambda.IFunction,
  getCoachConfigsLambda: lambda.IFunction,
  getCoachConfigLambda: lambda.IFunction,
  getCoachConfigStatusLambda: lambda.IFunction,
  getCoachCreatorSessionLambda: lambda.IFunction,
  createCoachConversationLambda: lambda.IFunction,
  getCoachConversationsLambda: lambda.IFunction,
  getCoachConversationLambda: lambda.IFunction,
  updateCoachConversationLambda: lambda.IFunction,
  sendCoachConversationMessageLambda: lambda.IFunction,
  getWorkoutsLambda: lambda.IFunction,
  getWorkoutLambda: lambda.IFunction,
  updateWorkoutLambda: lambda.IFunction,
  deleteWorkoutLambda: lambda.IFunction,
  getWorkoutsCountLambda: lambda.IFunction,
  getConversationsCountLambda: lambda.IFunction
) {
  // Determine if this is a sandbox deployment
  const isSandbox = stack.node.tryGetContext('amplify-backend-type') === 'sandbox';

  // Create dynamic API name
  const baseApiName = 'coachforge-proto-api';
  const apiName = isSandbox ? `${baseApiName}-dev` : baseApiName;

  // Domain configuration
  const baseDomain = 'coachforge.ai';
  const domainName = isSandbox ? `api-dev.${baseDomain}` : `api-prod.${baseDomain}`;

  // Certificate ARN - You'll need to replace these with your actual certificate ARNs
  // The certificate must be in the same region as your API Gateway
  const certificateArn = stack.region === 'us-east-1'
    ? 'arn:aws:acm:us-east-1:061920441871:certificate/44634e49-4c70-4be3-8f14-f2114dcffc35'
    : 'arn:aws:acm:us-west-2:061920441871:certificate/9d6277b4-e8b7-4448-bc40-0a68fec06270';

  // Import the existing certificate
  const certificate = certificatemanager.Certificate.fromCertificateArn(
    stack,
    'ApiCertificate',
    certificateArn
  );

  // Create HTTP API Gateway v2
  const httpApi = new apigatewayv2.HttpApi(stack, 'ProtoApi', {
    apiName: apiName,
    description: 'Core HTTP API for the application',
    corsPreflight: {
      allowCredentials: false,
      allowHeaders: ['*'],
      allowMethods: [
        apigatewayv2.CorsHttpMethod.GET,
        apigatewayv2.CorsHttpMethod.POST,
        apigatewayv2.CorsHttpMethod.PUT,
        apigatewayv2.CorsHttpMethod.DELETE,
        apigatewayv2.CorsHttpMethod.OPTIONS
      ],
      allowOrigins: ['*']
    }
  });

  // Create Lambda integration for hello world function
  const helloWorldIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'HelloWorldIntegration',
    helloWorldLambda
  );

  // Create Lambda integration for contact form function
  const contactFormIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'ContactFormIntegration',
    contactFormLambda
  );

  // Create Lambda integrations for coach creator functions
  const createCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateCoachCreatorSessionIntegration',
    createCoachCreatorSessionLambda
  );

  const updateCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateCoachCreatorSessionIntegration',
    updateCoachCreatorSessionLambda
  );

  const getCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachCreatorSessionIntegration',
    getCoachCreatorSessionLambda
  );

  const getCoachConfigsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigsIntegration',
    getCoachConfigsLambda
  );

  const getCoachConfigIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigIntegration',
    getCoachConfigLambda
  );

  const getCoachConfigStatusIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigStatusIntegration',
    getCoachConfigStatusLambda
  );

  // Create Lambda integrations for coach conversation functions
  const createCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateCoachConversationIntegration',
    createCoachConversationLambda
  );

  const getCoachConversationsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConversationsIntegration',
    getCoachConversationsLambda
  );

  const getCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConversationIntegration',
    getCoachConversationLambda
  );

  const updateCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateCoachConversationIntegration',
    updateCoachConversationLambda
  );

  const sendCoachConversationMessageIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'SendCoachConversationMessageIntegration',
    sendCoachConversationMessageLambda
  );

  // Create Lambda integrations for workout functions
  const getWorkoutsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutsIntegration',
    getWorkoutsLambda
  );

  const getWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutIntegration',
    getWorkoutLambda
  );

  const updateWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateWorkoutIntegration',
    updateWorkoutLambda
  );

  const deleteWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'DeleteWorkoutIntegration',
    deleteWorkoutLambda
  );

  const getWorkoutsCountIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutsCountIntegration',
    getWorkoutsCountLambda
  );

  const getConversationsCountIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetConversationsCountIntegration',
    getConversationsCountLambda
  );

  // Create integrations object for route configuration
  const integrations: RouteIntegrations = {
    helloWorld: helloWorldIntegration,
    contactForm: contactFormIntegration,
    createCoachCreatorSession: createCoachCreatorSessionIntegration,
    updateCoachCreatorSession: updateCoachCreatorSessionIntegration,
    getCoachCreatorSession: getCoachCreatorSessionIntegration,
    getCoachConfigs: getCoachConfigsIntegration,
    getCoachConfig: getCoachConfigIntegration,
    getCoachConfigStatus: getCoachConfigStatusIntegration,
    createCoachConversation: createCoachConversationIntegration,
    getCoachConversations: getCoachConversationsIntegration,
    getCoachConversation: getCoachConversationIntegration,
    updateCoachConversation: updateCoachConversationIntegration,
    sendCoachConversationMessage: sendCoachConversationMessageIntegration,
    getWorkouts: getWorkoutsIntegration,
    getWorkout: getWorkoutIntegration,
    updateWorkout: updateWorkoutIntegration,
    deleteWorkout: deleteWorkoutIntegration,
    getWorkoutsCount: getWorkoutsCountIntegration,
    getConversationsCount: getConversationsCountIntegration
  };

  // Add all routes using the organized route definitions
  addAllRoutes(httpApi, integrations);

  // Create custom domain name
  const customDomain = new apigatewayv2.DomainName(stack, 'ApiCustomDomain', {
    domainName: domainName,
    certificate: certificate,
  });

  // Create API mapping
  new apigatewayv2.ApiMapping(stack, 'ApiMapping', {
    api: httpApi,
    domainName: customDomain,
    stage: httpApi.defaultStage,
  });

  // DNS records need to be created manually after deployment
  // The custom domain will provide the target for your DNS records

  return {
    httpApi,
    customDomain,
    domainName: domainName,
    // Export individual integrations for potential reuse
    integrations
  };
}

export const apiGatewayv2 = {
  createCoreApi: createCoreApi,
};
