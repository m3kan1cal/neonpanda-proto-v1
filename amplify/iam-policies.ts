import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Bedrock policy for Claude Sonnet 4 inference profile and other AI models
 */
export const createBedrockPolicy = (): PolicyStatement => {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
      'bedrock:Converse',
      'bedrock:ConverseStream'
    ],
    resources: [
      // Claude models - both foundation models and inference profiles
      `arn:aws:bedrock:*::foundation-model/anthropic.claude-*`,
      `arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-*`,
      `arn:aws:bedrock:*:*:inference-profile/anthropic.claude-*`,
      // Allow all Bedrock models as fallback
      `arn:aws:bedrock:*:*:*`
    ]
  });
};

/**
 * Lambda invocation policy for async function calls
 */
export const createLambdaInvokePolicy = (targetFunctionArns: string[]): PolicyStatement => {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'lambda:InvokeFunction'
    ],
    resources: targetFunctionArns
  });
};

/**
 * Helper function to grant Bedrock permissions to multiple functions
 */
export const grantBedrockPermissions = (functions: IFunction[]): void => {
  const bedrockPolicy = createBedrockPolicy();
  functions.forEach(func => {
    func.addToRolePolicy(bedrockPolicy);
  });
};

/**
 * Helper function to grant Lambda invoke permissions
 */
export const grantLambdaInvokePermissions = (
  sourceFunction: IFunction,
  targetFunctionArns: string[]
): void => {
  const lambdaInvokePolicy = createLambdaInvokePolicy(targetFunctionArns);
  sourceFunction.addToRolePolicy(lambdaInvokePolicy);
};
