<template>
  <svg
    class="lucide-icon"
    :viewBox="icon.viewBox"
    :width="size"
    :height="size"
    aria-hidden="true"
  >
    <use :xlink:href="icon.url"></use>
  </svg>
</template>

<script>
// Lucide icons (https://lucide.dev, ISC License) vendored in assets/icons/lucide.
// Source files carry no fill/stroke attributes; styling is done via CSS below.
const requireIcon = require.context('@/assets/icons/lucide', false, /\.svg$/)
const icons = {}
for (const key of requireIcon.keys()) {
  const mod = requireIcon(key)
  icons[key.replace(/^\.\/lucide-(.*)\.svg$/, '$1')] = mod.default || mod
}

export default {
  name: 'LucideIcon',
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: [Number, String],
      default: 16
    }
  },
  computed: {
    icon () {
      const icon = icons[this.name]
      if (!icon) {
        console.warn(`[LucideIcon] unknown icon "${this.name}"`)
        return { viewBox: '0 0 24 24', url: '' }
      }
      return icon
    }
  }
}
</script>

<style>
  .lucide-icon {
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
    vertical-align: middle;
  }
</style>
