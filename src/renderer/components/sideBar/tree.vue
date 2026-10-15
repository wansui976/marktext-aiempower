<template>
  <div class="tree-view">
    <div class="title">
      <!-- Placeholder -->
    </div>

    <!-- Opened tabs -->
    <div class="opened-files">
      <div class="title">
        <lucide-icon name="chevron-right" :size="14" class="icon-arrow" :class="{'fold': !showOpenedFiles}" @click.native.stop="toggleOpenedFiles()"></lucide-icon>
        <span class="default-cursor text-overflow" @click.stop="toggleOpenedFiles()">Opened files</span>
        <a href="javascript:;" @click.stop="saveAll(false)" title="Save All">
          <lucide-icon name="save-all" :size="14"></lucide-icon>
        </a>
        <a href="javascript:;" @click.stop="saveAll(true)" title="Close All">
          <lucide-icon name="list-x" :size="14"></lucide-icon>
        </a>
      </div>
      <div class="opened-files-list" v-show="showOpenedFiles">
        <transition-group name="list">
          <opened-file
            v-for="tab of tabs"
            :key="tab.id"
            :file="tab"
          ></opened-file>
        </transition-group>
      </div>
    </div>

    <!-- Project tree view -->
    <div
      class="project-tree" v-if="projectTree"
    >
      <div class="title">
        <lucide-icon name="chevron-right" :size="14" class="icon-arrow" :class="{'fold': !showDirectories}" @click.native.stop="toggleDirectories()"></lucide-icon>
        <span class="default-cursor text-overflow" @click.stop="toggleDirectories()">{{ projectTree.name }}</span>
      </div>
      <div class="tree-wrapper" v-show="showDirectories">
        <folder
          v-for="(folder, index) of projectTree.folders" :key="index + 'folder'"
          :folder="folder"
          :depth="depth"
        ></folder>
        <input
          type="text" class="new-input" v-show="createCache.dirname === projectTree.pathname"
          :style="{'margin-left': `${depth * 16 + 12}px` }"
          ref="input"
          v-model="createName"
          @keydown.enter="handleInputEnter"
        >
        <file
          v-for="(file, index) of projectTree.files" :key="index + 'file'"
          :file="file"
          :depth="depth"
        ></file>
        <div class="empty-project" v-if="projectTree.files.length === 0 && projectTree.folders.length === 0">
          <span>Empty project</span>
          <a href="javascript:;" @click.stop="createFile">Create File</a>
        </div>
      </div>
    </div>
    <div v-else class="open-project">
      <div class="centered-group">
        <button class="button-primary" @click="openFolder">
          Open Folder
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Folder from './treeFolder.vue'
import File from './treeFile.vue'
import OpenedFile from './treeOpenedTab.vue'
import { mapState } from 'vuex'
import bus from '../../bus'
import { createFileOrDirectoryMixins } from '../../mixins'

export default {
  mixins: [createFileOrDirectoryMixins],
  data () {
    this.depth = 0
    return {
      showDirectories: true,
      showNewInput: false,
      showOpenedFiles: true,
      createName: ''
    }
  },
  props: {
    projectTree: {
      validator: function (value) {
        return typeof value === 'object'
      },
      required: true
    },
    openedFiles: Array,
    tabs: Array
  },
  components: {
    Folder,
    File,
    OpenedFile
  },
  computed: {
    ...mapState({
      createCache: state => state.project.createCache
    })
  },
  created () {
    this.$nextTick(() => {
      bus.$on('SIDEBAR::show-new-input', this.handleInputFocus)
      // hide rename or create input if needed
      document.addEventListener('click', event => {
        const target = event.target
        if (target.tagName !== 'INPUT') {
          this.$store.dispatch('CHANGE_ACTIVE_ITEM', {})
          this.$store.commit('CREATE_PATH', {})
          this.$store.commit('SET_RENAME_CACHE', null)
        }
      })
      document.addEventListener('contextmenu', event => {
        const target = event.target
        if (target.tagName !== 'INPUT') {
          this.$store.commit('CREATE_PATH', {})
          this.$store.commit('SET_RENAME_CACHE', null)
        }
      })
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          this.$store.commit('CREATE_PATH', {})
          this.$store.commit('SET_RENAME_CACHE', null)
        }
      })
    })
  },
  methods: {
    openFolder () {
      this.$store.dispatch('ASK_FOR_OPEN_PROJECT')
    },
    saveAll (isClose) {
      this.$store.dispatch('ASK_FOR_SAVE_ALL', isClose)
    },
    createFile () {
      this.$store.dispatch('CHANGE_ACTIVE_ITEM', this.projectTree)
      bus.$emit('SIDEBAR::new', 'file')
    },
    toggleOpenedFiles () {
      this.showOpenedFiles = !this.showOpenedFiles
    },
    toggleDirectories () {
      this.showDirectories = !this.showDirectories
    }
  }
}
</script>

<style scoped>
  .list-enter-active, .list-leave-active {
    transition: all var(--duration-normal) var(--ease);
  }
  .list-enter, .list-leave-to {
    opacity: 0;
    transform: translateX(-12px);
  }
  .tree-view {
    font-size: var(--font-size-md);
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .tree-view > .title {
    height: 35px;
    flex-shrink: 0;
  }

  .icon-arrow {
    margin-right: var(--space-1);
    color: var(--text-muted);
    transition: transform var(--duration-normal) var(--ease);
    transform: rotate(90deg);
  }
  .icon-arrow.fold {
    transform: rotate(0);
  }

  /* Section headers */
  .opened-files > .title,
  .project-tree > .title {
    display: flex;
    align-items: center;
    height: 28px;
    margin: var(--space-1) var(--space-2) 0;
    padding: 0 var(--space-1) 0 var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    & > span {
      flex: 1;
      user-select: none;
    }
    & > a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-left: 2px;
      text-decoration: none;
      color: var(--text-muted);
      border-radius: var(--radius-xs);
      opacity: 0;
      transition: opacity var(--duration-fast) var(--ease), background-color var(--duration-fast) var(--ease);
      &:hover {
        color: var(--text-primary);
        background: var(--surface-active);
      }
    }
    &:hover > a {
      opacity: 1;
    }
  }

  .opened-files {
    display: flex;
    flex-direction: column;
  }
  .default-cursor {
    cursor: pointer;
  }
  .opened-files .opened-files-list {
    max-height: 200px;
    overflow: auto;
    padding: 2px var(--space-2);
    flex: 1;
  }

  .project-tree {
    display: flex;
    flex-direction: column;
    overflow: auto;
    margin-top: var(--space-2);
    flex: 1;
    & > .tree-wrapper {
      overflow: auto;
      flex: 1;
      padding: 2px var(--space-2) var(--space-4);
    }
  }
  .open-project {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    padding-bottom: 100px;
    & .centered-group {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
  .new-input {
    outline: none;
    height: 24px;
    margin: 2px 0;
    padding: 0 var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--font-size-md);
    color: var(--text-primary);
    border: 1px solid var(--themeColor);
    background: var(--surface-base);
    width: calc(100% - 45px);
    border-radius: var(--radius-xs);
    box-shadow: var(--focus-ring);
  }
  .tree-wrapper {
    position: relative;
  }
  .empty-project {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    font-size: var(--font-size-md);
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    padding-top: 40px;
    align-items: center;
    & > a {
      color: var(--text-accent);
      text-align: center;
      margin-top: var(--space-3);
      text-decoration: none;
    }
  }
  .bold {
    font-weight: 600;
  }
</style>
