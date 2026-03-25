# GitHub Sync

Sync the current project with GitHub. Handles commit, push, and optional PR creation.

## Steps

1. **Identify the repo.** Default to the current working directory. If at workspace root (`C:\Apps\GitProjects`), ask which repo under `repos/`.

2. **Check status:**
   ```bash
   cd <repo-path>
   git status
   git log --oneline -5
   ```

3. **Stage and commit** if there are uncommitted changes:
   - Review the diff.
   - Generate a concise commit message (Conventional Commits style).
   - Ask for confirmation before committing.

4. **Push** to the remote tracking branch:
   - If no upstream is set, suggest `git push -u origin <branch>`.
   - Ask for confirmation before pushing.

5. **Optional PR creation** — If `$ARGUMENTS` contains "pr":
   - Use `gh pr create` with a generated title and summary.
   - Return the PR URL.

6. **Report** what was synced.

## Input

$ARGUMENTS
