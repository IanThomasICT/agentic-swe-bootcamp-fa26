---
name: commit
description: Commits changes using conventional commit format. Use when asked to commit changes.
---

1. Stage only files related to the current task
2. Write a commit message using conventional commit format (`type(scope): description [TICKET-ID]`)
3. Keep the subject line under 85 characters
4. Add a Jira or ticket tag if working on a tracked issue
5. Never commit .env files, credentials, or secrets
6. Always commit as `Ian's Agent <agent@ianthomasict.com>`