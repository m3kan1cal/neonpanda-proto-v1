#!/bin/bash

# Get the exact table ARN first
TABLE_ARN=$(aws dynamodb describe-table \
  --table-name NeonPanda-ProtoApi-AllItems-V2-Dev \
  --query 'Table.TableArn' \
  --output text)

echo "Using table ARN: $TABLE_ARN"

# 1. Check existing S3 bucket policy and merge if needed
echo "Checking existing S3 bucket policy..."
aws s3api get-bucket-policy \
  --bucket midgard-sandbox-logs \
  --query 'Policy' \
  --output text > scripts/cloudtrail/existing-policy.json 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Found existing bucket policy. Merging with CloudTrail permissions..."

    # Backup existing policy
    cp scripts/cloudtrail/existing-policy.json scripts/cloudtrail/existing-policy-backup.json

    # Merge existing policy with CloudTrail policy
    jq --argjson cloudtrail "$(cat scripts/cloudtrail/s3-bucket-policy.json)" '
        .Statement += $cloudtrail.Statement
    ' scripts/cloudtrail/existing-policy.json > scripts/cloudtrail/s3-bucket-policy-merged.json

    # Use merged policy
    POLICY_FILE="scripts/cloudtrail/s3-bucket-policy-merged.json"
    echo "📋 Using merged policy with $(jq '.Statement | length' $POLICY_FILE) statements"
else
    echo "ℹ️  No existing bucket policy found. Using CloudTrail policy only."
    POLICY_FILE="scripts/cloudtrail/s3-bucket-policy.json"
fi

echo "Setting S3 bucket policy..."
aws s3api put-bucket-policy \
  --bucket midgard-sandbox-logs \
  --policy file://$POLICY_FILE

# 2. Create CloudTrail
echo "Creating CloudTrail..."
aws cloudtrail create-trail \
  --name neonpanda-dynamodb-trail \
  --s3-bucket-name midgard-sandbox-logs \
  --s3-key-prefix dynamodb-events/ \
  --include-global-service-events \
  --is-multi-region-trail \
  --enable-log-file-validation

# 3. Start logging
echo "Starting CloudTrail logging..."
aws cloudtrail start-logging --name neonpanda-dynamodb-trail

# 4. Set up event selectors with correct ARN
echo "Setting up DynamoDB event selectors..."
aws cloudtrail put-event-selectors \
  --trail-name neonpanda-dynamodb-trail \
  --event-selectors "[
    {
      \"ReadWriteType\": \"All\",
      \"IncludeManagementEvents\": true,
      \"DataResources\": [
        {
          \"Type\": \"AWS::DynamoDB::Table\",
          \"Values\": [\"$TABLE_ARN\"]
        }
      ]
    }
  ]"

echo "CloudTrail setup complete! Wait 10-15 minutes before testing."
echo "Table being monitored: $TABLE_ARN"
