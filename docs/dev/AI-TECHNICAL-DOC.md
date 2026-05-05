# MarkText AI 功能技术文档

## 目录

1. [架构总览](#1-架构总览)
2. [API 通信层 — claudeApi.js](#2-api-通信层--claudeapijs)
3. [侧边栏 Chat — claudeChat.vue](#3-侧边栏-chat--claudechatvue)
4. [行内 AI — inlineAiPrompt.vue](#4-行内-ai--inlineaiprompt-vue)
5. [编辑器集成 — editor.vue](#5-编辑器集成--editorvue)
6. [Muya 格式工具栏集成](#6-muya-格式工具栏集成)
7. [右键菜单集成](#7-右键菜单集成)
8. [侧边栏 & 布局集成](#8-侧边栏--布局集成)
9. [数据流与事件总线](#9-数据流与事件总线)
10. [存储与持久化](#10-存储与持久化)

---

## 1. 架构总览

AI 功能以「零外部依赖」方式嵌入 MarkText，不引入任何 AI SDK，全部通过 `fetch` + SSE 流式解析完成。整体分为 4 层：

```
┌─────────────────────────────────────────────────────────────┐
│                       用户交互层                              │
│  侧边栏 Chat ┃ 行内 AI Popover ┃ 右键菜单 ┃ 格式工具栏        │
├──────────┬──────────┬──────────┬───────────────────────────────┤
│          │          │          │                               │
│  claudeChat.vue  inlineAiPrompt.vue  editor.vue  formatPicker │
│          │          │          │                               │
├──────────┴──────────┴──────────┴───────────────────────────────┤
│                      API 通信层                                │
│                   claudeApi.js                                 │
│        streamChat → streamAnthropicChat / streamOpenAiChat     │
├─────────────────────────────────────────────────────────────────┤
│                      Muya 编辑器引擎                            │
│  contentState · formatPicker · selection · eventCenter          │
├─────────────────────────────────────────────────────────────────┤
│                      Electron 主进程                            │
│            contextMenu · IPC (mt::cm-ask-claude)               │
└─────────────────────────────────────────────────────────────────┘
```

**关键设计原则：**

- **双 Provider 支持**：同一套代码同时适配 Anthropic Messages API 与 OpenAI Chat Completions API
- **流式优先**：所有 AI 交互均为 SSE 流式输出，使用 async generator 逐 token 消费
- **Tool Use 循环**：Claude 可以自主调用工具（读文档、编辑文档、读文件），循环执行直到无 tool_use 为止
- **最小侵入**：与 Muya 编辑器引擎通过 eventCenter 事件解耦；与 Vuex store 仅在布局切换处交互

---

## 2. API 通信层 — claudeApi.js

**路径**：`src/renderer/node/claudeApi.js`

### 2.1 Provider 与配置解析

```
PROVIDERS = { ANTHROPIC: 'anthropic', OPENAI: 'openai' }

默认模型：
  Anthropic → claude-sonnet-4-5-20250929
  OpenAI    → gpt-4.1

默认 Base URL：
  Anthropic → https://api.anthropic.com
  OpenAI    → https://api.openai.com
```

配置解析优先级：用户手动输入 > 环境变量 > 默认值。

| 配置项    | 解析函数          | 环境变量 (Anthropic)          | 环境变量 (OpenAI)  |
| --------- | ----------------- | ----------------------------- | ------------------ |
| API Key   | `resolveApiKey`   | `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` | `OPENAI_API_KEY`   |
| Base URL  | `resolveBaseUrl`  | `ANTHROPIC_BASE_URL`          | `OPENAI_BASE_URL`  |
| Model     | `resolveModel`    | `ANTHROPIC_MODEL`             | `OPENAI_MODEL`     |

### 2.2 System Prompt 构建

```javascript
const SYSTEM_PROMPT = `You are an AI assistant embedded in MarkText, a Markdown editor...`

const buildSystemPrompt = (persona) => {
  // 如果用户配置了 persona（写作风格），追加到 system prompt
  if (!persona) return SYSTEM_PROMPT
  return `${SYSTEM_PROMPT}\n\n## Writing style preferences\n${persona}`
}
```

### 2.3 Tool 定义

提供 6 个工���，让 Claude 能直接操作编辑器��

| 工具名          | 功能                          | 入参                                          |
| --------------- | ----------------------------- | --------------------------------------------- |
| `get_document`  | 读取当前编辑器中的完整 Markdown | 无                                            |
| `apply_edit`    | 整文档替换                     | `content: string`                             |
| `replace_text`  | 查找并替换文本                  | `old_text, new_text, replace_all?`            |
| `insert_text`   | 在指定位置插入文本              | `content, position(start/end/before/after), anchor?` |
| `read_file`     | 读取项目目录中的文件            | `path: string`（绝对路径，沙箱校验）           |
| `list_directory`| 列出目录内容                   | `path: string`（绝对路径，沙箱校验）           |

### 2.4 消息格式处理

```javascript
sanitizeContentBlocks(blocks)
```

过滤并规范化 content block，支持 4 种类型：

- `text` — 纯文本
- `image` — base64 图片（source.type / media_type / data）
- `tool_use` — 工具调用（id / name / input）
- `tool_result` — 工具返回（tool_use_id / content / is_error）

### 2.5 SSE 流解析

```javascript
const parseSseStream = async function * (response) {
  // 从 ReadableStream 逐块读取
  // 按 \n\n 分割 SSE 事件
  // 解析 data: 行的 JSON
  // yield 每个事件对象
}
```

支持两种 SSE 格式：
- **Anthropic**：`content_block_start` / `content_block_delta` / `content_block_stop` / `message_stop`
- **OpenAI**：`choices[0].delta.content` / `choices[0].delta.tool_calls` / `[DONE]`

### 2.6 流式对话主循环

```javascript
export async function * streamChat(options) {
  // 根据 provider 分发
  if (provider === PROVIDERS.OPENAI)
    yield * streamOpenAiChat(options)
  else
    yield * streamAnthropicChat(options)
}
```

每个 provider 的 stream 函数都实现 **Tool Use 循环**：

```
while (true) {
  1. 发送 API 请求（含 tools 定义）
  2. 流式消费 SSE 事件，累积 assistant 消息
     - 文本 delta → yield { type: 'text', text }
     - tool_use 开始 → yield { type: 'tool_start', name, id }
  3. 消费完毕后，检查是否有 tool_use block
     - 无 → yield { type: 'done', messages } → return
     - 有 → 依次执行工具 → yield { type: 'tool_end', ... }
           → 将 tool_result 追加到消息 → 继续循环
}
```

### 2.7 OpenAI 兼容层

`toOpenAiMessages(messages, persona)` 将 Anthropic 格式消息转为 OpenAI 格式：

| Anthropic 格式                | OpenAI 格式              |
| ----------------------------- | ----------------------- |
| system prompt (独立参数)       | `role: 'system'` 消息   |
| `content: [{ type: 'text' }]` | `content: "joined text"` |
| `content: [{ type: 'image' }]` | `content: [{ type: 'image_url', image_url: { url } }]` |
| `type: 'tool_use'`            | `tool_calls: [{ function }]` |
| `type: 'tool_result'`         | `role: 'tool'` 消��     |

---

## 3. 侧边栏 Chat — claudeChat.vue

**路径**：`src/renderer/components/sideBar/claudeChat.vue`

### 3.1 组件结构

```
┌─ .chat-header ────────────────────────┐
│  会话标题 · 文档标签 ┃ [+] 新建 [⋯] 菜单│
├──────────────────────────────────────────┤
│  .settings-panel (API 配置/写作风格)     │
│  .sessions-panel (历史会话列表)          │
├──────────────────────────────────────────┤
│  .chat-messages                          │
│    用户消息 · 助理消息 · 系统消息(压缩卡)  │
│    工具状态(spinner/✓/⚠)                 │
│    错误/重试 bar                          │
├──────────────────────────────────────────┤
│  .edit-preview (diff 审批面板)            │
├──────────────────────────────────────────┤
│  .chat-input (表单)                      │
│    附加图片预览                           │
│    上下文 chips (#file / @heading)        │
│    token 计数 · 编辑模式选择器             │
│    文本输入 · 提及菜单                    │
│    模板按钮栏 · 发送/停止                  │
└──────────────────────────────────────────┘
```

### 3.2 编辑模式

3 种模式控制 Claude 如何修改文档：

| 模式 | 图标 | 行为 |
| ---- | ---- | ---- |
| Ask before edits | ✋ | Claude 提出编辑 → 用户 diff 审批 → 才能应�� |
| Edit automatically | </> | Claude 直接修改文档，无需确认 |
| Plan mode | ☰ | Claude 只做分析和建议，不调用任何编辑工具 |

模式通过 `buildPromptWithReference()` 向 system prompt 注入模式指令来实现。

### 3.3 Prompt 模板

| ID | 标签 | 说明 |
| -- | ---- | ---- |
| polish | Polish | 润色、改善措辞 |
| continue | Continue | 续写文档 |
| condense | Condense | 压缩精炼 |
| summary | Summarize | 结构化摘要 |
| structure | Structure | 分析文档结构 |
| mermaid | Diagram | 生成 Mermaid 图表 |

### 3.4 Tool 执行引擎

`executeTool(name, input)` 是工具的实际执行器，在渲染进程中直接操作：

```javascript
executeTool(name, input) {
  if (name === 'get_document') {
    // 返回当前 markdown，带去重缓存 (documentSnapshotKey)
  }
  if (EDIT_TOOL_NAMES.has(name)) {
    // 根据编辑模式分发:
    //   plan  → 返回提示"不允许编辑"
    //   auto  → applyEditImmediately()
    //   ask   → requestEditApproval() → 返回 Promise（等用户点击 Accept/Reject）
  }
  if (name === 'read_file') {
    // 路径沙箱校验 → fs.readFileSync
    // 大文件截断 (MAX_READ_FILE_BYTES = 1MB)
  }
  if (name === 'list_directory') {
    // 路径沙箱校验 → fs.readdirSync
    // 最多 500 条目
  }
}
```

**路径沙箱**：`assertPathAllowed(target)` 确保请求路径位于项目目录或当前文档目录内，通过 `fs.realpathSync` + `path.relative` 验证。

### 3.5 Diff 审批流程

当编辑模式为「Ask before edits」时：

```
Claude 调用 replace_text/insert_text/apply_edit
  ↓
buildEditProposal(name, input) → 计算 newMarkdown + diff 预览
  ↓
requestEditApproval() → 返回 Promise，挂起 tool 执行
  ↓
UI 显示 .edit-preview ��板（红删/绿增/折叠行）
  ↓
用户点 Accept → resolve(successResult) → 应用到编辑器
       Reject → resolve('User rejected...') → Claude 收到拒绝信息
```

Diff 算法使用 LCS（最长公共子序列）逐行对比，超过 250,000 单元格时降级为粗略提示。长 diff 会折叠连续 context 行（保留前 3/后 3，中间折叠）。

### 3.6 对话压缩

当 token 估算超过 `TOKEN_COMPACT_THRESHOLD`（30,000 tok）时，显示「压缩」按钮：

```
1. 将当前所有 apiMessages 发给 Claude，附加指令"总结对话"
2. Claude 返回 3-4 段摘要
3. 替换 apiMessages 为 [用户"摘要上文", 助理"摘要内容"]
4. displayMessages 不变（用户仍可���动查看完整历史）
5. 在时间线中插入 system-card 标记压缩点
```

Token 估算使用 `Math.ceil(chars / 4)` 近似。

### 3.7 会话管理

- 每个文档有独立的会话列表（按 `documentKey` 分组）
- `documentKey` 格式：`file:{pathname}` / `draft:{id}` / `project:{pathname}` / `global`
- 切换文档自动切换会话上下��
- 最多保存 `MAX_STORED_SESSIONS`（40）个会话
- 会话标题自动生成：首轮对话完成后，后台发一次 API 请求让 Claude 生成 5-8 字标题

### 3.8 `#file` / `@heading` 上下文引用

输入框支持两种触发器：

| 触发 | 功能 | 数据来源 |
| ---- | ---- | -------- |
| `#` | 引用工作区文件 | `walkMdFiles()` 递归搜索项目目录，最深 2 层，匹配 `.md/.markdown/.txt` |
| `@` | 引用当前文档标题 | 解析当前 markdown 中的 `# ~ ######` 行 |

选中后显示为 chip，发送时通过 `buildContextText()` 读取文件内容/标题段落，包裹在 XML 标签中注入 prompt：

```xml
<attached_file name="readme.md">
文件内容...
</attached_file>

<attached_section heading="Introduction">
段落内容...
</attached_section>
```

### 3.9 图片附件

支持 **粘贴** 和 **拖��** 两种方式附加图片（最多 4 张）：

```
handlePaste / handleDrop → addImageFile(file)
  → FileReader.readAsDataURL → base64
  → 存入 attachedImages[]
  → UI 显示缩略图

发送时:
  apiContent = [
    { type: 'image', source: { type: 'base64', media_type, data } },
    ...
    { type: 'text', text: prompt }
  ]
```

Anthropic API 原生支持 image content block；OpenAI 端通过 `toOpenAiMessages` 转换为 `image_url` 格式。

根元素通过 `@paste.stop` 阻止粘贴���件冒泡到 Muya 编辑器，避免图片同时粘入文档。

---

## 4. 行内 AI — inlineAiPrompt.vue

**路径**：`src/renderer/components/editorWithTabs/inlineAiPrompt.vue`

### 4.1 功能概述

选中文本后，通过快捷键 `Cmd/Ctrl+Alt+K` 或格式工具栏 AI 按钮触发。弹出浮动 popover，支持两种模式：

| 模式 | 默认 | 功能 | 结果 UI |
| ---- | ---- | ---- | ------- |
| **Ask** | ✓ | 对选区内容提问 | 答案文本 + Copy/Ask again |
| **Rewrite** | | 按指令改写选区 | Original/Rewritten 对照 + Accept/Reject |

### 4.2 生命周期

```
open({selectionText, anchorRect, mode})
  → phase: 'input'（显示输入框 + 模式切换）
  → 用户输入 + Enter
  
submit()
  → phase: 'streaming'（流式输出）
  → 直接调用 streamChat，不经过 claudeChat
  → 独立读取 localStorage 获取 provider/key/model/persona
  
  → 完成后 phase: 'review'（显示结果）

accept()  → emit('accept', {selectionText, rewritten})  → editor.vue 替换文档
cancel()  → abort + 关闭
```

### 4.3 Prompt 构造

**Rewrite 模式**：
```
You are rewriting a portion of a Markdown document selected by the user.
User instruction: {instruction}
Selected text (between <<<SELECTION>>> markers):
<<<SELECTION>>>
{selectionText}
<<<SELECTION>>>
Reply with ONLY the rewritten text. Do not wrap it in code fences...
```

**Ask 模式**：
```
The user selected the following text from a Markdown document and is asking a question about it.
User question: {instruction}
Selected text: ...
Answer the question concisely. Do not propose edits.
```

### 4.4 定位算法

popover 使用 `position: fixed`，根据 `anchorRect`（选区的 `getBoundingClientRect()`）计算位置：

```javascript
popoverStyle() {
  left = anchorRect.left
  top  = anchorRect.bottom + 12px

  // 右侧溢出修正
  if (left + 380 + 12 > viewportW)
    left = viewportW - 380 - 12

  // 底部溢出 → 翻到选区上方
  if (top + 280 > viewportH)
    top = anchorRect.top - 280 - 12

  // 无 anchorRect 时居中兜底
  return { left: '50%', top: '20%', transform: 'translateX(-50%)' }
}
```

---

## 5. 编辑器集成 — editor.vue

**路径**：`src/renderer/components/editorWithTabs/editor.vue`

### 5.1 快捷键触发

```javascript
handleInlineAiKeydown(event) {
  // 仅匹配 Cmd/Ctrl + Alt + K
  // 排除 sourceCode 模式
  // 调用 triggerInlineAi()
}
```

注册方式：`document.addEventListener('keydown', handler, true)` — 使用 **capture** 阶段，优先于 Muya 的事件处理。

> 注意：Cmd+K 被 Electron 菜单加速键占用（Toggle TOC），因此改用 Cmd+Alt+K。

### 5.2 通用触发方法

```javascript
triggerInlineAi(mode, snapshot = {}) {
  // 1. 优先使用 snapshot（来自 formatPicker 保存的选区快照）
  // 2. 回退到 contentState.getClipBoardData() + window.getSelection()
  // 3. 调用 this.$refs.inlineAi.open({selectionText, anchorRect, mode})
}
```

`snapshot` 参数解决了一个关键问题：点击格式���具栏按钮时 DOM 选区会丢失，因此 formatPicker 在 **显示时** 就抓取选区文本和 rect，点击 AI 按钮时传入。

### 5.3 Muya 事件订阅

```javascript
this.editor.on('muya-inline-ai', payload => {
  this.triggerInlineAi(undefined, payload || {})
})
```

### 5.4 编辑应用

```javascript
handleInlineAiAccept({selectionText, rewritten}) {
  const markdown = this.currentFile.markdown
  const idx = markdown.indexOf(selectionText)
  if (idx === -1) {
    // 找不到 → 复制到剪贴板 + 提示
    return
  }
  const newMarkdown = markdown.slice(0, idx) + rewritten + markdown.slice(idx + selectionText.length)
  // 更新 Vuex store + Muya 编辑器
}
```

### 5.5 右键菜单 "Ask Claude"

```javascript
handleAskClaude(payload) {
  // 从 payload.text 构造 reference 对象
  // 通过 bus 发送 'claude-selection-reference'
  // 切换布局到 Claude 侧边栏
  this.$store.commit('SET_LAYOUT', { rightColumn: 'claude' })
}
```

### 5.6 选区同步

编辑器通过 `selectionChange` 事件持续追踪选区变化：

```
editor.on('selectionChange') → queueSelectionChange → requestAnimationFrame
  → flushSelectionState
    → getClaudeSelectionReference(changes)
    → bus.$emit('claude-selection-reference', reference)
```

Muya 的 `setPersistentSelection(cursor)` 用于在编辑器中高亮显示已发送给 Claude 的选区，即使焦点移到侧边栏也保持可见。

---

## 6. Muya 格式工具栏集成

### 6.1 配置 — formatPicker/config.js

在工具栏首位添加 AI 按钮：

```javascript
{
  type: 'ai',
  tooltip: 'Ask AI',
  shortcut: `${COMMAND_KEY}+${ALT_KEY}+K`,
  text: 'AI'  // 使用文字而非图标
}
```

### 6.2 渲染 — formatPicker/index.js

扩展 render 方法支持 `text` 字段（除传统 icon 之外）：

```javascript
if (i.icon) {
  icon = h('i.icon', h('i.icon-inner', { style: { background: `url(${i.icon})` } }))
} else if (i.text) {
  icon = h('span.text-icon', i.text)  // "AI" 文字标签
}
```

### 6.3 选区快照

格式���具栏显示时（`muya-format-picker` 事件）立即保存当前 DOM 选区：

```javascript
this.savedSelectionText = window.getSelection().toString()
this.savedAnchorRect = sel.getRangeAt(0).getBoundingClientRect()
```

点击 AI 按钮时，将快照通过事件传出：

```javascript
if (item.type === 'ai') {
  this.muya.eventCenter.dispatch('muya-inline-ai', {
    selectionText: this.savedSelectionText,
    anchorRect: this.savedAnchorRect
  })
  this.hide()
  return
}
```

### 6.4 样式

- 宽度从 265px 扩展到 300px
- AI 项右侧绘制 1px 分隔线
- `.text-icon` 使用 Claude 品牌橙色 `#d97757`、11px 加粗字体

---

## 7. 右键菜单集成

### 7.1 主进程菜单定义

**路径**：`src/main/contextMenu/editor/menuItems.js`

```javascript
export const ASK_CLAUDE = {
  label: 'Ask Claude about Selection',
  id: 'askClaudeMenuItem'
}
```

### 7.2 菜单构建

**路径**：`src/main/contextMenu/editor/index.js`

当用户在编辑器中右键且有选中文本时，在标准菜单（Cut/Copy/Paste...）下方追加 Claude 菜单项：

```javascript
if (hasText) {
  menu.append(new MenuItem(SEPARATOR))
  menu.append(new MenuItem({
    ...ASK_CLAUDE,
    click () {
      win.webContents.send('mt::cm-ask-claude', { text: selectionText })
    }
  }))
}
```

### 7.3 IPC 通道

```
主进程 → 渲染进程：mt::cm-ask-claude  { text: selectionText }
    ↓
editor.js (Vuex store) → bus.$emit('cm-ask-claude', payload)
    ↓
editor.vue → handleAskClaude() → bus.$emit('claude-selection-reference')
    ↓
claudeChat.vue → handleSelectionReference()
```

---

## 8. 侧边栏 & 布局集成

### 8.1 图标注册

**路径**：`src/renderer/components/sideBar/help.js`

```javascript
import ClaudeIcon from '@/assets/icons/claude.svg'

export const sideBarIcons = [
  { name: 'files',  icon: FilesIcon  },
  { name: 'search', icon: SearchIcon },
  { name: 'toc',    icon: TocIcon    },
  { name: 'claude', icon: ClaudeIcon }  // 新增
]
```

### 8.2 侧边栏路由

**路径**：`src/renderer/components/sideBar/index.vue`

```html
<claude-chat
  v-show="rightColumn === 'claude'"
  :active="rightColumn === 'claude'"
></claude-chat>
```

使用 `v-show` 而非 `v-if`，保证 Chat 组件始终保持挂载状态（避免切换时丢失对话上下文）。

### 8.3 Vuex 布局状态

**路径**：`src/renderer/store/layout.js`

```javascript
state: {
  rightColumn: 'files'  // 可选值: 'files' | 'search' | 'toc' | 'claude' | ''
}
```

### 8.4 Claude 图标样式

```css
&.icon-claude.active::before { background: #d97757; }
&.icon-claude.active svg     { fill: #d97757; }
&.icon-claude:hover svg      { fill: #d97757; }
```

使用 Claude 品牌色 `#d97757`，区别于默认的 `var(--themeColor)`。

---

## 9. 数据流与事件总线

### 9.1 Vue Bus 事件

| 事件名                        | 发送方               | 接收方           | 载荷                                   |
| ----------------------------- | -------------------- | ---------------- | -------------------------------------- |
| `claude-selection-reference`  | editor.vue / sourceCode.vue | claudeChat.vue | `{ fileId, filename, text }` 或 `null` |
| `claude-preserve-selection`   | claudeChat.vue       | editor.vue       | （无）— 防止编辑器选区被清除           |
| `claude-apply-edit`           | claudeChat.vue       | editor.vue       | `{ id, markdown }`                     |
| `cm-ask-claude`               | editor.js (store)    | editor.vue       | `{ text }`                             |

### 9.2 Muya EventCenter 事件

| 事件名              | 发送方           | 接收方       | 说明                     |
| ------------------- | ---------------- | ------------ | ------------------------ |
| `muya-format-picker`| contentState     | formatPicker | 显示/隐藏格式工具栏     |
| `muya-inline-ai`    | formatPicker     | editor.vue   | 触发行内 AI popover      |

### 9.3 IPC 通道

| 通道                  | 方向           | 说明              |
| --------------------- | -------------- | ----------------- |
| `mt::cm-ask-claude`   | main → renderer| 右键菜单 Ask Claude |

---

## 10. 存储与持久化

所有持久化数据均使用 `localStorage`，无需额外后端：

| Key                                     | 类型   | 内容                       |
| --------------------------------------- | ------ | -------------------------- |
| `marktext.claudeProvider`               | string | `''`(Anthropic) 或 `'openai'` |
| `marktext.claudeApiKey`                 | string | API 密钥                   |
| `marktext.claudeBaseUrl`                | string | 自定义 base URL            |
| `marktext.claudeModel`                  | string | 模型 ID                    |
| `marktext.claudePersona`               | string | 写作风格 persona           |
| `marktext.claudeEditMode`              | string | `'ask'` / `'auto'` / `'plan'` |
| `marktext.claudeSessions`              | JSON   | 所有会话数组（含消息历史）  |
| `marktext.claudeActiveSessionId`       | string | 当前活跃会话 ID（兼容旧版） |
| `marktext.claudeActiveSessionIds`      | JSON   | `{ documentKey → sessionId }` 映射 |

会话数据结构：

```javascript
{
  id: 'session-1717400000000-1',
  documentKey: 'file:/path/to/doc.md',
  documentLabel: 'doc.md',
  title: 'Discussing document structure',  // 自动生成
  createdAt: 1717400000000,
  updatedAt: 1717400060000,
  displayMessages: [...],  // 显示用（含 blocks 结构）
  apiMessages: [...]       // API 用（Anthropic/OpenAI 格式）
}
```

---

## 附录：文件清单

| 文件路径 | 状态 | 说明 |
| -------- | ---- | ---- |
| `src/renderer/node/claudeApi.js` | 新增 | 核心 API 通信层 |
| `src/renderer/components/sideBar/claudeChat.vue` | 新增 | 侧边栏 Chat 完整组件 |
| `src/renderer/components/editorWithTabs/inlineAiPrompt.vue` | 新增 | 行内 AI Popover 组件 |
| `src/renderer/components/editorWithTabs/editor.vue` | 修改 | 行内 AI 快捷键、事件、编辑应用 |
| `src/renderer/components/sideBar/index.vue` | 修改 | 注册 Claude 图标和组件 |
| `src/renderer/components/sideBar/help.js` | 修改 | 添加 Claude 图标定义 |
| `src/renderer/components/titleBar/index.vue` | 修改 | 字数格式化优化 |
| `src/renderer/store/layout.js` | 修改 | rightColumn 支持 `'claude'` |
| `src/renderer/store/editor.js` | 修改 | IPC 监听 `mt::cm-ask-claude` |
| `src/muya/lib/ui/formatPicker/config.js` | 修改 | 添加 AI 按钮配置 |
| `src/muya/lib/ui/formatPicker/index.js` | 修改 | AI 按钮渲染与事件派发 |
| `src/muya/lib/ui/formatPicker/index.css` | 修改 | AI 按钮样式 |
| `src/muya/lib/contentState/index.js` | 修改 | 持久选区高亮支持 |
| `src/main/contextMenu/editor/menuItems.js` | 修改 | 添加 Ask Claude ���单项 |
| `src/main/contextMenu/editor/index.js` | 修改 | 右键菜单渲染逻辑 |
| `src/renderer/assets/icons/claude.svg` | 新增 | 侧边栏图标 |
