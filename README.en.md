<p align="center">
  <img src="static/logo-small.png" alt="MarkText-AIEmpower" width="96" height="96">
</p>

<h1 align="center">MarkText-AIEmpower</h1>

<p align="center">
  A distraction-free Markdown editor with a built-in AI writing assistant.<br>
  Based on <a href="https://github.com/marktext/marktext">MarkText</a>, extended with AI chat, inline editing, a refreshed interface, 38 themes, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/AI-Anthropic%20%7C%20OpenAI%20compatible-orange" alt="AI">
</p>

---

## What's different

This fork adds an AI layer, a modernized interface, and a refreshed theme system on top of the original MarkText experience. Everything that made MarkText good — the clean editor, focus mode, live preview, keyboard-first workflow — stays exactly as it was.

### AI sidebar

A chat panel lives in the left activity bar (`Cmd/Ctrl + Alt + J`). It's document-aware: the model can read your current file, propose edits, and apply them with your approval.

- **Streaming responses** with live Markdown rendering and Mermaid diagram previews, laid out as a bubble-less document flow: your messages are soft blocks, replies read like body text
- **Tool calling** — reading (`get_document_outline`, `get_document_section`, `search_document`, `get_document`), project files (`glob_files`, `grep_files`, `read_file`, `list_directory`), web pages (`fetch_url`), and editing (`replace_text`, `insert_text`, `apply_edit`); up to 10 rounds per request, shown as a compact activity line such as "Reading outline · Reading section"
- **Edit modes** — *Ask before edits* (shows a diff, you approve), *Edit automatically*, or *Plan mode* (AI explains, you decide)
- **Undo stack** — one click to revert any AI edit (last 20 edits)
- **File references** — type `#` to attach a project file, `@` to attach a document section
- **Image context** — paste or drag images into the chat (up to 4)
- **Quick prompts** — type `/` (or click the `/` button in the composer) for `/polish`, `/continue`, `/condense`, `/summary`, `/structure`, and `/mermaid`; a new chat also shows them as suggestion cards
- **Input history** — press ↑ to recall previous messages
- **Session persistence** — conversations are saved per document and survive app restarts
- **Conversation compaction** — when the context gets long, summarize history with one click; a small ring in the composer shows token usage
- **Settings** grouped into *Connection* and *Writing*, with an always-visible Save button

### Inline AI

Select any text and press `Cmd/Ctrl + Alt + K` (or click **AI** in the format toolbar) to open a lightweight floating prompt:

- **Ask** — get an answer about the selection without leaving the editor
- **Rewrite** — stream a rewrite of the selected text, then Accept or discard

### Provider support

| Provider | Notes |
|---|---|
| Anthropic | Default. Requires an API key. Supports Claude models. |
| OpenAI-compatible | Works with OpenAI, local servers (Ollama, LM Studio), and any `/v1/chat/completions` endpoint. API key is optional for local endpoints. |

### Interface

The whole interface was modernized with a "content first, quiet chrome" direction:

- **Design tokens** — shared spacing, radii, shadows, motion, and a system UI font; every theme adapts automatically
- **Lucide icons** — the title bar, sidebar, tabs, editor floats, preferences, and AI panel all use [Lucide](https://lucide.dev) line icons
- **Quieter chrome** — rounded hover and selection states, flat tabs, slim scrollbars, card-style notifications
- **Editor floats** — the format toolbar, block menu, quick insert, find & replace, and command palette are rounded cards
- **Preferences** — settings grouped into cards; the key bindings table drops its heavy borders
- **Translucent sidebar (macOS)** — enable *Translucent sidebar* under *Preferences → General → Window* to show the system vibrancy material behind the sidebar (off by default)

### Theme system

38 hand-crafted themes, selectable from a card-grid preview page with **search** and **Light / Dark** filter tabs. All 38 themes adapt to the new interface and were checked one by one. The default light theme (Graphite Red) and Catppuccin Latte got adjusted color layering: a subtly tinted sidebar, with the tab bar matching the editor.

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

Pre-built binaries for Windows, macOS, and Linux are available on the project release page:

[Download MarkText-AIEmpower releases](https://github.com/wansui976/marktext-aiempower/releases)

The macOS build is currently unsigned and not notarized with Apple Developer ID. If macOS says "MarkText-AIEmpower.app is damaged and can't be opened", move the app to `/Applications`, then run:

```bash
sudo xattr -rd com.apple.quarantine /Applications/MarkText-AIEmpower.app
open /Applications/MarkText-AIEmpower.app
```

### Build from source

```bash
# Node 18+ and Yarn required
git clone https://github.com/wansui976/marktext-aiempower.git
cd marktext-aiempower
yarn
yarn dev        # development mode
yarn build      # production build
```

> With Python 3.12 or newer, rebuilding native modules (e.g. `keytar`, `ced`) during `yarn install` may fail with `No module named 'distutils'`. Use a Python virtualenv with `setuptools` and `node-gyp@10`, then run:
>
> ```bash
> PYTHON=<venv>/bin/python npm_config_node_gyp=<node-gyp@10>/bin/node-gyp.js yarn rebuild
> ```

---

## AI setup

1. Open the AI sidebar (AI icon in the left activity bar, or `Cmd/Ctrl + Alt + J`).
2. Click `⋯` in the panel header, then **Settings**.
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
| Toggle AI sidebar | `Cmd/Ctrl + Alt + J` |
| Inline AI prompt | `Cmd/Ctrl + Alt + K` |
| Send / new line | `Enter` / `Shift + Enter` |
| Quick prompts | Type `/` at the start of the AI input |
| Undo last AI edit | `Cmd/Ctrl + Z` inside the AI panel |
| Recall previous input | `Up` in the AI input box, at the start of a line |

---

## Project structure

```text
src/renderer/
├── node/claudeApi.js              # Provider abstraction, SSE streaming, tool loop
├── components/sideBar/
│   ├── claudeChat.vue             # AI sidebar: chat, sessions, tools, edit approval
│   └── chat/                      # Message list, session list, settings panel
├── components/editorWithTabs/
│   ├── inlineAiPrompt.vue         # Floating Ask / Rewrite UI
│   ├── editor.vue                 # Muya <-> AI bridge, selection, edit apply
│   └── sourceCode.vue             # CodeMirror <-> AI bridge
├── components/lucideIcon/         # Global <lucide-icon> component
└── assets/
    ├── styles/tokens.css          # Design tokens
    ├── styles/element-overrides.css # Element UI control styles
    ├── icons/lucide/              # Lucide icons (ISC License)
    └── themes/                    # 38 CSS theme files
tools/
├── uiScreenshots.js               # Batch UI screenshots per theme (visual regression)
└── aiChatScreenshots.js           # AI panel states rendered with mock data
docs/ui-modernization-plan.md      # Interface redesign plan and notes (Chinese)
```

### UI screenshots (development)

```bash
yarn run pack                                                   # note: `yarn run pack`, not `yarn pack`
yarn run ui:screenshots ui-screenshots/after                    # six representative themes, all views
UI_SHOTS_QUICK=1 yarn run ui:screenshots ui-screenshots/all all # all 38 themes, key views only
node tools/aiChatScreenshots.js ui-screenshots/ai               # AI panel states (mock data)
```

While `yarn dev` is running it replaces `dist/electron/main.js` with a development build; copy a production build elsewhere and point the scripts at it with `MT_DIST`.

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
