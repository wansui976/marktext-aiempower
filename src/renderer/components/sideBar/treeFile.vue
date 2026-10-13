<template>
  <div
    :title="file.pathname"
    class="side-bar-file"
    :style="{'padding-left': `${(depth * 16) + 26}px`, 'opacity': file.isMarkdown ? 1 : 0.7 }"
    @click="handleFileClick()"
    :class="[{'current': currentFile.pathname === file.pathname, 'active': file.id === activeItem.id }]"
    ref="file"
  >
    <file-icon
      :name="file.name"
    ></file-icon>
    <input
      type="text"
      @click.stop="noop"
      class="rename"
      v-if="renameCache === file.pathname"
      v-model="newName"
      ref="renameInput"
      @keydown.enter="rename"
    >
    <span v-else>{{ file.name }}</span>
  </div>
</template>

<script>
import FileIcon from './icon.vue'
import { mapState } from 'vuex'
import { fileMixins } from '../../mixins'
import { showContextMenu } from '../../contextMenu/sideBar'
import bus from '../../bus'

export default {
  mixins: [fileMixins],
  name: 'file',
  data () {
    return {
      newName: ''
    }
  },
  props: {
    file: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      required: true
    }
  },
  components: {
    FileIcon
  },
  computed: {
    ...mapState({
      renameCache: state => state.project.renameCache,
      activeItem: state => state.project.activeItem,
      clipboard: state => state.project.clipboard,
      currentFile: state => state.editor.currentFile,
      tabs: state => state.editor.tabs
    })
  },
  created () {
    this.$nextTick(() => {
      this.$refs.file.addEventListener('contextmenu', event => {
        event.preventDefault()
        this.$store.dispatch('CHANGE_ACTIVE_ITEM', this.file)
        showContextMenu(event, !!this.clipboard)
      })

      bus.$on('SIDEBAR::show-rename-input', this.focusRenameInput)
    })
  },
  methods: {
    noop () {},
    focusRenameInput () {
      this.$nextTick(() => {
        if (this.$refs.renameInput) {
          this.$refs.renameInput.focus()
          this.newName = this.file.name
        }
      })
    },
    rename () {
      const { newName } = this
      if (newName) {
        this.$store.dispatch('RENAME_IN_SIDEBAR', newName)
      }
    }
  }
}
</script>

<style scoped>
  .side-bar-file {
    display: flex;
    position: relative;
    align-items: center;
    cursor: default;
    user-select: none;
    height: 28px;
    box-sizing: border-box;
    padding-right: var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: background-color var(--duration-fast) var(--ease);
    &:hover {
      background: var(--surface-hover);
    }
    & > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .side-bar-file.current {
    background: var(--surface-selected);
    color: var(--text-primary);
    font-weight: 500;
  }
  .side-bar-file.active {
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-subtle);
  }
  input.rename {
    height: 22px;
    outline: none;
    margin: 0;
    padding: 0 var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--font-size-md);
    color: var(--text-primary);
    border: 1px solid var(--themeColor);
    background: var(--surface-base);
    width: 100%;
    border-radius: var(--radius-xs);
  }
</style>
