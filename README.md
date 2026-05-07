<p align="center">
  <img src="static/logo-small.png" alt="MarkText-AIEmpower" width="96" height="96">
</p>

<h1 align="center">MarkText-AIEmpower</h1>

<p align="center">
  一个能和你一起写作的 Markdown 编辑器。
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

## 这是什么

MarkText-AIEmpower 是 [MarkText](https://github.com/marktext/marktext) 的一个 fork。在这个基础上做了一件事：**把 AI 直接嵌进编辑流程里**。还扩充了主题库（38 套），对主题选择做了卡片式预览和搜索筛选。

---

## 为什么做这个

日常用 Markdown 写技术文档、整理笔记、写博客的时候，经常需要 AI 帮忙——润色一段文字、补一个 Mermaid 图、把散乱的笔记结构化、或者问一个和当前文档相关的问题。

但每次都要切到浏览器，把内容贴过去，再把结果贴回来，实在太碎片了。

这个项目试图解决的就是：**让 AI 成为编辑器的一部分，而不是一个外部工具**。它能直接读你的文档，直接改你的文档，中间没有复制粘贴。

---

## 核心功能

### AI 侧边栏

编辑器右侧有一个聊天面板。它不是一个独立的聊天窗口——它和当前编辑的文档是联动的。

**文档感知**

AI 可以��取你当前打开的 Markdown 文件。你问"帮我看看这篇文章结构有没有问题"，它会自动调用工具去读文档内容，然后给出建议。对于长文档，它会先读大纲，再按需读取某个章节，不会把整个文件塞进上下文浪费 token。

**编辑能力**

AI 不只是回答问题，它能直接修改你的文档。支持三种工作方式：

- **Ask 模式（默认）**：AI 提出修改方案，你能看到完整的 diff 预览——加了什么、删了什么、改了几处——确认之后才写入文档
- **Auto 模式**：AI 的修改直接生效，适合你信任它的判断或者在做批量修改的时候
- **Plan 模式**：AI 只给出计划和建议，不动文档，适合你想先讨论再动手的场景

所有修改都有一键撤销，不用担心 AI 搞砸。撤销栈最多保留 20 步。

**流式输出**

回答是一个字一个字流出来的，带完整的 Markdown 渲染——代码高亮、表格、列表都是实时渲染的。如果回答中有 Mermaid 代码块，会自动渲染成图表。

**工具调用**

AI 可以使用以下工具，所有操作你都能在界面上看到实时状态：

| 工具 | 用途 |
|---|---|
| `get_document_outline` | 读取文档大纲结构 |
| `get_document_section` | 按标题/索引读取指定章节 |
| `search_document` | 在文档中全文搜索 |
| `get_document` | 读取完整文档内容 |
| `replace_text` | 替换文档中的指定文本 |
| `insert_text` | 在指定位置插入内容 |
| `apply_edit` | 整篇替换文档 |
| `read_file` | 读取项目内的其他文件 |
| `list_directory` | 列出目录内容 |

工具调用有自动循环上限（10 轮），不会无限执行下去。

**文件和上下文引用**

在输入框里打 `#` 可以引用项目内的文件，打 `@` 可以引用文档结构中的章节。引用的内容会作为额外上下文发给 AI，让它更好地理解你的问题。

**图片支持**

直接把图片粘贴或拖拽到输入框里，AI 就能看到图片内容。最多同时附加 4 张。

**快捷模板**

输入框下方有一排快捷按钮，一键触发常见任务：

- `/polish` — 润色当前文档
- `/continue` — 续写
- `/condense` — 压缩精简
- `/summary` — 生成总结
- `/structure` — 优化文档结构
- `/mermaid` — 根据内容生成 Mermaid 图表

也可以在输入框里直接打 `/` 触发。

**会话管理**

- 每个文档有独立的会话列表，切换文档会自动切到对应的会话
- 会话持久化到 IndexedDB，关闭应用后仍在
- 支持多会话，可以新建、切换、删除
- 长对话可以一键压缩（compaction），减少 token 消耗的同时保留关键信息
- 实时显示 token 使用量和进度条

**其他细节**

- 输入框支持按 `↑` 召回历史输入
- 代码块内有复制按钮，hover 显示
- AI 修改文档后会自动同步到��辑器
- 支持导出整段聊天为 Markdown 文件
- Model switcher 可以快速切换模型，无需进设置面板
- 写作风格设置（Persona）让 AI 记住你的偏好

---

### 内联 AI

有时候你不需要打开完整的聊天面板。选中一段文本，按 `Cmd/Ctrl + Alt + K`，会弹出一个轻量的浮窗：

- **Ask**：针对选中的文本提问，AI 的回答显示在浮窗里
- **Rewrite**：AI 对选中文��进行流式改写，你可以实时看到新版本，满意就 Accept，不满意就 Discard

改写是非破坏性的——在你点 Accept 之前，原文不会被修改。

---

### 多模型支持

| Provider | 说明 |
|---|---|
| **Anthropic** | 默认。支持 Claude 系列模型。需要 API Key |
| **OpenAI-compatible** | 兼容任何提供 `/v1/chat/completions` 接口的服务 |

OpenAI-compatible 模式意味着你可以接入：

- OpenAI 官方 API
- 本地模型服务：Ollama、LM Studio、llama.cpp server
- 代理/网关：OpenRouter、one-api、自建反向代理
- 其他兼容平台：DeepSeek、Moonshot、零一万物、智谱等

本地服务不需要填 API Key，只需要填 Base URL（例如 `http://localhost:11434/v1`）。

---

### 主题

38 套主题，17 浅色 + 21 深色。主题选择改为卡片式预览，支持搜索和按 Light/Dark 标签筛选。

<details>
<summary>完整主题列表</summary>

| 浅色 | 深色 |
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

## 安装和运行

### 环境要求

- Node.js 18+
- Yarn（经典版本）
- macOS / Windows / Linux

### 从源码运行

```bash
git clone https://github.com/wansui976/marktext.git
cd marktext
yarn install
yarn dev
```

`yarn dev` 会启动 Electron 开发模式，修改代码后 renderer 侧会热更新。

### 构建发行包

```bash
yarn build
```

构建产物在 `build/` 目录下，具体格式取决于你的操作系统（macOS 出 `.dmg`，Windows 出 `.exe`，Linux 出 `.AppImage`）。

> 本 fork 暂未发布预构建安装包。如果你只想用原版编辑器，可以去 [MarkText 官方 Release](https://github.com/marktext/marktext/releases) 下载。

---

## 配置 AI

有两种方式配置 AI 连接信息：

### 方式一：界面配置（推荐）

1. 点击右侧栏的 AI 图标打开侧边栏
2. 点击面板右上角 `⋯` → Settings
3. 选择 Provider、填入 API Key、按需填 Base URL 和模型名
4. 点 Save

配置通过系统级加密存储保存（macOS Keychain / Windows Credential Vault / Linux Secret Service），不是明文放在本地文件里。

### 方式二：环境变量

```bash
# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_BASE_URL="https://api.anthropic.com"    # 可选，默认值
export ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"      # 可选，默认值

# OpenAI-compatible
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="http://localhost:11434/v1"       # 例如 Ollama
export OPENAI_MODEL="qwen2.5:14b"                        # 你的本地模型名
```

面板中手动填写的值优先级高于环境变量。

---

## ��捷键

| 功能 | 快捷键 |
|---|---|
| 打开/关闭 AI 侧边栏 | 点击右侧栏图标 |
| 打开内联 AI 浮窗 | `Cmd/Ctrl + Alt + K` |
| 发送消息 | `Enter` |
| 换行（不发送） | `Shift + Enter` |
| 撤销 AI 对文档的修改 | AI 面板内 `Cmd/Ctrl + Z` |
| 召回上一条输入 | 输入框行首按 `↑` |
| 停止生成 | 点击 Stop 按钮 |

---

## 项目结构

```text
src/
├── main/                              # Electron 主进程
│   └── dataCenter/                    # 设置持久化、加密凭证存储
├── renderer/                          # 渲染进程（Vue 2）
│   ├── node/
│   │   ├── claudeApi.js               # AI 接口抽象层：SSE 流、工具循环、双 provider 支持
│   │   ├── sessionDb.js               # IndexedDB 会话持久化
│   │   └── smartContext.js            # 文档分段、大纲、搜索等上下文工具
│   ├── components/
│   │   ├── sideBar/
│   │   │   ├── claudeChat.vue         # AI 侧边栏主组件（会话、工具执行、编辑确认）
│   │   │   └── chat/
│   │   │       ├── ChatMessageList.vue  # 消息列表渲染
│   │   │       ├── ChatSessionList.vue  # 会话列表
│   │   │       └── ChatSettings.vue     # 设置面板
│   │   └── editorWithTabs/
│   │       ├── inlineAiPrompt.vue     # 内联 AI 浮窗（Ask / Rewrite）
│   │       ├── editor.vue             # Muya 编辑器 ↔ AI 桥接
│   │       └── sourceCode.vue         # CodeMirror ↔ AI 桥接
│   ├── assets/themes/                 # 38 套主题 CSS
│   └── i18n/                          # 多语言（中/英）
└── muya/                              # MarkText 的编辑器引擎
```

---

## 技术细节

如果你对实现感兴趣：

- **流式输出**基于 SSE（Server-Sent Events），通过 `ReadableStream` + `TextDecoder` 逐行解析，带 60 秒空闲超时保护
- **工具调用**采用循环模式：AI 返回 tool_use → 前端执行 → 结果返回 AI → AI 继续或结束，最多 10 轮
- **编辑预览**使用 LCS diff 算法生成逐行对比，长 diff 自动折叠中间不变的行
- **会话存储**使用 IndexedDB（两个 object store：meta 索引 + messages 正文），按文档维度隔离
- **凭证加密**在支持的平台上使用 keytar（操作系统原生密钥链），不可用时回退到 localStorage
- **Token 估算**：ASCII 字符按 4:1，CJK 字符按 2:1，用于进度条和 compact 阈值判断
- **上下文压缩**：请求 AI 对整段对话做 3-4 段总结，替换掉原��� apiMessages，displayMessages 保留完整展示

---

## 已知限制

- 暂未发布预构建安装包，需要从源码构建
- 内联 AI 目前只支持纯文本选区，不支持跨代码块选择
- 图片上下文依赖 Provider 的多模态支持（部分本地模型可能不支持）
- Token 估算是启发式的，不如 tiktoken 准确，但足够用于进度指示

---

## 致谢

本项目基于 [MarkText](https://github.com/marktext/marktext) 开发。感谢 [Luo Ran](https://github.com/Jocs) 和所有 MarkText Contributors 打造了一个优秀的编辑器基座。

```text
Copyright (c) 2017-present Luo Ran
Copyright (c) 2018-present MarkText Contributors
```

---

## License

MIT — 详见 [LICENSE](LICENSE)。
