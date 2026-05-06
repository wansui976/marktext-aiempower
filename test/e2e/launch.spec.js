const { expect, test } = require('@playwright/test')
const { launchElectron } = require('./helpers')

test.describe('Check Launch MarkText', async () => {
  let app = null
  let page = null

  test.beforeAll(async () => {
    const { app: electronApp, page: firstPage } = await launchElectron()
    app = electronApp
    page = firstPage
  })

  test.afterAll(async () => {
    await app.close()
  })

  test('Empty MarkText', async () => {
    const title = await page.title()
    expect(/^(MarkText|MarkText-AIEmpower|Untitled-1 - (MarkText|MarkText-AIEmpower))$/.test(title)).toBeTruthy()
  })
})
