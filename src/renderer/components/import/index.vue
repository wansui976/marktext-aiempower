<template>
  <div class="import-dialog">
    <el-dialog
      :visible.sync="showImport"
      :show-close="false"
      :modal="true"
      custom-class="ag-dialog-table"
      width="450px"
    >
      <div class="body">
        <div
          class="drop-container"
          :class="{active: isOver}"
          @dragover="dragOverHandler"
          @dragleave="dragLeaveHandler"
          @drop="dropHandler"
        >
          <div class="img-wrapper">
            <lucide-icon name="file-down" :size="36"></lucide-icon>
          </div>
          <div class="headline">Import or Open</div>
          <p>Drop here to get your stuff into MarkText</p>
        </div>
        <div class="file-list">
          <div>.md</div>
          <div>.html</div>
          <div>.docx</div>
          <div>.tex</div>
          <div>.wiki</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import bus from '@/bus'
import { ipcRenderer } from 'electron'

export default {
  data () {
    return {
      showImport: false,
      isOver: false
    }
  },
  created () {
    bus.$on('importDialog', this.showDialog)
  },
  beforeDestroy () {
    bus.$off('importDialog', this.showDialog)
  },
  methods: {
    showDialog (boolean) {
      if (boolean !== this.showImport) {
        this.showImport = boolean
      }
    },
    dragOverHandler (e) {
      this.isOver = true
    },
    dragLeaveHandler (e) {
      this.isOver = false
    },
    dropHandler (e) {
      e.preventDefault()
      if (e.dataTransfer.files) {
        const fileList = []
        for (const file of e.dataTransfer.files) {
          fileList.push(file.path)
        }
        ipcRenderer.send('mt::window::drop', fileList)
      }
    }
  }
}
</script>

<style scoped>
.drop-container {
  padding: var(--space-6) var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  border: 1.5px dashed var(--border-strong);
  transition: border-color var(--duration-fast) var(--ease), background-color var(--duration-fast) var(--ease);
  & div,
  & p {
    text-align: center;
  }
  & .headline {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  & p {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-md);
    color: var(--text-muted);
  }
  &.active {
    border-color: var(--themeColor);
    background-color: var(--surface-hover);
  }
}
.img-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-3);
  color: var(--text-muted);
}
.file-list {
  margin-top: var(--space-4);
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  & div {
    padding: 0 var(--space-3);
    height: 26px;
    line-height: 26px;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface-hover);
    border-radius: 13px;
  }
}
</style>
