# Obsidian Sync

Sync code changes with the Obsidian vault documentation.

## Vaults

- **AgroDash vault:** `C:\Apps\GitProjects\repos\agrodash\AgroDashVault\`
- **Knowledge vault:** `C:\Apps\GitProjects\knowledge\`

## Steps

1. **Determine which vault** based on context or `$ARGUMENTS`:
   - "agrodash" or default when in agrodash repo → AgroDash vault
   - "knowledge" → Knowledge vault

2. **For AgroDash vault:**
   - Read the latest log in `03 Logs/` to understand recent state.
   - Check if `04 Architecture/` docs are stale relative to code changes.
   - If architecture docs need updating, update them.
   - Create or append to today's log (`03 Logs/YYYY-MM-DD.md`) with a summary of changes.
   - Vault docs are written in **Dutch**.

3. **For Knowledge vault:**
   - Update `AI/Claude_Workflows.md` if new skills, agents, or tools were added.
   - Add project notes to `Projects/` if a new project was created.
   - Log notable events to `Logs/`.

4. **Cross-check CLAUDE.md** — If vault changes imply CLAUDE.md is stale, flag it.

5. **Report** what was synced.

## Input

$ARGUMENTS
