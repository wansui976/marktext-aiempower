<template>
  <div class="side-bar-claude-chat" @keydown.stop="handleSidebarKeydown" @paste.stop @mousedown.capture="handleSidebarMouseDown">
    <div class="chat-header">
      <div class="chat-title">
        <span class="title">{{ panelTitle }}</span>
        <span v-if="contextLabel" class="title-doc-tag" :title="contextLabel">· {{ contextLabel }}</span>
      </div>
      <div class="chat-actions">
        <select
          v-model="selectedModel"
          class="model-switcher"
          :title="modelSwitchTitle"
          @change="handleModelChange"
        >
          <option v-for="option in modelOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button type="button" class="toolbar-btn icon primary" :title="$t('ai.header.newChat')" :disabled="streaming" @click="newChat">+</button>
        <button type="button" class="toolbar-btn icon" :title="$t('ai.header.more')" @click.stop="showHeaderMenu = !showHeaderMenu">⋯</button>
        <div v-if="showHeaderMenu" class="header-menu" @click.stop>
          <button type="button" class="header-menu-item" :disabled="streaming" @click="openSessionsFromMenu">
            <span class="header-menu-icon">◷</span>
            <span>{{ $t('common.sessions') }}</span>
          </button>
          <button type="button" class="header-menu-item" @click="openSettingsFromMenu">
            <span class="header-menu-icon">⚙</span>
            <span>{{ $t('common.settings') }}</span>
          </button>
          <button type="button" class="header-menu-item" :disabled="!displayMessages.length" @click="exportChatMarkdown">
            <span class="header-menu-icon">⇪</span>
            <span>{{ $t('ai.header.exportMarkdown') }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSettings || !apiKeyResolved" class="settings-panel">
      <label>{{ $t('ai.settings.provider') }}</label>
      <select v-model="providerInput">
        <option value="anthropic">Anthropic</option>
        <option value="openai">{{ $t('ai.settings.openAICompatible') }}</option>
      </select>
      <div class="settings-hint">
        {{ $t('ai.settings.providerHint') }}
      </div>

      <label>{{ $t('ai.settings.apiKey', { provider: providerLabel }) }}</label>
      <input
        type="password"
        v-model="apiKeyInput"
        spellcheck="false"
        autocomplete="off"
        :placeholder="apiKeyPlaceholder"
      />
      <div class="settings-hint">
        <span v-if="settingsProvider === 'anthropic'">{{ $t('ai.settings.apiKeyHintAnthropic', { env: apiKeyEnvName }) }}</span>
        <span v-else>{{ $t('ai.settings.apiKeyHintOpenAI', { env: apiKeyEnvName }) }}</span>
      </div>

      <label>{{ $t('ai.settings.baseUrl') }}</label>
      <input
        type="text"
        v-model="baseUrlInput"
        spellcheck="false"
        autocomplete="off"
        :placeholder="baseUrlPlaceholder"
      />
      <div class="settings-hint">
        {{ $t('ai.settings.baseUrlHint', { env: baseUrlEnvName, value: settingsResolvedBaseUrl }) }}
      </div>

      <label>{{ $t('ai.settings.model') }}</label>
      <input
        type="text"
        v-model="modelInput"
        spellcheck="false"
        autocomplete="off"
        :placeholder="modelPlaceholder"
      />
      <div class="settings-hint">
        {{ $t('ai.settings.modelHint', { env: modelEnvName, value: settingsResolvedModel }) }}
      </div>

      <label>{{ $t('ai.settings.writingStyle') }}</label>
      <textarea
        class="settings-persona"
        v-model="personaInput"
        spellcheck="false"
        rows="4"
        :placeholder="personaPlaceholder"
      ></textarea>
      <div class="settings-hint">
        {{ $t('ai.settings.personaHint') }}
      </div>

      <div class="settings-actions">
        <button type="button" @click="saveApiKey">{{ $t('common.save') }}</button>
        <button v-if="storedProvider || storedApiKey || storedBaseUrl || storedModel" type="button" class="ghost" @click="clearApiKey">{{ $t('common.clear') }}</button>
      </div>
    </div>

    <div v-if="showSessions" class="sessions-panel">
      <div class="sessions-header">
        <div class="sessions-heading">
          <span>{{ $t('common.sessions') }}</span>
          <span class="sessions-subtitle">{{ sessionScopeLabel }}</span>
        </div>
        <button type="button" :disabled="streaming" @click="newChat">{{ $t('common.new') }}</button>
      </div>
      <div v-if="!sortedSessions.length" class="empty-sessions">
        {{ $t('ai.sessions.empty') }}
      </div>
      <div
        v-for="session in sortedSessions"
        :key="session.id"
        class="session-row"
        :class="{ active: session.id === activeSessionId }"
      >
        <button
          type="button"
          class="session-main"
          :disabled="streaming"
          @click="selectSession(session.id)"
        >
          <span class="session-title">{{ session.title || $t('ai.sessions.newChat') }}</span>
          <span v-if="session.documentLabel" class="session-doc">{{ session.documentLabel }}</span>
          <span class="session-meta">{{ formatSessionTime(session.updatedAt) }}</span>
        </button>
        <button
          type="button"
          class="session-delete"
          :title="$t('ai.sessions.delete')"
          :disabled="streaming"
          @click.stop="deleteSession(session.id)"
        >
          ×
        </button>
      </div>
    </div>

    <div ref="messageList" class="chat-messages" @click="handleMessageListClick">
      <div v-if="!displayMessages.length && apiKeyResolved" class="empty-hint">
        <div class="empty-hint-title">{{ $t('ai.empty.title') }}</div>
        <div class="empty-hint-copy">{{ $t('ai.empty.copy') }}</div>
      </div>
      <div
        v-for="message in displayMessages"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <div v-if="message.role === 'system'" class="message-shell">
          <div class="message-avatar"></div>
          <div class="message-main">
            <div class="system-card">
              <div class="system-card-label">{{ $t('ai.messages.compacted') }}</div>
              <div class="message-blocks">
                <template v-for="(block, index) in message.blocks">
                  <div
                    v-if="block.type === 'text'"
                    :key="index"
                    class="block-text"
                    v-html="renderMarkdown(block.text)"
                  ></div>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="message-shell">
          <div class="message-avatar">{{ message.role === 'user' ? '' : '' }}</div>
          <div class="message-main">
            <div class="message-role">{{ message.role === 'user' ? $t('ai.messages.you') : $t('ai.messages.assistant') }}</div>
            <div class="message-blocks">
              <template v-for="(block, index) in message.blocks">
                <div
                  v-if="block.type === 'text'"
                  :key="index"
                  class="block-text"
                  v-html="block === streamingBlockRef ? streamingHtml : renderMarkdown(block.text)"
                ></div>
                <div
                  v-else-if="block.type === 'tool'"
                  :key="index"
                  class="block-tool"
                  :class="block.status"
                >
                  <span class="tool-icon">
                    <span v-if="block.status === 'running'" class="tool-spinner"></span>
                    <span v-else-if="block.status === 'error'">⚠</span>
                    <span v-else>✓</span>
                  </span>
                  <span class="tool-name">{{ toolLabel(block.name) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div v-if="error" class="error">
        <span>{{ error }}</span>
        <button
          v-if="pendingRetry && !streaming"
          type="button"
          class="retry-btn"
          @click="retryLastSend"
        >Retry</button>
      </div>
      <div v-if="!error && pendingRetry && !streaming" class="aborted">
        <span>{{ $t('ai.messages.stopped') }}</span>
        <button type="button" class="retry-btn" @click="retryLastSend">{{ $t('common.retry') }}</button>
      </div>
      <div v-if="editUndoStack.length && !streaming" class="undo-bar">
        <button type="button" class="undo-btn" @click="undoLastEdit">
          <span class="undo-icon">↩</span> {{ $t('ai.undo.lastEdit') }}
        </button>
        <span class="undo-hint">
          {{ editUndoStack.length > 1 ? $t('ai.undo.stacks', { count: editUndoStack.length }) : $t('ai.undo.stack', { count: editUndoStack.length }) }}
        </span>
      </div>
    </div>

    <div v-if="pendingEdit" class="edit-preview">
      <div class="edit-preview-topbar">
        <div class="edit-preview-header">
          <span class="edit-preview-kicker">{{ $t('ai.editPreview.review') }}</span>
          <span>{{ $t('ai.editPreview.proposed') }} · {{ toolLabel(pendingEdit.name) }}</span>
          <span class="edit-summary">{{ pendingEdit.summary }}</span>
        </div>
        <div class="edit-preview-actions">
          <button type="button" class="reject" @click="rejectPendingEdit">{{ $t('ai.editPreview.reject') }}</button>
          <button type="button" class="accept" @click="acceptPendingEdit">{{ $t('ai.editPreview.accept') }}</button>
        </div>
      </div>
      <div class="edit-diff-meta">
        <span class="diff-badge add">+{{ pendingEdit.stats.added }}</span>
        <span class="diff-badge remove">-{{ pendingEdit.stats.removed }}</span>
        <span v-if="pendingEdit.stats.skipped" class="diff-badge skip">{{ pendingEdit.stats.skipped }} {{ $t('ai.editPreview.folds') }}</span>
      </div>
      <div class="edit-diff">
        <template v-for="(line, idx) in pendingEdit.diff">
          <div :key="idx" class="diff-line" :class="line.type">
            <span class="diff-marker">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'skip' ? '…' : ' ' }}</span><span class="diff-text">{{ line.text }}</span>
          </div>
        </template>
      </div>
      <div class="edit-preview-footnote">
        {{ $t('ai.editPreview.footnote') }}
      </div>
    </div>

    <form class="chat-input" @submit.prevent="send">
      <div class="composer-meta">
        <span
          class="token-count"
          :class="{ warn: tokenWarning }"
          :title="tokenWarning ? $t('ai.composer.longConversation') : tokenProgressTitle"
        >
          <span class="token-dot"></span>
          {{ tokenUsageLabel }}
          <span class="token-meter" :aria-hidden="true"><span :style="{ width: `${tokenProgressPercent}%` }"></span></span>
          <button
            v-if="showCompactButton"
            type="button"
            class="token-compact-link"
            :disabled="compacting"
            @click="compactConversation"
          >{{ compacting ? $t('ai.composer.compacting') : `${$t('ai.composer.compact')} ↗` }}</button>
        </span>
        <span class="composer-meta-spacer"></span>
        <span v-if="referenceText" class="selection-status">
          {{ referenceLineCount === 1 ? $t('ai.composer.selectedLine', { count: referenceLineCount }) : $t('ai.composer.selectedLines', { count: referenceLineCount }) }}
        </span>
        <button
          type="button"
          class="mode-trigger"
          :disabled="streaming || compacting"
          :title="currentEditMode.description"
          @click.stop="showModeMenu = !showModeMenu"
        >
          <span class="mode-trigger-icon">{{ currentEditMode.icon }}</span>
          <span class="mode-trigger-label">{{ currentEditMode.shortLabel }}</span>
        </button>
      </div>
      <div v-if="attachedImages.length" class="attached-images">
        <div v-for="(img, idx) in attachedImages" :key="img.id" class="attached-image-thumb">
          <img :src="img.previewUrl" :alt="img.name" />
          <button type="button" class="remove-attachment" @click="removeImage(idx)">×</button>
        </div>
      </div>
      <div v-if="attachedContexts.length" class="attached-contexts">
        <span v-for="(ctx, idx) in attachedContexts" :key="idx" class="context-chip" :title="ctx.fullPath || ctx.text">
          <span class="context-chip-icon">{{ ctx.type === 'file' ? '#' : '@' }}</span>
          <span class="context-chip-label">{{ ctx.label }}</span>
          <button type="button" class="context-chip-remove" @click="removeContext(idx)">×</button>
        </span>
      </div>
      <div class="composer-input-wrap" @dragover.prevent @drop="handleDrop">
        <textarea
          ref="input"
          v-model="input"
          :disabled="streaming || compacting || !!pendingEdit || !apiKeyResolved"
          spellcheck="false"
          rows="3"
          :placeholder="inputPlaceholder"
          @keydown.enter.exact.prevent="send"
          @keydown.up="handleHistoryUp"
          @keydown.down="handleHistoryDown"
          @input="handleInputEvent"
          @paste="handlePaste"
        ></textarea>
        <div v-if="mentionSuggestions.length" class="mention-menu">
          <button
            v-for="(suggestion, idx) in mentionSuggestions"
            :key="idx"
            type="button"
            class="mention-item"
            @mousedown.prevent="selectMention(suggestion)"
          >
            <span class="mention-icon">{{ suggestion.type === 'file' ? '#' : '§' }}</span>
            <span class="mention-label">{{ suggestion.label }}</span>
          </button>
        </div>
        <div v-if="slashSuggestions.length" class="mention-menu slash-menu">
          <button
            v-for="template in slashSuggestions"
            :key="template.id"
            type="button"
            class="mention-item"
            @mousedown.prevent="selectSlashCommand(template)"
          >
            <span class="mention-icon">/</span>
            <span class="mention-label">{{ template.label }}</span>
          </button>
        </div>
        <div class="composer-toolbar">
          <span class="composer-slash" :title="$t('ai.composer.quickPrompts')">/</span>
          <button
            v-for="template in promptTemplates"
            :key="template.id"
            type="button"
            class="template-btn"
            :disabled="streaming || compacting || !!pendingEdit || !apiKeyResolved"
            @click="runTemplatePrompt(template)"
          >{{ template.label }}</button>
          <span class="composer-toolbar-spacer"></span>
          <button v-if="streaming || compacting" type="button" class="send-btn stop" @click="stop">{{ $t('common.stop') }}</button>
          <button
            v-else
            type="submit"
            class="send-btn primary"
            :disabled="!apiKeyResolved || (!input.trim() && !attachedImages.length) || !!pendingEdit"
          >{{ $t('common.send') }} <span class="send-key">↵</span></button>
        </div>
      </div>
      <div v-if="showModeMenu" class="mode-menu">
        <div class="mode-menu-header">
          <span>{{ $t('ai.modes.title') }}</span>
          <span class="mode-menu-hint">{{ $t('ai.modes.hint') }}</span>
        </div>
        <button
          v-for="mode in editModes"
          :key="mode.id"
          type="button"
          class="mode-option"
          :class="{ active: mode.id === currentEditMode.id }"
          @click="selectEditMode(mode.id)"
        >
          <span class="mode-option-icon">{{ mode.icon }}</span>
          <span class="mode-option-copy">
            <span class="mode-option-title">{{ mode.label }}</span>
            <span class="mode-option-description">{{ mode.description }}</span>
          </span>
          <span v-if="mode.id === currentEditMode.id" class="mode-option-check">✓</span>
        </button>
      </div>
      <div v-if="compactNotice" class="compact-notice">{{ compactNotice }}</div>
    </form>
  </div>
</template>

<script>
import fs from 'fs'
import path from 'path'
import { mapState } from 'vuex'
import marked from 'marked'
import DOMPurify from 'dompurify'
import Prism, { loadLanguage } from 'muya/lib/prism'
import { ipcRenderer } from 'electron'
import bus from '../../bus'
import { PROVIDERS, normalizeProvider, resolveApiKey, resolveBaseUrl, resolveModel, sanitizeMessages, streamChat } from '../../node/claudeApi'
import { wordCount as getWordCount } from 'muya/lib/utils'
import loadRenderer from 'muya/lib/renderers'
import { darkThemes as darkThemeSet } from '../../util/themeColor'

const PROVIDER_STORAGE_KEY = 'marktext.claudeProvider'
const STORAGE_KEY = 'marktext.claudeApiKey'
const BASE_URL_STORAGE_KEY = 'marktext.claudeBaseUrl'
const MODEL_STORAGE_KEY = 'marktext.claudeModel'
const PERSONA_STORAGE_KEY = 'marktext.claudePersona'
const EDIT_MODE_STORAGE_KEY = 'marktext.claudeEditMode'
const SESSIONS_STORAGE_KEY = 'marktext.claudeSessions'
const ACTIVE_SESSION_STORAGE_KEY = 'marktext.claudeActiveSessionId'
const ACTIVE_SESSION_MAP_STORAGE_KEY = 'marktext.claudeActiveSessionIds'
const MAX_STORED_SESSIONS = 40
const MAX_SESSION_TITLE_LENGTH = 48
const MAX_READ_FILE_BYTES = 1024 * 1024
const MAX_LIST_DIR_ENTRIES = 500
const TOKEN_COMPACT_THRESHOLD = 30000
const DIFF_COLLAPSE_MIN_CONTEXT = 10
const DIFF_COLLAPSE_HEAD = 3
const DIFF_COLLAPSE_TAIL = 3
const COMMON_PRISM_LANGS = ['javascript', 'typescript', 'jsx', 'tsx', 'python', 'bash', 'shell', 'json', 'css', 'scss', 'html', 'markdown', 'go', 'rust', 'java', 'c', 'cpp', 'csharp', 'sql', 'yaml']
COMMON_PRISM_LANGS.forEach(lang => {
  try { loadLanguage(lang) } catch (err) { /* ignore */ }
})

const EDIT_TOOL_NAMES = new Set(['apply_edit', 'replace_text', 'insert_text'])
const MAX_UNDO_STACK = 20
const MODEL_PRESETS = {
  anthropic: ['claude-sonnet-4-5-20250929', 'claude-opus-4-20250514', 'claude-3-7-sonnet-20250219'],
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini']
}
const MODEL_CONTEXT_LIMITS = {
  'claude-sonnet-4-5-20250929': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'gpt-4.1': 128000,
  'gpt-4.1-mini': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000
}

const computeLineDiff = (oldText, newText) => {
  const a = String(oldText || '').split('\n')
  const b = String(newText || '').split('\n')
  const m = a.length
  const n = b.length
  if (m * n > 250000) {
    return [
      ...(oldText ? [{ type: 'remove', text: `(${m} lines replaced)` }] : []),
      ...(newText ? [{ type: 'add', text: `(${n} lines new)` }] : [])
    ]
  }
  const dp = []
  for (let i = 0; i <= m; i++) dp.push(new Int32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const result = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'context', text: a[i] }); i++; j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'remove', text: a[i] }); i++
    } else {
      result.push({ type: 'add', text: b[j] }); j++
    }
  }
  while (i < m) result.push({ type: 'remove', text: a[i++] })
  while (j < n) result.push({ type: 'add', text: b[j++] })
  return result
}

const buildContextualPreview = (markdown, start, end, replacement, contextLines = 2) => {
  const source = String(markdown || '')
  const safeStart = Math.max(0, Math.min(start, source.length))
  const safeEnd = Math.max(safeStart, Math.min(end, source.length))
  const before = source.slice(0, safeStart)
  const changed = source.slice(safeStart, safeEnd)
  const after = source.slice(safeEnd)

  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const hasHiddenPrefix = beforeLines.length > contextLines
  const hasHiddenSuffix = afterLines.length > contextLines
  const prefix = beforeLines.slice(-contextLines).join('\n')
  const suffix = afterLines.slice(0, contextLines).join('\n')
  const prefixText = prefix ? `${hasHiddenPrefix ? '...\n' : ''}${prefix}` : (hasHiddenPrefix ? '...\n' : '')
  const suffixText = suffix ? `${suffix}${hasHiddenSuffix ? '\n...' : ''}` : (hasHiddenSuffix ? '\n...' : '')
  const middleSeparator = prefixText && !prefixText.endsWith('\n') ? '\n' : ''
  const suffixSeparator = suffixText && !suffixText.startsWith('\n') ? '\n' : ''

  return {
    oldText: `${prefixText}${middleSeparator}${changed}${suffixSeparator}${suffixText}`,
    newText: `${prefixText}${middleSeparator}${replacement}${suffixSeparator}${suffixText}`
  }
}

const documentSnapshotKey = markdown => {
  if (typeof markdown !== 'string') return ''
  let hash = 0
  for (let i = 0; i < markdown.length; i++) {
    hash = ((hash << 5) - hash + markdown.charCodeAt(i)) | 0
  }
  return `${markdown.length}:${hash}`
}

const estimateTokens = apiMessages => {
  let chars = 0
  for (const m of apiMessages) {
    if (typeof m.content === 'string') {
      chars += m.content.length
    } else if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if (block.type === 'text') chars += (block.text || '').length
        else if (block.type === 'tool_use') chars += JSON.stringify(block.input || {}).length + (block.name || '').length
        else if (block.type === 'tool_result') {
          chars += typeof block.content === 'string' ? block.content.length : JSON.stringify(block.content || '').length
        }
      }
    }
  }
  return Math.ceil(chars / 4)
}

const getSessionDocumentKey = (file, projectTree) => {
  if (file && file.pathname) return `file:${file.pathname}`
  if (file && file.id) return `draft:${file.id}`
  if (projectTree && projectTree.pathname) return `project:${projectTree.pathname}`
  return 'global'
}

const compactDiffLines = diff => {
  const result = []
  let contextRun = []
  const flushContextRun = () => {
    if (!contextRun.length) return
    if (contextRun.length >= DIFF_COLLAPSE_MIN_CONTEXT) {
      const hiddenCount = contextRun.length - DIFF_COLLAPSE_HEAD - DIFF_COLLAPSE_TAIL
      result.push(...contextRun.slice(0, DIFF_COLLAPSE_HEAD))
      result.push({
        type: 'skip',
        text: `${hiddenCount} unchanged lines hidden`
      })
      result.push(...contextRun.slice(-DIFF_COLLAPSE_TAIL))
    } else {
      result.push(...contextRun)
    }
    contextRun = []
  }

  for (const line of diff) {
    if (line.type === 'context') {
      contextRun.push(line)
    } else {
      flushContextRun()
      result.push(line)
    }
  }
  flushContextRun()
  return result
}

const summarizeDiff = diff => {
  let added = 0
  let removed = 0
  let skipped = 0
  for (const line of diff) {
    if (line.type === 'add') added++
    else if (line.type === 'remove') removed++
    else if (line.type === 'skip') skipped++
  }
  return { added, removed, skipped }
}

let messageIdCounter = 0
let sessionIdCounter = 0
const nextId = () => `msg-${Date.now()}-${++messageIdCounter}`
const nextSessionId = () => `session-${Date.now()}-${++sessionIdCounter}`
const cloneMessages = messages => JSON.parse(JSON.stringify(messages || []))
const sortSessionsByUpdate = sessions => sessions.slice().sort((a, b) => {
  return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)
})

export default {
  props: {
    active: {
      type: Boolean,
      required: true
    }
  },
  data () {
    return {
      input: '',
      providerInput: PROVIDERS.ANTHROPIC,
      storedProvider: '',
      apiKeyInput: '',
      storedApiKey: '',
      baseUrlInput: '',
      storedBaseUrl: '',
      modelInput: '',
      storedModel: '',
      selectedModel: '',
      personaInput: '',
      storedPersona: '',
      showSettings: false,
      streaming: false,
      error: '',
      displayMessages: [],
      apiMessages: [],
      sessions: [],
      activeSessionId: '',
      showSessions: false,
      abortController: null,
      currentAssistantMessage: null,
      reference: null,
      markdownCache: new Map(),
      pendingEdit: null,
      pendingRetry: null,
      compacting: false,
      compactNotice: '',
      loadedDocumentSessionKey: 'global',
      skipNextAutoFocus: false,
      storedEditMode: 'ask',
      showModeMenu: false,
      showHeaderMenu: false,
      attachedImages: [],
      attachedContexts: [],
      mentionTrigger: null,
      mentionSuggestions: [],
      editUndoStack: [],
      slashSuggestions: [],
      slashTrigger: null,
      streamingHtml: '',
      streamingBlockRef: null,
      inputHistory: [],
      inputHistoryIndex: -1,
      inputHistoryDraft: ''
    }
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile,
      projectTree: state => state.project.projectTree,
      theme: state => state.preferences.theme
    }),
    isDarkTheme () {
      return darkThemeSet.has(this.theme || '')
    },
    providerResolved () {
      return normalizeProvider(this.storedProvider)
    },
    settingsProvider () {
      return normalizeProvider(this.providerInput || this.storedProvider)
    },
    activeProviderLabel () {
      return 'AI'
    },
    panelTitle () {
      if (this.activeSession && this.activeSession.title && this.activeSession.title !== 'New chat') {
        return this.activeSession.title
      }
      if (this.referenceText) {
        const singleLine = this.referenceText.replace(/\s+/g, ' ').trim()
        if (singleLine) {
          return singleLine.length > 18 ? `${singleLine.slice(0, 18)}...` : singleLine
        }
      }
      return 'AI'
    },
    providerBadgeLabel () {
      return this.providerResolved === PROVIDERS.OPENAI ? 'OpenAI compatible' : 'Anthropic'
    },
    providerLabel () {
      return this.settingsProvider === PROVIDERS.OPENAI ? 'OpenAI' : 'Anthropic'
    },
    modelSwitchTitle () {
      return this.$t('ai.settings.model')
    },
    modelOptions () {
      const provider = this.settingsProvider
      const current = this.selectedModel || this.settingsResolvedModel || this.resolvedModel
      const baseModels = MODEL_PRESETS[provider] || []
      const values = [current, ...baseModels].filter(Boolean)
      return [...new Set(values)].map(value => ({
        value,
        label: value
      }))
    },
    apiKeyResolved () {
      if (this.providerResolved === PROVIDERS.OPENAI) return true
      return Boolean(resolveApiKey(this.storedApiKey, this.providerResolved))
    },
    apiKeyPlaceholder () {
      return this.settingsProvider === PROVIDERS.OPENAI ? 'sk-... or empty for local endpoint' : 'sk-ant-...'
    },
    apiKeyEnvName () {
      return this.settingsProvider === PROVIDERS.OPENAI ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'
    },
    baseUrlEnvName () {
      return this.settingsProvider === PROVIDERS.OPENAI ? 'OPENAI_BASE_URL' : 'ANTHROPIC_BASE_URL'
    },
    modelEnvName () {
      return this.settingsProvider === PROVIDERS.OPENAI ? 'OPENAI_MODEL' : 'ANTHROPIC_MODEL'
    },
    resolvedBaseUrl () {
      return resolveBaseUrl(this.storedBaseUrl, this.providerResolved)
    },
    baseUrlPlaceholder () {
      return resolveBaseUrl('', this.settingsProvider)
    },
    settingsResolvedBaseUrl () {
      return resolveBaseUrl(this.baseUrlInput, this.settingsProvider)
    },
    resolvedModel () {
      return resolveModel(this.storedModel, this.providerResolved)
    },
    modelPlaceholder () {
      return resolveModel('', this.settingsProvider)
    },
    personaPlaceholder () {
      return this.$t('ai.settings.personaPlaceholder')
    },
    settingsResolvedModel () {
      return resolveModel(this.modelInput, this.settingsProvider)
    },
    sortedSessions () {
      return sortSessionsByUpdate(this.sessions)
    },
    activeSession () {
      return this.sessions.find(session => session.id === this.activeSessionId) || null
    },
    referenceText () {
      return this.reference && this.reference.text ? this.reference.text : ''
    },
    referenceLabel () {
      if (!this.reference) return ''
      return this.reference.filename || this.contextLabel || ''
    },
    referenceLineCount () {
      if (!this.referenceText) return 0
      return this.referenceText
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .length || 1
    },
    contextLabel () {
      if (this.currentFile && this.currentFile.filename) {
        return this.currentFile.filename
      }
      if (this.projectTree && this.projectTree.pathname) {
        return path.basename(this.projectTree.pathname)
      }
      return ''
    },
    sessionScopeLabel () {
      return this.contextLabel || this.$t('common.workspace')
    },
    currentDocumentSessionKey () {
      return getSessionDocumentKey(this.currentFile, this.projectTree)
    },
    promptTemplates () {
      return ['polish', 'continue', 'condense', 'summary', 'structure', 'mermaid'].map(id => ({
        id,
        label: this.$t(`ai.templates.${id}.label`),
        prompt: this.$t(`ai.templates.${id}.prompt`)
      }))
    },
    editModes () {
      return ['ask', 'auto', 'plan'].map(id => ({
        id,
        icon: id === 'ask' ? '✋' : id === 'auto' ? '</>' : '☰',
        label: this.$t(`ai.modes.${id}.label`),
        shortLabel: this.$t(`ai.modes.${id}.shortLabel`),
        description: this.$t(`ai.modes.${id}.description`)
      }))
    },
    currentEditMode () {
      return this.editModes.find(mode => mode.id === this.storedEditMode) || this.editModes[0]
    },
    inputPlaceholder () {
      if (!this.apiKeyResolved) return this.$t('ai.composer.setApiKey')
      if (this.streaming) return this.$t('ai.composer.replying', { provider: this.activeProviderLabel })
      return this.$t('ai.composer.placeholder')
    },
    estimatedTokens () {
      return estimateTokens(this.apiMessages)
    },
    tokenLimit () {
      return MODEL_CONTEXT_LIMITS[this.resolvedModel] || MODEL_CONTEXT_LIMITS[this.settingsResolvedModel] || 128000
    },
    tokenProgressPercent () {
      const limit = this.tokenLimit || 1
      return Math.max(0, Math.min(100, Math.round((this.estimatedTokens / limit) * 100)))
    },
    tokenUsageLabel () {
      return this.$t('ai.composer.tokenUsage', { used: this.estimatedTokens, limit: this.tokenLimit })
    },
    tokenProgressTitle () {
      return this.$t('ai.composer.tokenTitle', { used: this.estimatedTokens, limit: this.tokenLimit })
    },
    showCompactButton () {
      return !this.streaming && !this.compacting && this.apiMessages.length >= 4 && this.estimatedTokens >= TOKEN_COMPACT_THRESHOLD
    },
    tokenWarning () {
      return this.estimatedTokens >= TOKEN_COMPACT_THRESHOLD
    }
  },
  watch: {
    active (value) {
      if (value) {
        this.skipNextAutoFocus = false
      }
    },
    currentFile (file, oldFile) {
      const nextKey = getSessionDocumentKey(file, this.projectTree)
      const prevKey = getSessionDocumentKey(oldFile, this.projectTree)
      if (nextKey !== prevKey) {
        this.handleDocumentContextChange(nextKey)
      }
      if (!this.reference) return
      if (!file || file.id !== this.reference.fileId) {
        this.clearReference()
      }
    },
    projectTree (tree, oldTree) {
      const nextKey = getSessionDocumentKey(this.currentFile, tree)
      const prevKey = getSessionDocumentKey(this.currentFile, oldTree)
      if (nextKey !== prevKey) {
        this.handleDocumentContextChange(nextKey)
      }
    },
    isDarkTheme () {
      this.rerenderMermaidBlocks()
    }
  },
  mounted () {
    const storedProvider = normalizeProvider(localStorage.getItem(PROVIDER_STORAGE_KEY) || '')
    this.storedProvider = storedProvider === PROVIDERS.ANTHROPIC ? '' : storedProvider
    this.providerInput = storedProvider
    this.storedApiKey = localStorage.getItem(STORAGE_KEY) || ''
    this.apiKeyInput = this.storedApiKey
    this.storedBaseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY) || ''
    this.baseUrlInput = this.storedBaseUrl
    this.storedModel = localStorage.getItem(MODEL_STORAGE_KEY) || ''
    this.modelInput = this.storedModel
    this.selectedModel = this.storedModel || this.resolvedModel
    this.storedPersona = localStorage.getItem(PERSONA_STORAGE_KEY) || ''
    this.personaInput = this.storedPersona
    const storedEditMode = localStorage.getItem(EDIT_MODE_STORAGE_KEY) || 'ask'
    this.storedEditMode = ['ask', 'auto', 'plan'].includes(storedEditMode) ? storedEditMode : 'ask'
    this.loadSessions(this.currentDocumentSessionKey)
    bus.$on('claude-selection-reference', this.handleSelectionReference)
  },
  beforeDestroy () {
    bus.$off('claude-selection-reference', this.handleSelectionReference)
    this.stop()
    this.saveCurrentSession()
  },
  methods: {
    saveApiKey () {
      const persist = (key, value) => {
        if (value) localStorage.setItem(key, value)
        else localStorage.removeItem(key)
      }
      const apiKeyValue = this.apiKeyInput.trim()
      const baseUrlValue = this.baseUrlInput.trim()
      const modelValue = this.modelInput.trim()
      const personaValue = this.personaInput.trim()
      const providerValue = normalizeProvider(this.providerInput)

      persist(PROVIDER_STORAGE_KEY, providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue)
      persist(STORAGE_KEY, apiKeyValue)
      persist(BASE_URL_STORAGE_KEY, baseUrlValue)
      persist(MODEL_STORAGE_KEY, modelValue)
      persist(PERSONA_STORAGE_KEY, personaValue)

      this.storedProvider = providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue
      this.providerInput = providerValue
      this.storedApiKey = apiKeyValue
      this.storedBaseUrl = baseUrlValue
      this.storedModel = modelValue
      this.selectedModel = modelValue || this.resolvedModel
      this.storedPersona = personaValue

      if (this.apiKeyResolved) {
        this.showSettings = false
      }
      this.error = ''
    },
    clearApiKey () {
      localStorage.removeItem(PROVIDER_STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(BASE_URL_STORAGE_KEY)
      localStorage.removeItem(MODEL_STORAGE_KEY)
      localStorage.removeItem(PERSONA_STORAGE_KEY)
      this.storedProvider = ''
      this.providerInput = PROVIDERS.ANTHROPIC
      this.storedApiKey = ''
      this.apiKeyInput = ''
      this.storedBaseUrl = ''
      this.baseUrlInput = ''
      this.storedModel = ''
      this.modelInput = ''
      this.storedPersona = ''
      this.personaInput = ''
      this.selectedModel = this.resolvedModel
    },
    selectEditMode (modeId) {
      const mode = this.editModes.find(item => item.id === modeId)
      if (!mode) return
      this.storedEditMode = mode.id
      localStorage.setItem(EDIT_MODE_STORAGE_KEY, mode.id)
      this.showModeMenu = false
    },
    handleModelChange () {
      this.modelInput = this.selectedModel
      this.saveApiKey()
    },
    getCurrentDocumentLabel () {
      if (this.currentFile && this.currentFile.filename) {
        return this.currentFile.filename
      }
      if (this.currentFile && this.currentFile.pathname) {
        return path.basename(this.currentFile.pathname)
      }
      if (this.projectTree && this.projectTree.pathname) {
        return path.basename(this.projectTree.pathname)
      }
      return 'Workspace'
    },
    createSession (documentKey = this.loadedDocumentSessionKey) {
      const now = Date.now()
      return {
        id: nextSessionId(),
        documentKey,
        documentLabel: this.getCurrentDocumentLabel(),
        title: 'New chat',
        createdAt: now,
        updatedAt: now,
        displayMessages: [],
        apiMessages: []
      }
    },
    readStoredSessions (legacyDocumentKey = this.currentDocumentSessionKey) {
      try {
        const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
        const sessions = raw ? JSON.parse(raw) : []
        if (!Array.isArray(sessions)) return []
        return sessions
          .filter(session => session && session.id)
          .map(session => ({
            id: String(session.id),
            documentKey: session.documentKey || legacyDocumentKey || 'global',
            documentLabel: session.documentLabel || '',
            title: session.title || 'New chat',
            createdAt: Number(session.createdAt || Date.now()),
            updatedAt: Number(session.updatedAt || session.createdAt || Date.now()),
            displayMessages: Array.isArray(session.displayMessages) ? session.displayMessages : [],
            apiMessages: Array.isArray(session.apiMessages) ? sanitizeMessages(session.apiMessages) : []
          }))
      } catch (err) {
        return []
      }
    },
    readActiveSessionMap () {
      try {
        const raw = localStorage.getItem(ACTIVE_SESSION_MAP_STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (err) {
        return {}
      }
    },
    writeActiveSessionId (documentKey, sessionId) {
      const map = this.readActiveSessionMap()
      if (sessionId) map[documentKey] = sessionId
      else delete map[documentKey]
      localStorage.setItem(ACTIVE_SESSION_MAP_STORAGE_KEY, JSON.stringify(map))
      if (documentKey === this.currentDocumentSessionKey && sessionId) {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId)
      }
    },
    loadSessions (documentKey = this.currentDocumentSessionKey) {
      const allSessions = this.readStoredSessions(documentKey)
      const sessions = allSessions.filter(session => session.documentKey === documentKey)
      this.loadedDocumentSessionKey = documentKey
      this.sessions = sessions.length ? sortSessionsByUpdate(sessions) : [this.createSession(documentKey)]

      const activeMap = this.readActiveSessionMap()
      const legacyActiveId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      const storedActiveId = activeMap[documentKey] || legacyActiveId
      const active = this.sessions.find(session => session.id === storedActiveId) || this.sortedSessions[0]
      this.activeSessionId = active.id
      this.displayMessages = cloneMessages(active.displayMessages)
      this.apiMessages = cloneMessages(active.apiMessages)
      this.pendingRetry = null
      this.pendingEdit = null
      this.error = ''
      this.compactNotice = ''
      this.clearMarkdownCache()
      this.persistSessions()
    },
    persistSessions () {
      const previousSessions = this.readStoredSessions(this.loadedDocumentSessionKey)
        .filter(session => session.documentKey !== this.loadedDocumentSessionKey)
      const sessions = sortSessionsByUpdate(this.sessions)
        .slice(0, MAX_STORED_SESSIONS)
        .map(session => ({
          id: session.id,
          documentKey: session.documentKey || this.loadedDocumentSessionKey,
          documentLabel: session.documentLabel || this.getCurrentDocumentLabel(),
          title: session.title || 'New chat',
          createdAt: session.createdAt || Date.now(),
          updatedAt: session.updatedAt || session.createdAt || Date.now(),
          displayMessages: cloneMessages(session.displayMessages),
          apiMessages: sanitizeMessages(cloneMessages(session.apiMessages))
        }))

      this.sessions = sessions
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([...previousSessions, ...sessions]))
        if (this.activeSessionId) {
          this.writeActiveSessionId(this.loadedDocumentSessionKey, this.activeSessionId)
        }
      } catch (err) {
        // Keep the in-memory session even if browser storage is full.
      }
    },
    deriveSessionTitle () {
      const firstUserMessage = this.displayMessages.find(message => message.role === 'user')
      const firstTextBlock = firstUserMessage && firstUserMessage.blocks
        ? firstUserMessage.blocks.find(block => block.type === 'text' && block.text)
        : null
      const title = firstTextBlock
        ? String(firstTextBlock.text).replace(/\s+/g, ' ').trim()
        : ''
      if (!title) return 'New chat'
      if (title.length <= MAX_SESSION_TITLE_LENGTH) return title
      return `${title.slice(0, MAX_SESSION_TITLE_LENGTH - 3)}...`
    },
    saveCurrentSession (options = {}) {
      const session = this.activeSession
      if (!session) return

      session.documentKey = session.documentKey || this.loadedDocumentSessionKey
      session.documentLabel = this.getCurrentDocumentLabel()
      session.displayMessages = cloneMessages(this.displayMessages)
      session.apiMessages = sanitizeMessages(cloneMessages(this.apiMessages))
      if (session.title === 'New chat' && this.displayMessages.length) {
        session.title = this.deriveSessionTitle()
      }
      if (options.touch) {
        session.updatedAt = Date.now()
      }
      this.persistSessions()
    },
    selectSession (sessionId) {
      if (this.streaming || sessionId === this.activeSessionId) return

      const session = this.sessions.find(item => item.id === sessionId)
      if (!session) return

      this.saveCurrentSession()
      this.activeSessionId = session.id
      this.displayMessages = cloneMessages(session.displayMessages)
      this.apiMessages = cloneMessages(session.apiMessages)
      this.error = ''
      this.pendingRetry = null
      this.pendingEdit = null
      this.compactNotice = ''
      this.currentAssistantMessage = null
      this.showSessions = false
      this.clearMarkdownCache()
      this.writeActiveSessionId(this.loadedDocumentSessionKey, session.id)
      this.$nextTick(() => {
        this.scrollToBottom(true)
        this.renderMermaidBlocks()
      })
    },
    deleteSession (sessionId) {
      if (this.streaming) return
      if (!window.confirm('Delete this AI session?')) return

      const wasActive = sessionId === this.activeSessionId
      if (!wasActive) {
        this.saveCurrentSession()
      }

      this.sessions = this.sessions.filter(session => session.id !== sessionId)
      if (!this.sessions.length) {
        this.sessions = [this.createSession()]
      }

      if (wasActive) {
        const nextSession = this.sortedSessions[0]
        this.activeSessionId = nextSession.id
        this.displayMessages = cloneMessages(nextSession.displayMessages)
        this.apiMessages = cloneMessages(nextSession.apiMessages)
        this.error = ''
        this.pendingRetry = null
        this.pendingEdit = null
        this.compactNotice = ''
        this.currentAssistantMessage = null
      }

      this.persistSessions()
    },
    formatSessionTime (timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const today = new Date()
      const sameDay = date.toDateString() === today.toDateString()
      if (sameDay) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    newChat () {
      if (this.streaming) return

      if (!this.sessions.length) {
        this.sessions = [this.createSession(this.loadedDocumentSessionKey)]
      }

      if (!this.displayMessages.length && !this.apiMessages.length) {
        this.error = ''
        this.showSessions = false
        return
      }

      this.saveCurrentSession()
      const session = this.createSession()
      this.sessions.unshift(session)
      this.activeSessionId = session.id
      this.displayMessages = []
      this.apiMessages = []
      this.error = ''
      this.currentAssistantMessage = null
      this.pendingRetry = null
      this.pendingEdit = null
      this.compactNotice = ''
      this.showSessions = false
      this.clearMarkdownCache()
      this.persistSessions()
    },
    handleDocumentContextChange (nextDocumentKey) {
      if (nextDocumentKey === this.loadedDocumentSessionKey) return
      if (this.compacting || this.streaming) {
        this.stop()
      }
      this.saveCurrentSession({ touch: true })
      this.loadSessions(nextDocumentKey)
      this.$nextTick(() => {
        this.scrollToBottom(true)
        this.renderMermaidBlocks()
      })
    },
    stop () {
      if (this.pendingEdit) {
        const edit = this.pendingEdit
        this.pendingEdit = null
        edit.reject()
      }
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
      this.streaming = false
    },
    retryLastSend () {
      if (this.streaming || !this.pendingRetry) return
      const { text, apiText } = this.pendingRetry
      this.pendingRetry = null
      this.error = ''
      this.runSend(text, apiText)
    },
    focusInput () {
      const el = this.$refs.input
      if (el) el.focus()
    },
    scrollToBottom (force = false) {
      const list = this.$refs.messageList
      if (!list) return
      if (!force) {
        const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
        if (distanceFromBottom > 80) return
      }
      list.scrollTop = list.scrollHeight
    },
    toolLabel (name) {
      const key = `ai.tools.${name}`
      const translated = this.$t(key)
      return translated === key ? name : translated
    },
    renderMarkdown (text) {
      if (!text) return ''
      const cache = this.markdownCache
      const cached = cache.get(text)
      if (cached !== undefined) return cached
      const raw = marked(text, { gfm: true, breaks: true })
      const safe = DOMPurify.sanitize(raw)
      const wrapper = document.createElement('div')
      wrapper.innerHTML = safe
      wrapper.querySelectorAll('pre > code').forEach(code => {
        const langMatch = code.className.match(/language-([\w-]+)/)
        const lang = langMatch ? langMatch[1] : ''
        if (lang && Prism.languages[lang]) {
          try {
            code.innerHTML = Prism.highlight(code.textContent, Prism.languages[lang], lang)
          } catch (err) { /* ignore */ }
        }
        const pre = code.parentElement
        if (!pre || pre.parentElement && pre.parentElement.classList.contains('claude-code-block-wrap')) return
        pre.classList.add('claude-code-block')
        const wrap = document.createElement('div')
        wrap.className = 'claude-code-block-wrap'
        pre.parentElement.insertBefore(wrap, pre)
        wrap.appendChild(pre)
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'claude-code-copy'
        button.textContent = this.$i18n.locale === 'zh-CN' ? '复制' : 'Copy'
        wrap.appendChild(button)
      })
      const html = wrapper.innerHTML
      if (cache.size >= 256) cache.delete(cache.keys().next().value)
      cache.set(text, html)
      return html
    },
    clearMarkdownCache () {
      this.markdownCache.clear()
    },
    rerenderMermaidBlocks () {
      const container = this.$refs.messageList
      if (!container) return
      container.querySelectorAll('.mermaid-preview').forEach(el => el.remove())
      container.querySelectorAll('.mermaid-error').forEach(el => el.remove())
      container.querySelectorAll('pre[data-mermaid-rendered]').forEach(pre => {
        pre.classList.remove('mermaid-source-collapsed')
        delete pre.dataset.mermaidRendered
      })
      this._mermaidInitialized = false
      this.$nextTick(() => this.renderMermaidBlocks())
    },
    async renderMermaidBlocks () {
      const container = this.$refs.messageList
      if (!container) return
      const codeBlocks = container.querySelectorAll('pre > code.language-mermaid')
      if (!codeBlocks.length) return
      const mermaidTheme = this.isDarkTheme ? 'dark' : 'default'
      let mermaid
      try {
        mermaid = await loadRenderer('mermaid')
        if (!this._mermaidInitialized || this._mermaidTheme !== mermaidTheme) {
          mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: mermaidTheme })
          this._mermaidInitialized = true
          this._mermaidTheme = mermaidTheme
        }
      } catch (err) { return }
      for (const code of codeBlocks) {
        const pre = code.parentElement
        if (!pre || pre.dataset.mermaidRendered) continue
        const source = code.textContent || ''
        if (!source.trim()) continue
        pre.dataset.mermaidRendered = '1'
        try {
          const id = `mmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const { svg } = await mermaid.render(id, source.trim())
          const wrapper = document.createElement('div')
          wrapper.className = 'mermaid-preview'
          wrapper.innerHTML = svg
          const toggle = document.createElement('button')
          toggle.type = 'button'
          toggle.className = 'mermaid-toggle'
          toggle.textContent = this.$i18n.locale === 'zh-CN' ? '源码' : 'Source'
          toggle.addEventListener('click', () => {
            pre.classList.toggle('mermaid-source-collapsed')
            toggle.textContent = pre.classList.contains('mermaid-source-collapsed')
              ? (this.$i18n.locale === 'zh-CN' ? '源码' : 'Source')
              : (this.$i18n.locale === 'zh-CN' ? '隐藏源码' : 'Hide source')
          })
          wrapper.appendChild(toggle)
          pre.parentElement.insertBefore(wrapper, pre.nextSibling)
          pre.classList.add('mermaid-source-collapsed')
        } catch (err) {
          const errEl = document.createElement('div')
          errEl.className = 'mermaid-error'
          errEl.textContent = `${this.$t('ai.header.exportMarkdown')}: ${err.message || err}`
          pre.parentElement.insertBefore(errEl, pre.nextSibling)
        }
      }
    },
    handleSelectionReference (reference) {
      if (!reference) {
        this.clearReference()
        return
      }
      if (this.currentFile && reference.fileId && reference.fileId !== this.currentFile.id) {
        return
      }

      const text = String(reference.text || '').trim()
      if (!text) return

      this.reference = {
        fileId: reference.fileId || (this.currentFile && this.currentFile.id),
        filename: reference.filename || this.contextLabel,
        text
      }
      this.skipNextAutoFocus = true
    },
    clearReference () {
      this.reference = null
    },
    openSessionsFromMenu () {
      this.showHeaderMenu = false
      this.showSettings = false
      this.showSessions = !this.showSessions
    },
    openSettingsFromMenu () {
      this.showHeaderMenu = false
      this.showSessions = false
      this.showSettings = !this.showSettings
    },
    async exportChatMarkdown () {
      if (!this.displayMessages.length) return
      const lines = []
      lines.push(`# ${this.panelTitle || this.$t('ai.header.newChat')}`)
      if (this.contextLabel) {
        lines.push(`\n- ${this.$t('ai.export.document')}: ${this.contextLabel}`)
      }
      lines.push(`- ${this.$t('ai.export.exportedAt')}: ${new Date().toLocaleString()}`)
      lines.push('')

      for (const message of this.displayMessages) {
        const heading = message.role === 'user'
          ? this.$t('ai.messages.you')
          : message.role === 'assistant'
            ? this.$t('ai.messages.assistant')
            : this.$t('ai.messages.compacted')
        lines.push(`## ${heading}`)
        for (const block of message.blocks || []) {
          if (block.type === 'text') {
            lines.push(block.text || '')
          } else if (block.type === 'tool') {
            lines.push(`> ${this.$t('ai.export.tool')}: ${this.toolLabel(block.name)} (${block.status})`)
          }
        }
        lines.push('')
      }

      const fileName = `${(this.panelTitle || this.$t('ai.header.newChat')).replace(/[\\/:*?"<>|]+/g, '_')}.md`
      try {
        const result = await ipcRenderer.invoke('mt::save-ai-chat-markdown', {
          content: lines.join('\n').trim() + '\n',
          defaultFilename: fileName
        })
        if (result && result.filePath) {
          this.compactNotice = this.$t('ai.export.saved', { path: result.filePath })
        }
      } catch (err) {
        this.error = this.$t('ai.export.failed', { message: err.message || err })
      }
    },
    handleSidebarKeydown (event) {
      const isMeta = event.metaKey || event.ctrlKey
      if (isMeta && event.key === 'z' && !event.shiftKey && this.editUndoStack.length && !this.streaming) {
        event.preventDefault()
        this.undoLastEdit()
      }
    },
    handleSidebarMouseDown (event) {
      const target = event.target
      if (this.showModeMenu) {
        const insideMenu = target && target.closest && (target.closest('.mode-menu') || target.closest('.mode-trigger'))
        if (!insideMenu) {
          this.showModeMenu = false
        }
      }
      if (this.showHeaderMenu) {
        const insideHeaderMenu = target && target.closest && (target.closest('.header-menu') || target.closest('.chat-actions'))
        if (!insideHeaderMenu) {
          this.showHeaderMenu = false
        }
      }
      if (this.mentionSuggestions.length || this.slashSuggestions.length) {
        const insideMention = target && target.closest && target.closest('.mention-menu')
        if (!insideMention) {
          this.mentionTrigger = null
          this.mentionSuggestions = []
          this.slashTrigger = null
          this.slashSuggestions = []
        }
      }
      const insideSelectableContent = target && target.closest && (
        target.closest('.block-text') ||
        target.closest('.error') ||
        target.closest('.aborted')
      )
      if (insideSelectableContent) {
        return
      }
      const tagName = target && target.tagName ? target.tagName.toUpperCase() : ''
      const allowFocus = tagName === 'TEXTAREA' || tagName === 'INPUT' || tagName === 'SELECT' || target.isContentEditable
      if (!allowFocus) {
        bus.$emit('claude-preserve-selection')
        event.preventDefault()
      }
    },
    buildPromptWithReference (text, options = {}) {
      const includeReference = options.includeReference !== false
      const questionLabel = options.questionLabel || 'Question'
      const lines = []

      if (this.currentEditMode.id === 'plan') {
        lines.push('Mode: Plan mode.')
        lines.push('Do not modify the document yet. First inspect the current document and reply with a concise plan or recommendation.')
        lines.push('Do not call apply_edit, replace_text, or insert_text unless the user explicitly asks for edits after the plan.')
        lines.push('')
      }

      if (includeReference && this.referenceText) {
        lines.push('Use this selected Markdown reference from the current document when answering.')
        if (this.referenceLabel) {
          lines.push(`File: ${this.referenceLabel}`)
        }
        lines.push('<selected_reference>')
        lines.push(this.referenceText)
        lines.push('</selected_reference>')
        lines.push('')
      }

      lines.push(`${questionLabel}: ${text}`)
      return lines.filter(line => line !== '').join('\n')
    },
    async sendPreparedPrompt (text, options = {}) {
      if (this.streaming || this.compacting || this.pendingEdit) return
      const provider = this.providerResolved
      const apiKey = resolveApiKey(this.storedApiKey, provider)
      if (provider === PROVIDERS.ANTHROPIC && !apiKey) {
        this.showSettings = true
        return
      }
      this.input = ''

      let apiText = this.buildPromptWithReference(text, options)

      if (this.attachedContexts.length) {
        const contextText = this.buildContextText()
        if (contextText) {
          apiText = `${contextText}\n\n${apiText}`
        }
        this.attachedContexts = []
      }

      let apiContent = apiText
      if (this.attachedImages.length) {
        const blocks = this.attachedImages.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data }
        }))
        blocks.push({ type: 'text', text: apiText })
        apiContent = blocks
        this.attachedImages = []
      }

      await this.runSend(text, apiContent)
    },
    runTemplatePrompt (template) {
      const prompt = `${template.prompt}\n\nCall get_document to read the current Markdown document before answering.`
      this.sendPreparedPrompt(prompt, {
        includeReference: false,
        questionLabel: 'Task'
      })
    },
    pushUndoSnapshot (label) {
      if (!this.currentFile || typeof this.currentFile.markdown !== 'string') return
      this.editUndoStack.push({
        fileId: this.currentFile.id,
        markdown: this.currentFile.markdown,
        label: label || 'Claude edit',
        timestamp: Date.now()
      })
      if (this.editUndoStack.length > MAX_UNDO_STACK) {
        this.editUndoStack.splice(0, this.editUndoStack.length - MAX_UNDO_STACK)
      }
    },
    undoLastEdit () {
      if (!this.editUndoStack.length) return
      const snapshot = this.editUndoStack.pop()
      if (!this.currentFile || this.currentFile.id !== snapshot.fileId) return
      this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', {
        id: snapshot.fileId,
        markdown: snapshot.markdown,
        wordCount: getWordCount(snapshot.markdown)
      })
      bus.$emit('claude-apply-edit', {
        id: snapshot.fileId,
        markdown: snapshot.markdown
      })
    },
    applyMarkdownUpdate (newMarkdown) {
      this.pushUndoSnapshot()
      this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', {
        id: this.currentFile.id,
        markdown: newMarkdown,
        wordCount: getWordCount(newMarkdown)
      })
      bus.$emit('claude-apply-edit', {
        id: this.currentFile.id,
        markdown: newMarkdown
      })
    },
    executeTool (name, input) {
      if (name === 'get_document') {
        if (!this.currentFile || typeof this.currentFile.markdown !== 'string') {
          return 'No document is currently open in the editor.'
        }
        const filename = this.currentFile.filename || 'untitled.md'
        const markdown = this.currentFile.markdown
        const key = documentSnapshotKey(markdown)
        if (this._documentTurnCacheKey === key) {
          return `(Document "${filename}" is unchanged since the previous get_document call in this turn. Use the prior content.)`
        }
        this._documentTurnCacheKey = key
        return `# ${filename}\n\n${markdown}`
      }
      if (EDIT_TOOL_NAMES.has(name)) {
        if (this.currentEditMode.id === 'plan') {
          return 'Plan mode is enabled. Do not edit the document yet. Present a plan first.'
        }
        if (this.currentEditMode.id === 'auto') {
          return this.applyEditImmediately(name, input)
        }
        return this.requestEditApproval(name, input)
      }
      if (name === 'read_file') {
        const target = String(input.path || '')
        if (!path.isAbsolute(target)) {
          throw new Error('path must be absolute')
        }
        this.assertPathAllowed(target)
        const stat = fs.statSync(target)
        if (stat.size > MAX_READ_FILE_BYTES) {
          const fd = fs.openSync(target, 'r')
          try {
            const buf = Buffer.alloc(MAX_READ_FILE_BYTES)
            fs.readSync(fd, buf, 0, MAX_READ_FILE_BYTES, 0)
            return `${buf.toString('utf8')}\n\n[Truncated: file is ${stat.size} bytes; only the first ${MAX_READ_FILE_BYTES} bytes were returned.]`
          } finally {
            fs.closeSync(fd)
          }
        }
        return fs.readFileSync(target, 'utf8')
      }
      if (name === 'list_directory') {
        const target = String(input.path || '')
        if (!path.isAbsolute(target)) {
          throw new Error('path must be absolute')
        }
        this.assertPathAllowed(target)
        const entries = fs.readdirSync(target)
        if (entries.length > MAX_LIST_DIR_ENTRIES) {
          return `${entries.slice(0, MAX_LIST_DIR_ENTRIES).join('\n')}\n\n[Truncated: directory has ${entries.length} entries; showing the first ${MAX_LIST_DIR_ENTRIES}.]`
        }
        return entries.join('\n')
      }
      throw new Error(`Unknown tool: ${name}`)
    },
    buildEditProposal (name, input) {
      if (!this.currentFile || !this.currentFile.id || typeof this.currentFile.markdown !== 'string') {
        throw new Error('No document is currently open.')
      }
      const markdown = this.currentFile.markdown

      if (name === 'apply_edit') {
        if (!input || typeof input.content !== 'string') {
          throw new Error('apply_edit requires a content string.')
        }
        return {
          newMarkdown: String(input.content),
          diffOldText: markdown,
          diffNewText: String(input.content),
          summary: 'Replace the entire document.',
          successResult: 'Document updated.'
        }
      }
      if (name === 'replace_text') {
        if (!input || typeof input.old_text !== 'string' || typeof input.new_text !== 'string') {
          throw new Error('replace_text requires old_text and new_text strings.')
        }
        const oldText = input.old_text
        if (!oldText) throw new Error('replace_text old_text cannot be empty.')
        if (!markdown.includes(oldText)) {
          throw new Error('replace_text old_text was not found in the current document.')
        }
        const firstMatchIndex = markdown.indexOf(oldText)
        let count = 0
        const newMarkdown = input.replace_all
          ? markdown.split(oldText).map((part, index) => {
            if (index > 0) count++
            return part
          }).join(input.new_text)
          : markdown.replace(oldText, () => {
            count = 1
            return input.new_text
          })
        const preview = buildContextualPreview(markdown, firstMatchIndex, firstMatchIndex + oldText.length, input.new_text)
        return {
          newMarkdown,
          diffOldText: count > 1 ? oldText : preview.oldText,
          diffNewText: count > 1 ? input.new_text : preview.newText,
          summary: count > 1
            ? `Replace ${count} occurrences. Preview shows one representative match.`
            : `Replace ${count} occurrence.`,
          successResult: `Document updated. Replaced ${count} occurrence${count === 1 ? '' : 's'}.`
        }
      }
      if (name === 'insert_text') {
        if (!input || typeof input.content !== 'string') {
          throw new Error('insert_text requires a content string.')
        }
        const position = input.position || 'end'
        let insertAt
        if (position === 'start') insertAt = 0
        else if (position === 'end') insertAt = markdown.length
        else if (position === 'before' || position === 'after') {
          if (typeof input.anchor !== 'string' || !input.anchor) {
            throw new Error('insert_text requires an anchor string for before or after insertion.')
          }
          const index = markdown.indexOf(input.anchor)
          if (index === -1) {
            throw new Error('insert_text anchor was not found in the current document.')
          }
          insertAt = position === 'before' ? index : index + input.anchor.length
        } else {
          throw new Error('insert_text position must be start, end, before, or after.')
        }
        const newMarkdown = `${markdown.slice(0, insertAt)}${input.content}${markdown.slice(insertAt)}`
        const preview = buildContextualPreview(markdown, insertAt, insertAt, input.content)
        return {
          newMarkdown,
          diffOldText: preview.oldText,
          diffNewText: preview.newText,
          summary: `Insert ${input.content.length} chars at position ${position}.`,
          successResult: 'Document updated. Inserted text.'
        }
      }
      throw new Error(`Unknown edit tool: ${name}`)
    },
    requestEditApproval (name, input) {
      const proposal = this.buildEditProposal(name, input)
      const oldMarkdown = this.currentFile.markdown
      const diff = compactDiffLines(computeLineDiff(
        proposal.diffOldText !== undefined ? proposal.diffOldText : oldMarkdown,
        proposal.diffNewText !== undefined ? proposal.diffNewText : proposal.newMarkdown
      ))
      return new Promise((resolve) => {
        this.pendingEdit = {
          name,
          input,
          summary: proposal.summary,
          oldMarkdown,
          newMarkdown: proposal.newMarkdown,
          diff,
          stats: summarizeDiff(diff),
          accept: () => {
            try {
              this.applyMarkdownUpdate(proposal.newMarkdown)
              this._documentTurnCacheKey = documentSnapshotKey(proposal.newMarkdown)
              this.pendingEdit = null
              resolve(proposal.successResult)
            } catch (err) {
              this.pendingEdit = null
              resolve(`Error applying edit: ${err.message || err}`)
            }
          },
          reject: () => {
            this.pendingEdit = null
            resolve('User rejected the proposed edit. Do not retry the same change unless asked.')
          }
        }
      })
    },
    applyEditImmediately (name, input) {
      const proposal = this.buildEditProposal(name, input)
      this.applyMarkdownUpdate(proposal.newMarkdown)
      this._documentTurnCacheKey = documentSnapshotKey(proposal.newMarkdown)
      return proposal.successResult
    },
    acceptPendingEdit () {
      if (this.pendingEdit) this.pendingEdit.accept()
    },
    rejectPendingEdit () {
      if (this.pendingEdit) this.pendingEdit.reject()
    },
    getAllowedRoots () {
      const roots = []
      if (this.projectTree && this.projectTree.pathname) {
        roots.push(this.projectTree.pathname)
      }
      if (this.currentFile && this.currentFile.pathname) {
        roots.push(path.dirname(this.currentFile.pathname))
      }
      return roots
    },
    assertPathAllowed (target) {
      const allowedRoots = this.getAllowedRoots()
      if (!allowedRoots.length) {
        throw new Error('No project or saved document directory is available for file access.')
      }

      const realTarget = fs.realpathSync(target)
      const isAllowed = allowedRoots.some(root => {
        try {
          const realRoot = fs.realpathSync(root)
          const relativePath = path.relative(realRoot, realTarget)
          return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
        } catch (err) {
          return false
        }
      })

      if (!isAllowed) {
        throw new Error('Path is outside the current project or document directory.')
      }
    },
    appendUserMessage (text, apiText = text) {
      this.displayMessages.push({
        id: nextId(),
        role: 'user',
        blocks: [{ type: 'text', text }]
      })
      this.apiMessages.push({ role: 'user', content: apiText })
      this.saveCurrentSession({ touch: true })
    },
    startAssistantMessage () {
      const message = {
        id: nextId(),
        role: 'assistant',
        blocks: []
      }
      this.displayMessages.push(message)
      this.currentAssistantMessage = message
      this.streamingBlockRef = null
      this.streamingHtml = ''
      return message
    },
    appendAssistantText (delta) {
      const msg = this.currentAssistantMessage
      if (!msg) return
      const last = msg.blocks[msg.blocks.length - 1]
      if (last && last.type === 'text') {
        last.text += delta
      } else {
        const block = { type: 'text', text: delta }
        msg.blocks.push(block)
      }
      const activeBlock = msg.blocks[msg.blocks.length - 1]
      if (this.streamingBlockRef !== activeBlock) {
        this.streamingBlockRef = activeBlock
      }
      this.scheduleStreamRender(activeBlock)
    },
    scheduleStreamRender (block) {
      if (this._streamRenderPending) return
      this._streamRenderPending = true
      const tick = () => {
        this._streamRenderPending = false
        if (block && block.text) {
          this.streamingHtml = this.renderMarkdown(block.text)
        }
      }
      if (!this._lastStreamRender || Date.now() - this._lastStreamRender > 120) {
        this._lastStreamRender = Date.now()
        this.$nextTick(tick)
      } else {
        setTimeout(() => {
          this._lastStreamRender = Date.now()
          tick()
        }, 120)
      }
    },
    finalizeStreamRender () {
      if (this.streamingBlockRef && this.streamingBlockRef.text) {
        this.streamingHtml = this.renderMarkdown(this.streamingBlockRef.text)
      }
      this.streamingBlockRef = null
      this.$nextTick(() => this.renderMermaidBlocks())
    },
    appendAssistantTool (name, status) {
      const msg = this.currentAssistantMessage
      if (!msg) return null
      this.finalizeStreamRender()
      const block = { type: 'tool', name, status }
      msg.blocks.push(block)
      return block
    },
    normalizeApiMessages (messages) {
      const cleanMessages = sanitizeMessages(messages)
      const normalized = []
      for (let index = 0; index < cleanMessages.length; index++) {
        const message = cleanMessages[index]
        if (message.role === 'assistant' && Array.isArray(message.content)) {
          const toolIds = message.content
            .filter(block => block && block.type === 'tool_use')
            .map(block => block.id)

          if (toolIds.length) {
            const nextMessage = cleanMessages[index + 1]
            const resultIds = nextMessage && nextMessage.role === 'user' && Array.isArray(nextMessage.content)
              ? nextMessage.content
                .filter(block => block && block.type === 'tool_result')
                .map(block => block.tool_use_id)
              : []
            const hasAllResults = toolIds.every(id => resultIds.includes(id))
            if (!hasAllResults) break
          }
        }
        normalized.push(message)
      }
      while (normalized.length) {
        const last = normalized[normalized.length - 1]
        if (last.role !== 'user') break
        const isToolResult = Array.isArray(last.content) &&
          last.content.length > 0 &&
          last.content.every(block => block && block.type === 'tool_result')
        if (isToolResult) break
        normalized.pop()
      }
      return normalized
    },
    async send () {
      if (this.slashSuggestions.length) {
        this.selectSlashCommand(this.slashSuggestions[0])
        return
      }
      const text = this.input.trim()
      if ((!text && !this.attachedImages.length) || this.streaming) return
      if (text) {
        this.inputHistory.push(text)
        if (this.inputHistory.length > 50) this.inputHistory.splice(0, this.inputHistory.length - 50)
      }
      this.inputHistoryIndex = -1
      this.inputHistoryDraft = ''
      this.slashTrigger = null
      this.slashSuggestions = []
      await this.sendPreparedPrompt(text || 'Describe this image.')
    },
    handleHistoryUp (event) {
      const textarea = this.$refs.input
      if (!textarea) return
      if (textarea.selectionStart !== 0 || textarea.selectionEnd !== 0) return
      if (!this.inputHistory.length) return
      event.preventDefault()
      if (this.inputHistoryIndex === -1) {
        this.inputHistoryDraft = this.input
        this.inputHistoryIndex = this.inputHistory.length - 1
      } else if (this.inputHistoryIndex > 0) {
        this.inputHistoryIndex--
      }
      this.input = this.inputHistory[this.inputHistoryIndex]
    },
    handleHistoryDown (event) {
      if (this.inputHistoryIndex === -1) return
      event.preventDefault()
      if (this.inputHistoryIndex < this.inputHistory.length - 1) {
        this.inputHistoryIndex++
        this.input = this.inputHistory[this.inputHistoryIndex]
      } else {
        this.inputHistoryIndex = -1
        this.input = this.inputHistoryDraft
      }
    },
    async runSend (text, apiText) {
      this.error = ''
      this.compactNotice = ''
      this.pendingRetry = null
      this.apiMessages = this.normalizeApiMessages(this.apiMessages)
      this.appendUserMessage(text, apiText)
      const userMessageIndex = this.apiMessages.length - 1
      const assistantDisplayMessage = this.startAssistantMessage()
      this.streaming = true
      this._documentTurnCacheKey = null
      this.$nextTick(() => this.scrollToBottom(true))

      const provider = this.providerResolved
      const apiKey = resolveApiKey(this.storedApiKey, provider)
      this.abortController = new AbortController()
      const runningTools = new Map()
      let completedSuccessfully = false

      try {
        const stream = streamChat({
          provider,
          apiKey,
          baseUrl: this.resolvedBaseUrl,
          model: this.resolvedModel,
          messages: this.apiMessages.slice(),
          executeTool: (name, input) => this.executeTool(name, input),
          signal: this.abortController.signal,
          persona: this.storedPersona
        })

        for await (const event of stream) {
          if (event.type === 'text') {
            this.appendAssistantText(event.text)
          } else if (event.type === 'tool_start') {
            const block = this.appendAssistantTool(event.name, 'running')
            if (block) runningTools.set(event.id, block)
          } else if (event.type === 'tool_end') {
            const block = runningTools.get(event.id)
            if (block) {
              block.status = event.isError ? 'error' : 'done'
              runningTools.delete(event.id)
            }
          } else if (event.type === 'done') {
            this.apiMessages = event.messages
            completedSuccessfully = true
            this.saveCurrentSession({ touch: true })
          }
          this.$nextTick(this.scrollToBottom)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.error = err.message || String(err)
        }
      } finally {
        runningTools.forEach(block => { block.status = 'error' })
        if (this.pendingEdit) {
          const edit = this.pendingEdit
          this.pendingEdit = null
          try { edit.reject() } catch (err) { /* ignore */ }
        }
        if (!completedSuccessfully) {
          if (this.apiMessages[userMessageIndex] &&
              this.apiMessages[userMessageIndex].role === 'user') {
            this.apiMessages.splice(userMessageIndex)
          }
          if (assistantDisplayMessage && assistantDisplayMessage.blocks.length === 0) {
            const idx = this.displayMessages.indexOf(assistantDisplayMessage)
            if (idx !== -1) this.displayMessages.splice(idx, 1)
          }
          this.pendingRetry = { text, apiText }
        }
        this.saveCurrentSession({ touch: true })
        this.streaming = false
        this.abortController = null
        this.finalizeStreamRender()
        this.currentAssistantMessage = null
        if (completedSuccessfully && this.activeSession && this.activeSession.title === 'New chat') {
          this.autoNameSession()
        }
      }
    },
    async compactConversation () {
      if (this.streaming || this.compacting || this.apiMessages.length < 4) return
      const provider = this.providerResolved
      const apiKey = resolveApiKey(this.storedApiKey, provider)
      if (provider === PROVIDERS.ANTHROPIC && !apiKey) {
        this.showSettings = true
        return
      }
      this.compacting = true
      this.error = ''
      this.compactNotice = ''
      const beforeTokens = this.estimatedTokens

      const summaryRequest = [
        ...sanitizeMessages(this.apiMessages),
        {
          role: 'user',
          content: 'Summarize our entire conversation so far in 3-4 short paragraphs. Cover key facts, the user\'s goals, decisions, and the current state of the document. Do not call any tools. Plain text only.'
        }
      ]

      this.abortController = new AbortController()
      let summaryText = ''
      try {
        const stream = streamChat({
          provider,
          apiKey,
          baseUrl: this.resolvedBaseUrl,
          model: this.resolvedModel,
          messages: summaryRequest,
          executeTool: async () => 'Tools are disabled during conversation compaction.',
          signal: this.abortController.signal,
          persona: this.storedPersona
        })
        for await (const event of stream) {
          if (event.type === 'text') summaryText += event.text
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.error = `Compact failed: ${err.message || err}`
        }
      } finally {
        this.abortController = null
      }

      const trimmed = summaryText.trim()
      if (trimmed) {
        this.apiMessages = [
          { role: 'user', content: 'Summary of earlier conversation (continue from here):' },
          { role: 'assistant', content: trimmed }
        ]
        this.displayMessages.push({
          id: nextId(),
          role: 'system',
          blocks: [{
            type: 'text',
            text: 'Compacted earlier turns for context length. Full chat history remains visible above.'
          }]
        })
        this.clearMarkdownCache()
        this.saveCurrentSession({ touch: true })
        const afterTokens = estimateTokens(this.apiMessages)
        this.compactNotice = `Compacted earlier turns from about ${beforeTokens} tok to ${afterTokens} tok. Full history stays visible in the sidebar.`
      }
      this.compacting = false
      this.$nextTick(() => this.scrollToBottom(true))
    },
    async copyTextToClipboard (text) {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text)
          return true
        } catch (err) {
          // fall through to execCommand
        }
      }

      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'readonly')
      textarea.style.position = 'fixed'
      textarea.style.top = '-1000px'
      document.body.appendChild(textarea)
      textarea.select()
      let copied = false
      try {
        copied = document.execCommand('copy')
      } catch (err) {
        copied = false
      }
      document.body.removeChild(textarea)
      return copied
    },
    handleInputEvent () {
      const textarea = this.$refs.input
      if (!textarea) return
      const pos = textarea.selectionStart
      const text = this.input.slice(0, pos)

      const slashMatch = text.match(/^\/(\S*)$/)
      if (slashMatch) {
        const q = slashMatch[1].toLowerCase()
        this.slashSuggestions = this.promptTemplates
          .filter(t => !q || t.id.startsWith(q) || t.label.toLowerCase().startsWith(q))
          .slice(0, 6)
        this.slashTrigger = { startPos: 0, query: slashMatch[1] }
        this.mentionTrigger = null
        this.mentionSuggestions = []
        return
      }
      this.slashTrigger = null
      this.slashSuggestions = []

      const hashMatch = text.match(/#([^\s#]*)$/)
      if (hashMatch) {
        this.mentionTrigger = { type: 'file', startPos: pos - hashMatch[0].length, query: hashMatch[1] }
        this.updateFileSuggestions(hashMatch[1])
        return
      }
      const atMatch = text.match(/@([^\s@]*)$/)
      if (atMatch) {
        this.mentionTrigger = { type: 'heading', startPos: pos - atMatch[0].length, query: atMatch[1] }
        this.updateHeadingSuggestions(atMatch[1])
        return
      }
      this.mentionTrigger = null
      this.mentionSuggestions = []
    },
    updateFileSuggestions (query) {
      const roots = this.getAllowedRoots()
      if (!roots.length) { this.mentionSuggestions = []; return }
      try {
        const files = this.walkMdFiles(roots[0], 2)
        const q = query.toLowerCase()
        this.mentionSuggestions = files
          .filter(f => f.name.toLowerCase().includes(q))
          .slice(0, 8)
          .map(f => ({ label: f.name, fullPath: f.path, type: 'file' }))
      } catch (err) { this.mentionSuggestions = [] }
    },
    updateHeadingSuggestions (query) {
      if (!this.currentFile || typeof this.currentFile.markdown !== 'string') {
        this.mentionSuggestions = []
        return
      }
      const headings = this.currentFile.markdown.split('\n')
        .map(line => {
          const match = line.match(/^(#{1,6})\s+(.+)$/)
          return match ? { level: match[1].length, text: match[2].trim() } : null
        })
        .filter(Boolean)
      const q = query.toLowerCase()
      this.mentionSuggestions = headings
        .filter(h => h.text.toLowerCase().includes(q))
        .slice(0, 8)
        .map(h => ({ label: `${'#'.repeat(h.level)} ${h.text}`, text: h.text, level: h.level, type: 'heading' }))
    },
    selectMention (suggestion) {
      if (!this.mentionTrigger) return
      const textarea = this.$refs.input
      const cursorPos = textarea ? textarea.selectionStart : this.input.length
      const before = this.input.slice(0, this.mentionTrigger.startPos)
      const after = this.input.slice(cursorPos)
      this.input = `${before}${after}`
      this.attachedContexts.push(suggestion)
      this.mentionTrigger = null
      this.mentionSuggestions = []
      this.$nextTick(() => { if (this.$refs.input) this.$refs.input.focus() })
    },
    selectSlashCommand (template) {
      this.input = ''
      this.slashTrigger = null
      this.slashSuggestions = []
      this.$nextTick(() => this.runTemplatePrompt(template))
    },
    removeContext (index) {
      this.attachedContexts.splice(index, 1)
    },
    walkMdFiles (dir, maxDepth, depth = 0) {
      if (depth > maxDepth) return []
      const results = []
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
          const fullPath = path.join(dir, entry.name)
          if (entry.isFile() && /\.(md|markdown|txt)$/i.test(entry.name)) {
            results.push({ name: entry.name, path: fullPath })
          } else if (entry.isDirectory() && depth < maxDepth) {
            results.push(...this.walkMdFiles(fullPath, maxDepth, depth + 1))
          }
        }
      } catch (err) { /* ignore */ }
      return results
    },
    getHeadingSection (headingText) {
      if (!this.currentFile || typeof this.currentFile.markdown !== 'string') return ''
      const lines = this.currentFile.markdown.split('\n')
      let startIdx = -1
      let headingLevel = 0
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
        if (match && match[2].trim() === headingText) {
          startIdx = i
          headingLevel = match[1].length
          break
        }
      }
      if (startIdx === -1) return ''
      let endIdx = lines.length
      for (let i = startIdx + 1; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s/)
        if (match && match[1].length <= headingLevel) { endIdx = i; break }
      }
      return lines.slice(startIdx, endIdx).join('\n')
    },
    buildContextText () {
      const parts = []
      for (const ctx of this.attachedContexts) {
        if (ctx.type === 'file') {
          try {
            this.assertPathAllowed(ctx.fullPath)
            const content = fs.readFileSync(ctx.fullPath, 'utf8')
            parts.push(`<attached_file name="${ctx.label}">\n${content.slice(0, MAX_READ_FILE_BYTES)}\n</attached_file>`)
          } catch (err) {
            parts.push(`<attached_file name="${ctx.label}">\nError reading file: ${err.message}\n</attached_file>`)
          }
        } else if (ctx.type === 'heading') {
          const section = this.getHeadingSection(ctx.text)
          if (section) {
            parts.push(`<attached_section heading="${ctx.text}">\n${section}\n</attached_section>`)
          }
        }
      }
      return parts.join('\n\n')
    },
    handlePaste (event) {
      const items = event.clipboardData && event.clipboardData.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          event.preventDefault()
          event.stopPropagation()
          this.addImageFile(items[i].getAsFile())
          return
        }
      }
    },
    handleDrop (event) {
      event.preventDefault()
      const files = event.dataTransfer && event.dataTransfer.files
      if (!files) return
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          this.addImageFile(files[i])
        }
      }
    },
    addImageFile (file) {
      if (!file || this.attachedImages.length >= 4) return
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        if (!base64) return
        this.attachedImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name || 'image',
          mediaType: file.type || 'image/png',
          data: base64,
          previewUrl: reader.result
        })
      }
      reader.readAsDataURL(file)
    },
    removeImage (index) {
      this.attachedImages.splice(index, 1)
    },
    async autoNameSession () {
      const sessionId = this.activeSessionId
      try {
        const firstUser = this.displayMessages.find(m => m.role === 'user')
        const firstAssistant = this.displayMessages.find(m => m.role === 'assistant')
        if (!firstUser || !firstAssistant) return
        const userText = (firstUser.blocks || []).filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 200)
        const assistantText = (firstAssistant.blocks || []).filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 200)
        if (!userText.trim()) return
        const provider = this.providerResolved
        const apiKey = resolveApiKey(this.storedApiKey, provider)
        const messages = [
          { role: 'user', content: `Generate a short title (5-8 words max, no quotes, no trailing punctuation) for this conversation:\n\nUser: ${userText}\nAssistant: ${assistantText}` }
        ]
        let title = ''
        const stream = streamChat({
          provider,
          apiKey,
          baseUrl: this.resolvedBaseUrl,
          model: this.resolvedModel,
          messages,
          executeTool: async () => 'disabled',
          signal: null,
          persona: ''
        })
        for await (const event of stream) {
          if (event.type === 'text') title += event.text
        }
        title = title.trim().replace(/^["']+|["']+$/g, '').replace(/[.!?]+$/, '').trim()
        if (!title || title.length > MAX_SESSION_TITLE_LENGTH) return
        const session = this.sessions.find(s => s.id === sessionId)
        if (session && session.title === 'New chat') {
          session.title = title
          this.persistSessions()
        }
      } catch (err) { /* naming is cosmetic - swallow errors */ }
    },
    async handleMessageListClick (event) {
      const target = event.target
      if (target && target.classList && target.classList.contains('claude-code-copy')) {
        event.stopPropagation()
        const wrap = target.closest('.claude-code-block-wrap')
        const code = wrap && wrap.querySelector('pre code')
        if (!code) return
        const text = code.textContent || ''
        const copied = await this.copyTextToClipboard(text)
        const original = target.textContent
        target.textContent = copied ? (this.$t('common.save') === '保存' ? '已复制' : 'Copied') : (this.$t('common.save') === '保存' ? '复制失败' : 'Copy failed')
        target.disabled = copied
        target.classList.toggle('error', !copied)
        setTimeout(() => {
          if (target.isConnected) {
            target.textContent = original
            target.disabled = false
            target.classList.remove('error')
          }
        }, copied ? 1200 : 1600)
      }
    }
  }
}
</script>

<style scoped>
  .side-bar-claude-chat {
    --claude-bg: var(--sideBarBgColor);
    --claude-surface: var(--floatBgColor);
    --claude-surface-soft: var(--editorBgColor);
    --claude-border: var(--editorColor10);
    --claude-border-strong: var(--editorColor30);
    --claude-text: var(--editorColor);
    --claude-text-strong: var(--sideBarTitleColor);
    --claude-text-muted: var(--sideBarTextColor);
    --claude-tint: var(--editorColor04);
    --claude-tint-strong: var(--editorColor10);
    --claude-selection-line: var(--themeColor);
    --claude-success: #2c7a2c;
    --claude-success-bg: rgba(0, 180, 0, 0.12);
    --claude-success-border: rgba(0, 180, 0, 0.2);
    --claude-danger: #d9534f;
    --claude-danger-soft: rgba(217, 83, 79, 0.12);
    --claude-danger-strong: #b53b35;
    --claude-danger-border: rgba(217, 83, 79, 0.2);
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--sideBarColor);
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    isolation: isolate;
    background:
      linear-gradient(180deg, var(--claude-tint), transparent 120px),
      linear-gradient(180deg, var(--claude-bg), var(--claude-bg));
  }

  .chat-header {
    padding: 10px 12px;
    padding-top: calc(var(--titleBarHeight) + 8px);
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--themeColor10);
    flex-shrink: 0;
    background: var(--claude-tint);
    backdrop-filter: blur(6px);
    position: relative;
    z-index: 100;
    -webkit-app-region: no-drag;
  }

  .chat-actions,
  .chat-actions button,
  .header-menu,
  .header-menu button {
    -webkit-app-region: no-drag;
  }

  .chat-title {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 6px;
    overflow: hidden;
  }

  .title {
    color: var(--claude-text-strong);
    font-weight: 600;
    font-size: 13px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-doc-tag {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--claude-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 50%;
  }

  .chat-actions {
    flex-shrink: 0;
    display: flex;
    gap: 4px;
    align-items: center;
    position: relative;
    z-index: 101;
  }

  .model-switcher {
    height: 28px;
    max-width: 160px;
    border: 1px solid var(--claude-border);
    border-radius: 6px;
    background: var(--claude-surface);
    color: var(--claude-text);
    font-size: 12px;
    padding: 0 8px;
  }

  .header-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 140px;
    background: var(--claude-surface);
    border: 1px solid var(--claude-border);
    border-radius: 8px;
    box-shadow: 0 6px 20px var(--claude-tint-strong);
    z-index: 200;
    padding: 4px;
    display: flex;
    flex-direction: column;
  }

  .header-menu-item {
    display: flex !important;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 28px !important;
    padding: 0 8px !important;
    background: transparent !important;
    border: none !important;
    border-radius: 4px !important;
    color: var(--claude-text) !important;
    font-size: 12px !important;
    text-align: left;
    cursor: pointer;
  }

  .header-menu-item:hover {
    background: var(--claude-tint-strong) !important;
    color: var(--claude-text-strong) !important;
  }

  .header-menu-item:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .header-menu-icon {
    width: 14px;
    text-align: center;
    color: var(--claude-text-muted);
  }

  .chat-actions button,
  .settings-actions button,
  .chat-input button {
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    background: var(--floatBgColor);
    color: var(--sideBarColor);
    cursor: pointer;
    outline: none;
    font-size: 11px;
    height: 24px;
    padding: 0 9px;
  }

  .toolbar-btn {
    height: 26px !important;
    padding: 0 8px !important;
    border-radius: 6px !important;
    font-size: 14px !important;
  }

  .toolbar-btn.icon {
    width: 26px;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    color: var(--claude-text-muted) !important;
    line-height: 1;
  }

  .toolbar-btn.icon:hover {
    background: var(--claude-tint-strong) !important;
    color: var(--claude-text-strong) !important;
  }

  .toolbar-btn.primary.icon {
    color: var(--claude-text) !important;
  }

  .toolbar-btn.subtle.icon {
    opacity: .82;
  }

  .chat-actions button:hover,
  .settings-actions button:hover,
  .chat-input button:hover {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .chat-actions button:disabled,
  .chat-input button:disabled {
    opacity: .5;
    cursor: default;
  }

  .settings-panel {
    padding: 14px 14px 16px 18px;
    border-bottom: 1px solid var(--themeColor10);
    background: linear-gradient(180deg, var(--claude-tint), transparent 120px), var(--claude-surface);
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .settings-panel label {
    font-size: 11px;
    color: var(--sideBarTextColor);
  }

  .settings-panel input,
  .settings-panel select,
  .settings-panel textarea {
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    background: var(--editorBgColor);
    color: var(--editorColor);
    outline: none;
  }

  .settings-panel textarea {
    resize: vertical;
    min-height: 70px;
    font-family: inherit;
    line-height: 1.5;
  }

  .settings-panel input:focus,
  .settings-panel select:focus,
  .settings-panel textarea:focus {
    border-color: var(--themeColor);
  }

  .settings-hint {
    font-size: 11px;
    color: var(--sideBarTextColor);
  }

  .settings-hint code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    background: var(--editorColor10);
    padding: 0 4px;
    border-radius: 3px;
  }

  .settings-actions {
    display: flex;
    gap: 6px;
  }

  .settings-actions .ghost {
    background: transparent;
  }

  .sessions-panel {
    flex-shrink: 0;
    max-height: 220px;
    overflow-y: auto;
    padding: 12px 12px 12px 18px;
    border-bottom: 1px solid var(--themeColor10);
    background: var(--floatBgColor);
  }

  .sessions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    color: var(--sideBarTextColor);
    font-size: 11px;
    font-weight: 600;
  }

  .sessions-heading {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .sessions-subtitle {
    font-size: 10px;
    font-weight: 400;
    color: var(--sideBarTextColor);
    opacity: .85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sessions-header button,
  .session-main,
  .session-delete {
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    background: var(--sideBarBgColor);
    color: var(--sideBarColor);
    cursor: pointer;
    outline: none;
    font-size: 11px;
  }

  .sessions-header button {
    height: 22px;
    padding: 0 8px;
  }

  .sessions-header button:hover,
  .session-main:hover,
  .session-delete:hover {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .sessions-header button:disabled,
  .session-main:disabled,
  .session-delete:disabled {
    opacity: .5;
    cursor: default;
  }

  .empty-sessions {
    color: var(--sideBarTextColor);
    font-size: 12px;
    padding: 10px 2px;
  }

  .session-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
    margin-bottom: 6px;
  }

  .session-row.active .session-main {
    border-color: var(--themeColor);
    color: var(--themeColor);
    background: var(--claude-tint);
  }

  .session-main {
    min-width: 0;
    flex: 1;
    padding: 8px 10px;
    text-align: left;
  }

  .session-title,
  .session-meta {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-title {
    color: inherit;
    font-size: 12px;
  }

  .session-doc {
    display: inline-block;
    margin-top: 4px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--editorColor10);
    color: var(--sideBarTextColor);
    font-size: 10px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-meta {
    margin-top: 2px;
    color: var(--sideBarTextColor);
    font-size: 10px;
  }

  .session-delete {
    flex-shrink: 0;
    width: 38px;
    padding: 0;
    font-size: 16px !important;
    line-height: 1;
  }

  .template-btn {
    border: none !important;
    border-radius: 4px !important;
    background: transparent !important;
    color: var(--claude-text) !important;
    font-size: 11px !important;
    cursor: pointer;
    height: 22px !important;
    padding: 0 7px !important;
    line-height: 1;
  }

  .template-btn:hover:not(:disabled) {
    background: var(--claude-tint-strong) !important;
    color: var(--themeColor) !important;
  }

  .template-btn:disabled {
    opacity: .4;
    cursor: default;
  }

  .chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 14px 16px 22px;
    overflow-anchor: none;
    overscroll-behavior: contain;
    position: relative;
    z-index: 1;
  }

  .empty-hint {
    color: var(--sideBarTextColor);
    text-align: left;
    margin-top: 10px;
    padding: 14px 14px 16px;
    border: 1px dashed var(--editorColor10);
    border-radius: 10px;
    background: var(--claude-tint);
  }

  .empty-hint-title {
    color: var(--sideBarTitleColor);
    font-size: 13px;
    font-weight: 600;
  }

  .empty-hint-copy {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
  }

  .message {
    margin-bottom: 18px;
    position: relative;
  }

  .message-shell {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .message-avatar {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0;
    color: transparent;
    background: var(--claude-text-muted);
    border: none;
    margin-top: 8px;
  }

  .message.user .message-avatar {
    display: none;
  }

  .message-main {
    min-width: 0;
    flex: 1;
  }

  .message-role {
    font-size: 10px;
    font-weight: 600;
    color: var(--claude-text-muted);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: .06em;
  }

  .message.user .message-role {
    display: none;
  }

  .message-blocks {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    line-height: 1.65;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
  }

  .message.user .message-blocks {
    background: var(--claude-surface);
    border: 1px solid var(--claude-border);
    border-radius: 16px;
    padding: 16px 14px;
    box-shadow: 0 1px 2px var(--claude-tint);
  }

  .block-text {
    color: var(--editorColor);
    word-wrap: break-word;
    user-select: text;
  }

  .block-text >>> *:first-child {
    margin-top: 0;
  }

  .block-text >>> *:last-child {
    margin-bottom: 0;
  }

  .block-text >>> p {
    margin: 0 0 10px;
  }

  .block-text >>> ul,
  .block-text >>> ol {
    margin: 8px 0 12px;
    padding-left: 22px;
  }

  .block-text >>> li {
    margin: 3px 0;
  }

  .block-text >>> li > ul,
  .block-text >>> li > ol {
    margin-top: 6px;
    margin-bottom: 6px;
  }

  .block-text >>> code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12px;
    background: var(--claude-tint-strong);
    padding: 1px 5px;
    border-radius: 5px;
    border: 1px solid var(--claude-border);
  }

  .block-text >>> pre {
    background: var(--claude-surface-soft);
    border: 1px solid var(--claude-border);
    border-radius: 10px;
    padding: 12px 12px 13px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .block-text >>> pre code {
    background: transparent;
    border: none;
    padding: 0;
    font-size: 12px;
    line-height: 1.55;
  }

  .block-text >>> h1,
  .block-text >>> h2,
  .block-text >>> h3 {
    color: var(--sideBarTitleColor);
    line-height: 1.3;
    margin: 16px 0 8px;
  }

  .block-text >>> h1 {
    font-size: 18px;
    font-weight: 700;
  }

  .block-text >>> h2 {
    font-size: 16px;
    font-weight: 700;
  }

  .block-text >>> h3 {
    font-size: 14px;
    font-weight: 600;
  }

  .block-text >>> strong {
    font-weight: 700;
    color: var(--sideBarTitleColor);
  }

  .block-text >>> em {
    font-style: italic;
  }

  .block-text >>> a {
    color: var(--themeColor);
    text-decoration: none;
    border-bottom: 1px solid var(--claude-border);
  }

  .block-text >>> a:hover {
    border-bottom-color: var(--themeColor);
  }

  .block-text >>> blockquote {
    margin: 12px 0;
    padding: 2px 0 2px 12px;
    border-left: 3px solid var(--themeColor) !important;
    color: var(--sideBarTextColor);
  }

  .block-text >>> blockquote p {
    margin: 0;
  }

  .block-text >>> hr {
    height: 0;
    border: none !important;
    border-top: 1px dashed var(--themeColor) !important;
    background: transparent !important;
    opacity: .42;
    margin: 14px 0;
  }

  .block-text >>> table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 12px;
  }

  .block-text >>> th,
  .block-text >>> td {
    border: 1px solid var(--claude-border);
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }

  .block-text >>> th {
    background: var(--claude-tint);
    color: var(--sideBarTitleColor);
    font-weight: 600;
  }

  .block-tool {
    display: flex;
    align-self: flex-start;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    padding: 5px 10px;
    margin: 0;
    border-radius: 999px;
    font-size: 10px;
    letter-spacing: .02em;
    background: var(--claude-tint);
    border: 1px solid var(--claude-border);
    color: var(--sideBarTextColor);
    box-sizing: border-box;
  }

  .block-tool.error {
    color: var(--claude-danger);
  }

  .tool-icon {
    display: inline-flex;
    width: 14px;
    height: 14px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
  }

  .tool-name {
    display: inline-flex;
    align-items: center;
    line-height: 1.2;
  }

  .tool-spinner {
    display: block;
    width: 10px;
    height: 10px;
    box-sizing: border-box;
    border: 1.5px solid var(--editorColor10);
    border-top-color: var(--themeColor);
    border-radius: 50%;
    animation: claude-tool-spin 0.8s linear infinite;
    will-change: transform;
  }

  @keyframes claude-tool-spin {
    to { transform: rotate(360deg); }
  }

  .error,
  .aborted {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    border-left: 3px solid;
    font-size: 12px;
    word-wrap: break-word;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    justify-content: space-between;
    line-height: 1.5;
  }

  .error {
    background: var(--claude-danger-soft);
    border-left-color: var(--claude-danger);
    color: var(--claude-danger);
  }

  .aborted {
    background: var(--editorColor04);
    border-left-color: var(--claude-text-muted);
    color: var(--sideBarTextColor);
  }

  .system-card {
    background: var(--editorColor04);
    border-left: 3px solid var(--claude-text-muted);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    color: var(--claude-text-muted);
    line-height: 1.55;
  }

  .message.system .message-avatar {
    background: var(--claude-text-muted);
    opacity: .55;
  }

  .system-card-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--claude-text-muted);
    opacity: .85;
    margin-bottom: 3px;
    font-weight: 600;
  }

  .system-card .block-text {
    color: var(--claude-text-muted);
  }

  .undo-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    padding: 6px 0;
  }

  .undo-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--claude-border);
    border-radius: 6px;
    background: var(--claude-surface);
    color: var(--themeColor);
    cursor: pointer;
    font-size: 11px;
    padding: 4px 10px;
    transition: background .15s;
    &:hover { background: var(--claude-tint); }
  }

  .undo-icon {
    font-size: 13px;
  }

  .undo-hint {
    font-size: 10px;
    color: var(--claude-text-muted);
  }

  .retry-btn {
    flex-shrink: 0;
    border: 1px solid currentColor;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 11px;
    padding: 1px 8px;
    height: 20px;
  }

  .retry-btn:hover {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .edit-preview {
    flex-shrink: 0;
    margin: 0 16px 10px;
    border: 1px solid var(--claude-border);
    border-radius: 16px;
    background: var(--claude-surface);
    padding: 12px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 50vh;
    box-shadow: 0 6px 24px var(--claude-tint);
  }

  .edit-preview-topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .edit-preview-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    color: var(--sideBarTextColor);
  }

  .edit-preview-kicker {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--sideBarTextColor);
    opacity: .7;
  }

  .edit-summary {
    color: var(--themeColor);
  }

  .edit-diff-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .diff-badge {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 10px;
    border: 1px solid var(--editorColor10);
    background: var(--sideBarBgColor);
    color: var(--sideBarTextColor);
  }

  .diff-badge.add {
    color: var(--claude-success);
    border-color: var(--claude-success-border);
  }

  .diff-badge.remove {
    color: var(--claude-danger-strong);
    border-color: var(--claude-danger-border);
  }

  .edit-diff {
    overflow: auto;
    border: 1px solid var(--claude-border);
    border-radius: 12px;
    background: var(--claude-surface-soft);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 11px;
    line-height: 1.4;
    padding: 4px 0;
    max-height: 240px;
    overscroll-behavior: contain;
  }

  .diff-line {
    display: flex;
    padding: 0 8px;
    white-space: pre;
  }

  .diff-line.add { background: var(--claude-success-bg); color: var(--claude-success); }
  .diff-line.remove { background: var(--claude-danger-soft); color: var(--claude-danger-strong); }
  .diff-line.skip {
    background: var(--claude-tint);
    color: var(--sideBarTextColor);
    font-style: italic;
  }
  .diff-line.context { color: var(--editorColor); }

  .diff-marker {
    width: 12px;
    flex-shrink: 0;
    color: inherit;
    opacity: 0.7;
  }

  .diff-text {
    flex: 1;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .edit-preview-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .edit-preview-actions button {
    border: 1px solid var(--editorColor10);
    border-radius: 8px;
    background: var(--sideBarBgColor);
    color: var(--sideBarColor);
    cursor: pointer;
    font-size: 11px;
    height: 30px;
    padding: 0 14px;
  }

  .edit-preview-actions button.accept {
    border-color: var(--themeColor);
    color: var(--themeColor);
    background: var(--claude-tint);
  }

  .edit-preview-actions button.reject {
    color: var(--sideBarTextColor);
  }

  .edit-preview-actions button:hover {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .edit-preview-footnote {
    font-size: 11px;
    color: var(--sideBarTextColor);
    line-height: 1.45;
    background: var(--claude-tint);
    border-radius: 8px;
    padding: 7px 9px;
  }

  .block-text >>> .claude-code-block-wrap {
    position: relative;
    margin: 12px 0;
  }

  .block-text >>> .claude-code-block-wrap > pre {
    margin: 0;
  }

  .block-text >>> .claude-code-copy {
    position: absolute;
    top: 8px;
    right: 8px;
    border: 1px solid var(--claude-border);
    border-radius: 999px;
    background: var(--claude-surface);
    color: var(--sideBarTextColor);
    cursor: pointer;
    font-size: 10px;
    padding: 3px 8px;
    opacity: 0;
    transition: opacity .15s;
  }

  .block-text >>> .claude-code-block-wrap:hover .claude-code-copy {
    opacity: 1;
  }

  .block-text >>> .claude-code-copy:hover {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .block-text >>> .claude-code-copy.error {
    opacity: 1;
    color: var(--claude-danger);
    border-color: var(--claude-danger);
  }

  .block-text >>> .claude-code-copy[disabled] {
    opacity: 1;
    color: var(--themeColor);
    border-color: var(--themeColor);
  }

  .block-text >>> .token { color: inherit; }
  .block-text >>> .token.comment,
  .block-text >>> .token.prolog,
  .block-text >>> .token.doctype,
  .block-text >>> .token.cdata { color: #998; font-style: italic; }
  .block-text >>> .token.punctuation { color: #999; }
  .block-text >>> .token.property,
  .block-text >>> .token.tag,
  .block-text >>> .token.boolean,
  .block-text >>> .token.number,
  .block-text >>> .token.constant,
  .block-text >>> .token.symbol,
  .block-text >>> .token.deleted { color: #905; }
  .block-text >>> .token.selector,
  .block-text >>> .token.attr-name,
  .block-text >>> .token.string,
  .block-text >>> .token.char,
  .block-text >>> .token.builtin,
  .block-text >>> .token.inserted { color: #690; }
  .block-text >>> .token.operator,
  .block-text >>> .token.entity,
  .block-text >>> .token.url { color: #9a6e3a; }
  .block-text >>> .token.atrule,
  .block-text >>> .token.attr-value,
  .block-text >>> .token.keyword { color: #07a; }
  .block-text >>> .token.function,
  .block-text >>> .token.class-name { color: #DD4A68; }
  .block-text >>> .token.regex,
  .block-text >>> .token.important,
  .block-text >>> .token.variable { color: #e90; }

  .chat-input {
    flex-shrink: 0;
    margin: 0 12px 12px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    position: relative;
    z-index: 10;
  }

  .composer-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
    font-size: 11px;
    color: var(--claude-text-muted);
    min-height: 22px;
  }

  .composer-meta-spacer {
    flex: 1;
  }

  .selection-status {
    font-size: 11px;
    color: var(--claude-text-muted);
  }

  .token-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--claude-text-muted);
  }

  .token-meter {
    display: inline-flex;
    width: 96px;
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--claude-tint-strong);
    margin-left: 4px;
  }

  .token-meter > span {
    display: block;
    height: 100%;
    background: var(--themeColor);
    border-radius: inherit;
    transition: width .2s ease;
  }

  .token-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--claude-text-muted);
    opacity: .5;
  }

  .token-count.warn {
    color: #b07b1c;
  }

  .token-count.warn .token-dot {
    background: #e0a93a;
    opacity: 1;
  }

  .token-compact-link {
    background: transparent !important;
    border: none !important;
    color: var(--themeColor) !important;
    font-size: 11px !important;
    height: auto !important;
    padding: 0 !important;
    margin-left: 2px;
    cursor: pointer;
    font-weight: 500;
  }

  .token-compact-link:hover {
    text-decoration: underline;
  }

  .token-compact-link:disabled {
    opacity: .55;
    cursor: default;
  }

  .composer-input-wrap {
    position: relative;
    border: 1px solid var(--claude-border);
    border-radius: 12px;
    background: var(--claude-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    overflow: visible;
  }

  .composer-input-wrap:focus-within {
    border-color: var(--themeColor);
    box-shadow: 0 0 0 3px var(--claude-tint-strong);
  }

  .chat-input textarea {
    width: 100%;
    box-sizing: border-box;
    resize: none;
    min-height: 60px;
    max-height: 140px;
    padding: 10px 12px;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--claude-text);
    font-size: 13px;
    line-height: 1.45;
    font-family: inherit;
    outline: none;
    display: block;
  }

  .chat-input textarea:disabled {
    opacity: .55;
    cursor: default;
  }

  .composer-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px 8px;
    border-top: 1px solid var(--claude-border);
    background: var(--claude-tint);
    flex-wrap: wrap;
  }

  .composer-slash {
    font-size: 11px;
    color: var(--claude-text-muted);
    background: var(--claude-tint-strong);
    padding: 2px 7px;
    border-radius: 4px;
    user-select: none;
    margin-right: 2px;
    line-height: 1.4;
  }

  .composer-toolbar-spacer {
    flex: 1;
  }

  .send-btn {
    border: none !important;
    border-radius: 6px !important;
    height: 26px !important;
    padding: 0 12px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    cursor: pointer;
    display: inline-flex !important;
    align-items: center;
    gap: 4px;
  }

  .send-btn.primary {
    background: var(--themeColor) !important;
    color: #fff !important;
  }

  .send-btn.primary:hover:not(:disabled) {
    filter: brightness(1.06);
  }

  .send-btn.primary:disabled {
    background: var(--claude-tint-strong) !important;
    color: var(--claude-text-muted) !important;
    cursor: default;
  }

  .send-btn.stop {
    background: var(--claude-danger-soft) !important;
    color: var(--claude-danger) !important;
  }

  .send-key {
    opacity: .85;
    font-size: 11px;
  }

  .mode-trigger {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    height: 22px !important;
    padding: 0 8px !important;
    border-radius: 6px !important;
    border: 1px solid var(--claude-border) !important;
    background: var(--claude-surface) !important;
    color: var(--claude-text) !important;
    font-size: 11px !important;
  }

  .mode-trigger:hover:not(:disabled) {
    border-color: var(--themeColor) !important;
    color: var(--themeColor) !important;
  }

  .mode-trigger-icon {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12px;
  }

  .mode-trigger-label {
    white-space: nowrap;
  }

  .mode-menu {
    position: absolute;
    right: 12px;
    bottom: calc(100% + 12px);
    width: min(100%, 340px);
    border: 1px solid var(--claude-border);
    border-radius: 16px;
    background: var(--claude-surface);
    box-shadow: 0 18px 44px var(--claude-tint-strong);
    overflow: hidden;
    z-index: 20;
    backdrop-filter: blur(8px);
  }

  .mode-menu-header {
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--claude-border);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mode-menu-header span:first-child {
    font-size: 13px;
    font-weight: 600;
    color: var(--claude-text-strong);
  }

  .mode-menu-hint {
    font-size: 10px;
    color: var(--claude-text-muted);
  }

  .mode-option {
    width: 100%;
    border: none !important;
    border-radius: 0 !important;
    border-bottom: 1px solid var(--claude-border) !important;
    background: transparent !important;
    color: inherit !important;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    padding: 12px 14px !important;
    height: auto !important;
  }

  .mode-option:last-child {
    border-bottom: none !important;
  }

  .mode-option.active {
    background: var(--themeColor10) !important;
  }

  .mode-option-icon {
    width: 22px;
    flex-shrink: 0;
    text-align: center;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 14px;
    color: var(--claude-text);
  }

  .mode-option-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mode-option-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--claude-text-strong);
  }

  .mode-option-description {
    font-size: 11px;
    line-height: 1.35;
    color: var(--claude-text-muted);
  }

  .mode-option-check {
    flex-shrink: 0;
    font-size: 18px;
    color: var(--claude-text-strong);
  }

  .compact-btn {
    color: var(--themeColor);
  }

  .compact-notice {
    font-size: 11px;
    color: var(--sideBarTextColor);
    background: var(--claude-tint);
    border-radius: 8px;
    padding: 8px 10px;
    line-height: 1.45;
  }

  .stop {
    color: var(--claude-danger);
  }

  /* Attached images */
  .attached-images {
    display: flex;
    gap: 6px;
    padding: 6px 10px 0;
    flex-wrap: wrap;
  }
  .attached-image-thumb {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--claude-border);
  }
  .attached-image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .remove-attachment {
    position: absolute;
    top: 1px;
    right: 1px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: none;
    background: rgba(0,0,0,0.55);
    color: #fff;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  /* Attached contexts */
  .attached-contexts {
    display: flex;
    gap: 4px;
    padding: 6px 10px 0;
    flex-wrap: wrap;
  }
  .context-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--claude-tint-strong);
    font-size: 11px;
    color: var(--claude-text-muted);
    max-width: 180px;
    overflow: hidden;
    white-space: nowrap;
  }
  .context-chip-icon {
    font-weight: 700;
    color: var(--themeColor);
    flex-shrink: 0;
  }
  .context-chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .context-chip-remove {
    flex-shrink: 0;
    border: none;
    background: none;
    padding: 0;
    font-size: 12px;
    color: var(--claude-text-muted);
    cursor: pointer;
    line-height: 1;
  }
  .context-chip-remove:hover {
    color: var(--claude-danger);
  }

  /* Mention dropdown */
  .mention-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--claude-surface);
    border: 1px solid var(--claude-border);
    border-radius: 8px;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    margin-bottom: 4px;
  }
  .mention-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 12px;
    color: var(--claude-text);
    text-align: left;
  }
  .mention-item:hover {
    background: var(--claude-tint-strong);
  }
  .mention-icon {
    flex-shrink: 0;
    font-weight: 700;
    color: var(--themeColor);
    width: 16px;
    text-align: center;
  }
  .mention-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mermaid-preview {
    margin: 8px 0;
    padding: 12px;
    background: var(--claude-surface);
    border: 1px solid var(--claude-border);
    border-radius: 8px;
    overflow-x: auto;
    text-align: center;
  }

  .mermaid-preview >>> svg {
    max-width: 100%;
    height: auto;
  }

  .mermaid-toggle {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 8px;
    font-size: 10px;
    color: var(--claude-text-muted);
    background: transparent;
    border: 1px solid var(--claude-border);
    border-radius: 4px;
    cursor: pointer;
    &:hover { color: var(--themeColor); border-color: var(--themeColor); }
  }

  .mermaid-source-collapsed {
    display: none;
  }

  .mermaid-error {
    margin: 6px 0;
    padding: 8px 10px;
    font-size: 11px;
    color: var(--claude-danger);
    background: var(--claude-danger-soft);
    border-radius: 6px;
  }
</style>
