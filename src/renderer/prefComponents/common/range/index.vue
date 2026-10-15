<template>
  <section class="pref-range-item" :class="{'ag-underdevelop': disable}">
    <div class="description">
      <span>{{description}}</span> <span class="value" v-if="selectValue">{{selectValue}} <span v-if="unit">{{unit}}</span></span>
      <i class="el-icon-info" v-if="more"
        @click="handleMoreClick"
      ></i>
    </div>
    <el-slider
      v-model="selectValue"
      @change="select"
      :min="min"
      :max="max"
      :format-tooltip="value => value + (unit ? unit : '')"
      :step="step">
    </el-slider>
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
    value: String | Number,
    min: Number,
    max: Number,
    onChange: Function,
    unit: String,
    step: Number,
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
.pref-range-item {
  margin: var(--space-4) 0;
  font-size: var(--font-size-md);
  color: var(--editorColor80);
  width: 100%;
  & .description {
    margin-bottom: var(--space-1);
  }
  & .value {
    float: right;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }
  & .el-slider {
    width: 100%;
    padding: 0 7px;
    box-sizing: border-box;
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
