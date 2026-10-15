<template>
  <section class="pref-compound-item">
    <div class="pref-compound-head">
      <slot name="head"/>
    </div>
    <div class="pref-compound-body">
      <slot name="children"/>
    </div>
    <div v-if="notes" class="notes">
      {{notes}}
    </div>
    </div>
  </section>
</template>

<script>

export default {
  props: {
    notes: String
  }
}
</script>

<style>
  .pref-compound-item {
    font-size: var(--font-size-md);
    user-select: none;
    margin: 0 0 var(--space-6);
    color: var(--editorColor80);

    & .pref-compound-head h6.title {
      margin: 0 0 var(--space-2) 2px;
      padding: 0;
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: .05em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    /* Settings rows inside a card, separated by hairlines. */
    & .pref-compound-body {
      padding: 0 var(--space-4);
      margin: 0 0 var(--space-5);
      background: var(--editorColor04);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      & > section {
        margin: 0;
        padding: var(--space-3) 0;
      }
      & > section + section {
        border-top: 1px solid var(--border-subtle);
      }
    }

    & .description {
      margin-bottom: var(--space-2);
    }

    & .notes {
      margin-top: 6px;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }
  }
</style>
