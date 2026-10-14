<template>
  <div class="search-bar"
    @click.stop="noop"
    v-show="showSearch"
  >
    <div
      class="left-arrow"
      @click="toggleSearchType"
    >
      <lucide-icon
        name="chevron-down"
        :size="14"
        :class="{'arrow-right': type === 'search'}"
      ></lucide-icon>
    </div>
    <div class="right-controls">
      <section class="search">
        <div
          class="input-wrapper"
          :class="{'error': !!searchErrorMsg}"
        >
          <input
            type="text"
            v-model="searchValue"
            @keyup="search($event)"
            ref="search"
            placeholder="Search"
          >
          <div class="controls">
            <span class="search-result">{{`${highlightIndex + 1} / ${highlightCount}`}}</span>
            <span
              title="Case Sensitive"
              class="is-case-sensitive"
              :class="{'active': isCaseSensitive}"
              @click.stop="toggleCtrl('isCaseSensitive')"
            >
              <lucide-icon name="case-sensitive" :size="15"></lucide-icon>
            </span>
            <span
              title="Select whole word"
              class="is-whole-word"
              :class="{'active': isWholeWord}"
              @click.stop="toggleCtrl('isWholeWord')"
            >
              <lucide-icon name="whole-word" :size="15"></lucide-icon>
            </span>
            <span
              title="Use query as RegEx"
              class="is-regex"
              :class="{'active': isRegexp}"
              @click.stop="toggleCtrl('isRegexp')"
            >
              <lucide-icon name="regex" :size="15"></lucide-icon>
            </span>
          </div>
          <div class="error-msg" v-if="searchErrorMsg">
            {{searchErrorMsg}}
          </div>
        </div>
        <div class="button-group">
          <button class="icon-button" title="Previous match" @click="find('prev')">
            <lucide-icon name="arrow-up" :size="16"></lucide-icon>
          </button>
          <button class="icon-button" title="Next match" @click="find('next')">
            <lucide-icon name="arrow-down" :size="16"></lucide-icon>
          </button>
        </div>
      </section>
      <section class="replace" v-if="type === 'replace'">
        <div class="input-wrapper replace-input">
          <input type="text" v-model="replaceValue" placeholder="Replacement">
        </div>
        <div class="button-group">
          <el-tooltip class="item"
            effect="dark"
            content="Replace All"
            placement="top"
            :visible-arrow="false"
            :open-delay="1000"
          >
            <button class="icon-button" @click="replace(false)">
              <lucide-icon name="replace-all" :size="16"></lucide-icon>
            </button>
          </el-tooltip>
          <el-tooltip class="item"
            effect="dark"
            content="Replace Single"
            placement="top"
            :visible-arrow="false"
            :open-delay="1000"
          >
            <button class="icon-button" @click="replace(true)">
              <lucide-icon name="replace" :size="16"></lucide-icon>
            </button>
          </el-tooltip>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import bus from '../../bus'
import { mapState } from 'vuex'

export default {
  data () {
    return {
      showSearch: false,
      isCaseSensitive: false,
      isWholeWord: false,
      isRegexp: false,
      type: 'search',
      searchValue: '',
      replaceValue: '',
      searchErrorMsg: ''
    }
  },

  watch: {
    searchMatches: function (newValue, oldValue) {
      if (!newValue || !oldValue) return
      const { value } = newValue
      if (value && value !== oldValue.value) {
        this.searchValue = value
      }
    }
  },

  computed: {
    ...mapState({
      searchMatches: state => state.editor.currentFile.searchMatches
    }),
    highlightIndex () {
      if (this.searchMatches) {
        return this.searchMatches.index
      } else {
        return -1
      }
    },
    highlightCount () {
      if (this.searchMatches) {
        return this.searchMatches.matches.length
      } else {
        return 0
      }
    }
  },

  created () {
    bus.$on('find', this.listenFind)
    bus.$on('replace', this.listenReplace)
    bus.$on('findNext', this.listenFindNext)
    bus.$on('findPrev', this.listenFindPrev)
    document.addEventListener('click', this.docClick)
    document.addEventListener('keyup', this.docKeyup)
  },

  beforeDestroy () {
    bus.$off('find', this.listenFind)
    bus.$off('replace', this.listenReplace)
    bus.$off('findNext', this.listenFindNext)
    bus.$off('findPrev', this.listenFindPrev)
    document.removeEventListener('click', this.docClick)
    document.removeEventListener('keyup', this.docKeyup)
  },

  methods: {
    toggleCtrl (ctrl) {
      this[ctrl] = !this[ctrl]
      this.search()
    },

    listenFind () {
      this.showSearch = true
      this.type = 'search'
      this.$nextTick(() => {
        this.$refs.search.focus()
        if (this.searchValue) {
          this.search()
        }
      })
    },

    listenReplace () {
      this.showSearch = true
      this.type = 'replace'
    },

    listenFindNext () {
      this.find('next')
    },

    listenFindPrev () {
      this.find('prev')
    },

    docKeyup (event) {
      if (event.key === 'Escape') {
        this.emptySearch(true)
      }
    },

    docClick () {
      if (!this.showSearch) return
      this.emptySearch(true)
    },

    emptySearch (selectHighlight = false) {
      this.showSearch = false
      const searchValue = this.searchValue = ''
      this.replaceValue = ''
      bus.$emit('searchValue', searchValue, { selectHighlight })
    },

    toggleSearchType () {
      this.type = this.type === 'search' ? 'replace' : 'search'
    },

    /**
     * Find the previous or next search result.
     * action: prev or next
     */
    find (action) {
      bus.$emit('find-action', action)
    },

    search (event) {
      if (event && event.key === 'Escape') {
        return
      }

      if (event && event.key === 'Enter') {
        return this.find('next')
      }

      const { searchValue, isCaseSensitive, isWholeWord, isRegexp } = this
      if (isRegexp) {
        // Handle invalid regexp.
        try {
          // eslint-disable-next-line no-new
          new RegExp(searchValue)
          this.searchErrorMsg = ''
        } catch (err) {
          this.searchErrorMsg = `Invalid regular expression: /${searchValue}/.`
          return
        }
        // Handle match empty string, no need to search.
        try {
          const SEARCH_REG = new RegExp(searchValue)
          if (searchValue && SEARCH_REG.test('')) {
            throw new Error()
          }
          this.searchErrorMsg = ''
        } catch (err) {
          this.searchErrorMsg = `RegExp: /${searchValue}/ match empty string.`
          return
        }
      }
      bus.$emit('searchValue', searchValue, {
        isCaseSensitive,
        isWholeWord,
        isRegexp
      })
    },

    replace (isSingle = true) {
      const { replaceValue, isCaseSensitive, isWholeWord, isRegexp } = this
      bus.$emit('replaceValue', replaceValue, {
        isSingle,
        isCaseSensitive,
        isWholeWord,
        isRegexp
      })
    },

    noop () {}
  }
}
</script>

<style scoped>
  .search-bar {
    position: absolute;
    width: 420px;
    padding: 6px 6px 6px 2px;
    top: var(--space-2);
    right: var(--space-5);
    box-sizing: border-box;
    font-family: var(--font-ui);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-3);
    background: var(--surface-overlay);
    display: flex;
    flex-direction: row;
    z-index: 10;
  }
  .search-bar .left-arrow {
    width: 22px;
    margin-right: 2px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease);
    & .lucide-icon {
      transition: transform var(--duration-normal) var(--ease);
    }
    & .lucide-icon.arrow-right {
      transform: rotate(-90deg);
    }
  }
  .search-bar .left-arrow:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .search-bar .right-controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .search, .replace {
    display: flex;
    align-items: center;
  }

  .button-group {
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    margin-left: 6px;
  }
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    outline: none;
    cursor: pointer;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
    &:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }
    &:active {
      background: var(--surface-active);
    }
    &:focus-visible {
      box-shadow: var(--focus-ring);
    }
  }

  .input-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    position: relative;
    height: 28px;
    box-sizing: border-box;
    border: 1px solid var(--border-subtle);
    background: var(--surface-input);
    border-radius: var(--radius-sm);
    overflow: visible;
    transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
    &:focus-within {
      border-color: var(--themeColor);
      box-shadow: var(--focus-ring);
    }
  }
  .input-wrapper.error {
    border-color: var(--notificationErrorBg);
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }
  .input-wrapper .controls {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 1px;
    padding-right: 3px;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    & > span.search-result {
      margin-right: var(--space-1);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    & > span:not(.search-result) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
      &:hover {
        color: var(--text-primary);
        background: var(--surface-hover);
      }
      &.active {
        color: var(--themeColor);
        background: var(--surface-active);
      }
    }
  }

  .input-wrapper .error-msg {
    position: absolute;
    top: 26px;
    width: calc(100% + 2px);
    left: -1px;
    padding: 4px var(--space-2);
    box-sizing: border-box;
    border-bottom-left-radius: var(--radius-sm);
    border-bottom-right-radius: var(--radius-sm);
    background: var(--notificationErrorBg);
    color: #ffffff;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-ui);
    z-index: 1;
  }

  .input-wrapper input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 var(--space-2);
    outline: none;
    border: none;
    box-sizing: border-box;
    font-family: var(--font-ui);
    font-size: var(--font-size-md);
    color: var(--text-primary);
    background: transparent;
    &::placeholder {
      color: var(--text-muted);
    }
  }
</style>
