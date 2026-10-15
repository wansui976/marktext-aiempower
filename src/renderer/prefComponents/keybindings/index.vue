<template>
  <div class="pref-keybindings">
    <h4>Key Bindings</h4>
    <section class="keybindings">
      <div class="text">
        Customize MarkText shortcuts and click on the save button below to apply all changes (requires a restart).
        All available and default key binding can be found <a class="link" @click="openKeybindingWiki">online</a>.
      </div>
      <el-table
        :data="keybindingList"
        style="width: 100%"
      >
        <el-table-column prop="description" label="Description">
        </el-table-column>
        <el-table-column prop="accelerator" label="Key Combination" width="220">
        </el-table-column>
        <el-table-column fixed="right" label="Options" width="112">
          <template slot-scope="scope">
            <el-button @click="handleEditClick(scope.$index, scope.row)" type="text" size="small" title="Edit">
              <i class="el-icon-edit"></i>
            </el-button>
            <el-button @click="handleResetClick(scope.$index, scope.row)" type="text" size="small" title="Reset">
              <i class="el-icon-refresh-right"></i>
            </el-button>
            <el-button @click="handleUnbindClick(scope.$index, scope.row)" type="text" size="small" title="Unbind">
              <i class="el-icon-delete"></i>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
    <section class="footer">
      <separator></separator>
      <el-button size="medium" @click="saveKeybindings">Save</el-button>
      <el-button size="medium" @click="restoreDefaults">Restore default key bindings</el-button>
    </section>
    <section v-if="showDebugTools" class="keyboard-debug">
      <separator></separator>
      <div><strong>Debug options:</strong></div>
      <el-button size="medium" @click="dumpKeyboardInformation">Dump keyboard information</el-button>
    </section>
    <key-input-dialog
      :showWithId="selectedShortcutId"
      :onCommit="onKeybinding"
    ></key-input-dialog>
  </div>
</template>

<script>
import { ipcRenderer, shell } from 'electron'
import log from 'electron-log'
import { setKeyboardLayout } from '@hfelix/electron-localshortcut'
import Compound from '../common/compound'
import Separator from '../common/separator'
import KeyInputDialog from './key-input-dialog.vue'
import KeybindingConfigurator from './KeybindingConfigurator'
import notice from '@/services/notification'

export default {
  components: {
    Compound,
    Separator,
    KeyInputDialog
  },
  data () {
    return {
      showDebugTools: false,
      keybindingConfigurator: null,
      selectedShortcutId: null,
      keybindingList: []
    }
  },

  mounted () {
    ipcRenderer.invoke('mt::keybinding-get-keyboard-info')
      .then(({ layout, keymap }) => {
        // Update the key mapper to prevent problems on non-US keyboards.
        setKeyboardLayout(layout, keymap)
      })
      .catch(error => log.error('Error while loading keyboard information for settings:', error))

    ipcRenderer.invoke('mt::keybinding-get-pref-keybindings')
      .then(({ defaultKeybindings, userKeybindings }) => {
        this.keybindingConfigurator = new KeybindingConfigurator(defaultKeybindings, userKeybindings)
        this.keybindingList = this.keybindingConfigurator.getKeybindings()
      })
      .catch(error => log.error('Error while loading keyboard information for settings:', error))

    // Show keyboard debugging tools which has been moved from CLI because we
    // need an active window on Windows.
    this.showDebugTools = global.marktext.env.debug
  },

  unmounted () {
    this.keybindingList = []
    this.keybindingConfigurator = null
  },

  methods: {
    openKeybindingWiki () {
      shell.openExternal('https://github.com/marktext/marktext/blob/master/docs/KEYBINDINGS.md')
    },
    saveKeybindings () {
      if (this.keybindingConfigurator && this.keybindingList.length > 0) {
        this.keybindingConfigurator.save()
          .then(success => {
            if (!success) {
              notice.notify({
                title: 'Failed to save',
                type: 'error',
                message: 'An unexpected error occurred while saving.'
              })
            }
          })
          .catch(error => log.error(error))
      }
    },
    restoreDefaults () {
      this.keybindingConfigurator.resetAll()
        .then(success => {
          if (!success) {
            notice.notify({
              title: 'Failed to save',
              type: 'error',
              message: 'An unexpected error occurred while saving.'
            })
          }
        })
        .catch(error => log.error(error))
    },
    handleEditClick (index, entry) {
      if (index >= 0 && entry) {
        this.selectedShortcutId = entry.id
      }
    },
    handleResetClick (index, entry) {
      const { keybindingConfigurator } = this
      const { id } = entry
      const success = keybindingConfigurator.resetToDefault(id)
      if (!success) {
        this.handleDuplicateShortcut(id, keybindingConfigurator.getDefaultAccelerator(id))
      }
    },
    handleUnbindClick (index, entry) {
      this.keybindingConfigurator.unbind(entry.id)
    },
    onKeybinding (value) {
      const selectedId = this.selectedShortcutId
      if (value && selectedId) {
        const success = this.keybindingConfigurator.change(selectedId, value)
        if (!success) {
          this.handleDuplicateShortcut(selectedId, value)
        }
      }
      this.selectedShortcutId = null
    },
    handleDuplicateShortcut (id, accelerator) {
      notice.notify({
        title: 'Shortcut already in use',
        type: 'warning',
        message: `The shortcut "${accelerator}" is already in use. Please unset the shortcut and try again.`
      })
    },
    dumpKeyboardInformation () {
      ipcRenderer.send('mt::keybinding-debug-dump-keyboard-info')
    }
  }
}
</script>

<style scoped>
.pref-keybindings {
  & .keyboard-debug,
  & .keybindings {
    font-size: var(--font-size-md);
    margin: 0 0 var(--space-5);
    color: var(--editorColor80);
  }
  & .keybindings > div.text {
    margin-bottom: var(--space-4);
    line-height: var(--line-height-ui);
    color: var(--text-secondary);
  }
  & .link {
    color: var(--themeColor);
    cursor: pointer;
  }
}
</style>
<style>
.pref-keybindings .el-table {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.pref-keybindings .el-table::before,
.pref-keybindings .el-table__fixed-right::before,
.pref-keybindings .el-table__fixed::before {
  display: none;
}
.pref-keybindings .el-table th.el-table__cell {
  background: var(--editorColor04);
}
.pref-keybindings .el-table th.el-table__cell,
.pref-keybindings .el-table td.el-table__cell {
  border: none;
  border-bottom: 1px solid var(--border-subtle);
}
.pref-keybindings .el-table tr:last-child td.el-table__cell {
  border-bottom: none;
}
.pref-keybindings .el-table__fixed-right {
  background: var(--editorBgColor);
}
.pref-keybindings .el-table__body tr.hover-row > td.el-table__cell {
  background: var(--surface-hover);
}
.pref-keybindings .el-table td.el-table__cell:nth-child(2) .cell {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}
.pref-keybindings .el-table .el-button--text {
  min-height: 24px;
  width: 24px;
  padding: 0;
  margin: 0;
  color: var(--text-muted);
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: var(--radius-xs);
}
.pref-keybindings .el-table .el-button--text + .el-button--text {
  margin-left: 2px;
}
.pref-keybindings .el-table .el-button--text:hover {
  color: var(--text-primary);
  background: var(--surface-active);
}
</style>
