#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

if echo "$command" | grep -qE 'git\s+(pull|rebase|merge|checkout|switch|reset|cherry-pick)'; then
  echo "Git operation detected that may have brought in external changes. Update the code-review-graph by calling mcp__code-review-graph__build_or_update_graph_tool."
fi
exit 0
