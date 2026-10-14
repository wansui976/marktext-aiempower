<template>
  <div class="sessions-panel">
    <div class="sessions-header">
      <div class="sessions-heading">
        <span class="sessions-title">{{ $t('common.sessions') }}</span>
        <span class="sessions-subtitle">{{ scopeLabel }}</span>
      </div>
      <button type="button" class="sessions-new" :disabled="disabled" @click="$emit('new-chat')">
        <lucide-icon name="plus" :size="13"></lucide-icon>
        {{ $t('common.new') }}
      </button>
    </div>
    <div v-if="!sessions.length" class="empty-sessions">
      {{ $t('ai.sessions.empty') }}
    </div>
    <div
      v-for="session in sessions"
      :key="session.id"
      class="session-row"
      :class="{ active: session.id === activeSessionId }"
    >
      <button
        type="button"
        class="session-main"
        :disabled="disabled"
        @click="$emit('select', session.id)"
      >
        <lucide-icon name="message-square-text" :size="14" class="session-icon"></lucide-icon>
        <span class="session-copy">
          <span class="session-title">{{ session.title || $t('ai.sessions.newChat') }}</span>
          <span class="session-meta">
            <span v-if="session.documentLabel" class="session-doc">{{ session.documentLabel }}</span>
            <span>{{ formatTime(session.updatedAt) }}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        class="session-delete"
        :title="$t('ai.sessions.delete')"
        :disabled="disabled"
        @click.stop="$emit('delete', session.id)"
      >
        <lucide-icon name="trash-2" :size="13"></lucide-icon>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    sessions: { type: Array, default: () => [] },
    activeSessionId: { type: String, default: '' },
    scopeLabel: { type: String, default: '' },
    disabled: { type: Boolean, default: false }
  },
  methods: {
    formatTime (timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const today = new Date()
      const sameDay = date.toDateString() === today.toDateString()
      if (sameDay) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }
}
</script>
