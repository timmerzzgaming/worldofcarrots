---
name: cli-anything
description: Generate complete CLI interfaces for any software using CLI-Anything. Transforms applications (GIMP, Blender, LibreOffice, Audacity, etc.) into agent-controllable command-line tools via a 7-phase pipeline.
---

Use CLI-Anything to generate comprehensive CLI interfaces for any software application, making them controllable by AI agents.

## What It Does

CLI-Anything transforms any software into agent-controllable command-line interfaces. It generates structured, reliable CLI tools from source code — enabling AI agents to programmatically control professional applications like GIMP, Blender, LibreOffice, and Audacity.

## Installation

### Claude Code (Primary)

```bash
# Add the marketplace
/plugin marketplace add HKUDS/CLI-Anything

# Install the plugin
/plugin install cli-anything
```

### Manual Installation

```bash
git clone https://github.com/HKUDS/CLI-Anything.git
```

Platform-specific setup:

| Platform | Setup |
|----------|-------|
| OpenCode | Copy `opencode-commands/*.md` to `~/.config/opencode/commands/` |
| Qodercli | Run `bash CLI-Anything/qoder-plugin/setup-qodercli.sh` |
| OpenClaw | Copy `openclaw-skill/SKILL.md` to `~/.openclaw/skills/cli-anything/` |
| Codex | Run `bash CLI-Anything/codex-skill/scripts/install.sh` |

## Core Commands

### Generate a CLI

```bash
# From a local directory
/cli-anything:cli-anything ./gimp

# From a GitHub repository
/cli-anything https://github.com/blender/blender
```

### Refine an Existing CLI

```bash
# Broad analysis for gaps
/cli-anything:refine ./gimp

# Targeted enhancement
/cli-anything:refine ./gimp "batch processing and filters"
```

### Use a Generated CLI

```bash
cd gimp/agent-harness && pip install -e .
cli-anything-gimp --help
cli-anything-gimp project new --width 1920 --height 1080
cli-anything-gimp --json layer add -n "Background"
```

## The 7-Phase Pipeline

1. **Analyze** — Scans source code and maps functionality to APIs
2. **Design** — Architects command structure and state model
3. **Implement** — Builds Click-based CLI with REPL and JSON output
4. **Plan Tests** — Creates comprehensive test specifications
5. **Write Tests** — Implements unit and end-to-end tests
6. **Document** — Updates documentation with results
7. **Publish** — Generates `setup.py` and installs to system PATH

Phase 6.5 (SKILL.md generation) also ships an AI-discoverable skill definition inside the Python package.

## Architecture

### Key Components

- **Click Framework** — Structured command architecture with automatic `--help` and JSON output (`--json` flag)
- **ReplSkin** — Unified interactive REPL interface with persistent session state, undo/redo
- **State Management** — Persistent project state across sessions
- **SKILL.md** — Every generated CLI ships with an AI-discoverable skill definition

### Output Formats

- Human-readable (default)
- Structured JSON (`--json` flag)

### Generated CLI Structure

```
software/agent-harness/
  setup.py
  cli_anything_software/
    __init__.py
    cli.py
    skills/
      SKILL.md
```

## Examples

Generate a CLI for GIMP:

```bash
/cli-anything:cli-anything ./gimp
cd gimp/agent-harness && pip install -e .

# Create a new project
cli-anything-gimp project new --width 1920 --height 1080

# Add a layer
cli-anything-gimp layer add -n "Background"

# Apply a filter (JSON output)
cli-anything-gimp --json filter apply gaussian-blur --radius 5
```

## When to Use This Skill

- Making desktop applications controllable by AI agents
- Generating CLI wrappers for GUI-only software
- Building agent-native interfaces for professional tools
- Automating workflows across multiple applications
- Creating testable, scriptable interfaces for any software

## References

- GitHub: https://github.com/HKUDS/CLI-Anything
- Guide: https://apidog.com/blog/how-to-use-cli-anything/
