const { expect, test } = require('@playwright/test')
const { launchElectron } = require('./helpers')

test.describe('Test XSS Vulnerabilities', async () => {
  let app = null
  let page = null

  test.beforeAll(async () => {
    const { app: electronApp, page: firstPage } = await launchElectron(['test/e2e/data/xss.md'])
    app = electronApp
    page = firstPage

    // Wait to parse and render the document.
    await new Promise((resolve) => setTimeout(resolve, 3000))
  })

  test.afterAll(async () => {
    await app.close()
  })

  test('Load malicious document', async () => {
    const { windowCount, isDestroyed, isCrashed } = await app.evaluate(async process => {
      const mainWindow = process.BrowserWindow.getAllWindows()[0]
      return {
        windowCount: process.BrowserWindow.getAllWindows().length,
        isDestroyed: mainWindow.isDestroyed(),
        isCrashed: mainWindow.webContents.isCrashed()
      }
    })

    expect(windowCount).toBeGreaterThan(0)
    expect(isDestroyed).toBeFalsy()
    expect(isCrashed).toBeFalsy()
  })
})
