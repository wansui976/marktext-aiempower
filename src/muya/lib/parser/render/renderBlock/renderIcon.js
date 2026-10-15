import { h } from '../snabbdom'
import { CLASS_OR_ID } from '../../../config'
import {
  pilcrow as paragraphIcon,
  codeXml as htmlIcon,
  separatorHorizontal as hrIcon,
  fileCog as frontMatterIcon,
  heading1 as header1Icon,
  heading2 as header2Icon,
  heading3 as header3Icon,
  heading4 as header4Icon,
  heading5 as header5Icon,
  heading6 as header6Icon,
  table as newTableIcon,
  list as bulletListIcon,
  squareCode as codeIcon,
  textQuote as quoteIcon,
  listTodo as todoListIcon,
  squareSigma as mathblockIcon,
  listOrdered as orderListIcon,
  workflow as flowchartIcon,
  arrowRightLeft as sequenceIcon,
  shapes as plantumlIcon,
  network as mermaidIcon,
  chartColumn as vegaIcon,
  superscript as footnoteIcon
} from '../../../assets/icons/lucide'

const FUNCTION_TYPE_HASH = {
  mermaid: mermaidIcon,
  flowchart: flowchartIcon,
  sequence: sequenceIcon,
  plantuml: plantumlIcon,
  'vega-lite': vegaIcon,
  table: newTableIcon,
  html: htmlIcon,
  multiplemath: mathblockIcon,
  fencecode: codeIcon,
  indentcode: codeIcon,
  frontmatter: frontMatterIcon,
  footnote: footnoteIcon
}

export default function renderIcon (block) {
  if (block.parent) {
    console.error('Only top most block can render front icon button.')
  }
  const { type, functionType, listType } = block
  const selector = `a.${CLASS_OR_ID.AG_FRONT_ICON}`
  let icon = null

  switch (type) {
    case 'p': {
      icon = paragraphIcon
      break
    }
    case 'figure':
    case 'pre': {
      icon = FUNCTION_TYPE_HASH[functionType]
      if (!icon) {
        console.warn(`Unhandled functionType ${functionType}`)
        icon = paragraphIcon
      }
      break
    }
    case 'ul': {
      if (listType === 'task') {
        icon = todoListIcon
      } else {
        icon = bulletListIcon
      }
      break
    }
    case 'ol': {
      icon = orderListIcon
      break
    }
    case 'blockquote': {
      icon = quoteIcon
      break
    }
    case 'h1': {
      icon = header1Icon
      break
    }
    case 'h2': {
      icon = header2Icon
      break
    }
    case 'h3': {
      icon = header3Icon
      break
    }
    case 'h4': {
      icon = header4Icon
      break
    }
    case 'h5': {
      icon = header5Icon
      break
    }
    case 'h6': {
      icon = header6Icon
      break
    }
    case 'hr': {
      icon = hrIcon
      break
    }
    default:
      icon = paragraphIcon
      break
  }

  const iconVnode = h('i.icon', h('i.icon-inner', {
    style: {
      background: `url(${icon}) no-repeat`,
      'background-size': '100%'
    }
  }, ''))

  return h(selector, {
    attrs: {
      contenteditable: 'false'
    }
  }, iconVnode)
}
