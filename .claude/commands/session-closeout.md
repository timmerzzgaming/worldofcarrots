# Session Closeout

Wrap up the current session and prepare for the next one.

## Steps

1. **Read** `C:\Apps\GitProjects\SESSION.md` and `C:\Apps\GitProjects\TASKS.md`.

2. **Gather session state:**
   - List files changed this session (use `git status` in any active repo).
   - Summarize what was accomplished.
   - Note any blockers or unfinished work.

3. **Update SESSION.md:**
   - Set Status to `closed`.
   - Fill "Recent Changes" with a bullet list of what happened.
   - Fill "Context" with anything the next session needs to know.

4. **Update TASKS.md:**
   - Move completed tasks to "Done (recent)".
   - Keep in-progress and blocked tasks current.
   - Add any new tasks discovered during the session.

5. **Update Claude memory** (`~/.claude/projects/C--apps-gitprojects/memory/MEMORY.md`) if any durable knowledge was gained.

6. **Log to Obsidian vault** if an agrodash session: append to `repos/agrodash/AgroDashVault/03 Logs/{today}.md`.

7. **Output a brief handoff summary** — 3-5 lines a new session can read to pick up where this one left off.

## Input

$ARGUMENTS
