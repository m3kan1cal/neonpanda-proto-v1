#!/bin/bash

# Cursor Hook: afterFileEdit
# Automatically lint and format files edited by the AI agent

# Read the JSON input from stdin
input=$(cat)

# Parse the file path from the JSON input
file_path=$(echo "$input" | jq -r '.file_path // empty')

# Log to a file for debugging (optional)
# echo "[$(date)] Linting and formatting: $file_path" >> /tmp/cursor-hooks.log

# Exit early if no file path
if [ -z "$file_path" ]; then
  exit 0
fi

# Get the file extension
file_ext="${file_path##*.}"

# Determine the project root (where package.json is)
project_root=$(dirname "$file_path")
while [ ! -f "$project_root/package.json" ] && [ "$project_root" != "/" ]; do
  project_root=$(dirname "$project_root")
done

# Change to project root for proper tool execution
cd "$project_root" 2>/dev/null || exit 0

# Run ESLint on JS/JSX files
if [[ "$file_ext" == "js" || "$file_ext" == "jsx" ]]; then
  # Check if ESLint is available
  if command -v npx >/dev/null 2>&1 && [ -f "eslint.config.js" ]; then
    npx eslint --fix "$file_path" 2>/dev/null || true
  fi
fi

# Run Prettier on supported file types
if [[ "$file_ext" =~ ^(js|jsx|ts|tsx|json|md|html|css)$ ]]; then
  # Check if Prettier is available
  if command -v npx >/dev/null 2>&1; then
    npx prettier --write "$file_path" 2>/dev/null || true
  fi
fi

# Exit successfully (hook always succeeds to not block the agent)
exit 0

