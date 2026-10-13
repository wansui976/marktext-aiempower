<template>
    <div
      class="side-bar-search"
    >
      <div class="search-wrapper">
        <input
          type="text" v-model="keyword"
          placeholder="Search in folder..."
          @keyup="search"
        >
        <div class="controls">
          <span
            title="Case Sensitive"
            class="is-case-sensitive"
            :class="{'active': isCaseSensitive}"
            @click.stop="caseSensitiveClicked()"
          >
            <lucide-icon name="case-sensitive" :size="15"></lucide-icon>
          </span>
          <span
            title="Select whole word"
            class="is-whole-word"
            :class="{'active': isWholeWord}"
            @click.stop="wholeWordClicked()"
          >
            <lucide-icon name="whole-word" :size="15"></lucide-icon>
          </span>
          <span
            title="Use query as RegEx"
            class="is-regex"
            :class="{'active': isRegexp}"
            @click.stop="regexpClicked()"
          >
            <lucide-icon name="regex" :size="15"></lucide-icon>
          </span>
        </div>
      </div>

      <div class="search-message-section" v-if="showNoFolderOpenedMessage">
        <span>No folder open</span>
      </div>
      <div class="search-message-section" v-if="showNoResultFoundMessage">No results found.</div>
      <div class="search-message-section" v-if="searchErrorString">{{ searchErrorString }}</div>

      <div
        class="cancel-area"
        v-show="showSearchCancelArea"
      >
        <el-button
          type="primary"
          size="mini"
          @click="cancelSearcher"
        >
          Cancel <i class="el-icon-video-pause"></i>
        </el-button>
      </div>
      <div v-if="searchResult.length" class="search-result-info">{{searchResultInfo}}</div>
      <div class="search-result" v-if="searchResult.length">
        <search-result-item
          v-for="(item, index) of searchResult"
          :key="index"
          :searchResult="item"
        ></search-result-item>
      </div>
      <div class="empty" v-else>
        <div class="no-data">
          <button
            class="button-primary"
            v-if="showNoFolderOpenedMessage"
            @click="openFolder"
          >
            Open Folder
          </button>
        </div>
      </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '../../bus'
import log from 'electron-log'
import SearchResultItem from './searchResultItem.vue'
import RipgrepDirectorySearcher from '../../node/ripgrepSearcher'
import { MARKDOWN_INCLUSIONS } from '../../../common/filesystem/paths'

export default {
  data () {
    this.lastKeyword = ''
    this.lastSearchTime = new Date()
    this.keyUpTimer = null
    this.searcherCancelCallback = null
    this.ripgrepDirectorySearcher = new RipgrepDirectorySearcher()
    return {
      keyword: '',
      searchResult: [],
      searcherRunning: false,
      showSearchCancelArea: false,
      searchErrorString: '',

      isCaseSensitive: false,
      isWholeWord: false,
      isRegexp: false
    }
  },
  components: {
    SearchResultItem
  },
  watch: {
    showSideBar: function (value, oldValue) {
      if (value && !oldValue && this.rightColumn === 'search') {
        this.keyword = this.searchMatches.value
      }
    }
  },
  created () {
    this.$nextTick(() => {
      this.keyword = this.searchMatches.value
      bus.$on('findInFolder', this.handleFindInFolder)
      if (this.keyword.length > 0 && this.searcherRunning === false) {
        this.searcherRunning = true
        this.search()
      }
    })
  },
  computed: {
    ...mapState({
      rightColumn: state => state.layout.rightColumn,
      showSideBar: state => state.layout.showSideBar,
      searchMatches: state => state.editor.currentFile.searchMatches,
      projectTree: state => state.project.projectTree,
      searchExclusions: state => state.preferences.searchExclusions,
      searchMaxFileSize: state => state.preferences.searchMaxFileSize,
      searchIncludeHidden: state => state.preferences.searchIncludeHidden,
      searchNoIgnore: state => state.preferences.searchNoIgnore,
      searchFollowSymlinks: state => state.preferences.searchFollowSymlinks
    }),
    searchResultInfo () {
      const fileCount = this.searchResult.length
      const matchCount = this.searchResult.reduce((acc, item) => {
        return acc + item.matches.length
      }, 0)

      return `${matchCount} ${matchCount > 1 ? 'matches' : 'match'} in ${fileCount} ${fileCount > 1 ? 'files' : 'file'}`
    },
    showNoFolderOpenedMessage () {
      return !this.projectTree || !this.projectTree.pathname
    },
    showNoResultFoundMessage () {
      return this.searchResult.length === 0 && this.searcherRunning === false && this.keyword.length > 0
    }
  },
  methods: {
    search () {
      // No root directory is opened.
      if (this.showNoFolderOpenedMessage) {
        return
      }

      const { pathname: rootDirectoryPath } = this.projectTree
      const {
        keyword,
        searcherRunning,
        searcherCancelCallback,
        isCaseSensitive,
        isWholeWord,
        isRegexp,
        ripgrepDirectorySearcher
      } = this

      if (searcherRunning && searcherCancelCallback) {
        searcherCancelCallback()
      }

      this.searchErrorString = ''
      this.searcherCancelCallback = null

      if (!keyword) {
        this.searchResult = []
        this.searcherRunning = false
        return
      }

      let canceled = false
      this.searcherRunning = true
      this.startShowSearchCancelAreaTimer()

      const newSearchResult = []
      const promises = ripgrepDirectorySearcher.search([rootDirectoryPath], keyword, {
        didMatch: searchResult => {
          if (canceled) return

          // filePath: "<file>"
          // matches: Array(1)
          // 0:
          //   leadingContextLines: []
          //   lineText: "foo-test"
          //   matchText: "foo"
          //   range: Array(2)
          //     0: (2) [0, 0]
          //     1: (2) [0, 3]
          //   length: 2
          //   trailingContextLines: []

          newSearchResult.push(searchResult)
        },
        didSearchPaths: numPathsFound => {
          // More than 100 files with (multiple) matches were found.
          if (!canceled && numPathsFound > 100) {
            canceled = true
            if (promises.cancel) {
              promises.cancel()
            }
            this.searchErrorString = 'Search was limited to 100 files.'
          }
        },

        // UI options
        isCaseSensitive,
        isWholeWord,
        isRegexp,

        // Options loaded from settings
        exclusions: this.searchExclusions,
        maxFileSize: this.searchMaxFileSize || null,
        includeHidden: this.searchIncludeHidden,
        noIgnore: this.searchNoIgnore,
        followSymlinks: this.searchFollowSymlinks,

        // Only search markdown files
        inclusions: MARKDOWN_INCLUSIONS
      })
        .then(() => {
          this.searchResult = newSearchResult
          this.searcherRunning = false
          this.searcherCancelCallback = null
          this.stopShowSearchCancelAreaTimer()
        })
        .catch(err => {
          canceled = true
          if (promises.cancel) {
            promises.cancel()
          }
          this.searcherRunning = false
          this.searcherCancelCallback = null
          this.stopShowSearchCancelAreaTimer()

          this.searchErrorString = err.message
          log.error(err)
        })

      this.searcherCancelCallback = () => {
        this.stopShowSearchCancelAreaTimer()
        canceled = true
        if (promises.cancel) {
          promises.cancel()
        }
      }
    },
    /**
     * Slightly delay showing the "cancel search" button so we don't
     * see it after every keypress, but only when a search query is lagging.
     */
    startShowSearchCancelAreaTimer () {
      this.stopShowSearchCancelAreaTimer()

      const SHOW_SEARCH_CANCEL_DELAY_MS = 5000
      this.showSearchCancelAreaTimer = window.setTimeout(() => {
        this.showSearchCancelArea = true
      }, SHOW_SEARCH_CANCEL_DELAY_MS)
    },
    stopShowSearchCancelAreaTimer () {
      this.showSearchCancelArea = false
      if (!this.showSearchCancelAreaTimer) {
        return
      }
      window.clearTimeout(this.showSearchCancelAreaTimer)
      this.showSearchCancelAreaTimer = null
    },
    cancelSearcher () {
      const { searcherCancelCallback } = this
      if (searcherCancelCallback) {
        searcherCancelCallback()
        this.searcherCancelCallback = null
      }
    },
    caseSensitiveClicked () {
      this.isCaseSensitive = !this.isCaseSensitive
      this.search()
    },
    wholeWordClicked () {
      this.isWholeWord = !this.isWholeWord
      this.search()
    },
    regexpClicked () {
      this.isRegexp = !this.isRegexp
      this.search()
    },
    openFolder () {
      this.$store.dispatch('ASK_FOR_OPEN_PROJECT')
    },
    handleFindInFolder () {
      this.keyword = this.searchMatches.value
    }
  },
  destroyed () {
    bus.$off('findInFolder', this.handleFindInFolder)
  }
}
</script>

<style scoped>
  .side-bar-search {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-size: var(--font-size-md);
  }
  .search-wrapper {
    display: flex;
    align-items: center;
    margin: 39px var(--space-2) var(--space-3);
    padding: 0 var(--space-1) 0 var(--space-2);
    height: var(--control-height);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    box-sizing: border-box;
    transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
    &:focus-within {
      border-color: var(--themeColor);
      box-shadow: var(--focus-ring);
    }
    & > input {
      color: var(--text-primary);
      background: transparent;
      height: 100%;
      flex: 1;
      border: none;
      outline: none;
      padding: 0 var(--space-1);
      font-family: var(--font-ui);
      font-size: var(--font-size-md);
      width: 50%;
      &::placeholder {
        color: var(--text-muted);
      }
    }
    & > .controls {
      display: flex;
      flex-shrink: 0;
      gap: 2px;
      & > span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        width: 22px;
        height: 22px;
        color: var(--text-muted);
        border-radius: var(--radius-xs);
        transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
        &:hover {
          color: var(--text-primary);
          background: var(--surface-hover);
        }
        &.active {
          color: var(--themeColor);
          background: var(--surface-selected);
        }
      }
    }
  }
  .cancel-area {
    text-align: center;
    margin-bottom: var(--space-4);
  }
  .search-message-section {
    overflow-wrap: break-word;
  }
  .search-result-info,
  .search-message-section {
    padding: 0 var(--space-4);
    margin-bottom: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--text-muted);
  }
  .empty,
  .search-result {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .empty {
    font-size: var(--font-size-md);
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding-bottom: 100px;
    & .no-data {
      display: flex;
      align-items: center;
      flex-direction: column;
    }
    & .no-data svg {
      fill: var(--themeColor);
      width: 96px;
      opacity: .5;
    }
    & .no-data .button-primary {
      margin-top: var(--space-5);
    }
  }
</style>
