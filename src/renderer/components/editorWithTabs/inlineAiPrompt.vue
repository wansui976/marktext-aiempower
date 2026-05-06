<template>
  <div
    v-if="visible"
    class="inline-ai-prompt"
    :style="popoverStyle"
    @mousedown.stop
    @click.stop
    @keydown.stop
  >
    <div v-if="phase === 'input'" class="phase-input">
      <div class="prompt-header">
        <div class="mode-tabs" role="tablist">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'ask' }"
            @click="setMode('ask')"
          >Ask</button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'rewrite' }"
            @click="setMode('rewrite')"
          >Rewrite</button>
        </div>
        <span class="prompt-meta">{{ selectionLineCount }} {{ selectionLineCount === 1 ? 'line' : 'lines' }}</span>
      </div>
      <textarea
        ref="input"
        v-model="instruction"
        class="prompt-textarea"
        rows="2"
        :placeholder="inputPlaceholder"
        @keydown.enter.exact.prevent="submit"
        @keydown.esc.prevent="cancel"
      ></textarea>
      <div class="prompt-actions">
        <button type="button" class="ghost" @click="cancel">Cancel</button>
        <button
          type="button"
          class="primary"
          :disabled="!instruction.trim() || !apiKeyAvailable"
          @click="submit"
        >{{ mode === 'rewrite' ? 'Rewrite ↵' : 'Ask ↵' }}</button>
      </div>
      <div v-if="!apiKeyAvailable" class="prompt-hint warn">
        Set an API key in the AI sidebar first.
      </div>
    </div>

    <div v-else-if="phase === 'streaming' || phase === 'review'" class="phase-review">
      <div class="prompt-header">
        <span class="prompt-title">{{ reviewTitle }}</span>
        <span class="prompt-instruction" :title="instruction">{{ instruction }}</span>
      </div>

      <div v-if="mode === 'rewrite'" class="diff-view">
        <div v-if="phase === 'streaming' && !response" class="streaming-placeholder">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
        <template v-else>
          <div class="diff-block remove">
            <div class="diff-label">Original</div>
            <div class="diff-text">{{ selectionText }}</div>
          </div>
          <div class="diff-block add">
            <div class="diff-label">{{ phase === 'streaming' ? 'Drafting…' : 'Rewritten' }}</div>
            <div class="diff-text">{{ response }}</div>
          </div>
        </template>
      </div>

      <div v-else class="answer-view">
        <div v-if="phase === 'streaming' && !response" class="streaming-placeholder">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
        <div v-else class="answer-text" v-html="renderedResponse"></div>
      </div>

      <div v-if="error" class="prompt-hint warn">{{ error }}</div>
      <div class="prompt-actions">
        <button v-if="phase === 'streaming'" type="button" class="ghost" @click="cancel">Stop</button>
        <template v-else-if="mode === 'rewrite'">
          <button type="button" class="ghost" @click="cancel">Reject (Esc)</button>
          <button
            type="button"
            class="primary"
            :disabled="!response.trim()"
            @click="accept"
          >Accept ↵</button>
        </template>
        <template v-else>
          <button type="button" class="ghost" @click="cancel">Close (Esc)</button>
          <button
            type="button"
            class="ghost"
            :disabled="!response.trim()"
            @click="copyAnswer"
          >{{ copyLabel }}</button>
          <button
            type="button"
            class="primary"
            @click="resetToInput"
          >Ask again</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import marked from 'marked'
import DOMPurify from 'dompurify'
import Prism from 'muya/lib/prism'
import { PROVIDERS, normalizeProvider, resolveApiKey, resolveBaseUrl, resolveModel, streamChat } from '../../node/claudeApi'

const PROVIDER_STORAGE_KEY = 'marktext.claudeProvider'
const STORAGE_KEY = 'marktext.claudeApiKey'
const BASE_URL_STORAGE_KEY = 'marktext.claudeBaseUrl'
const MODEL_STORAGE_KEY = 'marktext.claudeModel'
const PERSONA_STORAGE_KEY = 'marktext.claudePersona'

const POPOVER_WIDTH = 380
const POPOVER_MARGIN = 12

export default {
  data () {
    return {
      visible: false,
      phase: 'input',
      mode: 'ask',
      instruction: '',
      selectionText: '',
      response: '',
      error: '',
      anchorRect: null,
      abortController: null,
      copyLabel: 'Copy'
    }
  },
  computed: {
    selectionLineCount () {
      if (!this.selectionText) return 0
      return this.selectionText.split('\n').length
    },
    inputPlaceholder () {
      if (this.mode === 'rewrite') return 'How should I rewrite this? · Enter to submit, Esc to cancel'
      return 'Ask anything about this selection · Enter to submit, Esc to cancel'
    },
    reviewTitle () {
      if (this.mode === 'rewrite') {
        return this.phase === 'streaming' ? 'Rewriting…' : 'Preview'
      }
      return this.phase === 'streaming' ? 'Thinking…' : 'Answer'
    },
    apiKeyAvailable () {
      const provider = normalizeProvider(localStorage.getItem(PROVIDER_STORAGE_KEY) || '')
      const stored = localStorage.getItem(STORAGE_KEY) || ''
      const resolved = resolveApiKey(stored, provider)
      if (provider === PROVIDERS.ANTHROPIC) return !!resolved
      return true
    },
    renderedResponse () {
      return this.renderMarkdown(this.response)
    },
    popoverStyle () {
      if (!this.anchorRect) {
        return {
          left: '50%',
          top: '20%',
          width: `${POPOVER_WIDTH}px`,
          transform: 'translateX(-50%)'
        }
      }
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      let left = this.anchorRect.left
      const top = this.anchorRect.bottom + POPOVER_MARGIN
      if (left + POPOVER_WIDTH + POPOVER_MARGIN > viewportW) {
        left = Math.max(POPOVER_MARGIN, viewportW - POPOVER_WIDTH - POPOVER_MARGIN)
      }
      const finalTop = top + 280 > viewportH
        ? Math.max(POPOVER_MARGIN, this.anchorRect.top - 280 - POPOVER_MARGIN)
        : top
      return {
        left: `${Math.round(left)}px`,
        top: `${Math.round(finalTop)}px`,
        width: `${POPOVER_WIDTH}px`
      }
    }
  },
  methods: {
    renderMarkdown (text) {
      if (!text) return ''
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
      })
      return wrapper.innerHTML
    },
    open ({ selectionText, anchorRect, mode }) {
      const text = String(selectionText || '').trim()
      if (!text) return
      this.selectionText = String(selectionText)
      this.anchorRect = anchorRect || null
      this.instruction = ''
      this.response = ''
      this.error = ''
      this.copyLabel = 'Copy'
      this.phase = 'input'
      this.mode = mode === 'rewrite' ? 'rewrite' : 'ask'
      this.visible = true
      this.$nextTick(() => {
        const el = this.$refs.input
        if (el) {
          el.focus()
        }
      })
    },
    setMode (mode) {
      if (mode !== 'rewrite' && mode !== 'ask') return
      this.mode = mode
      this.$nextTick(() => {
        const el = this.$refs.input
        if (el) el.focus()
      })
    },
    resetToInput () {
      this.phase = 'input'
      this.response = ''
      this.error = ''
      this.copyLabel = 'Copy'
      this.$nextTick(() => {
        const el = this.$refs.input
        if (el) el.focus()
      })
    },
    cancel () {
      if (this.abortController) {
        try { this.abortController.abort() } catch (err) { /* ignore */ }
      }
      this.abortController = null
      this.visible = false
      this.phase = 'input'
      this.response = ''
      this.error = ''
      this.$emit('close')
    },
    accept () {
      if (this.mode !== 'rewrite') return
      if (!this.response || !this.response.trim()) return
      this.$emit('accept', {
        selectionText: this.selectionText,
        rewritten: this.response
      })
      this.visible = false
      this.phase = 'input'
      this.response = ''
    },
    async copyAnswer () {
      if (!this.response || !this.response.trim()) return
      try {
        await navigator.clipboard.writeText(this.response)
        this.copyLabel = 'Copied'
        setTimeout(() => { this.copyLabel = 'Copy' }, 1500)
      } catch (err) {
        this.copyLabel = 'Copy failed'
        setTimeout(() => { this.copyLabel = 'Copy' }, 1500)
      }
    },
    async submit () {
      const instruction = this.instruction.trim()
      if (!instruction) return
      const provider = normalizeProvider(localStorage.getItem(PROVIDER_STORAGE_KEY) || '')
      const apiKey = resolveApiKey(localStorage.getItem(STORAGE_KEY) || '', provider)
      if (provider === PROVIDERS.ANTHROPIC && !apiKey) {
        this.error = 'No API key configured.'
        return
      }
      const baseUrl = resolveBaseUrl(localStorage.getItem(BASE_URL_STORAGE_KEY) || '', provider)
      const model = resolveModel(localStorage.getItem(MODEL_STORAGE_KEY) || '', provider)
      const persona = localStorage.getItem(PERSONA_STORAGE_KEY) || ''

      const userPrompt = this.mode === 'rewrite'
        ? `You are rewriting a portion of a Markdown document selected by the user.

User instruction: ${instruction}

Selected text (between <<<SELECTION>>> markers):
<<<SELECTION>>>
${this.selectionText}
<<<SELECTION>>>

Reply with ONLY the rewritten text. Do not wrap it in code fences, do not add quotation marks, do not add any preamble or commentary. Preserve indentation and line breaks where appropriate.`
        : `The user selected the following text from a Markdown document and is asking a question about it.

User question: ${instruction}

Selected text (between <<<SELECTION>>> markers):
<<<SELECTION>>>
${this.selectionText}
<<<SELECTION>>>

Answer the question concisely. Do not propose edits to the document. Reply in the same language as the user's question.`

      this.phase = 'streaming'
      this.response = ''
      this.error = ''
      this.abortController = new AbortController()

      try {
        const stream = streamChat({
          provider,
          apiKey,
          baseUrl,
          model,
          messages: [{ role: 'user', content: userPrompt }],
          executeTool: async () => 'Tools are disabled for inline edits.',
          signal: this.abortController.signal,
          persona
        })
        for await (const event of stream) {
          if (event.type === 'text') {
            this.response += event.text
          }
        }
        this.phase = 'review'
        if (this.mode === 'rewrite') {
          this.response = stripWrappers(this.response)
        }
        this.$nextTick(() => {
          const root = this.$el
          if (root && root.focus) root.focus()
        })
      } catch (err) {
        if (err.name === 'AbortError') {
          this.phase = 'input'
        } else {
          this.error = err.message || String(err)
          this.phase = 'review'
        }
      } finally {
        this.abortController = null
      }
    }
  }
}

const stripWrappers = (text) => {
  let s = String(text || '').trim()
  const fenceMatch = s.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/)
  if (fenceMatch) s = fenceMatch[1]
  return s
}
</script>

<style scoped>
  .inline-ai-prompt {
    position: fixed;
    z-index: 1000;
    background: var(--floatBgColor, #fff);
    border: 1px solid var(--editorColor10, #e0e0e0);
    border-radius: 10px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
    padding: 12px;
    font-size: 13px;
    color: var(--editorColor, #333);
    outline: none;
    max-height: 70vh;
    overflow-y: auto;
  }

  .prompt-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    min-width: 0;
  }

  .prompt-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--sideBarTextColor, #888);
    font-weight: 600;
  }

  .prompt-meta,
  .prompt-instruction {
    font-size: 11px;
    color: var(--sideBarTextColor, #888);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
    max-width: 60%;
  }

  .mode-tabs {
    display: inline-flex;
    background: var(--editorColor04, rgba(0,0,0,0.04));
    border-radius: 6px;
    padding: 2px;
    gap: 0;
  }

  .mode-tab {
    border: none;
    background: transparent;
    color: var(--sideBarTextColor, #888);
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.2;
    transition: background-color .12s, color .12s;
  }

  .mode-tab:hover:not(.active) {
    color: var(--editorColor, #333);
  }

  .mode-tab.active {
    background: var(--floatBgColor, #fff);
    color: var(--themeColor, #d97757);
    box-shadow: 0 1px 2px rgba(0,0,0,.06);
  }

  .prompt-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--editorColor10, #e0e0e0);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    line-height: 1.45;
    background: var(--editorBgColor, #fff);
    color: var(--editorColor, #333);
    outline: none;
    resize: vertical;
    min-height: 50px;
    font-family: inherit;
  }

  .prompt-textarea:focus {
    border-color: var(--themeColor, #d97757);
  }

  .prompt-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }

  .prompt-actions button {
    height: 26px;
    padding: 0 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid var(--editorColor10, #e0e0e0);
    background: var(--floatBgColor, #fff);
    color: var(--editorColor, #333);
  }

  .prompt-actions button.ghost {
    background: transparent;
    color: var(--sideBarTextColor, #777);
  }

  .prompt-actions button.ghost:hover:not(:disabled) {
    border-color: var(--themeColor, #d97757);
    color: var(--themeColor, #d97757);
  }

  .prompt-actions button.primary {
    background: var(--themeColor, #d97757);
    border-color: var(--themeColor, #d97757);
    color: #fff;
    font-weight: 500;
  }

  .prompt-actions button.primary:disabled {
    opacity: .5;
    cursor: default;
  }

  .prompt-hint {
    margin-top: 6px;
    font-size: 11px;
    color: var(--sideBarTextColor, #888);
  }

  .prompt-hint.warn {
    color: #d04b3f;
  }

  .diff-view {
    margin-top: 4px;
    border: 1px solid var(--editorColor10, #e0e0e0);
    border-radius: 6px;
    overflow: hidden;
    max-height: 320px;
    overflow-y: auto;
  }

  .diff-block {
    padding: 6px 10px 8px;
    font-size: 12px;
    line-height: 1.5;
  }

  .diff-block.remove {
    background: rgba(217, 83, 79, 0.06);
    border-bottom: 1px solid var(--editorColor10, #e0e0e0);
  }

  .diff-block.add {
    background: rgba(46, 178, 125, 0.06);
  }

  .diff-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--sideBarTextColor, #888);
    margin-bottom: 3px;
    font-weight: 600;
  }

  .diff-block.remove .diff-label { color: #b53b35; }
  .diff-block.add .diff-label { color: #2c7a2c; }

  .diff-text {
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--editorColor, #333);
    font-family: inherit;
  }

  .answer-view {
    margin-top: 4px;
    border: 1px solid var(--editorColor10, #e0e0e0);
    border-radius: 6px;
    padding: 10px 12px;
    max-height: 320px;
    overflow-y: auto;
    background: var(--editorBgColor, #fff);
  }

  .answer-text {
    word-wrap: break-word;
    color: var(--editorColor, #333);
    font-size: 12px;
    line-height: 1.6;
    font-family: inherit;
  }

  .answer-text >>> *:first-child { margin-top: 0; }
  .answer-text >>> *:last-child { margin-bottom: 0; }
  .answer-text >>> p { margin: 0 0 8px; }
  .answer-text >>> ul,
  .answer-text >>> ol { margin: 6px 0; padding-left: 20px; }
  .answer-text >>> li { margin-bottom: 2px; }
  .answer-text >>> code {
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--editorColor04, rgba(0,0,0,.05));
    font-family: Menlo, Monaco, Consolas, monospace;
  }
  .answer-text >>> pre {
    margin: 6px 0;
    padding: 8px 10px;
    border-radius: 5px;
    background: var(--editorColor04, rgba(0,0,0,.05));
    overflow-x: auto;
    font-size: 11px;
    line-height: 1.5;
  }
  .answer-text >>> pre code {
    padding: 0;
    background: transparent;
    font-size: inherit;
  }
  .answer-text >>> blockquote {
    margin: 6px 0;
    padding: 4px 10px;
    border-left: 3px solid var(--themeColor, #d97757);
    color: var(--sideBarTextColor, #777);
  }
  .answer-text >>> h1,
  .answer-text >>> h2,
  .answer-text >>> h3 {
    margin: 10px 0 4px;
    font-size: 13px;
    font-weight: 600;
  }
  .answer-text >>> strong { font-weight: 600; }
  .answer-text >>> em { font-style: italic; }
  .answer-text >>> table {
    border-collapse: collapse;
    font-size: 11px;
    margin: 6px 0;
  }
  .answer-text >>> th,
  .answer-text >>> td {
    border: 1px solid var(--editorColor10, #e0e0e0);
    padding: 3px 6px;
  }
  .answer-text >>> th {
    background: var(--editorColor04, rgba(0,0,0,.05));
    font-weight: 600;
  }

  .streaming-placeholder {
    padding: 14px;
    text-align: center;
  }

  .streaming-placeholder .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin: 0 3px;
    border-radius: 50%;
    background: var(--themeColor, #d97757);
    opacity: .4;
    animation: bounce 1.2s infinite;
  }

  .streaming-placeholder .dot:nth-child(2) { animation-delay: .2s; }
  .streaming-placeholder .dot:nth-child(3) { animation-delay: .4s; }

  @keyframes bounce {
    0%, 80%, 100% { opacity: .3; transform: scale(.8); }
    40% { opacity: 1; transform: scale(1); }
  }
</style>
