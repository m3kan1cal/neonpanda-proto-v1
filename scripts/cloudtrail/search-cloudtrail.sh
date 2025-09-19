#!/bin/zsh

CONVERSATION_ID="${1:-conv_1756074503713_p7d0778jx}"
TIME_MINUTES="${2:-30}"

echo "🔍 Analyzing DynamoDB events for conversation: $CONVERSATION_ID"
echo "📅 Time range: last $TIME_MINUTES minutes"
echo "========================================================================"

# Function to get ISO date for macOS/BSD date
get_start_time() {
    # macOS/BSD date syntax for relative time
    date -u -v-${TIME_MINUTES}M +"%Y-%m-%dT%H:%M:%SZ"
}

get_end_time() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

START_TIME=$(get_start_time)
END_TIME=$(get_end_time)

echo "🕐 Start time: $START_TIME"
echo "🕐 End time: $END_TIME"
echo ""

# Get all DynamoDB events for this conversation
echo "📊 All DynamoDB operations on this conversation:"
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=dynamodb.amazonaws.com \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --output json | jq -r '.Events[] |
    select(.CloudTrailEvent | contains("'$CONVERSATION_ID'")) |
    {
      time: .EventTime,
      event: .EventName,
      user: .Username,
      sourceIP: .SourceIPAddress,
      userIdentity: (.CloudTrailEvent | fromjson | .userIdentity.type),
      userAgent: (.CloudTrailEvent | fromjson | .userAgent // "unknown"),
      lambdaFunction: (.CloudTrailEvent | fromjson | .userIdentity.principalId // "unknown")
    }' | jq -s 'sort_by(.time)'

echo ""
echo "🚨 Looking for MULTIPLE WRITES (potential race conditions):"

# Count writes per minute
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutItem \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --output json | jq -r '.Events[] |
    select(.CloudTrailEvent | contains("'$CONVERSATION_ID'")) |
    .EventTime' | cut -d: -f1,2 | sort | uniq -c | awk '$1 > 1 {print "⚠️  " $1 " writes in minute " $2}'

echo ""
echo "🔧 Different Lambda functions writing to this conversation:"
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=dynamodb.amazonaws.com \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --output json | jq -r '.Events[] |
    select(.CloudTrailEvent | contains("'$CONVERSATION_ID'")) |
    (.CloudTrailEvent | fromjson | .userIdentity.principalId // "unknown")' | sort | uniq -c

echo ""
echo "📱 Different source IPs accessing this conversation:"
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=dynamodb.amazonaws.com \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --output json | jq -r '.Events[] |
    select(.CloudTrailEvent | contains("'$CONVERSATION_ID'")) |
    .SourceIPAddress' | sort | uniq -c

echo ""
echo "📦 PAYLOAD ANALYSIS - What was actually written:"
echo "========================================================================"

# Show detailed payload information for each write operation
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutItem \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --output json | jq -r '.Events[] |
    select(.CloudTrailEvent | contains("'$CONVERSATION_ID'")) |
    (.CloudTrailEvent | fromjson) as $event |
    {
      time: .EventTime,
      lambdaFunction: ($event.userIdentity.principalId // "unknown"),
      messageCount: ($event.requestParameters.item.attributes.S | fromjson | .messages | length),
      lastMessageId: ($event.requestParameters.item.attributes.S | fromjson | .messages | last | .id),
      lastMessageRole: ($event.requestParameters.item.attributes.S | fromjson | .messages | last | .role),
      lastMessageContent: ($event.requestParameters.item.attributes.S | fromjson | .messages | last | .content | .[0:100] + "..."),
      totalMessages: ($event.requestParameters.item.attributes.S | fromjson | .metadata.totalMessages),
      updatedAt: ($event.requestParameters.item.updatedAt.S)
    }' | jq -s 'sort_by(.time)' | jq -r '.[] |
    "🕐 \(.time)
📍 Function: \(.lambdaFunction)
📊 Message Count: \(.messageCount) (metadata says: \(.totalMessages))
🆔 Last Message: \(.lastMessageId) (\(.lastMessageRole))
💬 Content: \(.lastMessageContent)
⏰ Updated: \(.updatedAt)
────────────────────────────────────────────────────────────────────────────────"'

echo ""
echo "🔍 RAW PAYLOAD DETAILS (for debugging):"
echo "========================================================================"

# Show the raw DynamoDB item structure for the most recent write
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutItem \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --output json | jq -r '.Events[] |
    select(.CloudTrailEvent | contains("'$CONVERSATION_ID'")) |
    (.CloudTrailEvent | fromjson | .requestParameters.item) as $item |
    {
      time: .EventTime,
      pk: $item.pk.S,
      sk: $item.sk.S,
      entityType: $item.entityType.S,
      updatedAt: $item.updatedAt.S,
      attributesLength: ($item.attributes.S | length),
      messagesArray: ($item.attributes.S | fromjson | .messages | map({id: .id, role: .role, contentLength: (.content | length)}))
    }' | jq -s 'sort_by(.time) | last'
