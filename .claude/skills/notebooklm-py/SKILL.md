---
name: notebooklm-py
description: Programmatic access to Google NotebookLM via Python API and CLI. Create notebooks, add sources, chat, generate audio/video/quizzes/flashcards/slides/infographics/mind-maps, and manage sharing.
---

Use `notebooklm-py` to interact with Google NotebookLM programmatically — via CLI or Python API. Supports notebook management, source ingestion, chat, and content generation (audio, video, slides, quizzes, flashcards, infographics, mind maps, reports, data tables).

**Warning**: Uses undocumented Google APIs. Not affiliated with Google. APIs may break without notice.

## Installation

```bash
# Basic
pip install notebooklm-py

# With browser authentication
pip install "notebooklm-py[browser]"
playwright install chromium
```

Requires Python 3.10+.

## Authentication

```bash
# Login (opens browser for Google auth)
notebooklm login

# For organizations requiring Edge SSO
notebooklm login --browser msedge

# Verify authentication
notebooklm auth check --test
```

Credentials stored in:
- macOS: `~/Library/Application Support/notebooklm`
- Linux: `~/.config/notebooklm`
- Windows: `%APPDATA%\notebooklm`

## CLI Commands

### Notebook Operations

```bash
notebooklm create "My Research"        # Create notebook
notebooklm use <notebook_id>           # Set active notebook
notebooklm metadata --json             # Show notebook metadata
```

### Source Management

```bash
notebooklm source add "https://example.com"       # Add URL
notebooklm source add "./document.pdf"             # Add file (PDF, DOCX, TXT, MD, audio, video, images)
notebooklm source add-research "query_term"        # Add from research
```

### Chat

```bash
notebooklm ask "What are the key themes?"
```

### Content Generation

```bash
notebooklm generate audio "make it engaging" --wait
notebooklm generate video --style whiteboard --wait
notebooklm generate cinematic-video "documentary style" --wait
notebooklm generate quiz --difficulty hard
notebooklm generate flashcards --quantity more
notebooklm generate slide-deck
notebooklm generate infographic --orientation portrait
notebooklm generate mind-map
notebooklm generate data-table "compare concepts"
```

### Download Artifacts

```bash
notebooklm download audio ./podcast.mp3
notebooklm download video ./overview.mp4
notebooklm download quiz --format markdown ./quiz.md
notebooklm download flashcards --format json ./cards.json
notebooklm download slide-deck ./slides.pdf          # Also supports .pptx
notebooklm download infographic ./graphic.png
notebooklm download mind-map ./map.json
notebooklm download data-table ./data.csv
```

### Sharing

```bash
notebooklm share status
```

### Agent Integration

```bash
notebooklm skill install                # Install Claude Code skill
notebooklm agent show claude            # Display Claude Code skill
notebooklm agent show codex             # Display Codex instructions
notebooklm skill status                 # Verify installation
notebooklm language list                # Show supported languages
```

## Content Generation Reference

| Type | Options | Export Formats |
|------|---------|----------------|
| Audio Overview | 4 formats, 3 lengths, 50+ languages | MP3, MP4 |
| Video Overview | 3 formats, 9 visual styles | MP4 |
| Slide Deck | Detailed/presenter modes, slide revision | PDF, PPTX |
| Infographic | 3 orientations, 3 detail levels | PNG |
| Quiz | Configurable difficulty | JSON, Markdown, HTML |
| Flashcards | Adjustable quantity/difficulty | JSON, Markdown, HTML |
| Report | Multiple templates (briefing, study guide, blog) | Markdown |
| Data Table | Natural language schema definition | CSV |
| Mind Map | Interactive hierarchical structure | JSON |

## Python API

```python
import asyncio
from notebooklm import NotebookLMClient

async def main():
    async with await NotebookLMClient.from_storage() as client:
        # Create notebook
        nb = await client.notebooks.create("Research")

        # Add sources
        await client.sources.add_url(nb.id, "https://example.com", wait=True)

        # Chat
        result = await client.chat.ask(nb.id, "Summarize this")
        print(result.answer)

        # Generate audio
        status = await client.artifacts.generate_audio(nb.id, instructions="make it fun")
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_audio(nb.id, "podcast.mp3")

        # Generate quiz
        status = await client.artifacts.generate_quiz(nb.id)
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_quiz(nb.id, "quiz.json", output_format="json")

asyncio.run(main())
```

## Exclusive Features (Beyond Web UI)

- Batch download all artifacts of a type
- Export quizzes/flashcards as JSON/Markdown/HTML
- Extract mind maps as JSON for visualization tools
- Download slide decks as editable PPTX
- Revise individual slides with natural language
- Save chat conversations to notebook notes
- Retrieve indexed fulltext from any source
- Programmatic sharing and permission management

## When to Use This Skill

- Automating research workflows with NotebookLM
- Generating study materials (quizzes, flashcards, audio overviews)
- Batch-processing notebooks and sources
- Creating audio/video content from research materials
- Exporting NotebookLM artifacts in structured formats

## References

- GitHub: https://github.com/teng-lin/notebooklm-py
- PyPI: https://pypi.org/project/notebooklm-py/
