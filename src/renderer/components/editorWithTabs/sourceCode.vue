<template>
  <div
    class="source-code"
    ref="sourceCode"
  >
  </div>
</template>

<script>
import codeMirror, { setMode, setCursorAtFirstLine, setCursorAtLastLine, setTextDirection } from '../../codeMirror'
import { wordCount as getWordCount } from 'muya/lib/utils'
import { mapState } from 'vuex'
import { adjustCursor } from '../../util'
import bus from '../../bus'
import { darkThemes } from '@/util/themeColor'
import { readDocumentPosition, writeDocumentPosition } from '@/util/documentPosition'

export default {
  props: {
    markdown: String,
    cursor: Object,
    textDirection: {
      type: String,
      required: true
    }
  },

  computed: {
    ...mapState({
      theme: state => state.preferences.theme,
      sourceCode: state => state.preferences.sourceCode,
      currentTab: state => state.editor.currentFile
    })
  },

  data () {
    return {
      contentState: null,
      editor: null,
      commitTimer: null,
      referenceFrame: null,
      positionSaveTimer: null,
      viewDestroyed: false,
      tabId: null,
      tabPathname: '',
      lastCommittedMarkdown: ''
    }
  },

  watch: {
    textDirection: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        setTextDirection(editor, value)
      }
    }
  },

  created () {
    this.$nextTick(() => {
      // TODO: Should we load markdown from the tab or mapped vue property?
      const { id } = this.currentTab
      const { markdown = '', theme, cursor, textDirection } = this
      const container = this.$refs.sourceCode
      const codeMirrorConfig = {
        value: markdown,
        lineNumbers: true,
        autofocus: true,
        lineWrapping: true,
        styleActiveLine: true,
        direction: textDirection,
        viewportMargin: 40,
        lineNumberFormatter (line) {
          if (line % 10 === 0 || line === 1) {
            return line
          } else {
            return ''
          }
        }
      }

      // Set theme
      if (darkThemes.has(theme)) {
        codeMirrorConfig.theme = 'one-dark'
      }

      // Init CodeMirror
      const editor = this.editor = codeMirror(container, codeMirrorConfig)
      this.lastCommittedMarkdown = markdown
      this.tabPathname = this.currentTab.pathname || ''

      bus.$on('file-loaded', this.handleFileChange)
      bus.$on('claude-apply-edit', this.handleClaudeApplyEdit)
      bus.$on('invalidate-image-cache', this.handleInvalidateImageCache)
      bus.$on('file-changed', this.handleFileChange)
      bus.$on('selectAll', this.handleSelectAll)
      bus.$on('image-action', this.handleImageAction)

      setMode(editor, 'markdown')
      this.listenChange()
      editor.on('scroll', this.scheduleSaveDocumentPosition)

      editor.on('contextmenu', (cm, event) => {
        // Make sure no context menu is shown in source-code mode because we have to handle
        // Muyas menu by Electron.
        event.preventDefault()
        event.stopPropagation()
      })

      // NOTE: Cursor may be not null but the inner values are.
      if (cursor && cursor.anchor && cursor.focus) {
        const { anchor, focus } = cursor
        editor.setSelection(anchor, focus, { scroll: true }) // Scroll the focus into view.
      } else {
        setCursorAtFirstLine(editor)
      }
      this.restoreDocumentPosition(cursor)
      this.tabId = id
    })
  },
  beforeDestroy () {
    // NOTE: Clear timer and manually commit changes. After mode switching and cleanup may follow
    // further key inputs, so ignore all inputs.
    this.viewDestroyed = true
    if (this.commitTimer) clearTimeout(this.commitTimer)
    if (this.referenceFrame) {
      window.cancelAnimationFrame(this.referenceFrame)
      this.referenceFrame = null
    }
    if (this.positionSaveTimer) {
      window.clearTimeout(this.positionSaveTimer)
      this.positionSaveTimer = null
    }

    bus.$off('file-loaded', this.handleFileChange)
    bus.$off('claude-apply-edit', this.handleClaudeApplyEdit)
    bus.$off('invalidate-image-cache', this.handleInvalidateImageCache)
    bus.$off('file-changed', this.handleFileChange)
    bus.$off('selectAll', this.handleSelectAll)
    bus.$off('image-action', this.handleImageAction)

    const { editor } = this
    this.saveDocumentPosition()
    const { cursor, markdown } = this.getMarkdownAndCursor(editor)
    bus.$emit('file-changed', { id: this.tabId, markdown, cursor, renderCursor: true })
  },
  methods: {
    handleImageAction ({ id, result, alt }) {
      const { editor } = this
      const value = editor.getValue()
      const focus = editor.getCursor('focus')
      const anchor = editor.getCursor('anchor')
      const lines = value.split('\n')
      const index = lines.findIndex(line => line.indexOf(id) > 0)

      if (index > -1) {
        const oldLine = lines[index]
        lines[index] = oldLine.replace(new RegExp(`!\\[${id}\\]\\(.*\\)`), `![${alt}](${result})`)
        const newValue = lines.join('\n')
        editor.setValue(newValue)
        const match = /(!\[.*\]\(.*\))/.exec(oldLine)
        if (!match) {
          // User maybe delete `![]()` structure, and the match is null.
          return
        }
        const range = {
          start: match.index,
          end: match.index + match[1].length
        }
        const delta = alt.length + result.length + 5 - match[1].length

        const adjust = pointer => {
          if (!pointer) {
            return
          }
          if (pointer.line !== index) {
            return
          }
          if (pointer.ch <= range.start) {
            // do nothing.
          } else if (pointer.ch > range.start && pointer.ch < range.end) {
            pointer.ch = range.start + alt.length + result.length + 5
          } else {
            pointer.ch += delta
          }
        }

        adjust(focus)
        adjust(anchor)
        if (focus && anchor) {
          editor.setSelection(anchor, focus, { scroll: true })
        } else {
          setCursorAtLastLine()
        }
      }
    },
    handleClaudeApplyEdit ({ id, markdown }) {
      if (id !== this.tabId || typeof markdown !== 'string') {
        return
      }

      if (this.commitTimer) {
        clearTimeout(this.commitTimer)
        this.commitTimer = null
      }

      this.editor.setValue(markdown)
      this.lastCommittedMarkdown = markdown
      setCursorAtLastLine(this.editor)
    },
    queueClaudeSelectionReference (cm) {
      if (this.referenceFrame) return

      this.referenceFrame = window.requestAnimationFrame(() => {
        this.referenceFrame = null
        this.emitClaudeSelectionReference(cm.getSelection())
      })
    },
    emitClaudeSelectionReference (text) {
      const selectedText = String(text || '').trim()
      if (!selectedText || !this.currentTab) return

      bus.$emit('claude-selection-reference', {
        fileId: this.currentTab.id || this.tabId,
        filename: this.currentTab.filename || '',
        text: selectedText
      })
    },
    saveDocumentPosition (pathname = this.tabPathname) {
      const { editor } = this
      if (!editor || !pathname) return

      const scroller = editor.getScrollerElement()
      writeDocumentPosition(pathname, {
        scrollTop: Math.max(0, Math.round(scroller.scrollTop || 0))
      })
    },
    scheduleSaveDocumentPosition () {
      if (this.positionSaveTimer) return

      this.positionSaveTimer = window.setTimeout(() => {
        this.positionSaveTimer = null
        this.saveDocumentPosition()
      }, 250)
    },
    restoreDocumentPosition (cursor) {
      const { editor } = this
      if (!editor) return

      const position = readDocumentPosition(this.currentTab && this.currentTab.pathname)
      const hasSavedScrollTop = position && Number.isFinite(position.scrollTop)
      const shouldRestoreTop = hasSavedScrollTop || !cursor
      if (!shouldRestoreTop) return

      const scrollTop = hasSavedScrollTop ? position.scrollTop : 0
      window.requestAnimationFrame(() => {
        if (this.editor) {
          this.editor.getScrollerElement().scrollTop = Math.max(0, scrollTop)
        }
      })
    },
    scheduleCommit () {
      if (this.commitTimer) clearTimeout(this.commitTimer)
      this.commitTimer = setTimeout(() => {
        // See "beforeDestroy" note
        if (!this.viewDestroyed) {
          if (this.tabId) {
            this.commitEditorState()
          } else {
            // This may occur during tab switching but should not occur otherwise.
            console.warn('LISTEN_FOR_CONTENT_CHANGE: Cannot commit changes because not tab id was set!')
          }
        }
      }, 1000)
    },
    commitEditorState () {
      const { cursor, markdown } = this.getMarkdownAndCursor(this.editor)
      const payload = { id: this.tabId, markdown, cursor }
      if (markdown !== this.lastCommittedMarkdown) {
        payload.wordCount = getWordCount(markdown)
        this.lastCommittedMarkdown = markdown
      }
      this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', payload)
    },
    listenChange () {
      const { editor } = this
      editor.on('changes', () => {
        this.scheduleCommit()
      })
      editor.on('cursorActivity', cm => {
        this.queueClaudeSelectionReference(cm)
        this.scheduleCommit()
      })
    },
    // Another tab was selected - only listen to get changes but don't set history or other things.
    handleFileChange ({ id, markdown, cursor }) {
      this.prepareTabSwitch()
      this.saveDocumentPosition()
      bus.$emit('claude-selection-reference', null)

      const { editor } = this
      if (typeof markdown === 'string') {
        editor.setValue(markdown)
        this.lastCommittedMarkdown = markdown
      }
      // Cursor is null when loading a file or creating a new tab in source code mode.
      if (cursor) {
        const { anchor, focus } = cursor
        editor.setSelection(anchor, focus, { scroll: true }) // Scroll the focus into view.
      } else {
        setCursorAtFirstLine(editor)
      }
      this.tabPathname = this.currentTab.pathname || ''
      this.restoreDocumentPosition(cursor)
      this.tabId = id
    },
    // Get markdown and cursor from CodeMirror.
    getMarkdownAndCursor (cm) {
      let focus = cm.getCursor('head')
      let anchor = cm.getCursor('anchor')
      const markdown = cm.getValue()
      const convertToMuyaCursor = cursor => {
        const line = cm.getLine(cursor.line)
        const preLine = cm.getLine(cursor.line - 1)
        const nextLine = cm.getLine(cursor.line + 1)
        return adjustCursor(cursor, preLine, line, nextLine)
      }

      anchor = convertToMuyaCursor(anchor) // Selection start as Muya cursor
      focus = convertToMuyaCursor(focus) // Selection end as Muya cursor

      // Normalize cursor that `anchor` is always before `focus` because
      // this is the expected behavior in Muya.
      if (anchor && focus && anchor.line > focus.line) {
        const tmpCursor = focus
        focus = anchor
        anchor = tmpCursor
      }
      return { cursor: { focus, anchor }, markdown }
    },
    // Commit changes from old tab. Problem: tab was already switched, so commit changes with old tab id.
    prepareTabSwitch () {
      if (this.commitTimer) clearTimeout(this.commitTimer)
      if (this.tabId) {
        const { editor } = this
        const { cursor, markdown } = this.getMarkdownAndCursor(editor)
        this.$store.dispatch('LISTEN_FOR_CONTENT_CHANGE', { id: this.tabId, markdown, cursor })
        this.lastCommittedMarkdown = markdown
        this.tabId = null // invalidate tab id
      }
    },

    handleSelectAll () {
      if (!this.sourceCode) {
        return
      }

      const { editor } = this
      if (editor && editor.hasFocus()) {
        this.editor.execCommand('selectAll')
      } else {
        const activeElement = document.activeElement
        const nodeName = activeElement.nodeName
        if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
          activeElement.select()
        }
      }
    },

    handleInvalidateImageCache () {
      if (this.editor) {
        this.editor.invalidateImageCache()
      }
    }
  }
}
</script>

<style>
  .source-code {
    height: calc(100vh - var(--titleBarHeight));
    box-sizing: border-box;
    overflow: hidden;
    padding: 50px 0;
  }
  .source-code .CodeMirror {
    height: 100%;
    margin: 0 auto;
    max-width: var(--editorAreaWidth);
    background: transparent;
  }
  .source-code .CodeMirror-gutters {
    border-right: none;
    background-color: transparent;
  }
  .source-code .CodeMirror-activeline-background,
  .source-code .CodeMirror-activeline-gutter {
    background: var(--floatHoverColor);
  }
</style>
