<template>
  <div class="about-dialog">
    <el-dialog
      :visible.sync="showAboutDialog"
      :show-close="false"
      :modal="true"
      custom-class="ag-dialog-table"
      width="400px"
    >
      <img class="logo" :src="logo" />
      <el-row>
        <el-col :span="24">
          <h3 class="title">{{ name }}</h3>
        </el-col>
        <el-col :span="24">
          <div class="text">{{ appVersion }}</div>
        </el-col>
        <el-col :span="24">
          <div class="text" style="min-height: auto">{{ copyright }}</div>
        </el-col>
        <el-col :span="24">
          <div class="text">{{ copyrightContributors }}</div>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import bus from '../../bus'
import MarkTextLogo from '../../assets/images/logo.png'

export default {
  data () {
    this.name = 'MarkText-AIEmpower'
    this.copyright = `Copyright © 2017-${new Date().getFullYear()} Luo Ran`
    this.copyrightContributors = `Based on MarkText · AI features © ${new Date().getFullYear()}`
    this.logo = MarkTextLogo
    return {
      showAboutDialog: false
    }
  },
  computed: {
    ...mapState({
      appVersion: state => state.appVersion
    })
  },
  created () {
    bus.$on('aboutDialog', this.showDialog)
  },
  beforeDestroy () {
    bus.$off('aboutDialog', this.showDialog)
  },
  methods: {
    showDialog () {
      this.showAboutDialog = true
      bus.$emit('editor-blur')
    }
  }
}
</script>

<style>
  .about-dialog el-row,
  .about-dialog el-col {
    display: block;
  }

  .about-dialog .el-dialog__body {
    padding: var(--space-6) var(--space-6) var(--space-5);
  }

  .about-dialog img.logo {
    width: 72px;
    height: 72px;
    display: inherit;
    margin: 0 auto var(--space-3);
  }

  .about-dialog .title,
  .about-dialog .text {
    text-align: center;
  }

  .about-dialog .title {
    margin: 0 0 var(--space-1);
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .about-dialog .text {
    min-height: 22px;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-ui);
    color: var(--text-muted);
  }
</style>
