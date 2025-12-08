#!/bin/bash

# Cursor Hook: afterAgentResponse
# Log all AI agent responses for debugging and audit trail

# Read the JSON input from stdin
input=$(cat)

# Parse the response text
response_text=$(echo "$input" | jq -r '.text // empty')

# Log directory
log_dir="/tmp/cursor-agent-audit"
mkdir -p "$log_dir"
log_file="$log_dir/agent-responses.log"

# Log the response with timestamp
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp]" >> "$log_file"
echo "$response_text" >> "$log_file"
echo "---" >> "$log_file"

# Exit successfully
exit 0

