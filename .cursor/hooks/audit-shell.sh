#!/bin/bash

# Cursor Hook: beforeShellExecution
# Audit and log all shell commands the AI agent wants to run
# Optionally block dangerous commands

# Read the JSON input from stdin
input=$(cat)

# Parse the command from the JSON input
command=$(echo "$input" | jq -r '.command // empty')

# Log directory
log_dir="/tmp/cursor-agent-audit"
mkdir -p "$log_dir"
log_file="$log_dir/shell-commands.log"

# Log the command with timestamp
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] $command" >> "$log_file"

# Define dangerous command patterns
dangerous_patterns=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \*"
  "> /dev/sda"
  "mkfs"
  "dd if="
  "chmod -R 777"
  "git push --force"
  "git push -f"
  "npm publish --force"
)

# Check if command matches dangerous patterns
for pattern in "${dangerous_patterns[@]}"; do
  if [[ "$command" =~ $pattern ]]; then
    # Block dangerous command
    cat << EOF
{
  "continue": true,
  "permission": "deny",
  "user_message": "⚠️ Dangerous command blocked: This command could cause data loss or security issues.",
  "agent_message": "The command '$command' has been blocked because it matches a dangerous pattern. Please use a safer alternative or ask the user for explicit permission."
}
EOF
    exit 0
  fi
done

# Allow all other commands (audit-only mode)
cat << EOF
{
  "continue": true,
  "permission": "allow"
}
EOF

exit 0

