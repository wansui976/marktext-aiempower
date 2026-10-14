import {
  pencil as editIcon,
  wrapText as inlineIcon,
  alignLeft as leftIcon,
  alignCenter as middleIcon,
  alignRight as rightIcon,
  trash2 as deleteIcon
} from '../../assets/icons/lucide'

const icons = [
  {
    type: 'edit',
    tooltip: 'Edit Image',
    icon: editIcon
  },
  {
    type: 'inline',
    tooltip: 'Inline Image',
    icon: inlineIcon
  },
  {
    type: 'left',
    tooltip: 'Align Left',
    icon: leftIcon
  },
  {
    type: 'center',
    tooltip: 'Align Middle',
    icon: middleIcon
  },
  {
    type: 'right',
    tooltip: 'Align Right',
    icon: rightIcon
  },
  {
    type: 'delete',
    tooltip: 'Remove Image',
    icon: deleteIcon
  }
]

export default icons
