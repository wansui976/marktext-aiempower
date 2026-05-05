<p align="center">
  <img src="static/logo-small.png" alt="MarkText-AIEmpower" width="96" height="96">
</p>

<h1 align="center">MarkText-AIEmpower</h1>

<p align="center">
  A distraction-free Markdown editor with a built-in AI writing assistant.<br>
  Based on <a href="https://github.com/marktext/marktext">MarkText</a>, extended with AI chat, inline editing, 38 themes, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/AI-Anthropic%20%7C%20OpenAI%20compatible-orange" alt="AI">
</p>

---

## What's different

This fork adds an AI layer and a refreshed theme system on top of the original MarkText experience. Everything that made MarkText good — the clean editor, focus mode, live preview, keyboard-first workflow — stays exactly as it was.

### AI sidebar

A chat panel lives in the right sidebar. It's document-aware: the model can read your current file, propose edits, and apply them with your approval.

- **Streaming responses** with live Markdown rendering and Mermaid diagram previews
- **Tool calling** — the AI can `get_document`, `replace_text`, `insert_text`, `apply_edit`, `read_file`, and `list_directory`
- **Edit modes** — *Ask before edits* (shows a diff, you approve), *Edit automatically*, or *Plan mode* (AI explains, you decide)
- **Undo stack** — one click to revert any AI edit
- **File references** — type `#` to attach a project file, `@` to attach a document section
- **Image context** — paste or drag images into the chat (up to 4)
- **Slash commands** — `/summarize`, `/improve`, `/translate`, and more built-in prompt templates
- **Input history** — press ↑ to recall previous messages
- **Session persistence** — conversations are saved per document and survive app restarts
- **Conversation compaction** — when the context gets long, summarize history with one click

### Inline AI

Select any text and press `Cmd/Ctrl + Alt + K` (or click **AI** in the format toolbar) to open a lightweight floating prompt:

- **Ask** — get an answer about the selection without leaving the editor
- **Rewrite** — stream a rewrite of the selected text, then Accept or discard

### Provider support

| Provider | Notes |
|---|---|
| Anthropic | Default. Requires an API key. Supports Claude models. |
| OpenAI-compatible | Works with OpenAI, local servers (Ollama, LM Studio), and any `/v1/chat/completions` endpoint. API key is optional for local endpoints. |

### Theme system

38 hand-crafted themes, selectable from a card-grid preview page with **search** and **Light / Dark** filter tabs.

<details>
<summary>Full theme list</summary>

| Light themes | Dark themes |
|---|---|
| Graphite Red | Graphite Black |
| Graphite Blue | Charcoal Grey |
| Broad Daylight | Dark Night |
| Dead Leaf | Anxiety Mode |
| Icefield | Gotham City |
| Moonlight | Dracula |
| Ayu Light | Toothpaste |
| Gandalf | Cobalt Blue |
| Deer Park | Ten Gold |
| Boring | Ayu Mirage |
| Day | Nord |
| Notes Light | Notes Dark |
| Rose Pine Dawn | Lighthouse |
| Norwegian Light | Rose Pine |
| Vinyl | Tokyo Night |
| Catppuccin Latte | Academic |
| Clear Realm | Atom One Dark |
| | Catppuccin Macchiato |
| | Shibuya Jazz |
| | Shibuya Lo-fi |
| | Dark Forest |

</details>

---

## Quick start

### Download a release

Pre-built binaries are not yet published in this fork. Build from source (see below) or grab the [original MarkText releases](https://github.com/marktext/marktext/releases) as a baseline.

### Build from source

```bash
# Node 18+ and Yarn required
git clone https://github.com/wansui976/marktext.git
cd marktext
yarn
yarn dev        # development mode
yarn build      # production build
```

---

## AI setup

1. Open the AI sidebar (right panel icon, or `Cmd/Ctrl + Shift + A`).
2. Click the **Settings** icon inside the panel.
3. Choose your provider and paste your API key.
4. Optionally set a custom Base URL (for local servers or proxies) and model name.

Environment variables are also supported and take lower priority than the settings panel:

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com   # optional
ANTHROPIC_MODEL=claude-...                     # optional

# OpenAI-compatible
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com          # optional
OPENAI_MODEL=gpt-...                            # optional
```

---

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Inline AI prompt | `Cmd/Ctrl + Alt + K` |
| Undo last AI edit | `Cmd/Ctrl + Z` inside the AI panel |
| Recall previous input | `Up` in the AI input box, at the start of a line |

---

## Project structure

```text
src/renderer/
├── node/claudeApi.js              # Provider abstraction, SSE streaming, tool loop
├── components/sideBar/
│   └── claudeChat.vue             # AI sidebar: chat, sessions, tools, edit approval
├── components/editorWithTabs/
│   ├── inlineAiPrompt.vue         # Floating Ask / Rewrite UI
│   ├── editor.vue                 # Muya <-> AI bridge, selection, edit apply
│   └── sourceCode.vue             # CodeMirror <-> AI bridge
└── assets/themes/                 # 38 CSS theme files
```

---

## Credits

This project is built on top of [MarkText](https://github.com/marktext/marktext) by [Luo Ran](https://github.com/Jocs) and the MarkText contributors.

Original copyright:

```text
Copyright (c) 2017-present Luo Ran
Copyright (c) 2018-present MarkText Contributors
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
