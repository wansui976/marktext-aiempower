const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/renderer/components/sideBar/chat/ChatMessageList.vue'),
  'utf8'
)

describe('ChatMessageList code block styles', () => {
  it('keeps long code lines inside the code block scroll area', () => {
    expect(source).to.contain('.block-text >>> pre')
    expect(source).to.contain('overflow-x: auto')
    expect(source).to.contain('white-space: pre')
    expect(source).to.contain('width: max-content')
    expect(source).to.contain('min-width: 100%')
  })
})
