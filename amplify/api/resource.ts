import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function createCoreApi(stack: Stack, helloWorldLambda: lambda.IFunction) {
  // Determine if this is a sandbox deployment
  const isSandbox = stack.node.tryGetContext('amplify-backend-type') === 'sandbox';

  // Create dynamic API name
  const baseApiName = 'coachforge-proto-api';
  const apiName = isSandbox ? `${baseApiName}-dev` : baseApiName;

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

  // Add routes
  httpApi.addRoutes({
    path: '/hello',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: helloWorldIntegration
  });

  return {
    httpApi,
    // Export individual integrations for potential reuse
    integrations: {
      helloWorld: helloWorldIntegration
    }
  };
}
