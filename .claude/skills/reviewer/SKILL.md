---
name: reviewer
description: Review code for bugs, unnecessary complexity, maintainability issues, and security risks. Use when reviewing code directly — for PR reviews by number, use git:pr-review instead.
---

Perform a strict code review on the specified code.

Check for:

- Bugs and logic errors
- Unnecessary complexity
- Maintainability issues
- Security risks (injection, auth, secrets, OWASP top 10)
- Performance concerns

Provide concise improvement suggestions. For each issue:

- State what the problem is
- Explain why it matters
- Suggest a specific fix

Do not rewrite the entire file. Focus on actionable feedback.
