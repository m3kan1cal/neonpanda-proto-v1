# DynamoDB Throughput Scaling Implementation

## Overview

This implementation provides automatic DynamoDB throughput scaling with retry logic to handle `ProvisionedThroughputExceededException` errors. When a throughput limit is exceeded, the system automatically scales up capacity, retries the operation, and then scales back down after a configurable delay.

## Features

- **Automatic Scaling**: Detects throughput exceptions and scales up capacity
- **Intelligent Retry**: Exponential backoff with configurable retry limits
- **Auto Scale-Down**: Returns capacity to baseline after operations complete
- **GSI Support**: Scales both main table and Global Secondary Indexes
- **Environment Configuration**: Configurable via environment variables
- **Comprehensive Logging**: Detailed logging for monitoring and debugging

## How It Works

1. **Operation Execution**: DynamoDB operations are wrapped with throughput scaling logic
2. **Exception Detection**: Catches `ProvisionedThroughputExceededException` errors
3. **Capacity Scaling**: Automatically increases read/write capacity by a configurable factor
4. **Wait for Active**: Waits for table to become active after scaling
5. **Retry with Backoff**: Retries the operation with exponential backoff
6. **Scheduled Scale-Down**: Automatically scales back to baseline after configurable delay

## Configuration

### Environment Variables

All functions are configured with these environment variables:

```typescript
DYNAMODB_BASE_READ_CAPACITY=5           // Baseline read capacity
DYNAMODB_BASE_WRITE_CAPACITY=5          // Baseline write capacity
DYNAMODB_MAX_READ_CAPACITY=100          // Maximum read capacity
DYNAMODB_MAX_WRITE_CAPACITY=50          // Maximum write capacity
DYNAMODB_SCALE_UP_FACTOR=2.0            // Scaling multiplier (2x capacity)
DYNAMODB_MAX_RETRIES=5                  // Maximum retry attempts
DYNAMODB_INITIAL_RETRY_DELAY=1000       // Initial delay in ms
DYNAMODB_SCALE_DOWN_DELAY_MINUTES=10    // Minutes to wait before scaling down
```

### IAM Permissions

Functions that use throughput scaling have these additional permissions:

```typescript
dynamodb:DescribeTable
dynamodb:UpdateTable
dynamodb:DescribeTimeToLive
dynamodb:ListTagsOfResource
```

## Usage Examples

### Automatic Wrapper (Recommended)

The system automatically wraps critical DynamoDB operations:

```typescript
// This function automatically uses throughput scaling
const workouts = await queryWorkouts(userId, {
  fromDate: startDate,
  toDate: endDate,
  limit: 100
});
```

### Manual Wrapper

For custom operations, use the `withThroughputScaling` wrapper:

```typescript
import { withThroughputScaling } from '../libs/dynamodb-retry-wrapper';

const result = await withThroughputScaling(
  async () => {
    // Your DynamoDB operation here
    return await docClient.send(command);
  },
  'Custom query operation'
);
```

### Using the Scaling Client

For more control, use the `ScalingDynamoDBDocumentClient`:

```typescript
import { createScalingDynamoDBClient } from '../libs/dynamodb-retry-wrapper';

const scalingClient = createScalingDynamoDBClient(docClient, {
  maxReadCapacity: 200, // Override default config
  scaleUpFactor: 3.0
});

const result = await scalingClient.executeWithScaling(
  () => docClient.send(command),
  'High-volume operation'
);
```

## Implementation Details

### Scaling Logic

1. **Scale Factor**: Current capacity is multiplied by `DYNAMODB_SCALE_UP_FACTOR`
2. **Maximum Limits**: Scaling is capped at `DYNAMODB_MAX_READ/WRITE_CAPACITY`
3. **GSI Scaling**: All Global Secondary Indexes are scaled proportionally
4. **Table Status**: Waits for table to become `ACTIVE` before retrying

### Retry Strategy

1. **Exponential Backoff**: Delay doubles after each retry
2. **Maximum Delay**: Capped at `maxRetryDelay` (default 30 seconds)
3. **Retry Limit**: Maximum of `DYNAMODB_MAX_RETRIES` attempts
4. **Exception Filtering**: Only retries on throughput-related exceptions

### Scale-Down Process

1. **Automatic Scheduling**: Scale-down is scheduled after successful operations
2. **Delay Period**: Configurable delay (default 10 minutes) to avoid thrashing
3. **Baseline Return**: Returns to `DYNAMODB_BASE_READ/WRITE_CAPACITY`
4. **Fire and Forget**: Scale-down runs asynchronously and doesn't block operations

## Monitoring

### CloudWatch Logs

The system provides comprehensive logging:

```
🔄 Scaling up throughput for table: CoachForge-ProtoApi-AllItems-V2-Dev
⚠️ Query workout sessions hit throughput limit (attempt 1). Scaling up capacity...
✅ Successfully scaled up throughput for CoachForge-ProtoApi-AllItems-V2-Dev
⏳ Waiting 1000ms before retrying Query workout sessions...
✅ Query workout sessions succeeded after scaling. Scheduling scale-down in 10 minutes
🔽 Scaling down throughput for table: CoachForge-ProtoApi-AllItems-V2-Dev
```

### Metrics to Monitor

- **Throughput Exceptions**: Should decrease with this implementation
- **Scaling Events**: Monitor frequency of scale-up/scale-down operations
- **Operation Latency**: May increase during scaling but should be more reliable
- **Cost Impact**: Monitor DynamoDB costs during high-throughput periods

## Cost Considerations

### Benefits
- **Reduced Errors**: Fewer failed operations due to throughput limits
- **Automatic Optimization**: Returns to baseline capacity to minimize costs
- **Configurable Limits**: Maximum capacity limits prevent runaway costs

### Potential Costs
- **Temporary Scaling**: Higher capacity during peak usage periods
- **Scale-Down Delay**: Brief period of elevated capacity after operations
- **GSI Scaling**: All indexes scale together, multiplying the cost impact

### Cost Optimization Tips
1. Set appropriate `MAX_READ/WRITE_CAPACITY` limits
2. Tune `SCALE_DOWN_DELAY_MINUTES` for your usage patterns
3. Monitor and adjust `SCALE_UP_FACTOR` based on actual needs
4. Consider switching to On-Demand billing for highly variable workloads

## Functions Using Throughput Scaling

### Automatically Wrapped Functions
- `queryFromDynamoDB()` - All entity queries
- `getUserProfileByEmail()` - User lookup by email
- `queryAllEntitiesByType()` - Analytics and admin queries

### Functions with Throughput Permissions
- `get-workouts` - Workout listing and filtering
- `get-workouts-count` - Workout counting operations
- `build-weekly-analytics` - Analytics data processing
- `get-weekly-reports` - Analytics report retrieval
- `get-conversations-count` - Conversation counting
- `get-coach-conversations` - Conversation listing

## Troubleshooting

### Common Issues

1. **Still Getting Throughput Errors**
   - Check if the function has throughput permissions
   - Verify environment variables are set correctly
   - Increase `MAX_READ/WRITE_CAPACITY` limits

2. **Scaling Not Working**
   - Check CloudWatch logs for scaling events
   - Verify IAM permissions for table updates
   - Ensure table is in provisioned (not on-demand) mode

3. **High Costs**
   - Review `SCALE_DOWN_DELAY_MINUTES` setting
   - Check if operations are completing successfully
   - Consider lowering `MAX_READ/WRITE_CAPACITY` limits

### Debug Mode

Enable detailed logging by checking CloudWatch logs for your Lambda functions. All scaling events are logged with specific details about capacity changes and retry attempts.

## Future Enhancements

1. **CloudWatch Metrics**: Custom metrics for scaling events
2. **SNS Notifications**: Alerts for frequent scaling events
3. **Cost Tracking**: Integration with AWS Cost Explorer
4. **Predictive Scaling**: Machine learning-based capacity prediction
5. **Per-Operation Tuning**: Different scaling parameters per operation type
