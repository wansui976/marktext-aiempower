import BaseFloat from '../baseFloat'
import { patch, h } from '../../parser/render/snabbdom'
import icons from './config'

import './index.css'

const defaultOptions = {
  placement: 'top',
  modifiers: {
    offset: {
      offset: '0, 5'
    }
  },
  showArrow: false
}

class FormatPicker extends BaseFloat {
  static pluginName = 'formatPicker'

  constructor (muya, options = {}) {
    const name = 'ag-format-picker'
    const opts = Object.assign({}, defaultOptions, options)
    super(muya, name, opts)
    this.oldVnode = null
    this.formats = null
    this.options = opts
    this.icons = icons
    const formatContainer = this.formatContainer = document.createElement('div')
    this.container.appendChild(formatContainer)
    this.floatBox.classList.add('ag-format-picker-container')
    this.listen()
  }

  listen () {
    const { eventCenter } = this.muya
    super.listen()
    eventCenter.subscribe('muya-format-picker', ({ reference, formats }) => {
      if (reference) {
        this.formats = formats
        this.savedSelectionText = ''
        this.savedAnchorRect = null
        try {
          const sel = window.getSelection()
          if (sel && sel.rangeCount > 0) {
            this.savedSelectionText = sel.toString()
            this.savedAnchorRect = sel.getRangeAt(0).getBoundingClientRect()
          }
        } catch (err) { /* ignore */ }
        setTimeout(() => {
          this.show(reference)
          this.render()
        }, 0)
      } else {
        this.hide()
      }
    })
  }

  render () {
    const { icons, oldVnode, formatContainer, formats } = this
    const children = icons.map(i => {
      let icon
      let iconWrapperSelector = 'div.icon-wrapper'
      if (i.icon) {
        // SVG icon Asset
        icon = h('i.icon', h('i.icon-inner', {
          style: {
            background: `url(${i.icon}) no-repeat`,
            'background-size': '100%'
          }
        }, ''))
      } else if (i.text) {
        icon = h('span.text-icon', i.text)
      }
      const iconWrapper = h(iconWrapperSelector, icon)

      let itemSelector = `li.item.${i.type}`
      if (formats.some(f => f.type === i.type || f.type === 'html_tag' && f.tag === i.type)) {
        itemSelector += '.active'
      }
      return h(itemSelector, {
        attrs: {
          title: `${i.tooltip} ${i.shortcut}`
        },
        on: {
          click: event => {
            this.selectItem(event, i)
          }
        }
      }, [iconWrapper])
    })

    const vnode = h('ul', children)

    if (oldVnode) {
      patch(oldVnode, vnode)
    } else {
      patch(formatContainer, vnode)
    }
    this.oldVnode = vnode
  }

  selectItem (event, item) {
    event.preventDefault()
    event.stopPropagation()
    if (item.type === 'ai') {
      this.muya.eventCenter.dispatch('muya-inline-ai', {
        selectionText: this.savedSelectionText || '',
        anchorRect: this.savedAnchorRect || null
      })
      this.hide()
      return
    }
    const { contentState } = this.muya
    contentState.render()
    contentState.format(item.type)
    if (/link|image/.test(item.type)) {
      this.hide()
    } else {
      const { formats } = contentState.selectionFormats()
      this.formats = formats
      this.render()
    }
  }
}

export default FormatPicker
