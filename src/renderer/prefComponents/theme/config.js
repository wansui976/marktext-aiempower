const makePreview = (bg, title, color, accent) => ({
  bg,
  title,
  color,
  accent,
  border: isLightColor(bg) ? 'rgba(18, 18, 18, 0.10)' : 'rgba(255, 255, 255, 0.03)',
  shadow: isLightColor(bg)
    ? '0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 1px 2px rgba(0, 0, 0, 0.05)'
    : '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 1px 2px rgba(0, 0, 0, 0.18)'
})

function isLightColor (hex) {
  const color = hex.replace('#', '')
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

export const themes = [
  { name: 'graphite-red', label: 'Graphite Red', preview: makePreview('#FFFFFF', '#333333', '#666666', '#E05D5D') },
  { name: 'graphite-black', label: 'Graphite Black', preview: makePreview('#222222', '#EEEEEE', '#BBBBBB', '#5D9CE0') },
  { name: 'graphite-blue', label: 'Graphite Blue', preview: makePreview('#FFFFFF', '#24292F', '#57606A', '#0969DA'), showModeIcons: true },
  { name: 'charcoal-grey', label: 'Charcoal Grey', preview: makePreview('#373C43', '#8B949E', '#C9D1D9', '#79C0FF') },
  { name: 'broad-daylight', label: 'Broad Daylight', preview: makePreview('#FDF6E3', '#586E75', '#657B83', '#B58900') },
  { name: 'dark-night', label: 'Dark Night', preview: makePreview('#002B36', '#93A1A1', '#839496', '#2AA198') },
  { name: 'anxiety-mode', label: 'Anxiety Mode', preview: makePreview('#1A202C', '#D69E2E', '#E2E8F0', '#38B2AC') },
  { name: 'gotham-city', label: 'Gotham City', preview: makePreview('#111827', '#10B981', '#64748B', '#EF4444') },
  { name: 'dracula', label: 'Dracula', preview: makePreview('#282A36', '#50FA7B', '#F8F8F2', '#8BE9FD') },
  { name: 'toothpaste', label: 'Toothpaste', preview: makePreview('#263238', '#80CBC4', '#B0BEC5', '#EF9A9A') },
  { name: 'cobalt-blue', label: 'Cobalt Blue', preview: makePreview('#192A3E', '#D4AF37', '#E2E8F0', '#20B2AA') },
  { name: 'dead-leaf', label: 'Dead Leaf', preview: makePreview('#FBF7EE', '#5D4037', '#795548', '#3F51B5') },
  { name: 'icefield', label: 'Icefield', preview: makePreview('#FFFFFF', '#5C6BC0', '#495057', '#D96F6F') },
  { name: 'moonlight', label: 'Moonlight', preview: makePreview('#FCFCFC', '#A068C6', '#606266', '#B565A7') },
  { name: 'ten-gold', label: 'Ten Gold', preview: makePreview('#000000', '#F5A623', '#F3F4F6', '#F59E0B') },
  { name: 'ayu-light', label: 'Ayu Light', preview: makePreview('#FAFAFA', '#6C719C', '#5C617B', '#F2994A') },
  { name: 'ayu-mirage', label: 'Ayu Mirage', preview: makePreview('#1F2430', '#8A91A7', '#C2C5D1', '#FFCC66') },
  { name: 'gandalf', label: 'Gandalf', preview: makePreview('#F4F5F7', '#4A6076', '#4B5563', '#8C4348') },
  { name: 'deer-park', label: 'Deer Park', preview: makePreview('#F6F7F0', '#35664F', '#424B46', '#4A9D87') },
  { name: 'boring', label: 'Boring', preview: makePreview('#FFFFFF', '#1C1C1E', '#3A3A3C', '#6E7C8B') },
  { name: 'day', label: 'Day', preview: makePreview('#FFFFFF', '#BA7276', '#4C5768', '#D97B65') },
  { name: 'nord', label: 'Nord', preview: makePreview('#2E3440', '#81A1C1', '#ECEFF4', '#A3BE8C') },
  { name: 'notes-light', label: 'Notes Light', preview: makePreview('#FFFFFF', '#4A4A4A', '#5A5A5A', '#E2B53E') },
  { name: 'notes-dark', label: 'Notes Dark', preview: makePreview('#1C1C1E', '#D4D4D4', '#A1A1AA', '#E2B53E') },
  { name: 'lighthouse', label: 'Lighthouse', preview: makePreview('#131216', '#EED87A', '#EAE5E1', '#73D2AE') },
  { name: 'rose-pine', label: 'Rosé Pine', preview: makePreview('#191724', '#A390C4', '#E0DEF4', '#EB6F92') },
  { name: 'rose-pine-dawn', label: 'Rosé Pine Dawn', preview: makePreview('#FAF4ED', '#3A7C96', '#575279', '#D7827E') },
  { name: 'tokyo-night', label: 'Tokyo Night', preview: makePreview('#1A1B26', '#7AA2F7', '#A9B1D6', '#BB9AF7') },
  { name: 'norwegian-light', label: 'Norwegian Light', preview: makePreview('#EEF2F6', '#1B5469', '#4C6275', '#B85B33') },
  { name: 'academic', label: 'Academic', preview: makePreview('#594A46', '#DBC5C1', '#BEB0AE', '#C67D38') },
  { name: 'atom-one-dark', label: 'Atom One Dark', preview: makePreview('#282C34', '#ABB2BF', '#9CA3AF', '#61AFEF') },
  { name: 'vinyl', label: 'Vinyl', preview: makePreview('#F7EFCF', '#796B3E', '#5C5A4E', '#64845D') },
  { name: 'catppuccin-latte', label: 'Catppuccin Latte', preview: makePreview('#EFF1F5', '#179299', '#4C4F69', '#8839EF') },
  { name: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', preview: makePreview('#24273A', '#8BD5CA', '#CAD3F5', '#C6A0F6') },
  { name: 'shibuya-jazz', label: 'Shibuya Jazz', preview: makePreview('#000000', '#4FD1C5', '#F3F4F6', '#F687B3') },
  { name: 'shibuya-lofi', label: 'Shibuya Lo-fi', preview: makePreview('#000000', '#B794F4', '#E2E8F0', '#F6AD55') },
  { name: 'dark-forest', label: 'Dark Forest', preview: makePreview('#222627', '#C6A67B', '#E3D9C6', '#C76E74') },
  { name: 'clear-realm', label: 'Clear Realm', preview: makePreview('#FCF9F2', '#6B7280', '#4B5563', '#2563EB') }
]

export const autoSwitchThemeOptions = [{
  label: 'Adjust theme at startup', // Always
  value: 0
}, /* {
  label: 'Only at runtime',
  value: 1
}, */ {
  label: 'Never',
  value: 2
}]
