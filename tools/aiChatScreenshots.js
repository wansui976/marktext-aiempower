#!/usr/bin/env node
// Capture the AI sidebar in several states using mock data (no API calls).
//
// Usage: yarn run pack && node tools/aiChatScreenshots.js <outDir> [theme ...]

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')
const { _electron } = require('playwright')

const ROOT = path.resolve(__dirname, '..')
// Override with MT_DIST to use a separate production build (e.g. while `yarn dev` owns dist/).
const DIST = process.env.MT_DIST || path.join(ROOT, 'dist/electron')
const SAMPLE_DIR = path.join(ROOT, 'test/e2e/data/ui-sample')
const SAMPLE_FILE = path.join(SAMPLE_DIR, 'README.md')
const SIDEBAR_WIDTH = 400

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const now = Date.now()
const MOCK = {
  messages: [{
    id: 'm1',
    role: 'user',
    blocks: [{ type: 'text', text: 'Summarize the **Lists** section and suggest a better title for this document.' }]
  }, {
    id: 'm2',
    role: 'assistant',
    blocks: [
      { type: 'tool', name: 'get_document_outline', status: 'done' },
      { type: 'tool', name: 'get_document_section', status: 'done' },
      {
        type: 'text',
        text: [
          'The **Lists** section demonstrates three kinds of lists:',
          '',
          '- a bullet list with a nested item',
          '- a todo list with one open and one finished task',
          '',
          'A clearer title could be **"Markdown Formatting Showcase"**. Here is the updated heading:',
          '',
          '```markdown',
          '# Markdown Formatting Showcase',
          '```',
          '',
          '> Tip: keep titles short so they read well in the tab bar.'
        ].join('\n')
      }
    ]
  }, {
    id: 'm3',
    role: 'user',
    blocks: [{ type: 'text', text: 'Apply the new title.' }]
  }, {
    id: 'm4',
    role: 'assistant',
    blocks: [
      { type: 'tool', name: 'search_document', status: 'done' },
      { type: 'tool', name: 'replace_text', status: 'running' }
    ]
  }],
  pendingEdit: {
    name: 'replace_text',
    summary: 'Rename the document title',
    stats: { added: 1, removed: 1, skipped: 2 },
    diff: [
      { type: 'remove', text: '# MarkText UI Sample' },
      { type: 'add', text: '# Markdown Formatting Showcase' },
      { type: 'context', text: '' },
      { type: 'context', text: 'A paragraph with **bold**, *italic*, `inline code` and a [link](https://example.com).' },
      { type: 'skip', text: '24 unchanged lines' }
    ]
  },
  sessions: [
    { id: 's1', title: 'Summarize lists and retitle', documentLabel: 'README.md', updatedAt: now - 60 * 1000 },
    { id: 's2', title: 'Translate the introduction', documentLabel: 'README.md', updatedAt: now - 3 * 3600 * 1000 },
    { id: 's3', title: 'Brainstorm blog ideas', documentLabel: '', updatedAt: now - 2 * 86400 * 1000 }
  ]
}

const writePreferences = (userDataDir, theme) => {
  const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, 'static/preference.json'), 'utf8'))
  fs.writeFileSync(path.join(userDataDir, 'preferences.json'), JSON.stringify(Object.assign(defaults, {
    theme,
    autoSwitchTheme: 2,
    startUpAction: 'blank',
    sideBarVisibility: true,
    tabBarVisibility: true
  }), null, 2))
}

const capture = async (outDir, theme) => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marktext-ui-'))
  writePreferences(userDataDir, theme)

  const app = await _electron.launch({
    executablePath: require('electron'),
    args: [path.join(DIST, 'main.js'), '--user-data-dir', userDataDir, SAMPLE_DIR, SAMPLE_FILE],
    cwd: ROOT,
    timeout: 30000
  })

  try {
    // firstWindow() may return the preloaded (hidden) settings window.
    await app.firstWindow()
    let page = null
    while (!page) {
      await sleep(250)
      page = app.windows().find(win => win.url().includes('type=editor'))
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForSelector('.editor-wrapper, .editor-component', { timeout: 20000 })
    await sleep(1500)

    const shot = async name => {
      await sleep(400)
      await page.screenshot({ path: path.join(outDir, `${theme}--ai-${name}.png`) })
    }

    // Open the AI panel and widen the sidebar.
    await page.locator('.side-bar .left-column li.icon-claude').first().click()
    await page.evaluate(width => {
      const sideBar = document.querySelector('.side-bar').__vue__
      sideBar.sideBarViewWidth = width
    }, SIDEBAR_WIDTH)
    await sleep(500)

    const setChat = state => page.evaluate(state => {
      const vm = document.querySelector('.side-bar-claude-chat').__vue__
      Object.assign(vm, state)
    }, state)

    await shot('initial')

    await setChat({ storedApiKey: 'sk-ant-mock', showSettings: false, displayMessages: [] })
    await shot('empty')

    await setChat({ displayMessages: MOCK.messages, streaming: true, input: '' })
    await shot('conversation')

    await setChat({
      streaming: false,
      displayMessages: MOCK.messages.slice(0, 3),
      pendingEdit: MOCK.pendingEdit
    })
    await shot('edit-preview')

    await setChat({ pendingEdit: null, displayMessages: MOCK.messages.slice(0, 2), input: 'Make the tip more concise' })
    await shot('composer')

    await setChat({ input: '', showModeMenu: true })
    await shot('mode-menu')

    await setChat({ showModeMenu: false, showHeaderMenu: true })
    await shot('header-menu')

    await setChat({ showHeaderMenu: false, sessions: MOCK.sessions, activeSessionId: 's1', showSessions: true })
    await shot('sessions')

    await setChat({ showSessions: false, showSettings: true })
    await shot('settings')
  } finally {
    // Always SIGKILL Electron; helpers share the user-data-dir argument.
    app.process().kill('SIGKILL')
    try {
      execSync(`pkill -9 -f ${JSON.stringify(userDataDir)}`)
    } catch (_) {
      // No remaining processes.
    }
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

const main = async () => {
  const [outDir = 'ui-screenshots/ai', ...themes] = process.argv.slice(2)
  fs.mkdirSync(outDir, { recursive: true })
  for (const theme of themes.length ? themes : ['graphite-red', 'graphite-black']) {
    process.stdout.write(`Capturing ${theme}... `)
    await capture(outDir, theme)
    console.log('done')
  }
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
