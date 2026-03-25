---
name: copyshot
description: Screenshot the last assistant response as a styled PNG image and copy to clipboard
allowed-tools: Bash(bash:*)
---

## Result

!`bash $HOME/.local/share/copyshot/scripts/copyshot.sh ${CLAUDE_SESSION_ID}`

## Task

Say only: "Image copied to clipboard. [HH:MM:SS]" with the current local time. Nothing else. Do not mention file paths, SVG, PNG, or /tmp. Do not save or copy files anywhere.
