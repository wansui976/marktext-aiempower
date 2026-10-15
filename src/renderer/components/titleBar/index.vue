<template>
  <div>
    <div
      class="title-bar-editor-bg"
      :class="{ 'tabs-visible': showTabBar }"
    ></div>
    <div
      class="title-bar"
      :class="[{ 'active': active }, { 'tabs-visible': showTabBar }, { 'frameless': titleBarStyle === 'custom' }, { 'isOsx': isOsx }]"
    >
      <div class="title" @dblclick.stop="toggleMaxmizeOnMacOS">
        <span v-if="!filename">MarkText-AIEmpower</span>
        <span v-else>
          <span
            v-for="(path, index) of paths"
            :key="index"
          >
            {{ path }}
            <lucide-icon name="chevron-right" :size="12" class="path-separator"></lucide-icon>
          </span>
          <span
            class="filename"
            :class="{'isOsx': platform === 'darwin'}"
            @click="rename"
          >
            {{ filename }}
          </span>
          <span class="save-dot" :class="{'show': !isSaved}"></span>
        </span>
      </div>
      <div :class="showCustomTitleBar ? 'left-toolbar title-no-drag' : 'right-toolbar'">
        <div
          v-if="showCustomTitleBar"
          class="frameless-titlebar-menu title-no-drag"
          @click.stop="handleMenuClick"
        >
          <span class="text-center-vertical">&#9776;</span>
        </div>
        <el-tooltip
          v-if="wordCount"
          class="item"
          :content="`${wordCount[show]} ${HASH[show].full + (wordCount[show] > 1 ? 's' : '')}`"
          placement="bottom-end"
        >
          <div slot="content">
            <div class="title-item">
              <span class="front">Words:</span><span class="text">{{wordCount['word']}}</span>
            </div>
            <div class="title-item">
              <span class="front">Characters:</span><span class="text">{{wordCount['character']}}</span>
            </div>
            <div class="title-item">
              <span class="front">Paragraphs:</span><span class="text">{{wordCount['paragraph']}}</span>
            </div>
          </div>
          <div
            v-if="wordCount"
            class="word-count"
            :class="[{ 'title-no-drag': platform !== 'darwin' }]"
            @click.stop="handleWordClick"
          >
            <span class="text-center-vertical">{{ formatWordCount(wordCount[show], show) }}</span>
          </div>
        </el-tooltip>
      </div>
      <div
        v-if="titleBarStyle === 'custom' && !isFullScreen && !isOsx"
        class="right-toolbar"
        :class="[{ 'title-no-drag': titleBarStyle === 'custom' }]"
      >
        <div class="frameless-titlebar-button frameless-titlebar-close" @click.stop="handleCloseClick">
          <div>
            <svg width="10" height="10">
              <path :d="windowIconClose" />
            </svg>
          </div>
        </div>
        <div class="frameless-titlebar-button frameless-titlebar-toggle" @click.stop="handleMaximizeClick">
          <div>
            <svg width="10" height="10">
              <path v-show="!isMaximized" :d="windowIconMaximize" />
              <path v-show="isMaximized" :d="windowIconRestore" />
            </svg>
          </div>
        </div>
        <div class="frameless-titlebar-button frameless-titlebar-minimize" @click.stop="handleMinimizeClick">
          <div>
            <svg width="10" height="10">
              <path :d="windowIconMinimize" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import { getCurrentWindow, Menu as RemoteMenu } from '@electron/remote'
import { mapState } from 'vuex'
import { minimizePath, restorePath, maximizePath, closePath } from '../../assets/window-controls.js'
import { PATH_SEPARATOR } from '../../config'
import { isOsx } from '@/util'

export default {
  data () {
    this.isOsx = isOsx
    this.HASH = {
      word: {
        short: 'W',
        full: 'word'
      },
      character: {
        short: 'C',
        full: 'character'
      },
      paragraph: {
        short: 'P',
        full: 'paragraph'
      },
      all: {
        short: 'A',
        full: '(with space)character'
      }
    }
    this.windowIconMinimize = minimizePath
    this.windowIconRestore = restorePath
    this.windowIconMaximize = maximizePath
    this.windowIconClose = closePath
    return {
      isFullScreen: getCurrentWindow().isFullScreen(),
      isMaximized: getCurrentWindow().isMaximized(),
      show: 'word'
    }
  },
  created () {
    ipcRenderer.on('mt::window-maximize', this.onMaximize)
    ipcRenderer.on('mt::window-unmaximize', this.onUnmaximize)
    ipcRenderer.on('mt::window-enter-full-screen', this.onEnterFullScreen)
    ipcRenderer.on('mt::window-leave-full-screen', this.onLeaveFullScreen)
  },
  props: {
    project: Object,
    filename: String,
    pathname: String,
    active: Boolean,
    wordCount: Object,
    platform: String,
    isSaved: Boolean
  },
  computed: {
    ...mapState({
      titleBarStyle: state => state.preferences.titleBarStyle,
      showTabBar: state => state.layout.showTabBar
    }),
    paths () {
      if (!this.pathname) return []
      const pathnameToken = this.pathname.split(PATH_SEPARATOR).filter(i => i)
      return pathnameToken.slice(0, pathnameToken.length - 1).slice(-3)
    },
    showCustomTitleBar () {
      return this.titleBarStyle === 'custom' && !this.isOsx
    }
  },
  watch: {
    filename: function (value) {
      // Set filename when hover on dock
      const hasOpenFolder = this.project && this.project.name
      let title = ''
      if (value) {
        title = hasOpenFolder ? `${value} - ${this.project.name}` : `${value} - MarkText-AIEmpower`
      } else {
        title = hasOpenFolder ? this.project.name : 'MarkText-AIEmpower'
      }

      document.title = title
    }
  },
  methods: {
    formatWordCount (n, kind) {
      const num = typeof n === 'number' ? n.toLocaleString('en-US') : String(n)
      const label = this.HASH[kind] && this.HASH[kind].short ? this.HASH[kind].short : ''
      return `${label} ${num}`
    },
    handleWordClick () {
      const ITEMS = ['word', 'paragraph', 'character', 'all']
      const len = ITEMS.length
      let index = ITEMS.indexOf(this.show)
      index += 1
      if (index >= len) index = 0
      this.show = ITEMS[index]
    },

    handleCloseClick () {
      getCurrentWindow().close()
    },

    handleMaximizeClick () {
      const win = getCurrentWindow()
      if (win.isFullScreen()) {
        win.setFullScreen(false)
      } else if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    },

    toggleMaxmizeOnMacOS () {
      if (this.isOsx) {
        this.handleMaximizeClick()
      }
    },

    handleMinimizeClick () {
      getCurrentWindow().minimize()
    },

    handleMenuClick () {
      const win = getCurrentWindow()
      RemoteMenu.getApplicationMenu().popup({ window: win, x: 23, y: 20 })
    },

    rename () {
      if (this.platform === 'darwin') {
        this.$store.dispatch('RESPONSE_FOR_RENAME')
      }
    },

    onMaximize () {
      this.isMaximized = true
    },
    onUnmaximize () {
      this.isMaximized = false
    },
    onEnterFullScreen () {
      this.isFullScreen = true
    },
    onLeaveFullScreen  () {
      this.isFullScreen = false
    }
  },
  beforeDestroy () {
    ipcRenderer.off('window-maximize', this.onMaximize)
    ipcRenderer.off('window-unmaximize', this.onUnmaximize)
    ipcRenderer.off('window-enter-full-screen', this.onEnterFullScreen)
    ipcRenderer.off('window-leave-full-screen', this.onLeaveFullScreen)
  }
}
</script>

<style scoped>
  .title-bar-editor-bg {
    height: var(--titleBarHeight);
    background: var(--editorBgColor);
    position: relative;
    left: 0;
    top: 0;
    right: 0;
  }
  .title-bar {
    -webkit-app-region: drag;
    user-select: none;
    background: transparent;
    height: var(--titleBarHeight);
    box-sizing: border-box;
    color: var(--text-muted);
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    z-index: 2;
    transition: color var(--duration-normal) var(--ease);
    cursor: default;
  }
  .active {
    color: var(--text-secondary);
  }
  img {
    height: 90%;
    margin-top: 1px;
    vertical-align: top;
  }
  .title {
    padding: 0 142px;
    height: 100%;
    line-height: var(--titleBarHeight);
    font-size: var(--font-size-sm);
    text-align: center;
    transition: color var(--duration-normal) var(--ease);
    & .filename {
      font-weight: 500;
      color: var(--text-primary);
      transition: color var(--duration-fast) var(--ease);
    }
    & .path-separator {
      margin: 0 2px;
      opacity: .6;
      vertical-align: -2px;
    }
    &::after {
      content: '';
      position: absolute;
      top: 0;
      height: 1px;
      width: 100%;
      z-index: 1;
      -webkit-app-region: no-drag;
    }
  }
  div.title > span {
    /* Workaround for GH#339 */
    display: block;
    direction: rtl;
    overflow: hidden;
    text-overflow: clip;
    white-space: nowrap;
  }

  .title-bar .title .filename.isOsx:hover {
    color: var(--themeColor);
  }

  .save-dot {
    display: inline-block;
    margin-left: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    vertical-align: 1px;
    background: var(--themeColor);
    visibility: hidden;
  }
  .save-dot.show {
    visibility: visible;
  }
  .title-bar:not(.active) .save-dot {
    opacity: .5;
  }
  .title:hover {
    color: var(--text-secondary);
  }

  .left-toolbar {
    padding: 0 10px;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    width: 118px; /* + 2*10px padding*/
    display: flex;
    flex-direction: row;
  }
  .right-toolbar {
    height: 100%;
    position: absolute;
    top: 0;
    right: 0;
    width: 138px;
    display: flex;
    align-items: center;
    flex-direction: row-reverse;
    & .item {
      margin-right: var(--space-2);
    }
  }

  .word-count {
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    text-align: center;
    line-height: 22px;
    box-sizing: border-box;
    & > .text-center-vertical {
      padding: 2px var(--space-2);
      border-radius: var(--radius-sm);
      transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
    }
    &:hover > span {
      background: var(--surface-hover);
      color: var(--text-primary);
    }
  }

  .title-no-drag {
    -webkit-app-region: no-drag;
  }
  /* frameless window controls */
  .frameless-titlebar-button {
    position: relative;
    display: block;
    width: 46px;
    height: var(--titleBarHeight);
    transition: background-color var(--duration-fast) var(--ease);
  }
  .frameless-titlebar-button > div {
    position: absolute;
    display: inline-flex;
    top: 50%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
  }
  .frameless-titlebar-menu {
    color: var(--text-secondary);
  }
  .frameless-titlebar-close:hover {
    background-color: #e81123;
  }
  .frameless-titlebar-minimize:hover,
  .frameless-titlebar-toggle:hover {
    background-color: var(--surface-active);
  }
  .frameless-titlebar-button svg {
    fill: var(--text-secondary);
  }
  .frameless-titlebar-close:hover svg {
    fill: #ffffff;
  }

  .text-center-vertical {
    display: inline-block;
    vertical-align: middle;
    line-height: normal;
  }
</style>

<style>
.title-item {
  display: flex;
  justify-content: space-between;
  height: 22px;
  line-height: 22px;
  & .front {
    color: var(--text-muted);
  }
  & .text {
    margin-left: var(--space-4);
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
  }
}
</style>
