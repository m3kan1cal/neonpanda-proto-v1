import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export function createCoreApi(
  stack: Stack,
  helloWorldLambda: lambda.IFunction,
  contactFormLambda: lambda.IFunction,
  createCoachCreatorSessionLambda: lambda.IFunction,
  updateCoachCreatorSessionLambda: lambda.IFunction,
  getCoachConfigsLambda: lambda.IFunction,
  getCoachConfigLambda: lambda.IFunction,
  getCoachConfigStatusLambda: lambda.IFunction,
  getCoachCreatorSessionLambda: lambda.IFunction
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

  // *******************************************************
  // Miscellaneous Routes
  // *******************************************************

  // Add routes
  httpApi.addRoutes({
    path: '/hello',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: helloWorldIntegration
  });

  httpApi.addRoutes({
    path: '/contact',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: contactFormIntegration
  });

  // *******************************************************
  // Coach Creator Agent Routes
  // *******************************************************

  // Start coach creator session
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: createCoachCreatorSessionIntegration
  });

  // Update coach creator session (submit response)
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: updateCoachCreatorSessionIntegration
  });

  // Get coach creator session
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: getCoachCreatorSessionIntegration
  });

  // Get coach config generation status
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}/config-status',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: getCoachConfigStatusIntegration
  });

  // *******************************************************
  // Coach Config Routes
  // *******************************************************

  // Get all coach configs for a user
  httpApi.addRoutes({
    path: '/users/{userId}/coaches',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: getCoachConfigsIntegration
  });

  // Get specific coach config
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: getCoachConfigIntegration
  });

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
    integrations: {
      helloWorld: helloWorldIntegration,
      contactForm: contactFormIntegration,
      createCoachCreatorSession: createCoachCreatorSessionIntegration,
      updateCoachCreatorSession: updateCoachCreatorSessionIntegration,
      getCoachConfigs: getCoachConfigsIntegration,
      getCoachConfig: getCoachConfigIntegration,
      getCoachConfigStatus: getCoachConfigStatusIntegration,
      getCoachCreatorSession: getCoachCreatorSessionIntegration
    }
  };
}

export const apiGatewayv2 = {
  createCoreApi: createCoreApi,
};
