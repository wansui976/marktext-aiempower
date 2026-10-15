<template>
  <div class="editor-tabs">
    <div
      class="scrollable-tabs"
      ref="tabContainer"
    >
      <ul
        ref="tabDropContainer"
        class="tabs-container"
      >
        <li
          :title="file.pathname"
          :class="{'active': currentFile.id === file.id, 'unsaved': !file.isSaved }"
          v-for="file of tabs"
          :key="file.id"
          :data-id="file.id"
          @click.stop="selectFile(file)"
          @click.middle="closeTab(file.id)"
          @contextmenu.prevent="handleContextMenu($event, file)"
        >
          <span class="name">{{ file.filename }}</span>
          <span class="tab-action" @click.stop="removeFileInTab(file)">
            <span class="unsaved-dot"></span>
            <lucide-icon name="x" :size="13" class="close-icon"></lucide-icon>
          </span>
        </li>
      </ul>
    </div>
    <div
      class="new-file"
      @click.stop="newFile()"
    >
      <lucide-icon name="plus" :size="15"></lucide-icon>
    </div>
  </div>
</template>

<script>
import { shell, clipboard } from 'electron'
import { mapState } from 'vuex'
import autoScroll from 'dom-autoscroller'
import dragula from 'dragula'
import { tabsMixins } from '../../mixins'
import { showContextMenu } from '../../contextMenu/tabs'
import bus from '../../bus'

export default {
  data () {
    this.autoScroller = null
    this.drake = null
    return {}
  },
  mixins: [tabsMixins],
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile,
      tabs: state => state.editor.tabs
    })
  },
  methods: {
    newFile () {
      this.$store.dispatch('NEW_UNTITLED_TAB', {})
    },
    handleTabScroll (event) {
      // Use mouse wheel value first but prioritize X value more (e.g. touchpad input).
      let delta = event.deltaY
      if (event.deltaX !== 0) {
        delta = event.deltaX
      }

      const tabs = this.$refs.tabContainer
      const newLeft = Math.max(0, Math.min(tabs.scrollLeft + delta, tabs.scrollWidth))
      tabs.scrollLeft = newLeft
    },
    closeTab (tabId) {
      const tab = this.tabs.find(f => f.id === tabId)
      if (tab) {
        this.$store.dispatch('CLOSE_TAB', tab)
      }
    },
    closeOthers (tabId) {
      const tab = this.tabs.find(f => f.id === tabId)
      if (tab) {
        this.$store.dispatch('CLOSE_OTHER_TABS', tab)
      }
    },
    closeSaved () {
      this.$store.dispatch('CLOSE_SAVED_TABS')
    },
    closeAll () {
      this.$store.dispatch('CLOSE_ALL_TABS')
    },
    rename (tabId) {
      const tab = this.tabs.find(f => f.id === tabId)
      if (tab && tab.pathname) {
        this.$store.dispatch('RENAME_FILE', tab)
      }
    },
    copyPath (tabId) {
      const tab = this.tabs.find(f => f.id === tabId)
      if (tab && tab.pathname) {
        clipboard.writeText(tab.pathname)
      }
    },
    showInFolder (tabId) {
      const tab = this.tabs.find(f => f.id === tabId)
      if (tab && tab.pathname) {
        shell.showItemInFolder(tab.pathname)
      }
    },
    handleContextMenu (event, tab) {
      if (tab.id) {
        showContextMenu(event, tab)
      }
    }
  },
  created () {
    this.$nextTick(() => {
      bus.$on('TABS::close-this', this.closeTab)
      bus.$on('TABS::close-others', this.closeOthers)
      bus.$on('TABS::close-saved', this.closeSaved)
      bus.$on('TABS::close-all', this.closeAll)
      bus.$on('TABS::rename', this.rename)
      bus.$on('TABS::copy-path', this.copyPath)
      bus.$on('TABS::show-in-folder', this.showInFolder)
    })
  },
  mounted () {
    this.$nextTick(() => {
      const tabs = this.$refs.tabContainer

      // Allow to scroll through the tabs by mouse wheel or touchpad.
      tabs.addEventListener('wheel', this.handleTabScroll)

      // Allow tab drag and drop to reorder tabs.
      const drake = this.drake = dragula([this.$refs.tabDropContainer], {
        direction: 'horizontal',
        revertOnSpill: true,
        mirrorContainer: this.$refs.tabDropContainer,
        ignoreInputTextSelection: false
      }).on('drop', (el, target, source, sibling) => {
        // Current tab that was dropped and need to be reordered.
        const droppedId = el.getAttribute('data-id')
        // This should be the next tab (tab | ... | el | sibling | tab | ...) but may be
        // the mirror image or null (tab | ... | el | sibling or null) if last tab.
        const nextTabId = sibling && sibling.getAttribute('data-id')
        const isLastTab = !sibling || sibling.classList.contains('gu-mirror')
        if (!droppedId || (sibling && !nextTabId)) {
          throw new Error('Cannot reorder tabs: invalid tab id.')
        }

        this.$store.dispatch('EXCHANGE_TABS_BY_ID', {
          fromId: droppedId,
          toId: isLastTab ? null : nextTabId
        })
      })

      // TODO(perf): Create a copy of dom-autoscroller and just hook tabs-container to
      //   improve performance. Currently autoScroll is triggered when the mouse is moved
      //   in MarkText window.

      // Scroll when dragging a tab to the beginning or end of the tab container.
      this.autoScroller = autoScroll([tabs], {
        margin: 20,
        maxSpeed: 6,
        scrollWhenOutside: false,
        autoScroll: () => {
          return this.autoScroller.down && drake.dragging
        }
      })
    })
  },
  beforeUnmount () {
    const tabs = this.$refs.tabContainer
    tabs.removeEventListener('wheel', this.handleTabScroll)

    if (this.autoScroller) {
      // Force destroy
      this.autoScroller.destroy(true)
    }
    if (this.drake) {
      this.drake.destroy()
    }
  },
  beforeDestroy () {
    bus.$off('TABS::close-this', this.closeTab)
    bus.$off('TABS::close-others', this.closeOthers)
    bus.$off('TABS::close-saved', this.closeSaved)
    bus.$off('TABS::close-all', this.closeAll)
    bus.$off('TABS::rename', this.rename)
    bus.$off('TABS::copy-path', this.copyPath)
    bus.$off('TABS::show-in-folder', this.showInFolder)
  }
}
</script>

<style scoped>
  .editor-tabs {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    height: var(--tabBarHeight);
    padding: 0 var(--space-2);
    user-select: none;
    background: var(--tabBarBgColor);
    border-bottom: 1px solid var(--tabBarBorderColor);
    box-sizing: border-box;
    overflow: hidden;
    &:hover > .new-file {
      opacity: 1;
    }
  }
  .scrollable-tabs {
    flex: 0 1 auto;
    height: 100%;
    overflow: hidden;
  }
  .tabs-container {
    min-width: min-content;
    list-style: none;
    margin: 0;
    padding: 0;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
    overflow-y: hidden;
    z-index: 2;
    &::-webkit-scrollbar:horizontal {
      display: none;
    }
    & > li {
      position: relative;
      display: flex;
      align-items: center;
      height: 26px;
      max-width: 220px;
      padding: 0 4px 0 var(--space-3);
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      border-radius: var(--radius-sm);
      cursor: default;
      transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
      &[aria-grabbed="true"] {
        opacity: .5;
      }
      &:focus {
        outline: none;
      }
      &:hover {
        color: var(--text-secondary);
        background: var(--surface-hover);
      }
      & > .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 2px;
      }
    }
    & > li.active {
      color: var(--text-primary);
      background: var(--surface-active);
      font-weight: 500;
    }
  }

  /* Close button doubles as the unsaved indicator. */
  .tab-action {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-xs);
    color: var(--text-muted);
    & > .close-icon {
      opacity: 0;
      transition: opacity var(--duration-fast) var(--ease);
    }
    & > .unsaved-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--themeColor);
      display: none;
    }
    &:hover {
      color: var(--text-primary);
      background: var(--surface-active);
    }
  }
  .tabs-container > li:hover .tab-action > .close-icon,
  .tabs-container > li.active .tab-action > .close-icon {
    opacity: 1;
  }
  .tabs-container > li.unsaved .tab-action > .unsaved-dot {
    display: block;
  }
  .tabs-container > li.unsaved .tab-action > .close-icon {
    opacity: 0;
  }
  .tabs-container > li.unsaved:hover .tab-action > .unsaved-dot {
    display: none;
  }
  .tabs-container > li.unsaved:hover .tab-action > .close-icon {
    opacity: 1;
  }

  .editor-tabs > .new-file {
    flex: 0 0 26px;
    width: 26px;
    height: 26px;
    margin-left: var(--space-1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease), background-color var(--duration-fast) var(--ease);
    &:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }
    &.always-visible {
      opacity: 1;
    }
  }

  /* dragula effects */
  .gu-mirror {
    position: fixed !important;
    margin: 0 !important;
    z-index: 9999 !important;
    opacity: 0.8;
    cursor: grabbing;
  }
  .gu-hide {
    display: none !important;
  }
  .gu-unselectable {
    user-select: none !important;
  }
  .gu-transit {
    opacity: 0.2;
  }
</style>
