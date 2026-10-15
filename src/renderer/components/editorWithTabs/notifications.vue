<template>
  <div
    v-if="currentNotification"
    class="editor-notifications"
    :class="currentNotification.style"
    :style="{'max-width': showSideBar ? `calc(100vw - ${sideBarWidth}px` : '100vw' }"
  >
    <div class="msg">
      {{ currentNotification.msg }}
    </div>
    <div class="controls">
      <div>
        <span
          class="inline-button"
          v-if="currentNotification.showConfirm"
          @click.stop="handleClick(true)"
        >
          Ok
        </span>
        <span
          class="inline-button"
          @click.stop="handleClick(false)"
        >
          <lucide-icon name="x" :size="14"></lucide-icon>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  data () {
    return {}
  },
  computed: {
    ...mapState({
      currentFile: state => state.editor.currentFile,
      showSideBar: state => state.layout.showSideBar,
      sideBarWidth: state => state.layout.sideBarWidth
    }),
    currentNotification () {
      const notifications = this.currentFile.notifications
      if (!notifications || notifications.length === 0) {
        return null
      }
      return notifications[0]
    }
  },
  methods: {
    handleClick (status) {
      const notifications = this.currentFile.notifications
      if (!notifications || notifications.length === 0) {
        console.error('notifications::handleClick: Cannot find notification on stack.')
        return
      }

      const item = notifications.shift()
      const action = item.action
      if (action) {
        action(status)
      }
    }
  }
}
</script>

<style scoped>
  .editor-notifications {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    max-height: 100px;
    margin: var(--space-2) var(--space-3) 0;
    padding: 6px var(--space-2) 6px var(--space-3);
    background: var(--notificationPrimaryBg);
    color: var(--notificationPrimaryColor);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-1);
    user-select: none;
    overflow: hidden;
    &.warn {
      background: var(--notificationWarningBg);
      color: var(--notificationWarningColor);
    }
    &.crit {
      background: var(--notificationErrorBg);
      color: var(--notificationErrorColor);
    }
  }
  .msg {
    font-size: var(--font-size-md);
    line-height: var(--line-height-ui);
    flex: 1;
  }
  .controls {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-left: var(--space-2);
    & > div {
      display: flex;
      flex-direction: row;
      gap: var(--space-1);
    }
    & .inline-button {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 24px;
      height: 24px;
      padding: 0 6px;
      box-sizing: border-box;
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background-color var(--duration-fast) var(--ease);
    }
    & .inline-button:hover {
      background: rgba(255, 255, 255, .18);
    }
  }
</style>
