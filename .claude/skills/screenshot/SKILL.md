---
name: screenshot
description: Take a browser screenshot using the MCP screenshot server. Supports page, mobile, and element screenshots. Parses the prompt to auto-select the right mode.
---

Take a browser screenshot using the MCP screenshot tools.

Parse the user prompt and pick the right tool:

1. If the prompt contains "mobile" -> use `mcp__screenshot-server__screenshot_mobile`
   - default device_name: "iPhone 14"
   - if a device is mentioned (e.g. "Pixel 7", "iPad Mini"), pass it as device_name
2. If the prompt contains "element" and a CSS selector -> use `mcp__screenshot-server__screenshot_element`
   - the selector follows "element" (e.g. "element .hero", "element #nav")
3. Otherwise -> use `mcp__screenshot-server__screenshot_page`
   - set full_page: true by default

Extract the URL from the prompt. It is always required.

Defaults for all tools:
- wait_until: "networkidle2"
- delay_ms: 0
- width: 1280 (desktop only)
- height: 720 (desktop only)

For output_name:
- derive a short safe name from the URL domain (e.g. "example_com")
- if the user provides a name, use it
- append "_mobile" or "_element" suffix when relevant

After the tool returns, report the saved file path. Keep the response to one or two lines.

If the URL is missing and cannot be inferred, ask for it in one short sentence. Do not ask unnecessary questions.

Usage examples:
- `/screenshot https://example.com`
- `/screenshot homepage of https://example.com`
- `/screenshot mobile https://example.com`
- `/screenshot element .hero on https://example.com`
- `/screenshot https://example.com as my_page`
