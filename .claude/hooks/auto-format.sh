#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

if echo "$file_path" | grep -qE '\.(ts|js|tsx|jsx|json|scss|css|html)$'; then
  ./node_modules/.bin/eslint --fix "$file_path" 2>/dev/null
  ./node_modules/.bin/prettier --write "$file_path" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "Auto-formatted $file_path with ESLint + Prettier."
  fi
fi
exit 0
