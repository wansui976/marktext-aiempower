<template>
    <div
      class="recent-files-projects"
    >
      <div class="centered-group">
        <svg :viewBox="ContentIcon.viewBox" aria-hidden="true">
          <use :xlink:href="ContentIcon.url" />
        </svg>
        <button class="button-primary" @click="newFile">
          New File
        </button>
      </div>
    </div>
</template>

<script>
import ContentIcon from '@/assets/icons/undraw_content.svg'

export default {
  data () {
    this.ContentIcon = ContentIcon
    return {}
  },
  methods: {
    newFile () {
      this.$store.dispatch('NEW_UNTITLED_TAB', {})
    }
  }
}
</script>

<style scoped>
  .recent-files-projects {
    background: var(--editorBgColor);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-around;
    & .centered-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      & svg {
        width: 160px;
        fill: var(--themeColor);
        opacity: .5;
      }
      & button.button-primary {
        margin-top: var(--space-6);
      }
    }
  }
</style>
