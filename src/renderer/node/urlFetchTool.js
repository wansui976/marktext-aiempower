const DEFAULT_MAX_CHARS = 60000
const HARD_MAX_CHARS = 120000
const MAX_RESPONSE_BYTES = 1024 * 1024

const normalizeHostname = hostname => String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '')

const isPrivateIpv4 = hostname => {
  const parts = hostname.split('.')
  if (parts.length !== 4) return false
  const nums = parts.map(part => Number(part))
  if (nums.some(num => !Number.isInteger(num) || num < 0 || num > 255)) return false

  const [a, b] = nums
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

const isPrivateHostname = hostname => {
  const host = normalizeHostname(hostname)
  if (!host) return true
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (isPrivateIpv4(host)) return true
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true
  if (host.startsWith('::ffff:')) {
    return isPrivateIpv4(host.slice('::ffff:'.length))
  }
  return false
}

const normalizeMaxChars = value => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_CHARS
  return Math.max(1, Math.min(Math.floor(parsed), HARD_MAX_CHARS))
}

export const validateExternalUrl = value => {
  let parsed
  try {
    parsed = new URL(String(value || '').trim())
  } catch (err) {
    throw new Error('Invalid URL.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not allowed.')
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Local or private network URLs are not allowed.')
  }

  return parsed
}

const getHeader = (headers, name) => {
  if (!headers || typeof headers.get !== 'function') return ''
  return headers.get(name) || ''
}

const readResponseText = async response => {
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let received = 0
    let text = ''
    let truncatedByBytes = false

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        received += value.byteLength
        if (received > MAX_RESPONSE_BYTES) {
          truncatedByBytes = true
          await reader.cancel().catch(() => {})
          break
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    } finally {
      reader.releaseLock()
    }

    return { text, truncatedByBytes }
  }

  const text = await response.text()
  return {
    text,
    truncatedByBytes: Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES
  }
}

export const fetchExternalUrl = async (input, fetchImpl = fetch) => {
  const target = validateExternalUrl(input && input.url)
  const maxChars = normalizeMaxChars(input && input.max_chars)
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch is not available in this environment.')
  }

  const response = await fetchImpl(target.toString(), {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'text/plain,text/markdown,text/html,application/json,application/xml,*/*;q=0.8'
    }
  })

  const finalUrl = response.url || target.toString()
  validateExternalUrl(finalUrl)

  const contentLength = Number(getHeader(response.headers, 'content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Response is too large (${contentLength} bytes). Maximum allowed size is ${MAX_RESPONSE_BYTES} bytes.`)
  }

  const contentType = getHeader(response.headers, 'content-type') || 'unknown'
  const body = await readResponseText(response)
  const text = body.text || ''
  const visibleText = text.length > maxChars ? text.slice(0, maxChars) : text
  const lines = [
    `URL: ${finalUrl}`,
    `Status: ${response.status} ${response.statusText || ''}`.trim(),
    `Content-Type: ${contentType}`,
    '',
    visibleText
  ]

  if (text.length > maxChars) {
    lines.push('', `[Truncated: response body is ${text.length} chars; only the first ${maxChars} chars were returned.]`)
  } else if (body.truncatedByBytes) {
    lines.push('', `[Truncated: response exceeded ${MAX_RESPONSE_BYTES} bytes.]`)
  }

  return lines.join('\n')
}
