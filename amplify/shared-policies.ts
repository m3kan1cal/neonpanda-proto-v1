import { Stack } from "aws-cdk-lib";
import { ManagedPolicy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { BranchInfo, getBranchAwareResourceName } from "./functions/libs/branch-naming";


/**
 * Creates shared managed policies to avoid exceeding Lambda's 20KB policy size limit.
 *
 * AWS Lambda has a 20KB limit for all IAM policies attached to a function's execution role.
 * By using managed policies instead of inline grants, we keep policy sizes small since
 * managed policies are referenced by ARN rather than embedded inline.
 */
export class SharedPolicies {
  readonly dynamoDbReadWritePolicy: ManagedPolicy;
  readonly dynamoDbReadOnlyPolicy: ManagedPolicy;
  readonly bedrockAccessPolicy: ManagedPolicy;
  readonly s3DebugAccessPolicy: ManagedPolicy;
  readonly s3AnalyticsAccessPolicy: ManagedPolicy;
  readonly s3AppsAccessPolicy: ManagedPolicy;
  readonly cognitoAdminPolicy: ManagedPolicy;

  constructor(
    stack: Stack,
    coreTable: Table,
    branchName: string,
    appsBucketArn: string
  ) {
    // ========================================================================
    // DynamoDB Read/Write Policy
    // ========================================================================
    this.dynamoDbReadWritePolicy = new ManagedPolicy(
      stack,
      "DynamoDbReadWritePolicy",
      {
        managedPolicyName: `NeonPanda-DynamoDB-ReadWrite-${branchName}`,
        description: "Allows read and write access to DynamoDB core table",
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
              "dynamodb:Scan",
              "dynamodb:BatchGetItem",
              "dynamodb:BatchWriteItem",
            ],
            resources: [coreTable.tableArn, `${coreTable.tableArn}/index/*`],
          }),
          // DynamoDB throughput management for high-volume functions
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["dynamodb:DescribeTable", "dynamodb:UpdateTable"],
            resources: [coreTable.tableArn],
          }),
        ],
      }
    );

    // ========================================================================
    // DynamoDB Read-Only Policy
    // ========================================================================
    this.dynamoDbReadOnlyPolicy = new ManagedPolicy(
      stack,
      "DynamoDbReadOnlyPolicy",
      {
        managedPolicyName: `NeonPanda-DynamoDB-ReadOnly-${branchName}`,
        description: "Allows read-only access to DynamoDB core table",
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "dynamodb:GetItem",
              "dynamodb:Query",
              "dynamodb:Scan",
              "dynamodb:BatchGetItem",
              "dynamodb:DescribeTable",
            ],
            resources: [coreTable.tableArn, `${coreTable.tableArn}/index/*`],
          }),
          // DynamoDB throughput management (needed for high-volume read functions)
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["dynamodb:DescribeTable", "dynamodb:UpdateTable"],
            resources: [coreTable.tableArn],
          }),
        ],
      }
    );

    // ========================================================================
    // Bedrock Access Policy
    // ========================================================================
    this.bedrockAccessPolicy = new ManagedPolicy(stack, "BedrockAccessPolicy", {
      managedPolicyName: `NeonPanda-Bedrock-Access-${branchName}`,
      description:
        "Allows access to AWS Bedrock services for AI model invocation",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
          ],
          resources: ["*"],
        }),
      ],
    });

    // ========================================================================
    // S3 Debug Access Policy
    // ========================================================================
    this.s3DebugAccessPolicy = new ManagedPolicy(stack, "S3DebugAccessPolicy", {
      managedPolicyName: `NeonPanda-S3-Debug-${branchName}`,
      description: "Allows access to S3 debug bucket for development logging",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
          resources: [
            `arn:aws:s3:::midgard-sandbox-logs`,
            `arn:aws:s3:::midgard-sandbox-logs/*`,
          ],
        }),
      ],
    });

    // ========================================================================
    // S3 Analytics Access Policy
    // ========================================================================
    this.s3AnalyticsAccessPolicy = new ManagedPolicy(
      stack,
      "S3AnalyticsAccessPolicy",
      {
        managedPolicyName: `NeonPanda-S3-Analytics-${branchName}`,
        description: "Allows access to S3 analytics bucket for weekly reports",
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
            resources: [
              `arn:aws:s3:::midgard-sandbox-logs`,
              `arn:aws:s3:::midgard-sandbox-logs/*`,
            ],
          }),
        ],
      }
    );

    // ========================================================================
    // S3 Apps Bucket Access Policy
    // ========================================================================
    this.s3AppsAccessPolicy = new ManagedPolicy(stack, "S3AppsAccessPolicy", {
      managedPolicyName: `NeonPanda-S3-Apps-${branchName}`,
      description: "Allows access to S3 apps bucket for image storage",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:PutObject",
            "s3:GetObject",
            "s3:ListBucket",
            "s3:DeleteObject",
          ],
          resources: [appsBucketArn, `${appsBucketArn}/*`],
        }),
      ],
    });

    // ========================================================================
    // Cognito Admin Policy
    // ========================================================================
    this.cognitoAdminPolicy = new ManagedPolicy(stack, "CognitoAdminPolicy", {
      managedPolicyName: `NeonPanda-Cognito-Admin-${branchName}`,
      description: "Allows admin operations on Cognito User Pool",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "cognito-idp:AdminGetUser",
            "cognito-idp:AdminUpdateUserAttributes",
            "cognito-idp:AdminDeleteUser",
            "cognito-idp:AdminSetUserPassword",
            "cognito-idp:ListUsers",
          ],
          resources: ["*"],
        }),
      ],
    });
  }

  // ==========================================================================
  // Helper Methods for Attaching Policies
  // ==========================================================================

  /**
   * Attach DynamoDB read/write policy to a function
   */
  attachDynamoDbReadWrite(func: IFunction) {
    func.role?.addManagedPolicy(this.dynamoDbReadWritePolicy);
  }

  /**
   * Attach DynamoDB read-only policy to a function
   */
  attachDynamoDbReadOnly(func: IFunction) {
    func.role?.addManagedPolicy(this.dynamoDbReadOnlyPolicy);
  }

  /**
   * Attach Bedrock access policy to a function
   */
  attachBedrockAccess(func: IFunction) {
    func.role?.addManagedPolicy(this.bedrockAccessPolicy);
  }

  /**
   * Attach S3 debug access policy to a function
   */
  attachS3DebugAccess(func: IFunction) {
    func.role?.addManagedPolicy(this.s3DebugAccessPolicy);
  }

  /**
   * Attach S3 analytics access policy to a function
   */
  attachS3AnalyticsAccess(func: IFunction) {
    func.role?.addManagedPolicy(this.s3AnalyticsAccessPolicy);
  }

  /**
   * Attach S3 apps bucket access policy to a function
   */
  attachS3AppsAccess(func: IFunction) {
    func.role?.addManagedPolicy(this.s3AppsAccessPolicy);
  }

  /**
   * Attach Cognito admin policy to a function
   */
  attachCognitoAdmin(func: IFunction) {
    func.role?.addManagedPolicy(this.cognitoAdminPolicy);
  }

  /**
   * Helper to attach multiple policies at once
   *
   * @example
   * sharedPolicies.attachMultiple(myFunction, ['dynamoDbReadWrite', 'bedrock', 's3Apps']);
   */
  attachMultiple(
    func: IFunction,
    policies: Array<
      | "dynamoDbReadWrite"
      | "dynamoDbReadOnly"
      | "bedrock"
      | "s3Debug"
      | "s3Analytics"
      | "s3Apps"
      | "cognitoAdmin"
    >
  ) {
    policies.forEach((policy) => {
      switch (policy) {
        case "dynamoDbReadWrite":
          this.attachDynamoDbReadWrite(func);
          break;
        case "dynamoDbReadOnly":
          this.attachDynamoDbReadOnly(func);
          break;
        case "bedrock":
          this.attachBedrockAccess(func);
          break;
        case "s3Debug":
          this.attachS3DebugAccess(func);
          break;
        case "s3Analytics":
          this.attachS3AnalyticsAccess(func);
          break;
        case "s3Apps":
          this.attachS3AppsAccess(func);
          break;
        case "cognitoAdmin":
          this.attachCognitoAdmin(func);
          break;
      }
    });
  }
}

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

/**
 * S3 policy for apps bucket - branch-aware
 * Uses naming: midgard-apps-main, midgard-apps-develop, midgard-apps-sandbox-{id}
 */
export const createS3AppsPolicy = (branchInfo: BranchInfo): PolicyStatement => {
  // Use standard branch-aware naming helper
  let bucketName = getBranchAwareResourceName(branchInfo, { baseName: 'midgard-apps' });

  // Override for S3: ensure main branch also gets -main suffix (matches bucket creation logic)
  if (!branchInfo.isSandbox && branchInfo.branchName === 'main') {
    bucketName = `${bucketName}-main`;
  }

  const bucketPath = `arn:aws:s3:::${bucketName}/user-uploads/*`;

  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      's3:GetObject',
      's3:PutObject',
      's3:PutObjectAcl',
      's3:DeleteObject'
    ],
    resources: [bucketPath]
  });
};

/**
 * Helper function to grant S3 apps bucket permissions to functions
 */
export const grantS3AppsPermissions = (
  functions: IFunction[],
  branchInfo: BranchInfo
): void => {
  const policy = createS3AppsPolicy(branchInfo);

  functions.forEach(func => {
    func.addToRolePolicy(policy);
  });
};
