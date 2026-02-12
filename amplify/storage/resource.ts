import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, Stack, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createBranchAwareResourceName } from '../functions/libs/branch-naming';
import { logger } from "../functions/libs/logger";

export function createAppsBucket(scope: Construct) {
  const stack = Stack.of(scope);

  // Use standard branch-aware naming, but S3 buckets always get suffix (including -main)
  const { branchInfo, resourceName } = createBranchAwareResourceName(
    stack,
    'midgard-apps',
    'S3 Apps Bucket'
  );

  // Override for S3: ensure main branch also gets -main suffix
  const bucketName = branchInfo.isSandbox
    ? resourceName  // sandbox-{id} stays as is
    : branchInfo.branchName === 'main'
    ? `${resourceName}-main`  // Explicitly add -main for production
    : resourceName;  // Other branches already have suffix from branch naming

  const bucket = new s3.Bucket(scope, 'AppsBucket', {
    bucketName: bucketName,

    // Security
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

    // CORS for direct uploads from frontend
    cors: [
      {
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.HEAD,
        ],
        allowedOrigins: ['*'], // Tighten this in production
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      },
    ],

    // Lifecycle: Delete images after 90 days
    lifecycleRules: [
      {
        id: 'DeleteOldImages',
        prefix: 'user-uploads/',
        expiration: Duration.days(90),
        enabled: true,
      },
    ],

    // Encryption and removal
    encryption: s3.BucketEncryption.S3_MANAGED,
    removalPolicy: RemovalPolicy.DESTROY, // RETAIN for production
    autoDeleteObjects: true, // Only for dev
  });

  logger.info(`✅ Apps bucket created: ${bucketName} (branch: ${branchInfo.branchName})`);

  return {
    bucket,
    bucketName,
    branchInfo,
  };
}
