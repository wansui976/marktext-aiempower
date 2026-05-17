import editor from '../../../src/renderer/store/editor'

describe('editor toc state', () => {
  it('clears stale toc when switching to a blank untitled tab', () => {
    const currentFile = {
      id: 'existing',
      pathname: '/tmp/existing.md',
      markdown: '# Existing',
      cursor: null,
      history: null,
      toc: [{ content: 'Existing', lvl: 1, slug: 'existing-heading' }]
    }
    const blankFile = {
      id: 'blank',
      pathname: '',
      markdown: '',
      cursor: null,
      history: null,
      toc: []
    }
    const state = {
      currentFile,
      tabs: [currentFile, blankFile],
      listToc: currentFile.toc,
      toc: [{ label: 'Existing', slug: 'existing-heading', children: [] }]
    }

    editor.mutations.SET_CURRENT_FILE(state, blankFile)

    expect(state.listToc).to.deep.equal([])
    expect(state.toc).to.deep.equal([])
  })
})
