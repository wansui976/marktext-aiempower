import * as actions from '../actions/theme'

const THEME_LIST = [
  { label: 'Graphite Red', id: 'graphite-red' },
  { label: 'Graphite Black', id: 'graphite-black' },
  { label: 'Graphite Blue', id: 'graphite-blue' },
  { label: 'Charcoal Grey', id: 'charcoal-grey' },
  { label: 'Broad Daylight', id: 'broad-daylight' },
  { label: 'Dark Night', id: 'dark-night' },
  { label: 'Anxiety Mode', id: 'anxiety-mode' },
  { label: 'Gotham City', id: 'gotham-city' },
  { label: 'Dracula', id: 'dracula' },
  { label: 'Toothpaste', id: 'toothpaste' },
  { label: 'Cobalt Blue', id: 'cobalt-blue' },
  { label: 'Dead Leaf', id: 'dead-leaf' },
  { label: 'Icefield', id: 'icefield' },
  { label: 'Moonlight', id: 'moonlight' },
  { label: 'Ten Gold', id: 'ten-gold' },
  { label: 'Ayu Light', id: 'ayu-light' },
  { label: 'Ayu Mirage', id: 'ayu-mirage' },
  { label: 'Gandalf', id: 'gandalf' },
  { label: 'Deer Park', id: 'deer-park' },
  { label: 'Boring', id: 'boring' },
  { label: 'Day', id: 'day' },
  { label: 'Nord', id: 'nord' },
  { label: 'Notes Light', id: 'notes-light' },
  { label: 'Notes Dark', id: 'notes-dark' },
  { label: 'Lighthouse', id: 'lighthouse' },
  { label: 'Rosé Pine', id: 'rose-pine' },
  { label: 'Rosé Pine Dawn', id: 'rose-pine-dawn' },
  { label: 'Tokyo Night', id: 'tokyo-night' },
  { label: 'Norwegian Light', id: 'norwegian-light' },
  { label: 'Academic', id: 'academic' },
  { label: 'Atom One Dark', id: 'atom-one-dark' },
  { label: 'Vinyl', id: 'vinyl' },
  { label: 'Catppuccin Latte', id: 'catppuccin-latte' },
  { label: 'Catppuccin Macchiato', id: 'catppuccin-macchiato' },
  { label: 'Shibuya Jazz', id: 'shibuya-jazz' },
  { label: 'Shibuya Lo-fi', id: 'shibuya-lofi' },
  { label: 'Dark Forest', id: 'dark-forest' },
  { label: 'Clear Realm', id: 'clear-realm' }
]

export default function (userPreference) {
  const { theme } = userPreference.getAll()
  return {
    label: '&Theme',
    id: 'themeMenu',
    submenu: THEME_LIST.map(t => ({
      label: t.label,
      type: 'radio',
      id: t.id,
      checked: theme === t.id,
      click () {
        actions.selectTheme(t.id)
      }
    }))
  }
}
