<template>
    <div class="search-result-item">
      <div
        class="search-result"
        :title="searchResult.filePath"
      >
        <lucide-icon
          name="chevron-right"
          :size="14"
          class="icon-arrow"
          :class="{'fold': !showSearchMatches}"
          @click.native.stop="toggleSearchMatches()"
        ></lucide-icon>
        <div
          class="file-info"
          @click.stop="toggleSearchMatches()"
        >
          <div class="title">
            <span class="filename">
              <span class="name">{{ filename }}</span><span class="extension">{{extension}}</span>
            </span>
            <span class="match-count">{{ matchCount }}</span>
          </div>
          <!-- <div class="folder-path">
            <span>{{ dirname }}</span>
          </div> -->
        </div>
      </div>
      <div
        class="matches"
        v-if="showSearchMatches"
      >
        <ul>
          <li
            class="text-overflow"
            v-for="(searchMatch, index) of getMatches"
            :key="index"
            :searchMatch="searchMatch"
            :title="searchMatch.lineText"
            @click="handleSearchResultClick(searchMatch)"
          >
            <!-- <span class="line-number">{{ searchMatch.range[0][0] }}</span> -->
            <span>{{ ellipsisText(searchMatch.lineText.substring(0, searchMatch.range[0][1])) }}</span>
            <span class="highlight">{{ searchMatch.lineText.substring(searchMatch.range[0][1], searchMatch.range[1][1]) }}</span>
            <span>{{ searchMatch.lineText.substring(searchMatch.range[1][1]) }}</span>
          </li>
        </ul>
        <div v-if="!allMatchesShown">
          <div
            class="button tiny"
            @click="handleShowMoreMatches"
          >
            Show more matches
          </div>
        </div>
      </div>
    </div>
</template>

<script>
import path from 'path'
import { mapState } from 'vuex'
import { fileMixins } from '../../mixins'
import { PATH_SEPARATOR } from '../../config'

export default {
  mixins: [fileMixins],
  data () {
    return {
      showSearchMatches: this.searchResult.matches.length <= 20,
      allMatchesShown: this.searchResult.matches.length <= 10,
      shownMatches: 10
    }
  },
  props: {
    searchResult: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState({
      tabs: state => state.editor.tabs,
      currentFile: state => state.editor.currentFile
    }),

    getMatches () {
      if (this.searchResult.matches.length === 0 || this.allMatchesShown) {
        return this.searchResult.matches
      }
      return this.searchResult.matches.slice(0, this.shownMatches)
    },

    // Return filename without extension.
    filename () {
      return path.basename(this.searchResult.filePath, path.extname(this.searchResult.filePath))
    },

    matchCount () {
      return this.searchResult.matches.length
    },

    // Return the filename extension or null.
    extension () {
      return path.extname(this.searchResult.filePath)
    },

    // Return the parent directory with trailing path separator.
    dirname () {
      return path.join(path.dirname(this.searchResult.filePath), PATH_SEPARATOR)
    }
  },
  methods: {
    toggleSearchMatches () {
      this.showSearchMatches = !this.showSearchMatches
    },

    handleShowMoreMatches (event) {
      this.shownMatches += 15
      if (event.ctrlKey || event.metaKey ||
          this.shownMatches >= this.searchResult.matches.length) {
        this.allMatchesShown = true
      }
    },

    ellipsisText (text) {
      const len = text.length
      const MAX_PRETEXT_LEN = 6
      return len > MAX_PRETEXT_LEN ? `...${text.substring(len - MAX_PRETEXT_LEN)}` : text
    }
  }
}
</script>

<style scoped>
  .search-result-item {
    position: relative;
    user-select: none;
    padding: 0 var(--space-2) var(--space-1);
    color: var(--text-secondary);
    font-size: var(--font-size-md);
    & > .search-result {
      display: flex;
      align-items: center;
      height: 28px;
      padding: 0 var(--space-1);
      border-radius: var(--radius-sm);
      cursor: pointer;
      &:hover {
        background: var(--surface-hover);
      }
      & > .icon-arrow {
        margin-right: var(--space-1);
      }
      & > .file-info {
        flex: 1;
        overflow: hidden;
      }
    }
    & .title .filename {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      padding-right: var(--space-2);
    }
    & .matches {
      & ul {
        margin: 2px 0 0;
        padding-left: 0;
        list-style-type: none;
        & li {
          display: block;
          padding: 3px var(--space-2) 3px 26px;
          cursor: pointer;
          border-radius: var(--radius-sm);
          /* Hide space between inline spans */
          font-size: 0;
          & .highlight {
            background: var(--themeColor20);
            color: var(--text-primary);
            border-radius: 2px;
          }
          &:hover {
            background: var(--surface-hover);
          }
          & span {
            font-size: var(--font-size-sm);
            line-height: 18px;
            white-space: pre;
          }
        }
      }
      & .button {
        display: flex;
        width: 140px;
        margin: var(--space-1) auto var(--space-2);
      }
    }
  }
  .search-result-item.active {
    .title {
      color: var(--themeColor);
    }
  }
  .title {
    display: flex;
    align-items: center;
    color: var(--text-secondary);
    & .filename {
      flex: 1;
      & .name {
        font-weight: 500;
        color: var(--text-primary);
      }
      & .extension {
        color: var(--text-muted);
      }
    }
    & .match-count {
      display: inline-block;
      padding: 0 6px;
      font-size: var(--font-size-xs);
      font-weight: 500;
      line-height: 18px;
      text-align: center;
      min-width: 18px;
      height: 18px;
      box-sizing: border-box;
      border-radius: 9px;
      flex-shrink: 0;
      background: var(--surface-active);
      color: var(--text-secondary);
    }
  }

  .folder-path {
    font-size: var(--font-size-sm);
  }

  .folder-path > span,
  .matches {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
  }

  .icon-arrow {
    color: var(--text-muted);
    transition: transform var(--duration-normal) var(--ease);
    transform: rotate(90deg);
  }
  .icon-arrow.fold {
    transform: rotate(0);
  }
</style>
