<template>
  <div class="pref-sidebar">
    <h3 class="title">Preferences</h3>
    <section class="search-wrapper">
      <el-autocomplete
        popper-class="pref-autocomplete"
        v-model="state"
        :fetch-suggestions="querySearch"
        placeholder="Search preferences"
        :trigger-on-focus="false"
        @select="handleSelect">
        <i
          class="el-icon-search el-input__icon"
          slot="suffix"
        >
        </i>
        <template slot-scope="{ item }">
          <div class="name">{{ item.category }}</div>
          <span class="addr">{{ item.preference }}</span>
        </template>
      </el-autocomplete>
    </section>
    <section class="category">
      <div v-for="c of category" :key="c.name" class="item"
        role="button"
        tabindex="0"
        @mousedown.stop
        @click.stop.prevent="handleCategoryItemClick(c)"
        @keydown.enter.prevent="handleCategoryItemClick(c)"
        @keydown.space.prevent="handleCategoryItemClick(c)"
        :class="{active: c.label === currentCategory}"
      >
        <lucide-icon :name="c.icon" :size="16"></lucide-icon>
        <span>{{c.name}}</span>
      </div>
    </section>
  </div>
</template>
<script>
import { ipcRenderer } from 'electron'
import { category, searchContent } from './config'

export default {
  data () {
    this.category = category
    return {
      currentCategory: 'general',
      restaurants: [],
      state: ''
    }
  },
  watch: {
    '$route' (to, from) {
      if (to.name !== from.name) {
        this.currentCategory = to.name
      }
    }
  },
  methods: {
    querySearch (queryString, cb) {
      const restaurants = this.restaurants
      const results = queryString ? restaurants.filter(this.createFilter(queryString)) : restaurants
      // call callback return this results
      cb(results)
    },
    createFilter (queryString) {
      return (restaurant) => {
        return (restaurant.preference.toLowerCase().indexOf(queryString.toLowerCase()) >= 0) ||
            (restaurant.category.toLowerCase().indexOf(queryString.toLowerCase()) >= 0)
      }
    },
    loadAll () {
      return searchContent
    },
    handleSelect (item) {
      this.$router.push({
        path: `/preference/${item.category.toLowerCase()}`
      })
    },
    handleCategoryItemClick (item) {
      const { currentCategory } = this
      if (item.name.toLowerCase() !== currentCategory) {
        this.$router.push({
          path: item.path
        })
      }
    },
    onIpcCategoryChange (event, category) {
      const validRoute = category && this.$router.getRoutes().findIndex(route => route.path.endsWith(`/${category}`)) !== -1
      if (validRoute) {
        this.$router.push({
          path: `/preference/${category}`
        })
      }
    }
  },

  mounted () {
    this.restaurants = this.loadAll()
    if (this.$route && this.$route.name) {
      this.currentCategory = this.$route.name
    }
    ipcRenderer.on('settings::change-tab', this.onIpcCategoryChange)
  },
  unmounted () {
    ipcRenderer.removeAllListener('settings::change-tab', this.onIpcCategoryChange)
  }
}
</script>

<style>
  .pref-sidebar {
    -webkit-app-region: no-drag;
    display: flex;
    flex-direction: column;
    background: var(--surface-sidebar);
    border-right: 1px solid var(--border-subtle);
    width: var(--prefSideBarWidth);
    height: 100vh;
    padding-top: 14px;
    box-sizing: border-box;
    font-family: var(--font-ui);
    & h3 {
      -webkit-app-region: drag;
      margin: 0;
      height: 22px;
      line-height: 22px;
      font-size: var(--font-size-md);
      font-weight: 600;
      text-align: center;
      color: var(--text-secondary);
    }
  }
  .search-wrapper {
    -webkit-app-region: no-drag;
    padding: 0 var(--space-3);
    margin: var(--space-5) 0 var(--space-3);
  }
  .el-autocomplete {
    width: 100%;
  }
  .pref-autocomplete.el-autocomplete-suggestion {
    & li {
      height: auto;
      line-height: normal;
      padding: 6px var(--space-2);
      & .name {
        text-overflow: ellipsis;
        overflow: hidden;
        font-weight: 500;
        color: var(--text-primary);
      }
      & .addr {
        font-size: var(--font-size-sm);
        color: var(--text-muted);
      }
    }
  }
  .category {
    -webkit-app-region: no-drag;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 var(--space-2);
    & .item {
      -webkit-app-region: no-drag;
      height: 32px;
      padding: 0 var(--space-3);
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
      & > .lucide-icon {
        color: var(--sideBarIconColor);
      }
      &:hover {
        background: var(--surface-hover);
      }
      &:focus-visible {
        box-shadow: var(--focus-ring);
      }
      &.active {
        color: var(--text-primary);
        font-weight: 500;
        background: var(--surface-active);
        & > .lucide-icon {
          color: var(--text-primary);
        }
      }
    }
  }
</style>
