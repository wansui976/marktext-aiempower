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
  chartColumn as vegaIcon
} from '../../assets/icons/lucide'
import { isOsx } from '../../config'

const COMMAND_KEY = isOsx ? '⌘' : 'Ctrl'
const OPTION_KEY = isOsx ? '⌥' : 'Alt'
const SHIFT_KEY = isOsx ? '⇧' : 'Shift'

// Command (or Cmd) ⌘
// Shift ⇧
// Option (or Alt) ⌥
// Control (or Ctrl) ⌃
// Caps Lock ⇪
// Fn

export const quickInsertObj = {
  'basic block': [{
    title: 'Paragraph',
    subTitle: 'Lorem Ipsum is simply dummy text',
    label: 'paragraph',
    shortCut: `${COMMAND_KEY}+0`,
    icon: paragraphIcon
  }, {
    title: 'Horizontal Line',
    subTitle: '---',
    label: 'hr',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+-`,
    icon: hrIcon
  }, {
    title: 'Front Matter',
    subTitle: '--- Lorem Ipsum ---',
    label: 'front-matter',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+Y`,
    icon: frontMatterIcon
  }],
  header: [{
    title: 'Header 1',
    subTitle: '# Lorem Ipsum is simply ...',
    label: 'heading 1',
    shortCut: `${COMMAND_KEY}+1`,
    icon: header1Icon
  }, {
    title: 'Header 2',
    subTitle: '## Lorem Ipsum is simply ...',
    label: 'heading 2',
    shortCut: `${COMMAND_KEY}+2`,
    icon: header2Icon
  }, {
    title: 'Header 3',
    subTitle: '### Lorem Ipsum is simply ...',
    label: 'heading 3',
    shortCut: `${COMMAND_KEY}+3`,
    icon: header3Icon
  }, {
    title: 'Header 4',
    subTitle: '#### Lorem Ipsum is simply ...',
    label: 'heading 4',
    shortCut: `${COMMAND_KEY}+4`,
    icon: header4Icon
  }, {
    title: 'Header 5',
    subTitle: '##### Lorem Ipsum is simply ...',
    label: 'heading 5',
    shortCut: `${COMMAND_KEY}+5`,
    icon: header5Icon
  }, {
    title: 'Header 6',
    subTitle: '###### Lorem Ipsum is simply ...',
    label: 'heading 6',
    shortCut: `${COMMAND_KEY}+6`,
    icon: header6Icon
  }],
  'advanced block': [{
    title: 'Table Block',
    subTitle: '|Lorem | Ipsum is simply |',
    label: 'table',
    shortCut: `${SHIFT_KEY}+${COMMAND_KEY}+T`,
    icon: newTableIcon
  }, {
    title: 'Display Math',
    subTitle: '$$ Lorem Ipsum is simply $$',
    label: 'mathblock',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+M`,
    icon: mathblockIcon
  }, {
    title: 'HTML Block',
    subTitle: '<div> Lorem Ipsum is simply </div>',
    label: 'html',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+J`,
    icon: htmlIcon
  }, {
    title: 'Code Block',
    subTitle: '```java Lorem Ipsum is simply ```',
    label: 'pre',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+C`,
    icon: codeIcon
  }, {
    title: 'Quote Block',
    subTitle: '>Lorem Ipsum is simply ...',
    label: 'blockquote',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+Q`,
    icon: quoteIcon
  }],
  'list block': [{
    title: 'Order List',
    subTitle: '1. Lorem Ipsum is simply ...',
    label: 'ol-order',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+O`,
    icon: orderListIcon
  }, {
    title: 'Bullet List',
    subTitle: '- Lorem Ipsum is simply ...',
    label: 'ul-bullet',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+U`,
    icon: bulletListIcon
  }, {
    title: 'To-do List',
    subTitle: '- [x] Lorem Ipsum is simply ...',
    label: 'ul-task',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+X`,
    icon: todoListIcon
  }],
  diagram: [{
    title: 'Vega Chart',
    subTitle: 'Render flow chart by vega-lite.js.',
    label: 'vega-lite',
    icon: vegaIcon
  }, {
    title: 'Flow Chart',
    subTitle: 'Render flow chart by flowchart.js.',
    label: 'flowchart',
    icon: flowchartIcon
  }, {
    title: 'Sequence Diagram',
    subTitle: 'Render sequence diagram by js-sequence.',
    label: 'sequence',
    icon: sequenceIcon
  }, {
    title: 'PlantUML Diagram',
    subTitle: 'Render PlantUML diagrams',
    label: 'plantuml',
    icon: plantumlIcon
  }, {
    title: 'Mermaid',
    subTitle: 'Render Diagram by mermaid.',
    label: 'mermaid',
    icon: mermaidIcon
  }]
}
