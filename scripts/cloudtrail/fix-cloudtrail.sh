#!/bin/zsh

echo "🔧 Diagnosing and fixing CloudTrail setup..."

# 1. Check if trail exists
echo "📊 Checking CloudTrail status..."
aws cloudtrail describe-trails --trail-name-list coachforge-dynamodb-trail

# 2. Check logging status
echo ""
echo "📊 Checking logging status..."
aws cloudtrail get-trail-status --name coachforge-dynamodb-trail

# 3. Get table ARN
echo ""
echo "📊 Getting DynamoDB table ARN..."
TABLE_ARN=$(aws dynamodb describe-table \
  --table-name CoachForge-ProtoApi-AllItems-V2-Dev \
  --query 'Table.TableArn' \
  --output text)
echo "Table ARN: $TABLE_ARN"

# 4. Check current event selectors
echo ""
echo "📊 Current event selectors:"
aws cloudtrail get-event-selectors --trail-name coachforge-dynamodb-trail

# 5. Fix event selectors if needed
echo ""
echo "🔧 Updating event selectors to ensure DynamoDB data events are captured..."
aws cloudtrail put-event-selectors \
  --trail-name coachforge-dynamodb-trail \
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

echo ""
echo "✅ CloudTrail configuration updated!"
echo "⏳ Wait 5-10 minutes for data events to start appearing"
echo "🧪 Test your slash command and then run the search script again"
