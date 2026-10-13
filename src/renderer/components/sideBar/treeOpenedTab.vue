<template>
    <div
      class="opened-file"
      :title="file.pathname"
      @click="selectFile(file)"
      :class="[{'active': currentFile.id === file.id, 'unsaved': !file.isSaved }]"
    >
      <span class="close" @click.stop="removeFileInTab(file)">
        <lucide-icon name="x" :size="12"></lucide-icon>
      </span>
      <span class="name">{{ file.filename }}</span>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { tabsMixins } from '../../mixins'

export default {
  mixins: [tabsMixins],
  props: {
    file: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile
    })
  }
}
</script>

<style scoped>
  .opened-file {
    display: flex;
    align-items: center;
    user-select: none;
    height: 28px;
    padding-left: 26px;
    padding-right: var(--space-2);
    position: relative;
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease);
    & > .close {
      display: none;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      position: absolute;
      top: 5px;
      left: 4px;
      color: var(--text-muted);
      border-radius: var(--radius-xs);
      &:hover {
        color: var(--text-primary);
        background: var(--surface-active);
      }
    }
    &:hover > .close {
      display: inline-flex;
    }
    &:hover {
      background: var(--surface-hover);
    }
    & > span.name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .opened-file.active {
    color: var(--text-primary);
    background: var(--surface-selected);
    font-weight: 500;
  }
  .unsaved.opened-file::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--themeColor);
    position: absolute;
    top: 11px;
    left: 10px;
  }
  .unsaved.opened-file:hover::before {
    content: none;
  }
</style>
