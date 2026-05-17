<template>
  <div ref="messageList" class="chat-messages" @click="handleClick">
    <div v-if="!messages.length && ready" class="empty-hint">
      <div class="empty-hint-title">{{ $t('ai.empty.title') }}</div>
      <div class="empty-hint-copy">{{ $t('ai.empty.copy') }}</div>
    </div>
    <div
      v-for="message in messages"
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
                v-html="block === streamingBlock ? streamingHtml : renderMarkdown(block.text)"
              ></div>
              <div
                v-else-if="block.type === 'tool'"
                :key="index"
                class="block-tool"
                :class="block.status"
              >
                <span class="tool-icon">
                  <span v-if="block.status === 'running'" class="tool-spinner"></span>
                  <span v-else-if="block.status === 'error'">&#x26A0;</span>
                  <span v-else>&#x2713;</span>
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
        v-if="canRetry"
        type="button"
        class="retry-btn"
        @click="$emit('retry')"
      >Retry</button>
    </div>
    <div v-if="!error && showStopped" class="aborted">
      <span>{{ $t('ai.messages.stopped') }}</span>
      <button type="button" class="retry-btn" @click="$emit('retry')">{{ $t('common.retry') }}</button>
    </div>
    <div v-if="undoCount > 0 && !streaming" class="undo-bar">
      <button type="button" class="undo-btn" @click="$emit('undo')">
        <span class="undo-icon">&#x21A9;</span> {{ $t('ai.undo.lastEdit') }}
      </button>
      <span class="undo-hint">
        {{ undoCount > 1 ? $t('ai.undo.stacks', { count: undoCount }) : $t('ai.undo.stack', { count: undoCount }) }}
      </span>
    </div>
  </div>
</template>

<script>
import marked from 'marked'
import DOMPurify from 'dompurify'
import Prism from 'muya/lib/prism'
import copyIcon from 'muya/lib/assets/pngicon/copy/2.png'

const TOOL_LABELS = {
  get_document: 'Read document',
  apply_edit: 'Replace document',
  replace_text: 'Replace text',
  insert_text: 'Insert text',
  read_file: 'Read file',
  list_directory: 'List directory',
  fetch_url: 'Fetch URL'
}

export default {
  props: {
    messages: { type: Array, default: () => [] },
    streaming: { type: Boolean, default: false },
    streamingBlock: { type: Object, default: null },
    streamingHtml: { type: String, default: '' },
    error: { type: String, default: '' },
    canRetry: { type: Boolean, default: false },
    showStopped: { type: Boolean, default: false },
    undoCount: { type: Number, default: 0 },
    ready: { type: Boolean, default: false }
  },
  data () {
    return {
      markdownCache: new Map()
    }
  },
  methods: {
    renderMarkdown (text) {
      if (!text) return ''
      const cached = this.markdownCache.get(text)
      if (cached) return cached
      const raw = marked(text, {
        gfm: true,
        breaks: true,
        highlight: (code, lang) => {
          if (lang && Prism.languages[lang]) {
            try { return Prism.highlight(code, Prism.languages[lang], lang) } catch (e) { /* ignore */ }
          }
          return code
        }
      })
      const safe = DOMPurify.sanitize(raw)
      const wrapper = document.createElement('div')
      wrapper.innerHTML = safe
      wrapper.querySelectorAll('pre > code').forEach(code => {
        const pre = code.parentElement
        if (!pre || pre.querySelector('.claude-code-copy')) return
        pre.classList.add('claude-code-block')
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'claude-code-copy'
        button.title = 'Copy content'
        button.setAttribute('aria-label', 'Copy content')
        const icon = document.createElement('img')
        icon.className = 'icon'
        icon.src = copyIcon
        icon.alt = ''
        icon.draggable = false
        button.appendChild(icon)
        pre.appendChild(button)
      })
      const html = wrapper.innerHTML
      if (this.markdownCache.size >= 256) this.markdownCache.delete(this.markdownCache.keys().next().value)
      this.markdownCache.set(text, html)
      return html
    },
    toolLabel (name) {
      return TOOL_LABELS[name] || name
    },
    handleClick (event) {
      this.$emit('click', event)
    },
    clearCache () {
      this.markdownCache.clear()
    },
    scrollToBottom (force) {
      const container = this.$refs.messageList
      if (!container) return
      const threshold = 80
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
      if (force || isNearBottom) {
        container.scrollTop = container.scrollHeight
      }
    }
  }
}
</script>

<style scoped>
  .block-text {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  .block-text >>> pre {
    display: block;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: pre;
  }

  .block-text >>> pre code {
    display: block;
    width: max-content;
    min-width: 100%;
    white-space: pre;
  }
</style>
