<template>
  <section class="pref-font-input-item" :class="{'ag-underdevelop': disable}">
    <div class="description">
      <span>{{description}}</span>
      <i class="el-icon-info" v-if="more" @click="handleMoreClick"></i>
    </div>
    <el-autocomplete
      class="font-autocomplete"
      popper-class="font-autocomplete-popper"
      v-model="selectValue"
      :fetch-suggestions="querySearch"
      placeholder="Select font..."
      @select="handleSelect"
    >
      <i class="el-icon-arrow-down el-input__icon" slot="suffix"></i>
      <template slot-scope="{ item }">
        <div class="family">{{ item }}</div>
      </template>
    </el-autocomplete>
  </section>
</template>

<script>
import { shell } from 'electron'

// Example of fontmanager-redux objects:
// {
//     path: '/Library/Fonts/Arial.ttf',
//     postscriptName: 'ArialMT',
//     family: 'Arial',
//     style: 'Regular',
//     weight: 400,
//     width: 5,
//     italic: false,
//     monospace: false
// }
// {
//     path: '/Library/Fonts/Arial Bold.ttf',
//     postscriptName: 'Arial-BoldMT',
//     family: 'Arial',
//     style: 'Bold',
//     weight: 700,
//     width: 5,
//     italic: false,
//     monospace: false
// }

export default {
  data () {
    this.defaultValue = this.value
    return {
      fontFamilies: [],
      selectValue: this.value
    }
  },
  props: {
    description: String,
    value: String,
    onChange: Function,
    more: String,
    disable: {
      type: Boolean,
      default: false
    },
    onlyMonospace: {
      type: Boolean,
      default: false
    }
  },

  watch: {
    value: function (value, oldValue) {
      if (value !== oldValue) {
        this.defaultValue = value
        this.selectValue = value
      }
    }
  },

  methods: {
    querySearch (queryString, callback) {
      const fontFamilies = this.fontFamilies
      const results = queryString && this.defaultValue !== queryString
        ? fontFamilies.filter(f => f.toLowerCase().indexOf(queryString.toLowerCase()) === 0)
        : fontFamilies
      callback(results)
    },

    handleSelect (value) {
      if (/^[^\s]+((-|\s)*[^\s])*$/.test(value)) {
        this.selectValue = value
        this.onChange(value)
      }
    },

    handleMoreClick () {
      if (typeof this.more === 'string') {
        shell.openExternal(this.more)
      }
    }
  },
  mounted () {
    // Delay load native library because it's not needed for the editor and causes a delay.
    const fontManager = require('fontmanager-redux')
    const { onlyMonospace } = this
    const buf = fontManager.getAvailableFontsSync()
      .filter(f => f.family && (!onlyMonospace || (onlyMonospace && f.monospace)))
      .map(f => f.family)
    this.fontFamilies = [...new Set(buf)].sort((a, b) => a.localeCompare(b))
  }
}
</script>

<style>
.pref-font-input-item {
  margin: var(--space-4) 0;
  font-size: var(--font-size-md);
  color: var(--editorColor80);
  & .font-autocomplete {
    width: 100%;
  }
  & .description {
    margin-bottom: var(--space-2);
  }
  & .description i,
  & i.el-icon-info {
    margin-left: var(--space-1);
    cursor: pointer;
    color: var(--text-muted);
  }
  & .description i:hover,
  & i.el-icon-info:hover {
    color: var(--themeColor);
  }
  & .notes {
    margin-top: 6px;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-ui);
    color: var(--text-muted);
  }
}
.font-autocomplete-popper li {
  height: auto;
  line-height: normal;
  padding: 6px var(--space-2);
  & .value {
    text-overflow: ellipsis;
    overflow: hidden;
  }
  & .link {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
  }
}
</style>
