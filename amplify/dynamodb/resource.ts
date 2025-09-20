import { defineFunction } from '@aws-amplify/backend';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { RemovalPolicy, Stack, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export function createDynamoDBTable(scope: Construct) {
  const stack = Stack.of(scope);

      // Determine if this is a sandbox deployment (same approach as API)
  const isSandbox = stack.node.tryGetContext('amplify-backend-type') === 'sandbox';

  const tableBaseName = 'NeonPanda-ProtoApi-AllItems-V2';
  const tableName = isSandbox ? `${tableBaseName}-Dev` : tableBaseName;

  // Main DynamoDB table with enterprise configuration
  const table = new dynamodb.Table(scope, 'NeonPandaTable', {
    tableName: tableName,

    // Composite primary key (pk + sk)
    partitionKey: {
      name: 'pk',
      type: dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: 'sk',
      type: dynamodb.AttributeType.STRING,
    },

    // Provisioned billing mode for predictable performance
    billingMode: dynamodb.BillingMode.PROVISIONED,
    readCapacity: 20,
    writeCapacity: 20,

    // TTL Configuration for automatic cleanup
    timeToLiveAttribute: 'ttl',

    // Enterprise features
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true,
    },
    deletionProtection: true,
    encryption: dynamodb.TableEncryption.AWS_MANAGED,

    // Development vs Production removal policy
    removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN for production
  });

  // Add Global Secondary Indexes after table creation
  table.addGlobalSecondaryIndex({
    indexName: 'gsi1',
    partitionKey: {
      name: 'gsi1pk',
      type: dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: 'gsi1sk',
      type: dynamodb.AttributeType.STRING,
    },
    readCapacity: 20,
    writeCapacity: 20,
    projectionType: dynamodb.ProjectionType.ALL,
  });

  table.addGlobalSecondaryIndex({
    indexName: 'gsi2',
    partitionKey: {
      name: 'gsi2pk',
      type: dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: 'gsi2sk',
      type: dynamodb.AttributeType.STRING,
    },
    readCapacity: 20,
    writeCapacity: 20,
    projectionType: dynamodb.ProjectionType.ALL,
  });

  table.addGlobalSecondaryIndex({
    indexName: 'gsi3',
    partitionKey: {
      name: 'entityType',
      type: dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: 'pk',
      type: dynamodb.AttributeType.STRING,
    },
    readCapacity: 20,
    writeCapacity: 20,
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // Auto Scaling Configuration
  const readScaling = table.autoScaleReadCapacity({
    minCapacity: 20,
    maxCapacity: 100,
  });

  readScaling.scaleOnUtilization({
    targetUtilizationPercent: 70,
    scaleInCooldown: Duration.minutes(1),
    scaleOutCooldown: Duration.minutes(1),
  });

  const writeScaling = table.autoScaleWriteCapacity({
    minCapacity: 20,
    maxCapacity: 50,
  });

  writeScaling.scaleOnUtilization({
    targetUtilizationPercent: 70,
    scaleInCooldown: Duration.minutes(1),
    scaleOutCooldown: Duration.minutes(1),
  });

  // Auto Scaling for GSIs
  ['gsi1', 'gsi2', 'gsi3'].forEach((indexName) => {
    const gsiReadScaling = table.autoScaleGlobalSecondaryIndexReadCapacity(indexName, {
      minCapacity: 20,
      maxCapacity: 100,
    });

    gsiReadScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.minutes(1),
      scaleOutCooldown: Duration.minutes(1),
    });

    const gsiWriteScaling = table.autoScaleGlobalSecondaryIndexWriteCapacity(indexName, {
      minCapacity: 20,
      maxCapacity: 50,
    });

    gsiWriteScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.minutes(1),
      scaleOutCooldown: Duration.minutes(1),
    });
  });

  // Cost Alarm (simplified for development)
  const alarmBaseName = 'NeonPanda-ProtoApi-HighCostAlarm';
  const alarmName = isSandbox ? `${alarmBaseName}-Dev` : alarmBaseName;

  const costAlarm = new cloudwatch.Alarm(scope, 'DynamoDBCostAlarm', {
    alarmName: alarmName,
    alarmDescription: 'Alarm when DynamoDB costs exceed threshold',
    metric: new cloudwatch.Metric({
      namespace: 'AWS/Billing',
      metricName: 'EstimatedCharges',
      dimensionsMap: {
        ServiceName: 'DynamoDB',
        Currency: 'USD',
      },
      statistic: 'Maximum',
      period: Duration.hours(6),
    }),
    threshold: 100, // $100
    evaluationPeriods: 1,
  });

  return {
    table,
    costAlarm,
  };
}

export const dynamodbTable = {
  createCoreTable: createDynamoDBTable,
};
