import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function createCoreApi(stack: Stack, helloWorldLambda: lambda.IFunction) {
  // Create HTTP API Gateway v2
  const httpApi = new apigatewayv2.HttpApi(stack, 'CoreApi', {
    apiName: 'core-api',
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
