<template>
  <section class="pref-text-box-item" :class="{'ag-underdevelop': disable}">
    <div class="description">
      <span>{{description}}</span>
      <i class="el-icon-info" v-if="more"
        @click="handleMoreClick"
      ></i>
    </div>
    <el-input
      class="input"
      :class="{error: invalidInput}"
      :placeholder="defaultValue"
      v-model="inputText"
      @input="handleInput"
      size="small"
      clearable>
    </el-input>
    <div v-if="notes" class="notes">
      {{notes}}
    </div>
  </section>
</template>

<script>
import { shell } from 'electron'

export default {
  data () {
    this.inputTimer = null
    return {
      inputText: this.input,
      invalidInput: false
    }
  },
  props: {
    description: String,
    notes: String,
    input: String,
    onChange: Function,
    more: String,
    disable: {
      type: Boolean,
      default: false
    },
    defaultValue: {
      type: String,
      default: ''
    },
    emitTime: {
      type: Number,
      default: 800
    },
    regexValidator: {
      type: RegExp,
      default () {
        return /(.*?)/
      }
    }
  },
  watch: {
    input: function (value, oldValue) {
      if (value !== oldValue) {
        this.inputText = value
      }
    }
  },
  methods: {
    handleMoreClick () {
      if (typeof this.more === 'string') {
        shell.openExternal(this.more)
      }
    },
    handleInput (value) {
      const result = this.regexValidator.test(value)
      this.invalidInput = !result

      if (result) {
        // Only clear timer when input is valid, otherwise write the last value.
        if (this.inputTimer) {
          clearTimeout(this.inputTimer)
        }

        const { emitTime } = this
        if (emitTime === 0) {
          this.onChange(value)
          return
        }

        // Setting delay a little bit higher to prevent continuously file writes when typing.
        this.inputTimer = setTimeout(() => {
          this.inputTimer = null
          this.onChange(value)
        }, emitTime)
      }
    }
  }
}
</script>

<style>
  .pref-text-box-item {
    font-size: var(--font-size-md);
    user-select: none;
    margin: var(--space-4) 0;
    color: var(--editorColor80);
    width: 100%;
    & .input {
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
  .pref-text-box-item .el-input.error input {
    color: var(--deleteColor);
    border-color: var(--deleteColor);
  }
</style>
