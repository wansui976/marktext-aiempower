<template>
  <div class="side-bar-claude-chat" @keydown.stop @mousedown.stop>
    <div class="chat-header">
      <div class="chat-title">
        <div class="title">Claude</div>
        <div class="subtitle" :title="contextLabel">{{ contextLabel || 'No document open' }}</div>
      </div>
      <div class="chat-actions">
        <button type="button" title="History" :disabled="streaming" @click="showSessions = !showSessions">History</button>
        <button type="button" title="Settings" @click="showSettings = !showSettings">⚙</button>
        <button type="button" title="New chat" :disabled="streaming" @click="newChat">New</button>
      </div>
    </div>

    <div v-if="showSettings || !apiKeyResolved" class="settings-panel">
      <label>Provider</label>
      <select v-model="providerInput">
        <option value="anthropic">Anthropic</option>
        <option value="openai">OpenAI Compatible</option>
      </select>
      <div class="settings-hint">
        Choose Anthropic Messages API or OpenAI Chat Completions compatible API.
      </div>

      <label>{{ providerLabel }} API Key</label>
      <input
        type="password"
        v-model="apiKeyInput"
        spellcheck="false"
        autocomplete="off"
        :placeholder="apiKeyPlaceholder"
      />
      <div class="settings-hint">
        Falls back to <code>{{ apiKeyEnvName }}</code> env var<span v-if="settingsProvider === 'anthropic'"> or <code>ANTHROPIC_AUTH_TOKEN</code></span><span v-else>. Local OpenAI-compatible endpoints may leave this empty</span>.
      </div>

      <label>Base URL</label>
      <input
        type="text"
        v-model="baseUrlInput"
        spellcheck="false"
        autocomplete="off"
        :placeholder="baseUrlPlaceholder"
      />
      <div class="settings-hint">
        Optional. Falls back to <code>{{ baseUrlEnvName }}</code> env var. Currently using <code>{{ settingsResolvedBaseUrl }}</code>.
      </div>

      <label>Model</label>
      <input
        type="text"
        v-model="modelInput"
        spellcheck="false"
        autocomplete="off"
        :placeholder="modelPlaceholder"
      />
      <div class="settings-hint">
        Optional. Falls back to <code>{{ modelEnvName }}</code> env var. Currently using <code>{{ settingsResolvedModel }}</code>.
      </div>

      <div class="settings-actions">
        <button type="button" @click="saveApiKey">Save</button>
        <button v-if="storedProvider || storedApiKey || storedBaseUrl || storedModel" type="button" class="ghost" @click="clearApiKey">Clear</button>
      </div>
    </div>

    <div v-if="showSessions" class="sessions-panel">
      <div class="sessions-header">
        <span>Sessions</span>
        <button type="button" :disabled="streaming" @click="newChat">New</button>
      </div>
      <div v-if="!sortedSessions.length" class="empty-sessions">
        No sessions for this document yet.
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
          <span class="session-title">{{ session.title || 'New chat' }}</span>
          <span class="session-meta">{{ formatSessionTime(session.updatedAt) }}</span>
        </button>
        <button
          type="button"
          class="session-delete"
          title="Delete session"
          :disabled="streaming"
          @click.stop="deleteSession(session.id)"
        >
          Del
        </button>
      </div>
    </div>

    <div v-if="referenceText" class="reference-panel">
      <div class="reference-header">
        <span>Reference</span>
        <button type="button" title="Clear reference" @click="clearReference">Clear</button>
      </div>
      <div v-if="referenceLabel" class="reference-label">{{ referenceLabel }}</div>
      <pre>{{ referenceText }}</pre>
    </div>

    <div ref="messageList" class="chat-messages" @click="handleMessageListClick">
      <div v-if="!displayMessages.length && apiKeyResolved" class="empty-hint">
        Ask anything about the current document.
      </div>
      <div
        v-for="message in displayMessages"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <div class="message-role">{{ message.role === 'user' ? 'You' : 'Claude' }}</div>
        <div class="message-blocks">
          <template v-for="(block, index) in message.blocks">
            <div
              v-if="block.type === 'text'"
              :key="index"
              class="block-text"
              v-html="renderMarkdown(block.text)"
            ></div>
            <div
              v-else-if="block.type === 'tool'"
              :key="index"
              class="block-tool"
              :class="block.status"
            >
              <span class="tool-icon">
                <span v-if="block.status === 'running'" class="spinner"></span>
                <span v-else-if="block.status === 'error'">⚠</span>
                <span v-else>✓</span>
              </span>
              <span class="tool-name">{{ toolLabel(block.name) }}</span>
            </div>
          </template>
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
        <span>Stopped. Your message is preserved.</span>
        <button type="button" class="retry-btn" @click="retryLastSend">Retry</button>
      </div>
    </div>

    <div v-if="pendingEdit" class="edit-preview">
      <div class="edit-preview-header">
        <span>Proposed edit · {{ toolLabel(pendingEdit.name) }}</span>
        <span class="edit-summary">{{ pendingEdit.summary }}</span>
      </div>
      <div class="edit-diff-meta">
        <span class="diff-badge add">+{{ pendingEdit.stats.added }}</span>
        <span class="diff-badge remove">-{{ pendingEdit.stats.removed }}</span>
        <span v-if="pendingEdit.stats.skipped" class="diff-badge skip">{{ pendingEdit.stats.skipped }} folds</span>
      </div>
      <div class="edit-diff">
        <template v-for="(line, idx) in pendingEdit.diff">
          <div :key="idx" class="diff-line" :class="line.type">
            <span class="diff-marker">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'skip' ? '…' : ' ' }}</span><span class="diff-text">{{ line.text }}</span>
          </div>
        </template>
      </div>
      <div class="edit-preview-actions">
        <button type="button" class="accept" @click="acceptPendingEdit">Accept</button>
        <button type="button" class="reject" @click="rejectPendingEdit">Reject</button>
      </div>
    </div>

    <form class="chat-input" @submit.prevent="send">
      <textarea
        ref="input"
        v-model="input"
        :disabled="streaming || compacting || !!pendingEdit || !apiKeyResolved"
        spellcheck="false"
        rows="3"
        :placeholder="inputPlaceholder"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <div class="input-row">
        <span class="hint">
          <span>Enter to send · Shift+Enter for newline</span>
          <span class="token-count" :class="{ warn: tokenWarning }">{{ tokenDisplay }}</span>
        </span>
        <span class="input-actions">
          <button
            v-if="showCompactButton"
            type="button"
            class="compact-btn"
            :disabled="compacting"
            @click="compactConversation"
          >{{ compacting ? 'Compacting...' : 'Compact' }}</button>
          <button v-if="streaming || compacting" type="button" class="stop" @click="stop">Stop</button>
          <button v-else type="submit" :disabled="!apiKeyResolved || !input.trim() || !!pendingEdit">Send</button>
        </span>
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
import bus from '../../bus'
import { PROVIDERS, normalizeProvider, resolveApiKey, resolveBaseUrl, resolveModel, sanitizeMessages, streamChat } from '../../node/claudeApi'
import { wordCount as getWordCount } from 'muya/lib/utils'

const PROVIDER_STORAGE_KEY = 'marktext.claudeProvider'
const STORAGE_KEY = 'marktext.claudeApiKey'
const BASE_URL_STORAGE_KEY = 'marktext.claudeBaseUrl'
const MODEL_STORAGE_KEY = 'marktext.claudeModel'
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

const TOOL_LABELS = {
  get_document: 'Reading current document',
  apply_edit: 'Editing document',
  replace_text: 'Replacing text',
  insert_text: 'Inserting text',
  read_file: 'Reading file',
  list_directory: 'Listing directory'
}

const EDIT_TOOL_NAMES = new Set(['apply_edit', 'replace_text', 'insert_text'])

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
      loadedDocumentSessionKey: 'global'
    }
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile,
      projectTree: state => state.project.projectTree
    }),
    providerResolved () {
      return normalizeProvider(this.storedProvider)
    },
    settingsProvider () {
      return normalizeProvider(this.providerInput || this.storedProvider)
    },
    activeProviderLabel () {
      return this.providerResolved === PROVIDERS.OPENAI ? 'OpenAI' : 'Claude'
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
    contextLabel () {
      if (this.currentFile && this.currentFile.filename) {
        return this.currentFile.filename
      }
      if (this.projectTree && this.projectTree.pathname) {
        return path.basename(this.projectTree.pathname)
      }
      return ''
    },
    currentDocumentSessionKey () {
      return getSessionDocumentKey(this.currentFile, this.projectTree)
    },
    inputPlaceholder () {
      if (!this.apiKeyResolved) return 'Set your Anthropic API key to start.'
      if (this.streaming) return `${this.activeProviderLabel} is replying...`
      return 'Ask AI about this document'
    },
    estimatedTokens () {
      return estimateTokens(this.apiMessages)
    },
    tokenDisplay () {
      const t = this.estimatedTokens
      if (t < 1000) return `${t} tok`
      return `${(t / 1000).toFixed(1)}k tok`
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
      if (value) this.$nextTick(this.focusInput)
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
    this.loadSessions(this.currentDocumentSessionKey)
    bus.$on('claude-selection-reference', this.handleSelectionReference)
    if (this.active) this.$nextTick(this.focusInput)
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
      const providerValue = normalizeProvider(this.providerInput)

      persist(PROVIDER_STORAGE_KEY, providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue)
      persist(STORAGE_KEY, apiKeyValue)
      persist(BASE_URL_STORAGE_KEY, baseUrlValue)
      persist(MODEL_STORAGE_KEY, modelValue)

      this.storedProvider = providerValue === PROVIDERS.ANTHROPIC ? '' : providerValue
      this.providerInput = providerValue
      this.storedApiKey = apiKeyValue
      this.storedBaseUrl = baseUrlValue
      this.storedModel = modelValue

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
      this.storedProvider = ''
      this.providerInput = PROVIDERS.ANTHROPIC
      this.storedApiKey = ''
      this.apiKeyInput = ''
      this.storedBaseUrl = ''
      this.baseUrlInput = ''
      this.storedModel = ''
      this.modelInput = ''
    },
    createSession (documentKey = this.loadedDocumentSessionKey) {
      const now = Date.now()
      return {
        id: nextSessionId(),
        documentKey,
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
        this.focusInput()
      })
    },
    deleteSession (sessionId) {
      if (this.streaming) return
      if (!window.confirm('Delete this Claude session?')) return

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
      this.$nextTick(this.focusInput)
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
        this.$nextTick(this.focusInput)
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
      this.$nextTick(this.focusInput)
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
        this.focusInput()
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
      return TOOL_LABELS[name] || name
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
        button.textContent = 'Copy'
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
    },
    clearReference () {
      this.reference = null
    },
    buildPromptWithReference (text) {
      if (!this.referenceText) return text

      const lines = [
        'Use this selected Markdown reference from the current document when answering.',
        this.referenceLabel ? `File: ${this.referenceLabel}` : '',
        '<selected_reference>',
        this.referenceText,
        '</selected_reference>',
        '',
        `Question: ${text}`
      ]
      return lines.filter(line => line !== '').join('\n')
    },
    applyMarkdownUpdate (newMarkdown) {
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
        return {
          newMarkdown,
          summary: `Replace ${count} occurrence${count === 1 ? '' : 's'}.`,
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
        return {
          newMarkdown,
          summary: `Insert ${input.content.length} chars at position ${position}.`,
          successResult: 'Document updated. Inserted text.'
        }
      }
      throw new Error(`Unknown edit tool: ${name}`)
    },
    requestEditApproval (name, input) {
      const proposal = this.buildEditProposal(name, input)
      const oldMarkdown = this.currentFile.markdown
      const diff = compactDiffLines(computeLineDiff(oldMarkdown, proposal.newMarkdown))
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
      return message
    },
    appendAssistantText (delta) {
      const msg = this.currentAssistantMessage
      if (!msg) return
      const last = msg.blocks[msg.blocks.length - 1]
      if (last && last.type === 'text') {
        last.text += delta
      } else {
        msg.blocks.push({ type: 'text', text: delta })
      }
    },
    appendAssistantTool (name, status) {
      const msg = this.currentAssistantMessage
      if (!msg) return null
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
      const text = this.input.trim()
      if (!text || this.streaming) return
      const provider = this.providerResolved
      const apiKey = resolveApiKey(this.storedApiKey, provider)
      if (provider === PROVIDERS.ANTHROPIC && !apiKey) {
        this.showSettings = true
        return
      }
      this.input = ''
      const apiText = this.buildPromptWithReference(text)
      await this.runSend(text, apiText)
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
          signal: this.abortController.signal
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
        this.currentAssistantMessage = null
        this.$nextTick(this.focusInput)
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
          signal: this.abortController.signal
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
        const marker = {
          id: nextId(),
          role: 'assistant',
          blocks: [{ type: 'text', text: `**Compacted earlier turns** — summary:\n\n${trimmed}` }]
        }
        this.displayMessages = [marker]
        this.apiMessages = [
          { role: 'user', content: 'Summary of earlier conversation (continue from here):' },
          { role: 'assistant', content: trimmed }
        ]
        this.clearMarkdownCache()
        this.saveCurrentSession({ touch: true })
        const afterTokens = estimateTokens(this.apiMessages)
        this.compactNotice = `Compacted earlier turns from about ${beforeTokens} tok to ${afterTokens} tok. You can keep asking follow-up questions; older verbatim turns were replaced by a summary.`
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
        target.textContent = copied ? 'Copied' : 'Copy failed'
        target.disabled = copied
        target.classList.toggle('error', !copied)
        setTimeout(() => {
          if (target.isConnected) {
            target.textContent = original
            target.disabled = false
            target.classList.remove('error')
          }
        }, copied ? 1200 : 1600)
        return
      }
      this.focusInput()
    }
  }
}
</script>

<style scoped>
  .side-bar-claude-chat {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--sideBarColor);
    box-sizing: border-box;
    overflow: hidden;
  }

  .chat-header {
    padding: 30px 12px 10px 18px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 1px solid var(--editorColor10);
    flex-shrink: 0;
  }

  .chat-title {
    min-width: 0;
    flex: 1;
  }

  .title {
    color: var(--sideBarTitleColor);
    font-weight: 600;
    font-size: 15px;
  }

  .subtitle {
    margin-top: 3px;
    font-size: 11px;
    color: var(--sideBarTextColor);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-actions {
    flex-shrink: 0;
    display: flex;
    gap: 4px;
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
    padding: 12px 14px 14px 18px;
    border-bottom: 1px solid var(--editorColor10);
    background: var(--floatBgColor);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .settings-panel label {
    font-size: 11px;
    color: var(--sideBarTextColor);
  }

  .settings-panel input,
  .settings-panel select {
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    background: var(--editorBgColor);
    color: var(--editorColor);
    outline: none;
  }

  .settings-panel input:focus,
  .settings-panel select:focus {
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
    padding: 10px 12px 12px 18px;
    border-bottom: 1px solid var(--editorColor10);
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
    padding: 8px 0;
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
  }

  .session-main {
    min-width: 0;
    flex: 1;
    padding: 6px 8px;
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

  .session-meta {
    margin-top: 2px;
    color: var(--sideBarTextColor);
    font-size: 10px;
  }

  .session-delete {
    flex-shrink: 0;
    width: 38px;
    padding: 0;
  }

  .reference-panel {
    flex-shrink: 0;
    padding: 10px 14px 12px 18px;
    border-bottom: 1px solid var(--editorColor10);
    background: var(--sideBarBgColor);
  }

  .reference-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--sideBarTextColor);
    margin-bottom: 4px;
  }

  .reference-header button {
    border: none;
    background: transparent;
    color: var(--sideBarTextColor);
    cursor: pointer;
    font-size: 11px;
    padding: 0;
  }

  .reference-header button:hover {
    color: var(--themeColor);
  }

  .reference-label {
    font-size: 11px;
    color: var(--sideBarTextColor);
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reference-panel pre {
    max-height: 120px;
    overflow: auto;
    margin: 0;
    padding: 8px 10px;
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    background: var(--floatBgColor);
    color: var(--editorColor);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 11px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
    user-select: text;
  }

  .chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 14px;
    overflow-anchor: none;
  }

  .empty-hint {
    color: var(--sideBarTextColor);
    font-size: 12px;
    text-align: center;
    margin-top: 24px;
  }

  .message {
    margin-bottom: 14px;
    contain: content;
    content-visibility: auto;
    contain-intrinsic-size: auto 80px;
  }

  .message-role {
    font-size: 11px;
    font-weight: 600;
    color: var(--sideBarTextColor);
    margin-bottom: 4px;
  }

  .message.user .message-role {
    color: var(--themeColor);
  }

  .message-blocks {
    font-size: 13px;
    line-height: 1.5;
  }

  .block-text {
    color: var(--editorColor);
    word-wrap: break-word;
    user-select: text;
  }

  .block-text >>> p { margin: 4px 0; }
  .block-text >>> ul,
  .block-text >>> ol { margin: 4px 0; padding-left: 20px; }
  .block-text >>> code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12px;
    background: var(--editorColor10);
    padding: 0 4px;
    border-radius: 3px;
  }
  .block-text >>> pre {
    background: var(--editorBgColor);
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    padding: 8px 10px;
    overflow-x: auto;
    margin: 6px 0;
  }
  .block-text >>> pre code {
    background: transparent;
    padding: 0;
    font-size: 12px;
  }
  .block-text >>> h1,
  .block-text >>> h2,
  .block-text >>> h3 {
    font-size: 14px;
    margin: 10px 0 4px;
  }
  .block-text >>> a { color: var(--themeColor); }

  .block-tool {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    margin: 4px 0;
    border-radius: 12px;
    font-size: 11px;
    background: var(--editorColor10);
    color: var(--sideBarTextColor);
  }

  .block-tool.error {
    color: #d9534f;
  }

  .tool-icon {
    display: inline-flex;
    width: 12px;
    height: 12px;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 10px;
    height: 10px;
    border: 1.5px solid var(--editorColor10);
    border-top-color: var(--themeColor);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error,
  .aborted {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    word-wrap: break-word;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    justify-content: space-between;
  }

  .error {
    background: rgba(217, 83, 79, 0.12);
    color: #d9534f;
  }

  .aborted {
    background: var(--editorColor10);
    color: var(--sideBarTextColor);
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
    border-top: 1px solid var(--editorColor10);
    background: var(--floatBgColor);
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 50vh;
  }

  .edit-preview-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    color: var(--sideBarTextColor);
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
    color: #2c7a2c;
    border-color: rgba(0, 180, 0, 0.2);
  }

  .diff-badge.remove {
    color: #b53b35;
    border-color: rgba(217, 83, 79, 0.2);
  }

  .edit-diff {
    overflow: auto;
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    background: var(--editorBgColor);
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

  .diff-line.add { background: rgba(0, 180, 0, 0.12); color: #2c7a2c; }
  .diff-line.remove { background: rgba(217, 83, 79, 0.12); color: #b53b35; }
  .diff-line.skip {
    background: rgba(0, 0, 0, 0.04);
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
  }

  .edit-preview-actions button {
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    background: var(--sideBarBgColor);
    color: var(--sideBarColor);
    cursor: pointer;
    font-size: 11px;
    height: 24px;
    padding: 0 12px;
  }

  .edit-preview-actions button.accept {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .edit-preview-actions button:hover {
    border-color: var(--themeColor);
    color: var(--themeColor);
  }

  .block-text >>> .claude-code-block-wrap {
    position: relative;
    margin: 6px 0;
  }

  .block-text >>> .claude-code-block-wrap > pre {
    margin: 0;
  }

  .block-text >>> .claude-code-copy {
    position: absolute;
    top: 4px;
    right: 4px;
    border: 1px solid var(--editorColor10);
    border-radius: 3px;
    background: var(--floatBgColor);
    color: var(--sideBarTextColor);
    cursor: pointer;
    font-size: 10px;
    padding: 1px 6px;
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
    color: #d9534f;
    border-color: #d9534f;
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
    padding: 10px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid var(--editorColor10);
    background: var(--sideBarBgColor);
  }

  .chat-input textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    padding: 8px 10px;
    border: 1px solid var(--editorColor10);
    border-radius: 4px;
    background: var(--floatBgColor);
    color: var(--editorColor);
    font-size: 13px;
    line-height: 1.4;
    font-family: inherit;
    outline: none;
  }

  .chat-input textarea:focus {
    border-color: var(--themeColor);
  }

  .chat-input textarea:disabled {
    opacity: .55;
    cursor: default;
  }

  .input-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .hint {
    font-size: 10px;
    color: var(--sideBarTextColor);
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .token-count {
    color: var(--sideBarTextColor);
    opacity: .8;
  }

  .token-count.warn {
    color: #d9534f;
    opacity: 1;
  }

  .input-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .compact-btn {
    color: var(--themeColor);
  }

  .compact-notice {
    font-size: 11px;
    color: var(--sideBarTextColor);
    background: var(--editorColor10);
    border-radius: 4px;
    padding: 6px 8px;
    line-height: 1.45;
  }

  .stop {
    color: #d9534f;
  }
</style>
