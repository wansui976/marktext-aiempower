<p align="center">
  <img src="static/logo-small.png" alt="MarkText-AIEmpower" width="96" height="96">
</p>

<h1 align="center">MarkText-AIEmpower</h1>

<p align="center">
  一个基于 MarkText 二次开发的 Markdown 编辑器。<br>
  保留原项目简洁、沉浸、所见即所得的写作体验，并加入 AI 写作助手、内联改写、会话记忆和 38 套主题。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/AI-Anthropic%20%7C%20OpenAI%20compatible-orange" alt="AI">
</p>

<p align="center">
  <a href="README.en.md">English</a>
</p>

---

## 项目简介

MarkText-AIEmpower 是一个面向写作、学习和技术文档整理的桌面 Markdown 编辑器。

本项目基于开源项目 [MarkText](https://github.com/marktext/marktext) 开发，核心目标是在 MarkText 已有的轻量编辑体验上补齐 AI 工作流：

- 在编辑器侧边栏中直接和 AI 对话
- 让 AI 理解当前 Markdown 文档内容
- 支持选择文本后进行提问、润色、改写
- 支持 AI 给出可预览、可撤销的文档修改
- 增加更多主题，让长时间写作更舒服

---

## 相比原项目的改进

### AI 侧边栏

右侧新增 AI 聊天面板，AI 可以读取当前文档、回答问题、生成内容，并在你确认后修改 Markdown。

- **流式响应**：边生成边渲染 Markdown 内容
- **文档感知**：可以读取当前打开的 Markdown 文档
- **工具调用**：支持 `get_document`、`replace_text`、`insert_text`、`apply_edit`、`read_file`、`list_directory`
- **编辑模式**：支持先询问、自动编辑、计划模式
- **差异预览**：AI 修改前可以查看 diff
- **一键撤销**：AI 对文档的修改可以快速回退
- **会话持久化**：不同文档保留独立会话，重启后仍可继续
- **上下文压缩**：长对话可以压缩，减少上下文负担
- **文件引用**：输入 `#` 可引用项目文件，输入 `@` 可引用文档结构
- **图片上下文**：支持粘贴或拖拽图片给 AI 参考
- **快捷模板**：内置润色、续写、压缩、总结、结构优化、图表生成等模板

### 内联 AI

选中文本后，可以直接打开轻量级 AI 浮窗，不需要离开编辑区。

- **Ask**：针对选中文本提问
- **Rewrite**：对选中文本进行流式改写
- **Accept / Discard**：确认后再写回文档

默认快捷键：

```text
Cmd/Ctrl + Alt + K
```

### 多模型接入

目前支持两类接口：

| Provider | 说明 |
|---|---|
| Anthropic | 默认提供商，适合 Claude 系列模型 |
| OpenAI-compatible | 支持 OpenAI、本地模型服务、代理服务，以及兼容 `/v1/chat/completions` 的接口 |

本地服务例如 Ollama、LM Studio、自建网关等，都可以通过 OpenAI-compatible 模式接入。

### 主题系统

主题选择页改为卡片式预览，并新增搜索和 Light / Dark 筛选。

当前内置 38 套主题：

<details>
<summary>展开查看主题列表</summary>

| 浅色主题 | 深色主题 |
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

## 快速开始

### 从源码运行

```bash
# 需要 Node 18+ 和 Yarn
git clone https://github.com/wansui976/marktext.git
cd marktext
yarn
yarn dev
```

### 构建应用

```bash
yarn build
```

当前 fork 暂未发布预构建安装包。如果只想使用原版编辑器，可以查看 [MarkText 官方 Release](https://github.com/marktext/marktext/releases)。

---

## AI 配置

打开 AI 侧边栏后，进入面板内的 **Settings**：

1. 选择 Provider
2. 填写 API Key
3. 按需填写 Base URL
4. 按需指定模型名

也可以通过环境变量配置：

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com   # 可选
ANTHROPIC_MODEL=claude-...                     # 可选

# OpenAI-compatible
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com          # 可选
OPENAI_MODEL=gpt-...                            # 可选
```

设置面板中的配置优先级高于环境变量。

---

## 常用快捷键

| 功能 | 快捷键 |
|---|---|
| 打开内联 AI 浮窗 | `Cmd/Ctrl + Alt + K` |
| 在 AI 面板内撤销上一次 AI 修改 | `Cmd/Ctrl + Z` |
| AI 输入框中召回上一条输入 | 行首按 `Up` |

---

## 主要目录

```text
src/renderer/
├── node/claudeApi.js              # AI Provider 抽象、SSE 流式响应、工具调用循环
├── components/sideBar/
│   └── claudeChat.vue             # AI 侧边栏、会话、工具、编辑确认
├── components/editorWithTabs/
│   ├── inlineAiPrompt.vue         # 内联 AI 浮窗
│   ├── editor.vue                 # Muya 编辑器与 AI 的桥接
│   └── sourceCode.vue             # CodeMirror 与 AI 的桥接
└── assets/themes/                 # 主题 CSS 文件
```

---

## 开源说明

本项目基于 [MarkText](https://github.com/marktext/marktext) 二次开发。

感谢原作者 [Luo Ran](https://github.com/Jocs) 以及 MarkText Contributors 创建并维护了优秀的 Markdown 编辑器基础。

原项目版权信息：

```text
Copyright (c) 2017-present Luo Ran
Copyright (c) 2018-present MarkText Contributors
```

---

## License

本项目沿用 MIT License，详见 [LICENSE](LICENSE)。
