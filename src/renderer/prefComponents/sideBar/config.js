// Category icons are Lucide icon names (see components/lucideIcon).
import preferences from '../../../main/preferences/schema'

export const category = [{
  name: 'General',
  label: 'general',
  icon: 'settings',
  path: '/preference/general'
}, {
  name: 'Editor',
  label: 'editor',
  icon: 'square-pen',
  path: '/preference/editor'
}, {
  name: 'Markdown',
  label: 'markdown',
  icon: 'file-text',
  path: '/preference/markdown'
}, {
  name: 'Spelling',
  label: 'spelling',
  icon: 'spell-check',
  path: '/preference/spelling'
}, {
  name: 'Theme',
  label: 'theme',
  icon: 'palette',
  path: '/preference/theme'
}, {
  name: 'Image',
  label: 'image',
  icon: 'image',
  path: '/preference/image'
}, {
  name: 'Key Bindings',
  label: 'keybindings',
  icon: 'keyboard',
  path: '/preference/keybindings'
}]

export const searchContent = Object.keys(preferences).map(k => {
  const { description, enum: emums } = preferences[k]
  let [category, preference] = description.split('--')
  if (Array.isArray(emums)) {
    preference += ` optional values: ${emums.join(', ')}`
  }
  return {
    category,
    preference
  }
})
  .filter(({ category: ca }) => category.some(c => c.label === ca.toLowerCase()))
