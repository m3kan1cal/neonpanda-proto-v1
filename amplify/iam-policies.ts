import { PolicyStatement, Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
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
 * S3 policy for debugging logs storage - branch-aware subfolders
 */
export const createS3DebugPolicy = (branchName: string = 'main'): PolicyStatement => {
  const bucketPath = `arn:aws:s3:::midgard-sandbox-logs/${branchName}/debug/*`;

  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      's3:PutObject',
      's3:PutObjectAcl'
    ],
    resources: [bucketPath]
  });
};

/**
 * S3 policy for analytics storage - branch-aware subfolders
 */
export const createS3AnalyticsPolicy = (branchName: string = 'main'): PolicyStatement => {
  const bucketPath = `arn:aws:s3:::midgard-sandbox-logs/${branchName}/analytics/weekly-analytics/*`;

  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      's3:PutObject',
      's3:PutObjectAcl'
    ],
    resources: [bucketPath]
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

/**
 * Helper function to grant S3 debug permissions
 */
export const grantS3DebugPermissions = (functions: IFunction[], branchName: string = 'main'): void => {
  const s3Policy = createS3DebugPolicy(branchName);
  functions.forEach(func => {
    func.addToRolePolicy(s3Policy);
  });
};

/**
 * Helper function to grant S3 analytics permissions
 */
export const grantS3AnalyticsPermissions = (functions: IFunction[], branchName: string = 'main'): void => {
  const s3Policy = createS3AnalyticsPolicy(branchName);
  functions.forEach(func => {
    func.addToRolePolicy(s3Policy);
  });
};

/**
 * Cognito policy for post-confirmation Lambda to update user attributes
 */
export const createCognitoAdminPolicy = (): PolicyStatement => {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminGetUser'
    ],
    resources: [
      '*' // Post-confirmation triggers need access to the user pool they're attached to
    ]
  });
};

/**
 * Helper function to grant Cognito admin permissions
 */
export const grantCognitoAdminPermissions = (functions: IFunction[]): void => {
  const cognitoPolicy = createCognitoAdminPolicy();
  functions.forEach(func => {
    func.addToRolePolicy(cognitoPolicy);
  });
};

/**
 * DynamoDB policy for basic CRUD operations
 */
export const createDynamoDBPolicy = (): PolicyStatement => {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:DeleteItem'
    ],
    resources: ['*'] // Will be scoped by table name in environment
  });
};

/**
 * DynamoDB policy for throughput management operations
 */
export const createDynamoDBThroughputPolicy = (): PolicyStatement => {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:DescribeTable',
      'dynamodb:UpdateTable',
      'dynamodb:DescribeTimeToLive',
      'dynamodb:ListTagsOfResource'
    ],
    resources: ['*'] // Will be scoped by table name in environment
  });
};

/**
 * Helper function to grant DynamoDB permissions
 */
export const grantDynamoDBPermissions = (functions: IFunction[]): void => {
  const dynamoPolicy = createDynamoDBPolicy();
  functions.forEach(func => {
    func.addToRolePolicy(dynamoPolicy);
  });
};

/**
 * Helper function to grant DynamoDB throughput management permissions
 */
export const grantDynamoDBThroughputPermissions = (functions: IFunction[]): void => {
  const throughputPolicy = createDynamoDBThroughputPolicy();
  functions.forEach(func => {
    func.addToRolePolicy(throughputPolicy);
  });
};
