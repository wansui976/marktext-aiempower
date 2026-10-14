<template>
  <div class="rename">
    <el-dialog
      :visible.sync="showRename"
      :show-close="false"
      :modal="true"
      custom-class="ag-dialog-table"
      width="410px"
    >
      <div slot="title" class="search-wrapper">
        <div class="input-wrapper">
          <input
            type="text" v-model="tempName" class="search"
            @keyup.13="confirm"
            ref="search"
          >
          <button class="confirm" title="Rename" @click="confirm">
            <lucide-icon name="check" :size="16"></lucide-icon>
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import bus from '../../bus'
import { mapState } from 'vuex'

export default {
  data () {
    return {
      showRename: false,
      tempName: ''
    }
  },
  created () {
    this.$nextTick(() => {
      bus.$on('rename', this.handleRename)
    })
  },
  beforeDestroy () {
    bus.$off('rename', this.handleRename)
  },
  computed: {
    ...mapState({
      filename: state => state.editor.currentFile.filename
    })
  },
  methods: {
    handleRename () {
      this.showRename = true
      this.tempName = this.filename
      this.$refs.search.focus()
    },
    confirm () {
      this.$store.dispatch('RENAME', this.tempName)
      this.showRename = false
    }
  }
}
</script>

<style>
  .rename .el-dialog__header {
    box-sizing: border-box;
    padding: 0;
  }
  .rename .el-dialog__body {
    display: none;
  }
</style>

<style scoped>
  .search-wrapper {
    z-index: 10000;
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    width: 410px;
    box-sizing: border-box;
    margin: 0;
    padding: var(--space-3);

    & .input-wrapper {
      display: flex;
      align-items: center;
      width: 100%;
      height: 36px;
      padding: 0 4px 0 var(--space-3);
      box-sizing: border-box;
      background: var(--surface-input);
      border: 1px solid var(--themeColor);
      border-radius: var(--radius-md);
      box-shadow: var(--focus-ring);
    }
  }
  .search {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    outline: none;
    border: none;
    font-family: var(--font-ui);
    font-size: var(--font-size-lg);
    color: var(--text-primary);
    background: transparent;
  }
  .confirm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    cursor: pointer;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
    &:hover {
      color: var(--themeColor);
      background: var(--surface-hover);
    }
  }
</style>
