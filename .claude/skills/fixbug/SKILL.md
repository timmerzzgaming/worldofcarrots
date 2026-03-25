---
name: fixbug
description: Diagnose and fix a bug with minimal changes. Identifies root cause, applies targeted fix, reports files modified and next steps. Use for general bug fixing — for failing tests use testing:test-fix, for GitHub issues use git:fix-issue.
---

Diagnose and fix the reported bug.

Steps:

1. Identify root cause through practical debugging
2. Apply minimal fix — modify files directly when appropriate
3. Verify the fix addresses the root cause, not just symptoms

Output:

- short explanation of root cause
- files modified
- next steps (if any)

Rules:

- Focus on minimal, targeted changes
- Do not refactor surrounding code
- If the bug cannot be reproduced or root cause is unclear, explain what was investigated and suggest next steps
