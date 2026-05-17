const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/renderer/components/editorWithTabs/inlineAiPrompt.vue'),
  'utf8'
)

describe('inline AI credentials', () => {
  it('loads credentials from the same Electron store as the AI sidebar', () => {
    expect(source).to.contain('mt::ai-get-credentials')
    expect(source).to.contain('loadCredentials')
    expect(source).to.contain('this.storedApiKey')
  })
})
