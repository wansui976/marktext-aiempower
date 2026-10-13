<template>
  <div
    class="side-bar-toc"
    :class="[{ 'side-bar-toc-overflow': !wordWrapInToc, 'side-bar-toc-wordwrap': wordWrapInToc }]"
  >
    <div class="title">Table Of Contents</div>
    <el-tree
      v-if="toc.length"
      :data="toc"
      :default-expand-all="true"
      :props="defaultProps"
      @node-click="handleClick"
      :expand-on-click-node="false"
      :indent="10"
    ></el-tree>
    <div class="no-data" v-else>
      <svg aria-hidden="true" :viewBox="EmptyIcon.viewBox">
        <use :xlink:href="EmptyIcon.url"></use>
      </svg>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '../../bus'
import EmptyIcon from '@/assets/icons/undraw_toc_empty.svg'

export default {
  data () {
    this.EmptyIcon = EmptyIcon
    return {
      defaultProps: {
        children: 'children',
        label: 'label'
      }
    }
  },
  computed: {
    ...mapState({
      toc: state => state.editor.toc,
      wordWrapInToc: state => state.preferences.wordWrapInToc
    })
  },
  methods: {
    handleClick ({ slug }) {
      bus.$emit('scroll-to-header', slug)
    }
  }
}
</script>

<style>
  .side-bar-toc {
    height: calc(100% - 35px);
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    & .title {
      display: flex;
      align-items: center;
      height: 28px;
      margin: 39px var(--space-2) var(--space-1);
      padding: 0 var(--space-2);
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    & .el-tree {
      padding: 0 var(--space-2) var(--space-4);
      font-size: var(--font-size-md);
      background: transparent;
      color: var(--text-secondary);
    }
    & .el-tree-node__content {
      height: 28px;
      padding-right: var(--space-2);
      border-radius: var(--radius-sm);
      transition: background-color var(--duration-fast) var(--ease);
    }
    & .el-tree-node:focus > .el-tree-node__content,
    & .el-tree-node__content:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }
    & .el-tree-node__expand-icon {
      color: var(--text-muted);
    }
    & .el-tree-node__expand-icon.is-leaf {
      color: transparent;
    }
    & .no-data {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-around;
      padding-bottom: 50px;
      & svg {
        width: 96px;
        fill: var(--themeColor);
        opacity: .5;
      }
    }
  }
  .side-bar-toc-overflow {
    overflow: auto;
  }
  .side-bar-toc-wordwrap {
    overflow-x: hidden;
    overflow-y: auto;
    & .el-tree-node__content {
      white-space: normal;
      height: auto;
      min-height: 28px;
    }
  }
</style>
