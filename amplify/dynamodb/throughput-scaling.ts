import { DynamoDBClient, UpdateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb";
import { getTableName } from "../functions/libs/branch-naming";

// DynamoDB client for throughput management
const dynamoDbClient = new DynamoDBClient({});


export interface ThroughputScalingConfig {
  baseReadCapacity: number;
  baseWriteCapacity: number;
  maxReadCapacity: number;
  maxWriteCapacity: number;
  scaleUpFactor: number;
  maxRetries: number;
  initialRetryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  scaleDownDelayMinutes: number;
}

export const DEFAULT_THROUGHPUT_CONFIG: ThroughputScalingConfig = {
  baseReadCapacity: 5,
  baseWriteCapacity: 5,
  maxReadCapacity: 100,
  maxWriteCapacity: 50,
  scaleUpFactor: 2.0,
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 2.0,
  scaleDownDelayMinutes: 10
};

export interface ScaleResult {
  success: boolean;
  previousReadCapacity: number;
  previousWriteCapacity: number;
  newReadCapacity: number;
  newWriteCapacity: number;
  error?: string;
}

/**
 * Get current table capacity information
 */
async function getTableCapacity(tableName: string) {
  const command = new DescribeTableCommand({ TableName: tableName });
  const response = await dynamoDbClient.send(command);
  const table = response.Table;

  if (!table) {
    throw new Error(`Table ${tableName} not found`);
  }

  return {
    readCapacity: table.ProvisionedThroughput?.ReadCapacityUnits || 0,
    writeCapacity: table.ProvisionedThroughput?.WriteCapacityUnits || 0,
    gsiCapacities: table.GlobalSecondaryIndexes?.map(gsi => ({
      indexName: gsi.IndexName || '',
      readCapacity: gsi.ProvisionedThroughput?.ReadCapacityUnits || 0,
      writeCapacity: gsi.ProvisionedThroughput?.WriteCapacityUnits || 0
    })) || []
  };
}

/**
 * Scale up table throughput capacity
 */
async function scaleUpThroughput(tableName: string, config: ThroughputScalingConfig): Promise<ScaleResult> {
  try {
    console.info(`🔄 Scaling up throughput for table: ${tableName}`);

    const currentCapacity = await getTableCapacity(tableName);

    const newReadCapacity = Math.min(
      Math.ceil(currentCapacity.readCapacity * config.scaleUpFactor),
      config.maxReadCapacity
    );
    const newWriteCapacity = Math.min(
      Math.ceil(currentCapacity.writeCapacity * config.scaleUpFactor),
      config.maxWriteCapacity
    );

    const globalSecondaryIndexUpdates = currentCapacity.gsiCapacities.map(gsi => ({
      Update: {
        IndexName: gsi.indexName,
        ProvisionedThroughput: {
          ReadCapacityUnits: Math.min(
            Math.ceil(gsi.readCapacity * config.scaleUpFactor),
            config.maxReadCapacity
          ),
          WriteCapacityUnits: Math.min(
            Math.ceil(gsi.writeCapacity * config.scaleUpFactor),
            config.maxWriteCapacity
          )
        }
      }
    }));

    const updateCommand = new UpdateTableCommand({
      TableName: tableName,
      ProvisionedThroughput: {
        ReadCapacityUnits: newReadCapacity,
        WriteCapacityUnits: newWriteCapacity
      },
      GlobalSecondaryIndexUpdates: globalSecondaryIndexUpdates
    });

    await dynamoDbClient.send(updateCommand);

    const result: ScaleResult = {
      success: true,
      previousReadCapacity: currentCapacity.readCapacity,
      previousWriteCapacity: currentCapacity.writeCapacity,
      newReadCapacity,
      newWriteCapacity
    };

    console.info(`✅ Successfully scaled up throughput for ${tableName}:`, result);
    return result;

  } catch (error) {
    console.error(`❌ Error scaling up throughput for ${tableName}:`, error);
    return {
      success: false,
      previousReadCapacity: 0,
      previousWriteCapacity: 0,
      newReadCapacity: 0,
      newWriteCapacity: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Scale down table throughput capacity back to base levels
 */
async function scaleDownThroughput(tableName: string, config: ThroughputScalingConfig): Promise<ScaleResult> {
  try {
    console.info(`🔽 Scaling down throughput for table: ${tableName}`);

    const currentCapacity = await getTableCapacity(tableName);

    if (currentCapacity.readCapacity <= config.baseReadCapacity &&
        currentCapacity.writeCapacity <= config.baseWriteCapacity) {
      console.info(`Table ${tableName} already at base capacity, skipping scale down`);
      return {
        success: true,
        previousReadCapacity: currentCapacity.readCapacity,
        previousWriteCapacity: currentCapacity.writeCapacity,
        newReadCapacity: currentCapacity.readCapacity,
        newWriteCapacity: currentCapacity.writeCapacity
      };
    }

    const globalSecondaryIndexUpdates = currentCapacity.gsiCapacities.map(gsi => ({
      Update: {
        IndexName: gsi.indexName,
        ProvisionedThroughput: {
          ReadCapacityUnits: config.baseReadCapacity,
          WriteCapacityUnits: config.baseWriteCapacity
        }
      }
    }));

    const updateCommand = new UpdateTableCommand({
      TableName: tableName,
      ProvisionedThroughput: {
        ReadCapacityUnits: config.baseReadCapacity,
        WriteCapacityUnits: config.baseWriteCapacity
      },
      GlobalSecondaryIndexUpdates: globalSecondaryIndexUpdates
    });

    await dynamoDbClient.send(updateCommand);

    const result: ScaleResult = {
      success: true,
      previousReadCapacity: currentCapacity.readCapacity,
      previousWriteCapacity: currentCapacity.writeCapacity,
      newReadCapacity: config.baseReadCapacity,
      newWriteCapacity: config.baseWriteCapacity
    };

    console.info(`✅ Successfully scaled down throughput for ${tableName}:`, result);
    return result;

  } catch (error) {
    console.error(`❌ Error scaling down throughput for ${tableName}:`, error);
    return {
      success: false,
      previousReadCapacity: 0,
      previousWriteCapacity: 0,
      newReadCapacity: 0,
      newWriteCapacity: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Wait for table to be in ACTIVE state after scaling
 */
async function waitForTableActive(tableName: string, maxWaitTimeMs: number = 60000): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < maxWaitTimeMs) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await dynamoDbClient.send(command);
      const tableStatus = response.Table?.TableStatus;

      if (tableStatus === 'ACTIVE') {
        console.info(`✅ Table ${tableName} is now ACTIVE`);
        return true;
      }

      console.info(`⏳ Table ${tableName} status: ${tableStatus}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error(`Error checking table status for ${tableName}:`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  console.warn(`⚠️ Table ${tableName} did not become ACTIVE within ${maxWaitTimeMs}ms`);
  return false;
}

/**
 * Get configuration from environment variables
 */
function getConfigFromEnv(): ThroughputScalingConfig {
  return {
    baseReadCapacity: parseInt(process.env.DYNAMODB_BASE_READ_CAPACITY || '5'),
    baseWriteCapacity: parseInt(process.env.DYNAMODB_BASE_WRITE_CAPACITY || '5'),
    maxReadCapacity: parseInt(process.env.DYNAMODB_MAX_READ_CAPACITY || '100'),
    maxWriteCapacity: parseInt(process.env.DYNAMODB_MAX_WRITE_CAPACITY || '50'),
    scaleUpFactor: parseFloat(process.env.DYNAMODB_SCALE_UP_FACTOR || '2.0'),
    maxRetries: parseInt(process.env.DYNAMODB_MAX_RETRIES || '5'),
    initialRetryDelay: parseInt(process.env.DYNAMODB_INITIAL_RETRY_DELAY || '1000'),
    maxRetryDelay: parseInt(process.env.DYNAMODB_MAX_RETRY_DELAY || '30000'),
    backoffMultiplier: parseFloat(process.env.DYNAMODB_BACKOFF_MULTIPLIER || '2.0'),
    scaleDownDelayMinutes: parseInt(process.env.DYNAMODB_SCALE_DOWN_DELAY_MINUTES || '10')
  };
}

/**
 * Execute a function with automatic throughput scaling and retry logic
 */
export async function withThroughputScaling<T>(
  operation: () => Promise<T>,
  operationName: string = 'DynamoDB operation',
  config?: Partial<ThroughputScalingConfig>
): Promise<T> {
  const tableName = getTableName();

  const finalConfig = { ...getConfigFromEnv(), ...config };
  let lastError: Error | null = null;
  let retryDelay = finalConfig.initialRetryDelay;
  let scaleUpResult: ScaleResult | null = null;

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      console.info(`🔄 Attempting ${operationName} (attempt ${attempt}/${finalConfig.maxRetries + 1})`);

      const result = await operation();

      // If we scaled up and succeeded, schedule scale down
      if (scaleUpResult?.success) {
        console.info(`✅ ${operationName} succeeded after scaling. Scheduling scale-down in ${finalConfig.scaleDownDelayMinutes} minutes`);

        setTimeout(async () => {
          try {
            await scaleDownThroughput(tableName, finalConfig);
          } catch (error) {
            console.error(`Error during scheduled scale-down for ${tableName}:`, error);
          }
        }, finalConfig.scaleDownDelayMinutes * 60 * 1000);
      }

      return result;

    } catch (error) {
      lastError = error as Error;

      // Check if this is a throughput exceeded error
      const isThroughputError =
        error instanceof ProvisionedThroughputExceededException ||
        (error as any)?.name === 'ProvisionedThroughputExceededException' ||
        (error as any)?.__type?.includes('ProvisionedThroughputExceededException');

      if (!isThroughputError) {
        console.error(`❌ ${operationName} failed with non-throughput error:`, error);
        throw error;
      }

      if (attempt > finalConfig.maxRetries) {
        console.error(`❌ ${operationName} failed after ${finalConfig.maxRetries} retries`);
        throw lastError;
      }

      console.warn(`⚠️ ${operationName} hit throughput limit (attempt ${attempt}). Scaling up capacity...`);

      scaleUpResult = await scaleUpThroughput(tableName, finalConfig);

      if (!scaleUpResult.success) {
        console.error(`❌ Failed to scale up throughput: ${scaleUpResult.error}`);
        throw new Error(`Failed to scale up throughput: ${scaleUpResult.error}`);
      }

      const isActive = await waitForTableActive(tableName);
      if (!isActive) {
        throw new Error(`Table ${tableName} did not become active after scaling`);
      }

      console.info(`⏳ Waiting ${retryDelay}ms before retrying ${operationName}...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      retryDelay = Math.min(retryDelay * finalConfig.backoffMultiplier, finalConfig.maxRetryDelay);
    }
  }

  throw lastError || new Error(`${operationName} failed after all retries`);
}

