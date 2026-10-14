<template>
  <div ref="messageList" class="chat-messages" @click="handleClick">
    <div v-if="!messages.length && ready" class="empty-state">
      <div class="empty-state-icon">
        <lucide-icon name="sparkles" :size="18"></lucide-icon>
      </div>
      <div class="empty-state-title">{{ $t('ai.empty.title') }}</div>
      <div class="empty-state-copy">{{ $t('ai.empty.copy') }}</div>
      <div v-if="suggestions.length" class="empty-suggestions">
        <button
          v-for="item in suggestions"
          :key="item.id"
          type="button"
          class="suggestion"
          @click="$emit('suggest', item)"
        >
          <span class="suggestion-label">{{ item.label }}</span>
          <lucide-icon name="chevron-right" :size="14" class="suggestion-arrow"></lucide-icon>
        </button>
      </div>
    </div>
    <div
      v-for="message in messages"
      :key="message.id"
      class="message"
      :class="message.role"
    >
      <div v-if="message.role === 'system'" class="system-card">
        <div class="system-card-label">
          <lucide-icon name="list-checks" :size="13"></lucide-icon>
          {{ $t('ai.messages.compacted') }}
        </div>
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
      <div v-else class="message-blocks">
        <template v-for="(segment, index) in segmentBlocks(message.blocks)">
          <div
            v-if="segment.type === 'text'"
            :key="index"
            class="block-text"
            v-html="segment.block === streamingBlock ? streamingHtml : renderMarkdown(segment.block.text)"
          ></div>
          <div v-else :key="index" class="tool-activity">
            <span
              v-for="(tool, toolIndex) in segment.tools"
              :key="toolIndex"
              class="tool-step"
              :class="tool.status"
              :title="tool.name"
            >
              <span v-if="tool.status === 'running'" class="tool-spinner"></span>
              <lucide-icon v-else-if="tool.status === 'error'" name="triangle-alert" :size="13"></lucide-icon>
              <lucide-icon v-else :name="toolIcon(tool.name)" :size="13"></lucide-icon>
              <span class="tool-name">{{ toolLabel(tool.name) }}</span>
            </span>
          </div>
        </template>
      </div>
    </div>
    <div v-if="error" class="error">
      <lucide-icon name="triangle-alert" :size="14" class="notice-icon"></lucide-icon>
      <span class="notice-text">{{ error }}</span>
      <button
        v-if="canRetry"
        type="button"
        class="retry-btn"
        @click="$emit('retry')"
      >
        <lucide-icon name="rotate-ccw" :size="13"></lucide-icon>
        {{ $t('common.retry') }}
      </button>
    </div>
    <div v-if="!error && showStopped" class="aborted">
      <lucide-icon name="square" :size="13" class="notice-icon"></lucide-icon>
      <span class="notice-text">{{ $t('ai.messages.stopped') }}</span>
      <button type="button" class="retry-btn" @click="$emit('retry')">
        <lucide-icon name="rotate-ccw" :size="13"></lucide-icon>
        {{ $t('common.retry') }}
      </button>
    </div>
    <div v-if="undoCount > 0 && !streaming" class="undo-bar">
      <button type="button" class="undo-btn" @click="$emit('undo')">
        <lucide-icon name="undo-2" :size="14"></lucide-icon>
        {{ $t('ai.undo.lastEdit') }}
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
import { COPY_ICON_SVG } from './copyIcon'

// Lucide icon per tool (labels live in i18n under ai.tools.*).
const TOOL_ICONS = {
  get_document: 'file-text',
  get_document_outline: 'list-tree',
  get_document_section: 'file-text',
  search_document: 'search',
  apply_edit: 'file-pen-line',
  replace_text: 'replace',
  insert_text: 'text-cursor-input',
  read_file: 'file-text',
  list_directory: 'folder-open',
  glob_files: 'folder-search',
  grep_files: 'file-search',
  fetch_url: 'globe'
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
    ready: { type: Boolean, default: false },
    suggestions: { type: Array, default: () => [] }
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
        button.innerHTML = COPY_ICON_SVG
        pre.appendChild(button)
      })
      const html = wrapper.innerHTML
      if (this.markdownCache.size >= 256) this.markdownCache.delete(this.markdownCache.keys().next().value)
      this.markdownCache.set(text, html)
      return html
    },
    toolLabel (name) {
      const key = `ai.tools.${name}`
      return this.$te(key) ? this.$t(key) : name
    },
    toolIcon (name) {
      return TOOL_ICONS[name] || 'sparkles'
    },
    // Groups consecutive tool blocks into a single activity row.
    segmentBlocks (blocks) {
      const segments = []
      for (const block of blocks || []) {
        if (block.type === 'tool') {
          const last = segments[segments.length - 1]
          if (last && last.type === 'tools') {
            last.tools.push(block)
          } else {
            segments.push({ type: 'tools', tools: [block] })
          }
        } else if (block.type === 'text') {
          segments.push({ type: 'text', block })
        }
      }
      return segments
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
