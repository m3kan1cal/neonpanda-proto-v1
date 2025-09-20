import { Stack } from 'aws-cdk-lib';

/**
 * Branch and environment detection utilities for consistent resource naming
 */
export interface BranchInfo {
  isSandbox: boolean;
  branchName: string;
  stackId?: string;
}

/**
 * Resource naming options
 */
export interface ResourceNamingOptions {
  baseName: string;
  resourceType?: string;
}

/**
 * Get branch and environment information from CDK context
 */
export function getBranchInfo(stack: Stack): BranchInfo {
  const isSandbox = stack.node.tryGetContext('amplify-backend-type') === 'sandbox';
  const branchName = stack.node.tryGetContext('amplify-branch') || process.env.AWS_BRANCH || 'main';
  const stackId = isSandbox ? stack.node.addr.slice(-8) : undefined;

  return {
    isSandbox,
    branchName,
    stackId
  };
}

/**
 * Generate branch-aware resource name following consistent naming strategy
 */
export function getBranchAwareResourceName(
  branchInfo: BranchInfo,
  options: ResourceNamingOptions
): string {
  const { baseName } = options;
  const { isSandbox, branchName, stackId } = branchInfo;

  if (isSandbox) {
    // Sandbox: Use unique identifier to avoid conflicts between developers
    return `${baseName}-sandbox-${stackId}`;
  } else if (branchName === 'main') {
    // Production from main branch - clean name
    return baseName;
  } else {
    // Non-production branches (develop, feature branches, etc.)
    return `${baseName}-${branchName}`;
  }
}

/**
 * Log branch and resource configuration for debugging
 */
export function logBranchConfiguration(
  branchInfo: BranchInfo,
  resourceName: string,
  resourceType: string
): void {
  console.info(`🏗️ ${resourceType} Configuration:`, {
    isSandbox: branchInfo.isSandbox,
    branchName: branchInfo.branchName,
    resourceName,
    ...(branchInfo.stackId && { stackId: branchInfo.stackId })
  });
}

/**
 * Convenience function that combines all naming logic
 */
export function createBranchAwareResourceName(
  stack: Stack,
  baseName: string,
  resourceType?: string
): { branchInfo: BranchInfo; resourceName: string } {
  const branchInfo = getBranchInfo(stack);
  const resourceName = getBranchAwareResourceName(branchInfo, { baseName, resourceType });

  if (resourceType) {
    logBranchConfiguration(branchInfo, resourceName, resourceType);
  }

  return { branchInfo, resourceName };
}

/**
 * Construct full table name from base name and branch name (for runtime use)
 * This is used by functions that can't get the table name from CDK due to circular dependencies
 */
export function constructBranchAwareTableName(baseName: string, branchName?: string): string {
  const branch = branchName || 'main';

  if (branch === 'main') {
    return baseName;
  } else {
    return `${baseName}-${branch}`;
  }
}

/**
 * Get the DynamoDB table name, either from environment or by constructing it
 * This handles the case where post-confirmation can't get the table name from CDK due to circular dependency
 */
export function getTableName(): string {
  console.info('🔍 getTableName() called with environment:', {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'NOT_SET',
    DYNAMODB_BASE_TABLE_NAME: process.env.DYNAMODB_BASE_TABLE_NAME || 'NOT_SET',
    BRANCH_NAME: process.env.BRANCH_NAME || 'NOT_SET',
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME || 'NOT_SET'
  });

  // Try the standard environment variable first
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (tableName) {
    console.info('✅ Using DYNAMODB_TABLE_NAME:', tableName);
    return tableName;
  }

  console.info('⚠️ DYNAMODB_TABLE_NAME not found, trying fallback construction');

  // Fallback for post-confirmation function - construct from base name and branch
  const baseName = process.env.DYNAMODB_BASE_TABLE_NAME;
  const branchName = process.env.BRANCH_NAME;

  if (baseName) {
    const constructedName = constructBranchAwareTableName(baseName, branchName);
    console.info('✅ Constructed table name:', constructedName, 'from base:', baseName, 'branch:', branchName);
    return constructedName;
  }

  console.error('❌ No table name available - both DYNAMODB_TABLE_NAME and DYNAMODB_BASE_TABLE_NAME are missing');
  throw new Error("Neither DYNAMODB_TABLE_NAME nor DYNAMODB_BASE_TABLE_NAME environment variable is set");
}
