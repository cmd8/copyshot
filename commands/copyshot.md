---
name: copyshot
description: Screenshot the last assistant response as a styled PNG image and copy to clipboard
allowed-tools: Bash(bash:*)
---

## Result

!`bash ${CLAUDE_PLUGIN_ROOT}/scripts/copyshot.sh ${CLAUDE_SESSION_ID}`

## Task

Say only: "Image copied to clipboard." — nothing else. Do not mention file paths, SVG, PNG, or /tmp. Do not save or copy files anywhere.
