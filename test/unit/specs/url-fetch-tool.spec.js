import { fetchExternalUrl, validateExternalUrl } from '../../../src/renderer/node/urlFetchTool'

describe('urlFetchTool', () => {
  it('rejects non-http protocols', () => {
    expect(() => validateExternalUrl('file:///etc/passwd')).to.throw('Only http and https URLs are supported.')
  })

  it('rejects localhost and private network hosts', () => {
    expect(() => validateExternalUrl('http://localhost:3000')).to.throw('Local or private network URLs are not allowed.')
    expect(() => validateExternalUrl('http://192.168.1.12/status')).to.throw('Local or private network URLs are not allowed.')
  })

  it('fetches an external URL and truncates long text', async () => {
    const fakeFetch = async (url, options) => {
      expect(url).to.equal('https://example.com/page')
      expect(options.method).to.equal('GET')
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        url,
        headers: {
          get: name => name.toLowerCase() === 'content-type' ? 'text/plain; charset=utf-8' : ''
        },
        text: async () => 'abcdefghijklmnopqrstuvwxyz'
      }
    }

    const result = await fetchExternalUrl({ url: 'https://example.com/page', max_chars: 10 }, fakeFetch)

    expect(result).to.contain('URL: https://example.com/page')
    expect(result).to.contain('Status: 200 OK')
    expect(result).to.contain('Content-Type: text/plain; charset=utf-8')
    expect(result).to.contain('abcdefghij')
    expect(result).to.contain('[Truncated: response body is 26 chars; only the first 10 chars were returned.]')
  })
})
