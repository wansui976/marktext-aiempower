#!/usr/bin/env node
// Capture UI screenshots of the packed app for visual comparison.
//
// Usage: yarn run pack && node tools/uiScreenshots.js <outDir> [theme ...]
//   Defaults to the six representative themes when no theme is given.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { _electron } = require('playwright')

const ROOT = path.resolve(__dirname, '..')
const SAMPLE_DIR = path.join(ROOT, 'test/e2e/data/ui-sample')
const SAMPLE_FILE = path.join(SAMPLE_DIR, 'README.md')
const DEFAULT_THEMES = ['graphite-red', 'graphite-black', 'nord', 'catppuccin-latte', 'tokyo-night', 'rose-pine']

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const writePreferences = (userDataDir, theme) => {
  const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, 'static/preference.json'), 'utf8'))
  const prefs = Object.assign(defaults, {
    theme,
    autoSwitchTheme: 2,
    startUpAction: 'blank',
    sideBarVisibility: true,
    tabBarVisibility: true
  })
  fs.writeFileSync(path.join(userDataDir, 'preferences.json'), JSON.stringify(prefs, null, 2))
}

const capture = async (outDir, theme) => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marktext-ui-'))
  writePreferences(userDataDir, theme)

  const app = await _electron.launch({
    executablePath: path.join(ROOT, 'node_modules/.bin/electron'),
    args: [path.join(ROOT, 'dist/electron/main.js'), '--user-data-dir', userDataDir, SAMPLE_DIR, SAMPLE_FILE],
    cwd: ROOT,
    timeout: 30000
  })

  try {
    const page = await app.firstWindow()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForSelector('.editor-wrapper, .editor-component', { timeout: 20000 })
    await sleep(1500)

    const shot = async name => {
      await sleep(400)
      await page.screenshot({ path: path.join(outDir, `${theme}--${name}.png`) })
    }

    const clickSideBar = async name => {
      const item = page.locator(`.side-bar .left-column li.icon-${name}`)
      if (!await item.count()) return false
      const isActive = await item.first().evaluate(el => el.classList.contains('active'))
      if (!isActive) await item.first().click()
      return true
    }

    await clickSideBar('files') && await shot('files')
    await page.locator('.side-bar .tree-view .folder').first().click().catch(() => {})
    await clickSideBar('search') && await shot('search')
    await clickSideBar('toc') && await shot('toc')
    await clickSideBar('files')

    // Command palette
    // Menu accelerators don't fire for synthetic key events, so trigger the menu action directly.
    await app.evaluate(({ BrowserWindow }) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('mt::show-command-palette')
      }
    })
    await shot('command-palette')
    await page.keyboard.press('Escape')

    // Preferences window
    const capturePreferences = async () => {
      await app.evaluate(({ ipcMain }) => { ipcMain.emit('app-create-settings-window', 'theme') })
      let prefPage = null
      while (!prefPage) {
        await sleep(250)
        prefPage = app.windows().find(win => win.url().includes('type=settings'))
      }
      await prefPage.setViewportSize({ width: 950, height: 650 })
      await prefPage.waitForSelector('.pref-container, .pref-setting, body', { timeout: 10000 })
      await sleep(1500)
      await prefPage.screenshot({ path: path.join(outDir, `${theme}--preferences.png`), timeout: 10000 })
    }
    await Promise.race([
      capturePreferences(),
      sleep(30000).then(() => { throw new Error('preferences capture timed out') })
    ]).catch(err => console.warn(`\n  [warn] ${err.message}`))
  } finally {
    const proc = app.process()
    await Promise.race([app.close().catch(() => {}), sleep(5000)])
    if (proc.exitCode === null) proc.kill('SIGKILL')
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

const main = async () => {
  const [outDir = 'ui-screenshots', ...themes] = process.argv.slice(2)
  fs.mkdirSync(outDir, { recursive: true })
  for (const theme of themes.length ? themes : DEFAULT_THEMES) {
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
