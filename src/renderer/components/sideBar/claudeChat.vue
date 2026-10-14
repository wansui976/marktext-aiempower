<template>
  <div class="side-bar-claude-chat" @keydown.stop="handleSidebarKeydown" @paste.stop @mousedown.capture="handleSidebarMouseDown">
    <div class="chat-header">
      <div class="chat-title">
        <span class="title">{{ panelTitle }}</span>
        <span v-if="contextLabel" class="title-doc-tag" :title="contextLabel">· {{ contextLabel }}</span>
      </div>
      <div class="chat-actions">
        <button type="button" class="toolbar-btn icon primary" :title="$t('ai.header.newChat')" :disabled="streaming" @click="newChat"><lucide-icon name="plus" :size="16"></lucide-icon></button>
        <button type="button" class="toolbar-btn icon" :title="$t('ai.header.more')" @click.stop="showHeaderMenu = !showHeaderMenu"><lucide-icon name="ellipsis" :size="16"></lucide-icon></button>
        <div v-if="showHeaderMenu" class="header-menu" @click.stop>
          <button type="button" class="header-menu-item" :disabled="streaming" @click="openSessionsFromMenu">
            <lucide-icon name="history" :size="14" class="header-menu-icon"></lucide-icon>
            <span>{{ $t('common.sessions') }}</span>
          </button>
          <button type="button" class="header-menu-item" @click="openSettingsFromMenu">
            <lucide-icon name="settings" :size="14" class="header-menu-icon"></lucide-icon>
            <span>{{ $t('common.settings') }}</span>
          </button>
          <button type="button" class="header-menu-item" :disabled="!displayMessages.length" @click="exportChatMarkdown">
            <lucide-icon name="download" :size="14" class="header-menu-icon"></lucide-icon>
            <span>{{ $t('ai.header.exportMarkdown') }}</span>
          </button>
        </div>
      </div>
    </div>

    <chat-settings
      v-if="settingsVisible"
      :provider-input="providerInput"
      :api-key-input="apiKeyInput"
      :base-url-input="baseUrlInput"
      :model-input="modelInput"
      :persona-input="personaInput"
      :context-limit-input="contextLimitInput"
      :has-stored-values="!!(storedProvider || storedApiKey || storedBaseUrl || storedModel)"
      @save="handleSettingsSave"
      @clear="clearApiKey"
    />

    <chat-session-list
      v-if="showSessions"
      :sessions="sortedSessions"
      :active-session-id="activeSessionId"
      :scope-label="sessionScopeLabel"
      :disabled="streaming"
      @select="selectSession"
      @delete="deleteSession"
      @new-chat="newChat"
    />

    <chat-message-list
      v-show="!settingsVisible"
      ref="messageList"
      :messages="displayMessages"
      :streaming="streaming"
      :streaming-block="streamingBlockRef"
      :streaming-html="streamingHtml"
      :error="error"
      :can-retry="!!(pendingRetry && !streaming)"
      :show-stopped="!!(!error && pendingRetry && !streaming)"
      :undo-count="activeUndoCount"
      :ready="apiKeyResolved"
      :suggestions="emptySuggestions"
      @suggest="runTemplatePrompt"
      @retry="retryLastSend"
      @undo="undoLastEdit"
      @click="handleMessageListClick"
    />

    <div v-if="pendingEdit && !settingsVisible" class="edit-preview">
      <div class="edit-preview-header">
        <lucide-icon name="file-pen-line" :size="15" class="edit-preview-icon"></lucide-icon>
        <div class="edit-preview-title">
          <span class="edit-preview-kicker">{{ $t('ai.editPreview.review') }}</span>
          <span class="edit-summary" :title="pendingEdit.summary">{{ pendingEdit.summary || toolLabel(pendingEdit.name) }}</span>
        </div>
        <span class="edit-diff-meta">
          <span class="diff-badge add">+{{ pendingEdit.stats.added }}</span>
          <span class="diff-badge remove">-{{ pendingEdit.stats.removed }}</span>
        </span>
      </div>
      <div class="edit-diff">
        <template v-for="(line, idx) in pendingEdit.diff">
          <div :key="idx" class="diff-line" :class="line.type">
            <span class="diff-marker">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'skip' ? '…' : ' ' }}</span><span class="diff-text">{{ line.text }}</span>
          </div>
        </template>
      </div>
      <div class="edit-preview-actions">
        <span v-if="pendingEdit.stats.skipped" class="edit-preview-note">{{ pendingEdit.stats.skipped }} {{ $t('ai.editPreview.folds') }}</span>
        <span class="edit-preview-spacer"></span>
        <button type="button" class="reject" @click="rejectPendingEdit">{{ $t('ai.editPreview.reject') }}</button>
        <button type="button" class="accept" @click="acceptPendingEdit">
          <lucide-icon name="check" :size="14"></lucide-icon>
          {{ $t('ai.editPreview.accept') }}
        </button>
      </div>
    </div>

    <form v-show="!settingsVisible" class="chat-input" @submit.prevent="send">
      <div v-if="referenceText || showCompactButton" class="composer-meta">
        <span v-if="referenceText" class="selection-status">
          <lucide-icon name="text-cursor-input" :size="12"></lucide-icon>
          {{ referenceLineCount === 1 ? $t('ai.composer.selectedLine', { count: referenceLineCount }) : $t('ai.composer.selectedLines', { count: referenceLineCount }) }}
        </span>
        <span class="composer-meta-spacer"></span>
        <button
          v-if="showCompactButton"
          type="button"
          class="token-compact-link"
          :disabled="compacting"
          :title="$t('ai.composer.longConversation')"
          @click="compactConversation"
        >{{ compacting ? $t('ai.composer.compacting') : $t('ai.composer.compact') }}</button>
      </div>
      <div v-if="attachedImages.length" class="attached-images">
        <div v-for="(img, idx) in attachedImages" :key="img.id" class="attached-image-thumb">
          <img :src="img.previewUrl" :alt="img.name" />
          <button type="button" class="remove-attachment" @click="removeImage(idx)">
            <lucide-icon name="x" :size="11"></lucide-icon>
          </button>
        </div>
      </div>
      <div v-if="attachedContexts.length" class="attached-contexts">
        <span v-for="(ctx, idx) in attachedContexts" :key="idx" class="context-chip" :title="ctx.fullPath || ctx.text">
          <lucide-icon :name="ctx.type === 'file' ? 'hash' : 'at-sign'" :size="12" class="context-chip-icon"></lucide-icon>
          <span class="context-chip-label">{{ ctx.label }}</span>
          <button type="button" class="context-chip-remove" @click="removeContext(idx)">
            <lucide-icon name="x" :size="11"></lucide-icon>
          </button>
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
            <lucide-icon :name="suggestion.type === 'file' ? 'hash' : 'at-sign'" :size="13" class="mention-icon"></lucide-icon>
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
            <lucide-icon name="square-slash" :size="13" class="mention-icon"></lucide-icon>
            <span class="mention-label">{{ template.label }}</span>
          </button>
        </div>
        <div class="composer-toolbar">
          <button
            type="button"
            class="mode-trigger"
            :disabled="streaming || compacting"
            :title="currentEditMode.description"
            @click.stop="showModeMenu = !showModeMenu"
          >
            <lucide-icon :name="currentEditMode.icon" :size="14"></lucide-icon>
            <span class="mode-trigger-label">{{ currentEditMode.shortLabel }}</span>
            <lucide-icon name="chevron-down" :size="12" class="mode-trigger-caret"></lucide-icon>
          </button>
          <span class="composer-toolbar-spacer"></span>
          <span
            class="token-ring"
            :class="{ warn: tokenWarning }"
            :title="tokenWarning ? $t('ai.composer.longConversation') : tokenProgressTitle"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle class="token-ring-track" cx="10" cy="10" r="7"></circle>
              <circle
                class="token-ring-value"
                cx="10"
                cy="10"
                r="7"
                :stroke-dasharray="`${tokenProgressPercent * 0.44} 44`"
              ></circle>
            </svg>
          </span>
          <button
            type="button"
            class="composer-icon-btn"
            :class="{ active: slashSuggestions.length }"
            :title="$t('ai.composer.quickPrompts')"
            :disabled="streaming || compacting || !!pendingEdit || !apiKeyResolved"
            @click.stop="toggleSlashMenu"
          >
            <lucide-icon name="square-slash" :size="15"></lucide-icon>
          </button>
          <button
            v-if="streaming || compacting"
            type="button"
            class="send-btn stop"
            :title="$t('common.stop')"
            @click="stop"
          >
            <lucide-icon name="square" :size="12"></lucide-icon>
          </button>
          <button
            v-else
            type="submit"
            class="send-btn primary"
            :title="$t('common.send')"
            :disabled="!apiKeyResolved || (!input.trim() && !attachedImages.length) || !!pendingEdit"
          >
            <lucide-icon name="arrow-up" :size="16"></lucide-icon>
          </button>
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
          <lucide-icon :name="mode.icon" :size="16" class="mode-option-icon"></lucide-icon>
          <span class="mode-option-copy">
            <span class="mode-option-title">{{ mode.label }}</span>
            <span class="mode-option-description">{{ mode.description }}</span>
          </span>
          <lucide-icon v-if="mode.id === currentEditMode.id" name="check" :size="16" class="mode-option-check"></lucide-icon>
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
import { parseSections, buildOutline, searchDocument, getSectionContent, globFiles, grepFiles } from '../../node/smartContext'
import { fetchExternalUrl } from '../../node/urlFetchTool'
import sessionDb from '../../node/sessionDb'
import { wordCount as getWordCount } from 'muya/lib/utils'
import loadRenderer from 'muya/lib/renderers'
import { darkThemes as darkThemeSet } from '../../util/themeColor'
import ChatSettings from './chat/ChatSettings.vue'
import ChatSessionList from './chat/ChatSessionList.vue'
import ChatMessageList from './chat/ChatMessageList.vue'
import { COPY_ICON_SVG } from './chat/copyIcon'

const PROVIDER_STORAGE_KEY = 'marktext.claudeProvider'
const STORAGE_KEY = 'marktext.claudeApiKey'
const BASE_URL_STORAGE_KEY = 'marktext.claudeBaseUrl'
const MODEL_STORAGE_KEY = 'marktext.claudeModel'
const PERSONA_STORAGE_KEY = 'marktext.claudePersona'
const CONTEXT_LIMIT_STORAGE_KEY = 'marktext.claudeContextLimit'
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
const DEFAULT_CONTEXT_LIMIT = 128000

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
  components: {
    ChatSettings,
    ChatSessionList,
    ChatMessageList
  },
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
      personaInput: '',
      storedPersona: '',
      contextLimitInput: DEFAULT_CONTEXT_LIMIT,
      storedContextLimit: '',
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
    activeUndoCount () {
      return this.editUndoStack.filter(snapshot => this.isActiveUndoSnapshot(snapshot)).length
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
    settingsVisible () {
      return this.showSettings || !this.apiKeyResolved
    },
    emptySuggestions () {
      return this.promptTemplates.slice(0, 4)
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
        icon: id === 'ask' ? 'shield-check' : id === 'auto' ? 'pencil-line' : 'list-checks',
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
      const stored = parseInt(this.storedContextLimit, 10)
      if (stored && stored >= 4096) return stored
      return DEFAULT_CONTEXT_LIMIT
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
  async mounted () {
    await this.loadCredentials()
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
    async loadCredentials () {
      try {
        const credentials = await ipcRenderer.invoke('mt::ai-get-credentials')
        const storedProvider = normalizeProvider(credentials.aiProvider || '')
        this.storedProvider = storedProvider === PROVIDERS.ANTHROPIC ? '' : storedProvider
        this.providerInput = storedProvider
        this.storedApiKey = credentials.aiApiKey || ''
        this.apiKeyInput = this.storedApiKey
        this.storedBaseUrl = credentials.aiBaseUrl || ''
        this.baseUrlInput = this.storedBaseUrl
        this.storedModel = credentials.aiModel || ''
        this.modelInput = this.storedModel
        this.storedPersona = credentials.aiPersona || ''
        this.personaInput = this.storedPersona
        const storedCtx = credentials.aiContextLimit
        this.storedContextLimit = storedCtx ? String(storedCtx) : ''
        this.contextLimitInput = parseInt(storedCtx, 10) || DEFAULT_CONTEXT_LIMIT
      } catch (err) {
        const storedProvider = normalizeProvider(localStorage.getItem(PROVIDER_STORAGE_KEY) || '')
        this.storedProvider = storedProvider === PROVIDERS.ANTHROPIC ? '' : storedProvider
        this.providerInput = storedProvider
        this.storedApiKey = localStorage.getItem(STORAGE_KEY) || ''
        this.apiKeyInput = this.storedApiKey
        this.storedBaseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY) || ''
        this.baseUrlInput = this.storedBaseUrl
        this.storedModel = localStorage.getItem(MODEL_STORAGE_KEY) || ''
        this.modelInput = this.storedModel
        this.storedPersona = localStorage.getItem(PERSONA_STORAGE_KEY) || ''
        this.personaInput = this.storedPersona
        const storedCtx = localStorage.getItem(CONTEXT_LIMIT_STORAGE_KEY) || ''
        this.storedContextLimit = storedCtx
        this.contextLimitInput = parseInt(storedCtx, 10) || DEFAULT_CONTEXT_LIMIT
      }
      this.migrateLocalStorageCredentials()
    },
    async migrateLocalStorageCredentials () {
      const legacyKey = localStorage.getItem(STORAGE_KEY)
      if (!legacyKey) return
      try {
        await ipcRenderer.invoke('mt::ai-set-credentials', {
          aiApiKey: legacyKey,
          aiBaseUrl: localStorage.getItem(BASE_URL_STORAGE_KEY) || '',
          aiModel: localStorage.getItem(MODEL_STORAGE_KEY) || '',
          aiProvider: localStorage.getItem(PROVIDER_STORAGE_KEY) || '',
          aiPersona: localStorage.getItem(PERSONA_STORAGE_KEY) || '',
          aiContextLimit: localStorage.getItem(CONTEXT_LIMIT_STORAGE_KEY) || ''
        })
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(BASE_URL_STORAGE_KEY)
        localStorage.removeItem(MODEL_STORAGE_KEY)
        localStorage.removeItem(PROVIDER_STORAGE_KEY)
        localStorage.removeItem(PERSONA_STORAGE_KEY)
        localStorage.removeItem(CONTEXT_LIMIT_STORAGE_KEY)
      } catch (err) { /* keep localStorage as fallback */ }
    },
    async saveApiKey () {
      const apiKeyValue = this.apiKeyInput.trim()
      const baseUrlValue = this.baseUrlInput.trim()
      const modelValue = this.modelInput.trim()
      const personaValue = this.personaInput.trim()
      const contextLimitValue = String(this.contextLimitInput || DEFAULT_CONTEXT_LIMIT)
      const providerValue = normalizeProvider(this.providerInput)

      try {
        await ipcRenderer.invoke('mt::ai-set-credentials', {
          aiApiKey: apiKeyValue,
          aiBaseUrl: baseUrlValue,
          aiModel: modelValue,
          aiProvider: providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue,
          aiPersona: personaValue,
          aiContextLimit: contextLimitValue
        })
      } catch (err) {
        const persist = (key, value) => {
          if (value) localStorage.setItem(key, value)
          else localStorage.removeItem(key)
        }
        persist(PROVIDER_STORAGE_KEY, providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue)
        persist(STORAGE_KEY, apiKeyValue)
        persist(BASE_URL_STORAGE_KEY, baseUrlValue)
        persist(MODEL_STORAGE_KEY, modelValue)
        persist(PERSONA_STORAGE_KEY, personaValue)
        persist(CONTEXT_LIMIT_STORAGE_KEY, contextLimitValue)
      }

      this.storedProvider = providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue
      this.providerInput = providerValue
      this.storedApiKey = apiKeyValue
      this.storedBaseUrl = baseUrlValue
      this.storedModel = modelValue
      this.storedPersona = personaValue
      this.storedContextLimit = contextLimitValue
      this.contextLimitInput = parseInt(contextLimitValue, 10) || DEFAULT_CONTEXT_LIMIT

      if (this.apiKeyResolved) {
        this.showSettings = false
      }
      this.error = ''
    },
    async clearApiKey () {
      try {
        await ipcRenderer.invoke('mt::ai-clear-credentials')
      } catch (err) {
        localStorage.removeItem(PROVIDER_STORAGE_KEY)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(BASE_URL_STORAGE_KEY)
        localStorage.removeItem(MODEL_STORAGE_KEY)
        localStorage.removeItem(PERSONA_STORAGE_KEY)
        localStorage.removeItem(CONTEXT_LIMIT_STORAGE_KEY)
      }
      this.storedProvider = ''
      this.providerInput = PROVIDERS.ANTHROPIC
      this.storedApiKey = ''
      this.apiKeyInput = ''
      this.storedBaseUrl = ''
      this.baseUrlInput = ''
      this.storedModel = ''
      this.storedContextLimit = ''
      this.contextLimitInput = DEFAULT_CONTEXT_LIMIT
      this.modelInput = ''
      this.storedPersona = ''
      this.personaInput = ''
    },
    handleSettingsSave (settings) {
      this.providerInput = settings.provider
      this.apiKeyInput = settings.apiKey
      this.baseUrlInput = settings.baseUrl
      this.modelInput = settings.model
      this.personaInput = settings.persona
      if (settings.contextLimit != null) {
        this.contextLimitInput = parseInt(settings.contextLimit, 10) || DEFAULT_CONTEXT_LIMIT
      }
      this.saveApiKey()
    },
    selectEditMode (modeId) {
      const mode = this.editModes.find(item => item.id === modeId)
      if (!mode) return
      this.storedEditMode = mode.id
      localStorage.setItem(EDIT_MODE_STORAGE_KEY, mode.id)
      this.showModeMenu = false
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
    async migrateLocalStorageSessions () {
      try {
        const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
        if (!raw) return
        const sessions = JSON.parse(raw)
        if (!Array.isArray(sessions) || !sessions.length) return
        const valid = sessions
          .filter(s => s && s.id)
          .map(s => ({
            id: String(s.id),
            documentKey: s.documentKey || 'global',
            documentLabel: s.documentLabel || '',
            title: s.title || 'New chat',
            createdAt: Number(s.createdAt || Date.now()),
            updatedAt: Number(s.updatedAt || s.createdAt || Date.now()),
            displayMessages: Array.isArray(s.displayMessages) ? s.displayMessages : [],
            apiMessages: Array.isArray(s.apiMessages) ? sanitizeMessages(s.apiMessages) : []
          }))
        if (valid.length) {
          await sessionDb.importSessions(valid)
        }
        localStorage.removeItem(SESSIONS_STORAGE_KEY)
      } catch (err) { /* ignore migration errors */ }
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
    async loadSessions (documentKey = this.currentDocumentSessionKey) {
      await this.migrateLocalStorageSessions()
      let metas = []
      try {
        metas = await sessionDb.getSessionsByDocumentKey(documentKey)
      } catch (err) { /* empty */ }

      this.loadedDocumentSessionKey = documentKey

      if (metas.length) {
        const sorted = metas.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, MAX_STORED_SESSIONS)
        this.sessions = sorted.map(m => ({
          id: m.id,
          documentKey: m.documentKey,
          documentLabel: m.documentLabel || '',
          title: m.title || 'New chat',
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          displayMessages: [],
          apiMessages: []
        }))
      } else {
        this.sessions = [this.createSession(documentKey)]
      }

      const activeMap = this.readActiveSessionMap()
      const legacyActiveId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      const storedActiveId = activeMap[documentKey] || legacyActiveId
      const active = this.sessions.find(session => session.id === storedActiveId) || this.sessions[0]
      this.activeSessionId = active.id

      try {
        const messages = await sessionDb.getSessionMessages(active.id)
        if (messages) {
          this.displayMessages = cloneMessages(messages.displayMessages)
          this.apiMessages = cloneMessages(messages.apiMessages)
          active.displayMessages = this.displayMessages
          active.apiMessages = this.apiMessages
        } else {
          this.displayMessages = []
          this.apiMessages = []
        }
      } catch (err) {
        this.displayMessages = []
        this.apiMessages = []
      }

      this.pendingRetry = null
      this.pendingEdit = null
      this.error = ''
      this.compactNotice = ''
      this.clearMarkdownCache()
    },
    persistSessions () {
      const sessions = sortSessionsByUpdate(this.sessions).slice(0, MAX_STORED_SESSIONS)
      this.sessions = sessions

      if (this.activeSessionId) {
        this.writeActiveSessionId(this.loadedDocumentSessionKey, this.activeSessionId)
      }

      const activeSession = sessions.find(s => s.id === this.activeSessionId)
      if (activeSession) {
        const meta = {
          id: activeSession.id,
          documentKey: activeSession.documentKey || this.loadedDocumentSessionKey,
          documentLabel: activeSession.documentLabel || this.getCurrentDocumentLabel(),
          title: activeSession.title || 'New chat',
          createdAt: activeSession.createdAt || Date.now(),
          updatedAt: activeSession.updatedAt || activeSession.createdAt || Date.now()
        }
        const messages = {
          displayMessages: cloneMessages(activeSession.displayMessages || this.displayMessages),
          apiMessages: sanitizeMessages(cloneMessages(activeSession.apiMessages || this.apiMessages))
        }
        sessionDb.saveSession(meta, messages).catch(() => {})
      }

      for (const session of sessions) {
        if (session.id === this.activeSessionId) continue
        const meta = {
          id: session.id,
          documentKey: session.documentKey || this.loadedDocumentSessionKey,
          documentLabel: session.documentLabel || this.getCurrentDocumentLabel(),
          title: session.title || 'New chat',
          createdAt: session.createdAt || Date.now(),
          updatedAt: session.updatedAt || session.createdAt || Date.now()
        }
        sessionDb.saveMeta(meta).catch(() => {})
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
    async selectSession (sessionId) {
      if (this.streaming || sessionId === this.activeSessionId) return

      const session = this.sessions.find(item => item.id === sessionId)
      if (!session) return

      this.saveCurrentSession()
      this.activeSessionId = session.id

      if (session.displayMessages && session.displayMessages.length) {
        this.displayMessages = cloneMessages(session.displayMessages)
        this.apiMessages = cloneMessages(session.apiMessages)
      } else {
        try {
          const messages = await sessionDb.getSessionMessages(session.id)
          if (messages) {
            this.displayMessages = cloneMessages(messages.displayMessages)
            this.apiMessages = cloneMessages(messages.apiMessages)
            session.displayMessages = this.displayMessages
            session.apiMessages = this.apiMessages
          } else {
            this.displayMessages = []
            this.apiMessages = []
          }
        } catch (err) {
          this.displayMessages = []
          this.apiMessages = []
        }
      }

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
    async deleteSession (sessionId) {
      if (this.streaming) return
      if (!window.confirm('Delete this AI session?')) return

      const wasActive = sessionId === this.activeSessionId
      if (!wasActive) {
        this.saveCurrentSession()
      }

      sessionDb.deleteSession(sessionId).catch(() => {})
      this.sessions = this.sessions.filter(session => session.id !== sessionId)
      this.editUndoStack = this.editUndoStack.filter(snapshot => snapshot.sessionId !== sessionId)
      if (!this.sessions.length) {
        this.sessions = [this.createSession()]
      }

      if (wasActive) {
        const nextSession = this.sortedSessions[0]
        this.activeSessionId = nextSession.id
        if (nextSession.displayMessages && nextSession.displayMessages.length) {
          this.displayMessages = cloneMessages(nextSession.displayMessages)
          this.apiMessages = cloneMessages(nextSession.apiMessages)
        } else {
          try {
            const messages = await sessionDb.getSessionMessages(nextSession.id)
            if (messages) {
              this.displayMessages = cloneMessages(messages.displayMessages)
              this.apiMessages = cloneMessages(messages.apiMessages)
              nextSession.displayMessages = this.displayMessages
              nextSession.apiMessages = this.apiMessages
            } else {
              this.displayMessages = []
              this.apiMessages = []
            }
          } catch (err) {
            this.displayMessages = []
            this.apiMessages = []
          }
        }
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
      const child = this.$refs.messageList
      if (child && child.scrollToBottom) {
        child.scrollToBottom(force)
      }
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
        if (!pre || pre.querySelector('.claude-code-copy')) return
        pre.classList.add('claude-code-block')
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'claude-code-copy'
        button.title = 'Copy content'
        button.setAttribute('aria-label', 'Copy content')
        button.innerHTML = COPY_ICON_SVG
        pre.appendChild(button)
      })
      const html = wrapper.innerHTML
      if (cache.size >= 256) cache.delete(cache.keys().next().value)
      cache.set(text, html)
      return html
    },
    clearMarkdownCache () {
      this.markdownCache.clear()
      const child = this.$refs.messageList
      if (child && child.clearCache) child.clearCache()
    },
    rerenderMermaidBlocks () {
      const container = this.$refs.messageList && this.$refs.messageList.$el
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
      const container = this.$refs.messageList && this.$refs.messageList.$el
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
      if (isMeta && event.key === 'z' && !event.shiftKey && this.activeUndoCount && !this.streaming) {
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
        sessionId: this.activeSessionId,
        fileId: this.currentFile.id,
        markdown: this.currentFile.markdown,
        label: label || 'Claude edit',
        timestamp: Date.now()
      })
      if (this.editUndoStack.length > MAX_UNDO_STACK) {
        this.editUndoStack.splice(0, this.editUndoStack.length - MAX_UNDO_STACK)
      }
    },
    isActiveUndoSnapshot (snapshot) {
      return !!(
        snapshot &&
        snapshot.sessionId === this.activeSessionId &&
        this.currentFile &&
        snapshot.fileId === this.currentFile.id
      )
    },
    undoLastEdit () {
      let index = -1
      for (let i = this.editUndoStack.length - 1; i >= 0; i--) {
        if (this.isActiveUndoSnapshot(this.editUndoStack[i])) {
          index = i
          break
        }
      }
      if (index === -1) return

      const [snapshot] = this.editUndoStack.splice(index, 1)
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
      if (name === 'get_document_outline') {
        if (!this.currentFile || typeof this.currentFile.markdown !== 'string') {
          return 'No document is currently open in the editor.'
        }
        const sections = parseSections(this.currentFile.markdown)
        this._documentSections = sections
        return buildOutline(sections, this.currentFile.filename || 'untitled.md')
      }
      if (name === 'search_document') {
        if (!this.currentFile || typeof this.currentFile.markdown !== 'string') {
          return 'No document is currently open in the editor.'
        }
        return searchDocument(this.currentFile.markdown, input.query || '')
      }
      if (name === 'get_document_section') {
        if (!this.currentFile || typeof this.currentFile.markdown !== 'string') {
          return 'No document is currently open in the editor.'
        }
        let sections = this._documentSections
        if (!sections || !sections.length) {
          sections = parseSections(this.currentFile.markdown)
          this._documentSections = sections
        }
        const raw = String(input.section || '').trim()
        const identifier = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw
        return getSectionContent(sections, this.currentFile.markdown, identifier)
      }
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
      if (name === 'glob_files') {
        const globPattern = String(input.pattern || '')
        if (!globPattern.trim()) return '(Empty glob pattern.)'
        let baseDir = (this.projectTree && this.projectTree.pathname) || process.cwd()
        if (input.path && path.isAbsolute(input.path)) {
          this.assertPathAllowed(input.path)
          baseDir = input.path
        }
        return globFiles(globPattern.trim(), baseDir)
      }
      if (name === 'grep_files') {
        const rgPattern = String(input.pattern || '')
        if (!rgPattern.trim()) return '(Empty regex pattern.)'
        let baseDir = (this.projectTree && this.projectTree.pathname) || process.cwd()
        if (input.path && path.isAbsolute(input.path)) {
          this.assertPathAllowed(input.path)
          baseDir = input.path
        }
        const fileGlob = input.glob ? String(input.glob).trim() : ''
        return grepFiles(rgPattern.trim(), baseDir, fileGlob)
      }
      if (name === 'fetch_url') {
        return fetchExternalUrl(input)
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
      this._documentSections = null
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
    toggleSlashMenu () {
      if (this.slashSuggestions.length) {
        this.slashSuggestions = []
        this.slashTrigger = null
        return
      }
      this.mentionTrigger = null
      this.mentionSuggestions = []
      this.slashSuggestions = this.promptTemplates
      this.slashTrigger = { startPos: 0, query: '' }
      this.$nextTick(() => { if (this.$refs.input) this.$refs.input.focus() })
    },
    selectSlashCommand (template) {
      // Only clear the input when the menu was opened by typing "/".
      if (this.input.startsWith('/')) this.input = ''
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
      const copyButton = target && target.closest ? target.closest('.claude-code-copy') : null
      if (copyButton) {
        event.stopPropagation()
        const pre = copyButton.closest('pre.claude-code-block')
        const code = pre && pre.querySelector('code')
        if (!code) return
        const text = code.textContent || ''
        const copied = await this.copyTextToClipboard(text)
        const originalTitle = copyButton.title
        copyButton.title = copied ? (this.$t('common.save') === '保存' ? '已复制' : 'Copied') : (this.$t('common.save') === '保存' ? '复制失败' : 'Copy failed')
        copyButton.disabled = copied
        copyButton.classList.toggle('copied', copied)
        copyButton.classList.toggle('error', !copied)
        setTimeout(() => {
          if (copyButton.isConnected) {
            copyButton.title = originalTitle
            copyButton.disabled = false
            copyButton.classList.remove('copied')
            copyButton.classList.remove('error')
          }
        }, copied ? 1200 : 1600)
      }
    }
  }
}
</script>

<style>
  /*
   * AI sidebar. Every rule is scoped under .side-bar-claude-chat because this
   * stylesheet is global (child components and generated HTML rely on it).
   */
  .side-bar-claude-chat {
    --claude-bg: var(--editorBgColor);
    --claude-surface: var(--surface-overlay);
    --claude-surface-soft: var(--surface-base);
    --claude-border: var(--border-subtle);
    --claude-border-strong: var(--border-strong);
    --claude-text: var(--editorColor);
    --claude-text-strong: var(--text-primary);
    --claude-text-muted: var(--text-muted);
    --claude-tint: var(--editorColor04);
    --claude-tint-strong: var(--surface-active);
    --claude-user-bg: var(--surface-active);
    --claude-success: #2c7a2c;
    --claude-success-bg: rgba(0, 180, 0, 0.12);
    --claude-danger: #d9534f;
    --claude-danger-soft: rgba(217, 83, 79, 0.12);
    --claude-danger-strong: #b53b35;
    --claude-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;

    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: var(--font-ui);
    font-size: var(--font-size-md);
    color: var(--claude-text);
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    isolation: isolate;
    background: var(--claude-bg);
  }

  body.dark .side-bar-claude-chat {
    --claude-success: #81c995;
    --claude-success-bg: rgba(129, 201, 149, .14);
    --claude-danger: #f28b82;
    --claude-danger-soft: rgba(242, 139, 130, .14);
    --claude-danger-strong: #f28b82;
  }

  .side-bar-claude-chat button {
    font-family: inherit;
    outline: none;
  }
  .side-bar-claude-chat button:focus-visible {
    box-shadow: var(--focus-ring);
  }

  /* ------------------------------------------------------------------ Header */

  .side-bar-claude-chat .chat-header {
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
    padding-top: calc(var(--titleBarHeight) + 6px);
    display: flex;
    gap: var(--space-2);
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--claude-border);
    flex-shrink: 0;
    background: var(--claude-bg);
    position: relative;
    z-index: 100;
    -webkit-app-region: no-drag;
  }
  .side-bar-claude-chat .chat-title {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 6px;
    overflow: hidden;
  }
  .side-bar-claude-chat .title {
    color: var(--claude-text-strong);
    font-weight: 600;
    font-size: var(--font-size-md);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-bar-claude-chat .title-doc-tag {
    flex-shrink: 1;
    min-width: 0;
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-bar-claude-chat .chat-actions {
    flex-shrink: 0;
    display: flex;
    gap: 2px;
    align-items: center;
    position: relative;
    z-index: 101;
  }
  .side-bar-claude-chat .toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--claude-text-muted);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .toolbar-btn:hover:not(:disabled) {
    background: var(--claude-tint-strong);
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .toolbar-btn:disabled {
    opacity: .4;
    cursor: default;
  }
  .side-bar-claude-chat .header-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 168px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    background: var(--claude-surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-3);
    z-index: 200;
  }
  .side-bar-claude-chat .header-menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 30px;
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--claude-text);
    font-size: var(--font-size-md);
    text-align: left;
    cursor: pointer;
  }
  .side-bar-claude-chat .header-menu-item:hover:not(:disabled) {
    background: var(--claude-tint-strong);
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .header-menu-item:disabled {
    opacity: .45;
    cursor: default;
  }
  .side-bar-claude-chat .header-menu-icon {
    flex-shrink: 0;
    color: var(--claude-text-muted);
  }

  /* ---------------------------------------------------------------- Settings */

  .side-bar-claude-chat .settings-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--claude-bg);
  }
  .side-bar-claude-chat .settings-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-3) var(--space-3) var(--space-2);
  }
  .side-bar-claude-chat .settings-group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: var(--space-2) 2px var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .settings-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background: var(--claude-tint);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-lg);
  }
  .side-bar-claude-chat .settings-card label {
    margin-top: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .settings-card label:first-child {
    margin-top: 0;
  }
  .side-bar-claude-chat .settings-card input,
  .side-bar-claude-chat .settings-card select,
  .side-bar-claude-chat .settings-card textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--control-height);
    padding: 5px var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--font-size-md);
    color: var(--claude-text);
    background: var(--surface-input);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .settings-card textarea {
    resize: vertical;
    min-height: 84px;
    line-height: 1.5;
  }
  .side-bar-claude-chat .settings-card input:focus,
  .side-bar-claude-chat .settings-card select:focus,
  .side-bar-claude-chat .settings-card textarea:focus {
    border-color: var(--themeColor);
    box-shadow: var(--focus-ring);
  }
  .side-bar-claude-chat .settings-hint {
    font-size: var(--font-size-xs);
    line-height: 1.45;
    color: var(--claude-text-muted);
    overflow-wrap: anywhere;
  }
  .side-bar-claude-chat .settings-hint code {
    font-family: var(--claude-mono);
    background: var(--claude-tint-strong);
    padding: 0 4px;
    border-radius: 3px;
  }
  .side-bar-claude-chat .settings-actions {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-3);
    border-top: 1px solid var(--claude-border);
    background: var(--claude-bg);
  }
  .side-bar-claude-chat .settings-actions button {
    height: var(--control-height);
    padding: 0 var(--space-4);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--claude-text);
    font-size: var(--font-size-md);
    font-weight: 500;
    cursor: pointer;
  }
  .side-bar-claude-chat .settings-actions button.ghost:hover {
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .settings-actions button.primary {
    border-color: transparent;
    background: var(--themeColor);
    color: #fff;
  }
  .side-bar-claude-chat .settings-actions button.primary:hover {
    filter: brightness(1.06);
  }

  /* ---------------------------------------------------------------- Sessions */

  .side-bar-claude-chat .sessions-panel {
    flex-shrink: 0;
    max-height: 260px;
    overflow-y: auto;
    padding: var(--space-2) var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--claude-border);
    background: var(--claude-bg);
  }
  .side-bar-claude-chat .sessions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 2px var(--space-2) var(--space-2);
  }
  .side-bar-claude-chat .sessions-heading {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .side-bar-claude-chat .sessions-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .sessions-subtitle {
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
    opacity: .8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .side-bar-claude-chat .sessions-new {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--claude-text-muted);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .side-bar-claude-chat .sessions-new:hover:not(:disabled) {
    background: var(--claude-tint-strong);
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .empty-sessions {
    color: var(--claude-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--space-2);
  }
  .side-bar-claude-chat .session-row {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .session-row:hover {
    background: var(--surface-hover);
  }
  .side-bar-claude-chat .session-row.active {
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .session-main {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: 6px var(--space-2);
    border: none;
    background: transparent;
    color: var(--claude-text);
    text-align: left;
    cursor: pointer;
  }
  .side-bar-claude-chat .session-icon {
    margin-top: 2px;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .session-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .side-bar-claude-chat .session-title,
  .side-bar-claude-chat .session-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-bar-claude-chat .session-title {
    font-size: var(--font-size-md);
  }
  .side-bar-claude-chat .session-row.active .session-title {
    color: var(--claude-text-strong);
    font-weight: 500;
  }
  .side-bar-claude-chat .session-meta {
    display: flex;
    gap: 6px;
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .session-doc {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .side-bar-claude-chat .session-doc::after {
    content: '·';
    margin-left: 6px;
  }
  .side-bar-claude-chat .session-delete {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    margin-right: 4px;
    padding: 0;
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--claude-text-muted);
    opacity: 0;
    cursor: pointer;
    transition: opacity var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .session-row:hover .session-delete {
    opacity: 1;
  }
  .side-bar-claude-chat .session-delete:hover:not(:disabled) {
    color: var(--claude-danger);
    background: var(--claude-danger-soft);
  }
  .side-bar-claude-chat .session-main:disabled,
  .side-bar-claude-chat .session-delete:disabled,
  .side-bar-claude-chat .sessions-new:disabled {
    opacity: .45;
    cursor: default;
  }

  /* ---------------------------------------------------------------- Messages */

  .side-bar-claude-chat .chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-4) var(--space-4) var(--space-5);
    overflow-anchor: none;
    overscroll-behavior: contain;
    position: relative;
    z-index: 1;
    background: var(--claude-bg);
  }

  .side-bar-claude-chat .empty-state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: var(--space-4) 2px;
  }
  .side-bar-claude-chat .empty-state-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-bottom: var(--space-1);
    border-radius: var(--radius-md);
    color: var(--themeColor);
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .empty-state-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .empty-state-copy {
    font-size: var(--font-size-md);
    line-height: 1.5;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .empty-suggestions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    margin-top: var(--space-3);
  }
  .side-bar-claude-chat .suggestion {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--claude-text);
    font-size: var(--font-size-md);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .suggestion:hover {
    background: var(--surface-hover);
    border-color: var(--claude-border-strong);
  }
  .side-bar-claude-chat .suggestion-label {
    flex: 1;
  }
  .side-bar-claude-chat .suggestion-arrow {
    color: var(--claude-text-muted);
  }

  .side-bar-claude-chat .message {
    margin-bottom: var(--space-4);
  }
  .side-bar-claude-chat .message-blocks {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: var(--font-size-md);
    line-height: 1.65;
  }
  /* User turns: a soft block; assistant turns: plain document flow. */
  .side-bar-claude-chat .message.user .message-blocks {
    padding: var(--space-2) var(--space-3);
    background: var(--claude-user-bg);
    border-radius: var(--radius-md);
  }
  .side-bar-claude-chat .message.user .block-text {
    color: var(--claude-text-strong);
  }

  .side-bar-claude-chat .tool-activity {
    display: flex;
    flex-wrap: wrap;
    gap: 2px var(--space-3);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .tool-step {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
  .side-bar-claude-chat .tool-step.running {
    color: var(--claude-text);
  }
  .side-bar-claude-chat .tool-step.error {
    color: var(--claude-danger);
  }
  .side-bar-claude-chat .tool-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-bar-claude-chat .tool-spinner {
    display: block;
    flex-shrink: 0;
    width: 11px;
    height: 11px;
    box-sizing: border-box;
    border: 1.5px solid var(--claude-border-strong);
    border-top-color: var(--themeColor);
    border-radius: 50%;
    animation: claude-tool-spin .8s linear infinite;
  }
  @keyframes claude-tool-spin {
    to { transform: rotate(360deg); }
  }

  .side-bar-claude-chat .system-card {
    padding: var(--space-2) var(--space-3);
    border: 1px dashed var(--claude-border-strong);
    border-radius: var(--radius-md);
  }
  .side-bar-claude-chat .system-card-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .system-card .block-text {
    font-size: var(--font-size-sm);
    color: var(--claude-text-muted);
  }

  .side-bar-claude-chat .chat-messages > .error,
  .side-bar-claude-chat .chat-messages > .aborted {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    line-height: 1.5;
    word-wrap: break-word;
  }
  .side-bar-claude-chat .chat-messages > .error {
    color: var(--claude-danger-strong);
    background: var(--claude-danger-soft);
  }
  .side-bar-claude-chat .chat-messages > .aborted {
    color: var(--claude-text-muted);
    background: var(--claude-tint);
  }
  .side-bar-claude-chat .notice-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
  .side-bar-claude-chat .notice-text {
    flex: 1;
    min-width: 0;
  }
  .side-bar-claude-chat .retry-btn,
  .side-bar-claude-chat .undo-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 var(--space-2);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-sm);
    background: var(--claude-surface);
    color: var(--claude-text);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .side-bar-claude-chat .retry-btn:hover,
  .side-bar-claude-chat .undo-btn:hover {
    border-color: var(--claude-border-strong);
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .undo-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .side-bar-claude-chat .undo-hint {
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
  }

  /* -------------------------------------------------------- Markdown content */

  .side-bar-claude-chat .block-text {
    color: var(--claude-text);
    word-wrap: break-word;
    overflow-wrap: break-word;
    user-select: text;
    min-width: 0;
    max-width: 100%;
  }
  .side-bar-claude-chat .block-text > *:first-child { margin-top: 0; }
  .side-bar-claude-chat .block-text > *:last-child { margin-bottom: 0; }
  .side-bar-claude-chat .block-text p { margin: 0 0 10px; }
  .side-bar-claude-chat .block-text ul,
  .side-bar-claude-chat .block-text ol {
    margin: 6px 0 10px;
    padding-left: 20px;
  }
  .side-bar-claude-chat .block-text li { margin: 3px 0; }
  .side-bar-claude-chat .block-text li > ul,
  .side-bar-claude-chat .block-text li > ol { margin: 4px 0; }
  .side-bar-claude-chat .block-text code {
    font-family: var(--claude-mono);
    font-size: 12px;
    padding: 1px 5px;
    border-radius: var(--radius-xs);
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .block-text pre {
    position: relative;
    display: block;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 10px 0;
    padding: 10px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: pre;
    background: var(--codeBlockBgColor);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-md);
  }
  .side-bar-claude-chat .block-text pre::-webkit-scrollbar {
    display: block;
    height: 4px;
  }
  .side-bar-claude-chat .block-text pre code {
    display: block;
    width: max-content;
    min-width: 100%;
    padding: 0;
    font-size: 12px;
    line-height: 1.55;
    white-space: pre;
    background: transparent;
    border: none;
  }
  .side-bar-claude-chat .block-text h1,
  .side-bar-claude-chat .block-text h2,
  .side-bar-claude-chat .block-text h3 {
    margin: 14px 0 6px;
    line-height: 1.3;
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .block-text h1 { font-size: 17px; font-weight: 700; }
  .side-bar-claude-chat .block-text h2 { font-size: 15px; font-weight: 700; }
  .side-bar-claude-chat .block-text h3 { font-size: 14px; font-weight: 600; }
  .side-bar-claude-chat .block-text strong {
    font-weight: 600;
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .block-text em { font-style: italic; }
  .side-bar-claude-chat .block-text a {
    color: var(--themeColor);
    text-decoration: none;
    border-bottom: 1px solid var(--themeColor30);
  }
  .side-bar-claude-chat .block-text a:hover {
    border-bottom-color: var(--themeColor);
  }
  .side-bar-claude-chat .block-text blockquote {
    margin: 10px 0;
    padding: 2px 0 2px 12px;
    border-left: 3px solid var(--claude-border-strong) !important;
    color: var(--claude-text-muted);
  }
  /* Muya's global theme draws its own quote bar; not wanted here. */
  .side-bar-claude-chat .block-text blockquote::before {
    display: none;
  }
  .side-bar-claude-chat .block-text blockquote p { margin: 0; }
  .side-bar-claude-chat .block-text hr {
    height: 0;
    margin: 14px 0;
    border: none !important;
    border-top: 1px solid var(--claude-border) !important;
    background: transparent !important;
  }
  .side-bar-claude-chat .block-text table {
    width: 100%;
    margin: 10px 0;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }
  .side-bar-claude-chat .block-text th,
  .side-bar-claude-chat .block-text td {
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
    border: 1px solid var(--claude-border);
  }
  .side-bar-claude-chat .block-text th::before,
  .side-bar-claude-chat .block-text td::before {
    display: none;
  }
  .side-bar-claude-chat .block-text th {
    background: var(--claude-tint);
    color: var(--claude-text-strong);
    font-weight: 600;
  }

  /* Code block copy button (injected into rendered markdown). */
  .side-bar-claude-chat .block-text .claude-code-copy {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: var(--radius-xs);
    background: var(--claude-surface);
    color: transparent;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-fast) var(--ease);
    z-index: 1;
  }
  .side-bar-claude-chat .block-text pre.claude-code-block:hover .claude-code-copy {
    opacity: 1;
    pointer-events: auto;
  }
  .side-bar-claude-chat .block-text .claude-code-copy:hover {
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .block-text .claude-code-copy .icon {
    display: block;
    width: 14px;
    height: 14px;
    fill: none;
    /* The button uses `color: transparent`, so set the stroke explicitly. */
    stroke: var(--claude-text-muted);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .side-bar-claude-chat .block-text .claude-code-copy.copied .icon {
    stroke: var(--claude-success);
  }
  .side-bar-claude-chat .block-text .claude-code-copy.error .icon {
    stroke: var(--claude-danger);
  }
  .side-bar-claude-chat .block-text .claude-code-copy.copied,
  .side-bar-claude-chat .block-text .claude-code-copy.error {
    opacity: 1;
    pointer-events: auto;
  }
  .side-bar-claude-chat .block-text .claude-code-copy[disabled] {
    cursor: default;
  }

  /* Prism tokens */
  .side-bar-claude-chat .block-text .token { color: inherit; }
  .side-bar-claude-chat .block-text .token.comment,
  .side-bar-claude-chat .block-text .token.prolog,
  .side-bar-claude-chat .block-text .token.doctype,
  .side-bar-claude-chat .block-text .token.cdata { color: #998; font-style: italic; }
  .side-bar-claude-chat .block-text .token.punctuation { color: #999; }
  .side-bar-claude-chat .block-text .token.property,
  .side-bar-claude-chat .block-text .token.tag,
  .side-bar-claude-chat .block-text .token.boolean,
  .side-bar-claude-chat .block-text .token.number,
  .side-bar-claude-chat .block-text .token.constant,
  .side-bar-claude-chat .block-text .token.symbol,
  .side-bar-claude-chat .block-text .token.deleted { color: #905; }
  .side-bar-claude-chat .block-text .token.selector,
  .side-bar-claude-chat .block-text .token.attr-name,
  .side-bar-claude-chat .block-text .token.string,
  .side-bar-claude-chat .block-text .token.char,
  .side-bar-claude-chat .block-text .token.builtin,
  .side-bar-claude-chat .block-text .token.inserted { color: #690; }
  .side-bar-claude-chat .block-text .token.operator,
  .side-bar-claude-chat .block-text .token.entity,
  .side-bar-claude-chat .block-text .token.url { color: #9a6e3a; }
  .side-bar-claude-chat .block-text .token.atrule,
  .side-bar-claude-chat .block-text .token.attr-value,
  .side-bar-claude-chat .block-text .token.keyword { color: #07a; }
  .side-bar-claude-chat .block-text .token.function,
  .side-bar-claude-chat .block-text .token.class-name { color: #dd4a68; }
  .side-bar-claude-chat .block-text .token.regex,
  .side-bar-claude-chat .block-text .token.important,
  .side-bar-claude-chat .block-text .token.variable { color: #e90; }
  body.dark .side-bar-claude-chat .block-text .token.keyword { color: #6cb6ff; }
  body.dark .side-bar-claude-chat .block-text .token.string { color: #9ccc65; }
  body.dark .side-bar-claude-chat .block-text .token.function,
  body.dark .side-bar-claude-chat .block-text .token.class-name { color: #f78c6c; }

  /* Mermaid previews */
  .side-bar-claude-chat .mermaid-preview {
    margin: 8px 0;
    padding: var(--space-3);
    background: var(--claude-surface);
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-md);
    overflow-x: auto;
    text-align: center;
  }
  .side-bar-claude-chat .mermaid-preview svg {
    max-width: 100%;
    height: auto;
  }
  .side-bar-claude-chat .mermaid-toggle {
    display: inline-block;
    margin-top: 6px;
    padding: 2px var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
    background: transparent;
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-xs);
    cursor: pointer;
  }
  .side-bar-claude-chat .mermaid-toggle:hover {
    color: var(--claude-text-strong);
    border-color: var(--claude-border-strong);
  }
  .side-bar-claude-chat .mermaid-source-collapsed {
    display: none;
  }
  .side-bar-claude-chat .mermaid-error {
    margin: 6px 0;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    color: var(--claude-danger);
    background: var(--claude-danger-soft);
    border-radius: var(--radius-sm);
  }

  /* ------------------------------------------------------------ Edit preview */

  .side-bar-claude-chat .edit-preview {
    flex-shrink: 0;
    margin: 0 var(--space-3) var(--space-3);
    display: flex;
    flex-direction: column;
    max-height: 48%;
    background: var(--claude-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-2);
    overflow: hidden;
  }
  .side-bar-claude-chat .edit-preview-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--claude-border);
  }
  .side-bar-claude-chat .edit-preview-icon {
    flex-shrink: 0;
    color: var(--themeColor);
  }
  .side-bar-claude-chat .edit-preview-title {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .side-bar-claude-chat .edit-preview-kicker {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .edit-summary {
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--claude-text-strong);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-bar-claude-chat .edit-diff-meta {
    flex-shrink: 0;
    display: flex;
    gap: 4px;
  }
  .side-bar-claude-chat .diff-badge {
    padding: 0 6px;
    font-family: var(--claude-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    line-height: 18px;
    border-radius: 9px;
  }
  .side-bar-claude-chat .diff-badge.add {
    color: var(--claude-success);
    background: var(--claude-success-bg);
  }
  .side-bar-claude-chat .diff-badge.remove {
    color: var(--claude-danger-strong);
    background: var(--claude-danger-soft);
  }
  .side-bar-claude-chat .edit-diff {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 0;
    font-family: var(--claude-mono);
    font-size: 12px;
    line-height: 1.55;
  }
  .side-bar-claude-chat .diff-line {
    display: flex;
    padding: 0 var(--space-3);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .side-bar-claude-chat .diff-line.add { background: var(--claude-success-bg); color: var(--claude-success); }
  .side-bar-claude-chat .diff-line.remove { background: var(--claude-danger-soft); color: var(--claude-danger-strong); }
  .side-bar-claude-chat .diff-line.context { color: var(--claude-text); }
  .side-bar-claude-chat .diff-line.skip {
    color: var(--claude-text-muted);
    font-style: italic;
  }
  .side-bar-claude-chat .diff-marker {
    flex-shrink: 0;
    width: 14px;
    opacity: .7;
    user-select: none;
  }
  .side-bar-claude-chat .diff-text {
    flex: 1;
    min-width: 0;
  }
  .side-bar-claude-chat .edit-preview-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--claude-border);
  }
  .side-bar-claude-chat .edit-preview-note {
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .edit-preview-spacer {
    flex: 1;
  }
  .side-bar-claude-chat .edit-preview-actions button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-md);
    font-weight: 500;
    cursor: pointer;
  }
  .side-bar-claude-chat .edit-preview-actions button.reject {
    border: 1px solid var(--claude-border);
    background: transparent;
    color: var(--claude-text);
  }
  .side-bar-claude-chat .edit-preview-actions button.reject:hover {
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .edit-preview-actions button.accept {
    border: 1px solid transparent;
    background: var(--themeColor);
    color: #fff;
  }
  .side-bar-claude-chat .edit-preview-actions button.accept:hover {
    filter: brightness(1.06);
  }

  /* ---------------------------------------------------------------- Composer */

  .side-bar-claude-chat .chat-input {
    flex-shrink: 0;
    margin: 0 var(--space-3) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 10;
  }
  .side-bar-claude-chat .composer-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 4px;
    min-height: 20px;
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .composer-meta-spacer {
    flex: 1;
  }
  .side-bar-claude-chat .selection-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .side-bar-claude-chat .token-compact-link {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--themeColor);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
  }
  .side-bar-claude-chat .token-compact-link:hover:not(:disabled) {
    text-decoration: underline;
  }
  .side-bar-claude-chat .token-compact-link:disabled {
    opacity: .55;
    cursor: default;
  }

  .side-bar-claude-chat .composer-input-wrap {
    position: relative;
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-lg);
    background: var(--claude-surface);
    box-shadow: var(--shadow-1);
    transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .composer-input-wrap:focus-within {
    border-color: var(--themeColor);
    box-shadow: var(--focus-ring);
  }
  .side-bar-claude-chat .chat-input textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 56px;
    max-height: 160px;
    padding: 10px 12px 4px;
    resize: none;
    border: none;
    background: transparent;
    color: var(--claude-text);
    font-family: inherit;
    font-size: var(--font-size-md);
    line-height: 1.5;
    outline: none;
  }
  .side-bar-claude-chat .chat-input textarea::placeholder {
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .chat-input textarea:disabled {
    opacity: .6;
    cursor: default;
  }

  .side-bar-claude-chat .composer-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px 6px;
  }
  .side-bar-claude-chat .composer-toolbar-spacer {
    flex: 1;
  }
  .side-bar-claude-chat .mode-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    height: 26px;
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--claude-text-muted);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  .side-bar-claude-chat .mode-trigger:hover:not(:disabled) {
    background: var(--claude-tint-strong);
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .mode-trigger:disabled {
    opacity: .5;
    cursor: default;
  }
  .side-bar-claude-chat .mode-trigger-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side-bar-claude-chat .mode-trigger-caret {
    flex-shrink: 0;
    opacity: .7;
  }
  .side-bar-claude-chat .token-ring {
    display: inline-flex;
    width: 26px;
    height: 26px;
    align-items: center;
    justify-content: center;
    cursor: default;
  }
  .side-bar-claude-chat .token-ring svg {
    width: 16px;
    height: 16px;
    transform: rotate(-90deg);
  }
  .side-bar-claude-chat .token-ring circle {
    fill: none;
    stroke-width: 2.5;
  }
  .side-bar-claude-chat .token-ring-track {
    stroke: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .token-ring-value {
    stroke: var(--claude-text-muted);
    stroke-linecap: round;
    transition: stroke-dasharray var(--duration-normal) var(--ease);
  }
  .side-bar-claude-chat .token-ring.warn .token-ring-value {
    stroke: #e0a93a;
  }
  .side-bar-claude-chat .composer-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--claude-text-muted);
    cursor: pointer;
  }
  .side-bar-claude-chat .composer-icon-btn:hover:not(:disabled),
  .side-bar-claude-chat .composer-icon-btn.active {
    background: var(--claude-tint-strong);
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .composer-icon-btn:disabled {
    opacity: .4;
    cursor: default;
  }
  .side-bar-claude-chat .send-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-left: 2px;
    padding: 0;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease), filter var(--duration-fast) var(--ease);
  }
  .side-bar-claude-chat .send-btn.primary {
    background: var(--themeColor);
    color: #fff;
  }
  .side-bar-claude-chat .send-btn.primary:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  .side-bar-claude-chat .send-btn.primary:disabled {
    background: var(--claude-tint-strong);
    color: var(--claude-text-muted);
    cursor: default;
  }
  .side-bar-claude-chat .send-btn.stop {
    background: var(--claude-text-strong);
    color: var(--claude-bg);
  }

  /* Mode menu */
  .side-bar-claude-chat .mode-menu {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 8px);
    padding: 4px;
    background: var(--claude-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-3);
    z-index: 20;
  }
  .side-bar-claude-chat .mode-menu-header {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: var(--space-2) var(--space-2) 6px;
  }
  .side-bar-claude-chat .mode-menu-header span:first-child {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .mode-menu-hint {
    font-size: var(--font-size-xs);
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .mode-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    padding: var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .side-bar-claude-chat .mode-option:hover {
    background: var(--surface-hover);
  }
  .side-bar-claude-chat .mode-option.active {
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .mode-option-icon {
    margin-top: 1px;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .mode-option.active .mode-option-icon {
    color: var(--themeColor);
  }
  .side-bar-claude-chat .mode-option-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .side-bar-claude-chat .mode-option-title {
    font-size: var(--font-size-md);
    font-weight: 500;
    color: var(--claude-text-strong);
  }
  .side-bar-claude-chat .mode-option-description {
    font-size: var(--font-size-xs);
    line-height: 1.4;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .mode-option-check {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--themeColor);
  }

  .side-bar-claude-chat .compact-notice {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    line-height: 1.45;
    color: var(--claude-text-muted);
    background: var(--claude-tint);
    border-radius: var(--radius-md);
  }

  /* Attachments */
  .side-bar-claude-chat .attached-images {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 2px;
  }
  .side-bar-claude-chat .attached-image-thumb {
    position: relative;
    width: 52px;
    height: 52px;
    overflow: hidden;
    border: 1px solid var(--claude-border);
    border-radius: var(--radius-sm);
  }
  .side-bar-claude-chat .attached-image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .side-bar-claude-chat .remove-attachment {
    position: absolute;
    top: 2px;
    right: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, .6);
    color: #fff;
    cursor: pointer;
  }
  .side-bar-claude-chat .attached-contexts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 2px;
  }
  .side-bar-claude-chat .context-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 200px;
    height: 22px;
    padding: 0 4px 0 6px;
    overflow: hidden;
    white-space: nowrap;
    font-size: var(--font-size-xs);
    color: var(--claude-text);
    background: var(--claude-tint-strong);
    border-radius: var(--radius-xs);
  }
  .side-bar-claude-chat .context-chip-icon {
    flex-shrink: 0;
    color: var(--themeColor);
  }
  .side-bar-claude-chat .context-chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .side-bar-claude-chat .context-chip-remove {
    flex-shrink: 0;
    display: inline-flex;
    padding: 2px;
    border: none;
    border-radius: 3px;
    background: none;
    color: var(--claude-text-muted);
    cursor: pointer;
  }
  .side-bar-claude-chat .context-chip-remove:hover {
    color: var(--claude-danger);
  }

  /* Mention / slash menus */
  .side-bar-claude-chat .mention-menu {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 6px);
    max-height: 240px;
    padding: 4px;
    overflow-y: auto;
    background: var(--claude-surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-3);
    z-index: 10;
  }
  .side-bar-claude-chat .mention-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 30px;
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius-xs);
    background: none;
    color: var(--claude-text);
    font-size: var(--font-size-md);
    text-align: left;
    cursor: pointer;
  }
  .side-bar-claude-chat .mention-item:hover {
    background: var(--claude-tint-strong);
  }
  .side-bar-claude-chat .mention-icon {
    flex-shrink: 0;
    color: var(--claude-text-muted);
  }
  .side-bar-claude-chat .mention-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
