import { isOsx } from '../../config'
import {
  bold as strongIcon,
  italic as emphasisIcon,
  underline as underlineIcon,
  code as codeIcon,
  image as imageIcon,
  link as linkIcon,
  strikethrough as strikeIcon,
  sigma as mathIcon,
  highlighter as highlightIcon,
  removeFormatting as clearIcon
} from '../../assets/icons/lucide'

const COMMAND_KEY = isOsx ? '⌘' : 'Ctrl'
const ALT_KEY = isOsx ? '⌥' : 'Alt'

const icons = [
  {
    type: 'ai',
    tooltip: 'Ask AI',
    shortcut: `${COMMAND_KEY}+${ALT_KEY}+K`,
    text: 'AI'
  }, {
    type: 'strong',
    tooltip: 'Bold',
    shortcut: `${COMMAND_KEY}+B`,
    icon: strongIcon
  }, {
    type: 'em',
    tooltip: 'Italic',
    shortcut: `${COMMAND_KEY}+I`,
    icon: emphasisIcon
  }, {
    type: 'u',
    tooltip: 'Underline',
    shortcut: `${COMMAND_KEY}+U`,
    icon: underlineIcon
  }, {
    type: 'del',
    tooltip: 'Strikethrough',
    shortcut: `${COMMAND_KEY}+D`,
    icon: strikeIcon
  }, {
    type: 'mark',
    tooltip: 'Highlight',
    shortcut: `⇧+${COMMAND_KEY}+H`,
    icon: highlightIcon
  }, {
    type: 'inline_code',
    tooltip: 'Inline Code',
    shortcut: `${COMMAND_KEY}+\``,
    icon: codeIcon
  }, {
    type: 'inline_math',
    tooltip: 'Inline Math',
    shortcut: `⇧+${COMMAND_KEY}+M`,
    icon: mathIcon
  }, {
    type: 'link',
    tooltip: 'Link',
    shortcut: `${COMMAND_KEY}+L`,
    icon: linkIcon
  }, {
    type: 'image',
    tooltip: 'Image',
    shortcut: `⇧+${COMMAND_KEY}+I`,
    icon: imageIcon
  }, {
    type: 'clear',
    tooltip: 'Clear Formatting',
    shortcut: `⇧+${COMMAND_KEY}+R`,
    icon: clearIcon
  }
]

export default icons
