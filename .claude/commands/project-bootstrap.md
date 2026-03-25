# Project Bootstrap

Create a new project structure under `C:\Apps\GitProjects\repos\`.

## Input

Project name: $ARGUMENTS

If no name is provided, ask for one.

## Actions

1. Create the project directory at `C:\Apps\GitProjects\repos\<project-name>\`

2. Create this structure:
   ```
   <project-name>/
   ├── README.md
   ├── CLAUDE.md
   ├── docs/
   │   ├── ARCHITECTURE.md
   │   └── ROADMAP.md
   ├── scripts/
   └── src/
   ```

3. **README.md** — Project title, one-line description, setup instructions placeholder, tech stack placeholder.

4. **CLAUDE.md** — Follow this template:
   ```markdown
   # CLAUDE.md

   This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

   ## Commands

   (to be filled as the project develops)

   ## Architecture

   (to be filled as the project develops)

   ## Conventions

   - Use clear, descriptive variable and function names
   - Keep functions small and focused
   - Co-locate related files
   ```

5. **docs/ARCHITECTURE.md** — Empty template with sections: Overview, Components, Data Flow, Key Decisions.

6. **docs/ROADMAP.md** — Empty template with sections: MVP, Phase 2, Future.

7. Initialize git repo: `git init`

8. Create `.gitignore` appropriate for the detected tech stack (or a generic one with `.env`, `node_modules/`, `__pycache__/`, `*.db`, `.DS_Store`).

9. Create initial commit.

10. Report what was created.
