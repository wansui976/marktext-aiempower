<template>
  <section class="pref-select-item" :class="{'ag-underdevelop': disable}">
    <div class="description" v-if="description">
      <span>{{description}}</span>
      <i class="el-icon-info"
        v-if="more"
        @click="handleMoreClick"
      ></i>
    </div>
    <el-select
      v-model="selectValue"
      @change="select"
      :disabled="disable"
    >
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value">
      </el-option>
    </el-select>
    <div v-if="notes" class="notes">
      {{notes}}
    </div>
  </section>
</template>

<script>
import { shell } from 'electron'

export default {
  data () {
    return {
      selectValue: this.value
    }
  },
  props: {
    description: String,
    notes: String,
    value: String | Number,
    options: Array,
    onChange: Function,
    more: String,
    disable: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    value: function (value, oldValue) {
      if (value !== oldValue) {
        this.selectValue = value
      }
    }
  },
  methods: {
    handleMoreClick () {
      if (typeof this.more === 'string') {
        shell.openExternal(this.more)
      }
    },
    select (value) {
      this.onChange(value)
    }
  }
}
</script>

<style>
.pref-select-item {
  margin: var(--space-4) 0;
  font-size: var(--font-size-md);
  color: var(--editorColor80);
  & .description {
    margin-bottom: var(--space-2);
  }
  & .el-select {
    width: 100%;
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
</style>
