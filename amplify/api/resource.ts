import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export function createCoreApi(stack: Stack, helloWorldLambda: lambda.IFunction, contactFormLambda: lambda.IFunction) {
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
      contactForm: contactFormIntegration
    }
  };
}

export const apiGatewayv2 = {
  createCoreApi: createCoreApi,
};
