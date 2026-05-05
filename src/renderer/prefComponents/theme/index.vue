<template>
  <div class="pref-theme">
    <h4>Theme</h4>

    <div class="theme-filter-bar">
      <div class="theme-filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: filter === tab.value }"
          @click="filter = tab.value"
        >{{ tab.label }}</button>
      </div>
      <div class="theme-search-wrap">
        <svg class="theme-search-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6" />
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          class="theme-search"
          type="text"
          placeholder="Search themes…"
          v-model="search"
        />
        <button v-if="search" class="theme-search-clear" @click="search = ''">×</button>
      </div>
    </div>

    <section class="theme-grid">
      <button
        v-for="t of visibleThemes"
        :key="t.name"
        type="button"
        class="theme-card"
        :class="{ active: t.name === theme }"
        :style="cardStyle(t)"
        @click="onSelectChange('theme', t.name)"
      >
        <span class="theme-card-swatch" aria-hidden="true">
          <span class="theme-card-sidebar"></span>
          <span class="theme-card-window">
            <span class="theme-card-dots">
              <i></i><i></i><i></i>
            </span>
            <span class="theme-card-heading"></span>
            <span class="theme-card-line line-long"></span>
            <span class="theme-card-line line-medium"></span>
          </span>
        </span>
        <span class="theme-card-meta">
          <span class="theme-card-title">{{ t.label }}</span>
          <span class="theme-card-badge" :class="isDark(t) ? 'badge-dark' : 'badge-light'">
            {{ isDark(t) ? 'Dark' : 'Light' }}
          </span>
        </span>
        <span v-if="t.name === theme" class="theme-card-check" aria-label="selected">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5" />
            <path d="M5 8l2.2 2.2L11 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>
    </section>

    <div v-if="filteredThemes.length === 0" class="theme-empty">
      No themes match "<em>{{ search }}</em>"
    </div>

    <separator></separator>
    <cur-select
      description="Automatically adjust application theme according to system settings"
      :value="autoSwitchTheme"
      :options="autoSwitchThemeOptions"
      :onChange="value => onSelectChange('autoSwitchTheme', value)"
    ></cur-select>
    <separator v-show="false"></separator>
    <section v-show="false" class="import-themes ag-underdevelop">
      <div>
        <span>Open the themes folder</span>
        <el-button size="small">Open Folder</el-button>
      </div>
      <div>
        <span>Import custom themes</span>
        <el-button size="small">Import Theme</el-button>
      </div>
    </section>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { autoSwitchThemeOptions, themes } from './config'
import { darkThemes } from '@/util/themeColor'
import CurSelect from '../common/select'
import Separator from '../common/separator'

export default {
  components: {
    CurSelect,
    Separator
  },
  data () {
    this.autoSwitchThemeOptions = autoSwitchThemeOptions
    this.filterTabs = [
      { label: 'All', value: 'all' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' }
    ]
    return {
      themes,
      filter: 'all',
      search: '',
      visibleCount: 12
    }
  },
  computed: {
    ...mapState({
      autoSwitchTheme: state => state.preferences.autoSwitchTheme,
      theme: state => state.preferences.theme
    }),
    filteredThemes () {
      let list = this.themes
      if (this.filter === 'dark') {
        list = list.filter(t => darkThemes.has(t.name))
      } else if (this.filter === 'light') {
        list = list.filter(t => !darkThemes.has(t.name))
      }
      const q = this.search.trim().toLowerCase()
      if (q) {
        list = list.filter(t =>
          t.label.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
        )
      }
      return list
    },
    visibleThemes () {
      return this.filteredThemes.slice(0, this.visibleCount)
    }
  },
  mounted () {
    requestAnimationFrame(() => {
      this.visibleCount = this.themes.length
    })
  },
  methods: {
    isDark (t) {
      return darkThemes.has(t.name)
    },
    cardStyle (t) {
      const { preview } = t
      return {
        '--cardBg': preview.bg,
        '--cardTitle': preview.title,
        '--previewTextColor': preview.color,
        '--previewAccentColor': preview.accent,
        '--previewSurfaceColor': this.surfaceColor(preview.bg),
        background: preview.bg,
        color: preview.title,
        borderColor: preview.border
      }
    },
    surfaceColor (color) {
      const light = ['#ffffff', '#fafafa', '#fcfcfc', '#eff1f5', '#fcf9f2', '#f4f5f7', '#f7efcf', '#eef2f6', '#fdf6e3', '#fbf7ee', '#f6f7f0', '#faf4ed']
      return light.includes(color.toLowerCase())
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.08)'
    },
    onSelectChange (type, value) {
      this.$store.dispatch('SET_SINGLE_PREFERENCE', { type, value })
    }
  }
}
</script>

<style>
.pref-theme {
  color: var(--editorColor);

  & h4 {
    margin-bottom: 16px;
  }
}

/* ── Filter bar ── */
.theme-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.theme-filter-tabs {
  display: flex;
  gap: 2px;
  background: var(--editorColor04, rgba(0, 0, 0, 0.05));
  border-radius: 9px;
  padding: 3px;
  flex-shrink: 0;
}

.filter-tab {
  padding: 5px 15px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--editorColor60);
  background: transparent;
  border: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: all .15s;

  &.active {
    background-color: var(--floatBgColor);
    color: var(--editorColor);
    border: 1px solid var(--editorColor10);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.13);
  }

  &:hover:not(.active) {
    color: var(--editorColor);
  }
}

/* ── Search ── */
.theme-search-wrap {
  position: relative;
  flex: 1;
}

.theme-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--editorColor40);
  pointer-events: none;
}

.theme-search {
  width: 100%;
  padding: 7px 30px 7px 32px;
  border: 1px solid var(--editorColor10, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  font-size: 13px;
  background-color: var(--floatBgColor);
  color: var(--editorColor);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;

  &:focus {
    border-color: var(--themeColor);
    box-shadow: 0 0 0 2px var(--themeColor10);
  }

  &::placeholder {
    color: var(--editorColor30);
  }
}

.theme-search-clear {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--editorColor10, rgba(0, 0, 0, 0.1));
  border: none;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  color: var(--editorColor60);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    background: var(--editorColor30, rgba(0, 0, 0, 0.2));
  }
}

/* ── Grid ── */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

/* ── Card ── */
.theme-card {
  position: relative;
  border: 1.5px solid;
  border-radius: 12px;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: none;
  transition: transform .15s ease, box-shadow .15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
  }

  &.active {
    border-color: var(--themeColor) !important;
    box-shadow: 0 0 0 2.5px var(--themeColor10), 0 4px 14px rgba(0, 0, 0, 0.1);
  }
}

/* Swatch */
.theme-card-swatch {
  display: grid;
  grid-template-columns: 24% 1fr;
  width: 100%;
  height: 90px;
  background: var(--cardBg);
}

.theme-card-sidebar {
  background: rgba(0, 0, 0, 0.14);
}

.theme-card-window {
  padding: 10px 12px;
  background: var(--previewSurfaceColor);
}

.theme-card-dots {
  display: flex;
  gap: 4px;
  margin-bottom: 9px;

  & i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--previewAccentColor);
    opacity: .85;
  }
}

.theme-card-heading {
  display: block;
  width: 50%;
  height: 7px;
  border-radius: 3px;
  background: var(--cardTitle);
  margin-bottom: 8px;
}

.theme-card-line {
  display: block;
  height: 5px;
  border-radius: 2px;
  background: var(--previewTextColor);
  opacity: .55;
  margin-bottom: 5px;
}

.line-long { width: 76%; }
.line-medium { width: 58%; }

/* Card footer */
.theme-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 11px 9px;
  background: var(--cardBg);
  gap: 6px;
}

.theme-card-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--cardTitle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-card-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;

  &.badge-light {
    background: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.45);
  }

  &.badge-dark {
    background: rgba(255, 255, 255, 0.13);
    color: rgba(255, 255, 255, 0.55);
  }
}

/* Checkmark on selected card */
.theme-card-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  color: var(--themeColor);
  background: var(--cardBg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;

  & svg {
    width: 16px;
    height: 16px;
  }
}

/* Empty state */
.theme-empty {
  text-align: center;
  padding: 48px 0;
  color: var(--editorColor40);
  font-size: 14px;

  & em {
    font-style: normal;
    color: var(--editorColor60);
  }
}

.import-themes {
  padding: 10px 0;
  display: flex;
  justify-content: space-around;
  color: var(--editorColor);

  & > div {
    display: flex;
    flex-direction: column;

    & > span {
      display: inline-block;
      margin-bottom: 20px;
    }
  }
}

@media (max-width: 900px) {
  .theme-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
