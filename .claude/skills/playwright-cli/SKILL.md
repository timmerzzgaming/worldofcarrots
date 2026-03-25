---
name: playwright-cli
description: Browser automation via playwright-cli. Token-efficient commands for navigation, clicking, filling forms, screenshots, tab management, network interception, and session state. Designed for AI agent workflows.
---

Use the `playwright-cli` command-line tool for browser automation tasks. This tool is token-efficient and designed for AI agent workflows.

## Installation

```bash
npm install -g @anthropic-ai/playwright-cli
```

Install browser binaries if needed:

```bash
playwright-cli install-browser
```

## Command Syntax

```
playwright-cli [-s=session] <command> [args...] [--flags]
```

### Global Flags

- `-s=name` — Target a named session (for multi-session workflows)
- `--headed` — Show the browser window (default is headless)
- `--browser` — Select engine: `chromium` (default), `firefox`, `webkit`, `chrome`, `msedge`
- `--persistent` — Save browser profile to disk
- `--profile=/path` — Use a custom profile directory
- `--config=/path` — Load configuration file

## Core Commands (Page Interaction)

| Command | Description | Example |
|---------|-------------|---------|
| `open` | Launch browser session | `playwright-cli open --headed` |
| `goto` | Navigate to URL | `playwright-cli goto https://example.com` |
| `click` | Click an element | `playwright-cli click e3` |
| `fill` | Input text into a field | `playwright-cli fill e5 "hello"` |
| `type` | Type text character by character | `playwright-cli type e5 "hello"` |
| `snapshot` | Capture page state with element refs | `playwright-cli snapshot` |
| `close` | Close browser session | `playwright-cli close` |

### Element References

After running `snapshot`, elements are assigned references (`e1`, `e2`, `e3`, ...). Use these in subsequent commands:

```bash
playwright-cli snapshot          # Get element references
playwright-cli click e3          # Click the third element
playwright-cli fill e5 "query"   # Fill input field
```

## Navigation Commands

| Command | Description |
|---------|-------------|
| `go-back` | Navigate to previous page |
| `go-forward` | Navigate to next page |
| `reload` | Refresh the current page |

## Input Commands (Keyboard & Mouse)

| Command | Description | Example |
|---------|-------------|---------|
| `press` | Press keyboard keys | `playwright-cli press Enter` |
| `keydown` | Key down event | `playwright-cli keydown Shift` |
| `keyup` | Key up event | `playwright-cli keyup Shift` |
| `mousemove` | Move mouse cursor | `playwright-cli mousemove 100 200` |
| `mousedown` | Mouse button down | `playwright-cli mousedown` |
| `mouseup` | Mouse button up | `playwright-cli mouseup` |
| `mousewheel` | Scroll wheel | `playwright-cli mousewheel 0 -300` |

## Tab Management

| Command | Description | Example |
|---------|-------------|---------|
| `tab-list` | List open tabs | `playwright-cli tab-list` |
| `tab-new` | Open new tab | `playwright-cli tab-new` |
| `tab-close` | Close a tab | `playwright-cli tab-close` |
| `tab-select` | Switch to a tab | `playwright-cli tab-select 2` |

## Storage & State Commands

| Command | Description |
|---------|-------------|
| `state-save` | Save storage state to file |
| `state-load` | Load saved storage state |
| `cookie-get` | Get cookies |
| `cookie-set` | Set a cookie |
| `cookie-delete` | Delete cookies |
| `localstorage-get` | Get localStorage item |
| `localstorage-set` | Set localStorage item |
| `sessionstorage-get` | Get sessionStorage item |
| `sessionstorage-set` | Set sessionStorage item |

Save and restore login state:

```bash
playwright-cli state-save auth.json
playwright-cli state-load auth.json
```

## Network Commands

| Command | Description |
|---------|-------------|
| `route` | Set up a request handler (mock/intercept) |
| `unroute` | Remove a request handler |
| `route-list` | List active route handlers |

## DevTools Commands

| Command | Description | Example |
|---------|-------------|---------|
| `console` | Capture console output | `playwright-cli console` |
| `network` | Capture network activity | `playwright-cli network` |
| `screenshot` | Take a page screenshot | `playwright-cli screenshot --filename=page.png` |
| `run-code` | Execute custom JS code | `playwright-cli run-code "document.title"` |
| `tracing-start` | Begin trace recording | `playwright-cli tracing-start` |
| `tracing-stop` | End trace recording | `playwright-cli tracing-stop` |
| `video-start` | Begin video recording | `playwright-cli video-start` |
| `video-stop` | End video recording | `playwright-cli video-stop` |

## Session Management

| Command | Description |
|---------|-------------|
| `list` | List active sessions |
| `close` | Close a specific session |
| `close-all` | Close all sessions |
| `kill-all` | Force terminate all browsers |
| `delete-data` | Remove profile data |

## Typical Workflow

1. Open a session and navigate:
   ```bash
   playwright-cli open --headed
   playwright-cli goto https://example.com
   ```

2. Take a snapshot to get element references:
   ```bash
   playwright-cli snapshot
   ```

3. Interact with elements using refs:
   ```bash
   playwright-cli click e3
   playwright-cli fill e7 "search term"
   playwright-cli press Enter
   ```

4. Take a screenshot:
   ```bash
   playwright-cli screenshot --filename=result.png
   ```

5. Close the session:
   ```bash
   playwright-cli close

## When to Use This Skill

- Automating browser interactions for testing or scraping
- Taking screenshots of web pages
- Filling forms and clicking buttons programmatically
- Managing browser sessions and state
- Intercepting and mocking network requests
- Recording traces and videos of browser sessions

## References

- GitHub: https://github.com/microsoft/playwright-cli
- Docs: https://playwright.dev/docs/test-cli
