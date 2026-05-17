export const PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai'
}

const DEFAULT_PROVIDER = PROVIDERS.ANTHROPIC
const DEFAULT_BASE_URLS = {
  [PROVIDERS.ANTHROPIC]: 'https://api.anthropic.com',
  [PROVIDERS.OPENAI]: 'https://api.openai.com'
}
const API_VERSION = '2023-06-01'
const DEFAULT_MODELS = {
  [PROVIDERS.ANTHROPIC]: 'claude-sonnet-4-5-20250929',
  [PROVIDERS.OPENAI]: 'gpt-4.1'
}
const MAX_TOKENS = 8192
const MAX_TOOL_ROUNDS = 10
const STREAM_IDLE_TIMEOUT_MS = 60000

export const TOOLS = [
  {
    name: 'get_document_outline',
    description: 'Get the heading outline (TOC) of the current document. Use this FIRST when you need to understand the document structure, locate a specific section, or the document might be large. Returns heading levels, titles, and approximate line numbers.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_document_section',
    description: 'Get the Markdown content of a specific section in the current document. Use a heading title (or 0-based section index from the outline) to fetch only the relevant part. Prefer this over get_document for targeted reading, especially in large documents.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: 'The section identifier: either a heading title (e.g. "Introduction") or a numeric index from the outline (e.g. "3").'
        }
      },
      required: ['section']
    }
  },
  {
    name: 'search_document',
    description: 'Full-text search in the current document. Returns paragraphs containing the query with surrounding context. Use this to find specific keywords, code snippets, or topics without reading the whole document.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Case-insensitive. Matches whole or partial words.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_document',
    description: 'Get the FULL Markdown content of the current document. IMPORTANT: For large documents, prefer get_document_outline + get_document_section + search_document instead. Only use this for short documents or when you truly need the entire content.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'apply_edit',
    description: 'Replace the entire content of the current Markdown document with new content. Use this only when replacing the whole document and you can provide the complete new Markdown content. Prefer replace_text or insert_text for targeted edits.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The full new Markdown content to write into the document.'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'replace_text',
    description: 'Replace exact Markdown text in the current document. Use this for targeted edits to existing content. The old_text must match the current document exactly.',
    input_schema: {
      type: 'object',
      properties: {
        old_text: {
          type: 'string',
          description: 'Exact text currently present in the document.'
        },
        new_text: {
          type: 'string',
          description: 'Replacement text.'
        },
        replace_all: {
          type: 'boolean',
          description: 'Whether to replace all occurrences. Defaults to false.'
        }
      },
      required: ['old_text', 'new_text']
    }
  },
  {
    name: 'insert_text',
    description: 'Insert Markdown text into the current document. Use start or end for simple insertion, or before/after with an exact anchor string.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Markdown text to insert.'
        },
        position: {
          type: 'string',
          enum: ['start', 'end', 'before', 'after'],
          description: 'Where to insert the content.'
        },
        anchor: {
          type: 'string',
          description: 'Exact document text used as insertion anchor when position is before or after.'
        }
      },
      required: ['content', 'position']
    }
  },
  {
    name: 'read_file',
    description: 'Read the content of a file by absolute path. The path must be inside the current project or the current Markdown document directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the file to read.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'list_directory',
    description: 'List the entries inside a directory by absolute path. The path must be inside the current project or the current Markdown document directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path of the directory to list.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'glob_files',
    description: 'Find file paths matching a glob pattern (e.g. "**/*.js", "src/**/*.vue"). Returns sorted list of matching file paths. Use this to discover files by name pattern before reading or searching within them.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The glob pattern to match file paths against (e.g. "**/*.js", "src/**/*.ts").'
        },
        path: {
          type: 'string',
          description: 'Optional directory to search in. Defaults to the project root.'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'grep_files',
    description: 'Search for a regex pattern across files in the project. Returns matching lines with file paths and line numbers. Use this to find code patterns, function calls, or text across multiple files.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The regex pattern to search for in file contents.'
        },
        glob: {
          type: 'string',
          description: 'Optional glob pattern to filter which files to search (e.g. "*.js", "**/*.vue").'
        },
        path: {
          type: 'string',
          description: 'Optional directory to search in. Defaults to the project root.'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'fetch_url',
    description: 'Fetch the text content of an external http(s) URL. Use this when the user asks about web content, documentation, articles, or any external URL. Localhost, private-network, file, and other non-web URLs are blocked.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The external http or https URL to fetch.'
        },
        max_chars: {
          type: 'number',
          description: 'Optional maximum number of response characters to return. Defaults to 60000 and is capped at 120000.'
        }
      },
      required: ['url']
    }
  }
]

const SYSTEM_PROMPT = `You are an AI assistant embedded in MarkText, a Markdown editor. The user is reading or writing a Markdown document in the editor and asks you questions about it.

## Reading the document
- Use get_document_outline FIRST to understand the document structure (headings, sections).
- Use get_document_section to fetch only the relevant sections by title or index.
- Use search_document to locate specific keywords, topics, or code snippets.
- Use get_document only when you truly need the full document content (e.g. for global rewrites or when the document is short). For long documents, prefer the targeted tools above.

## Exploring the project
- Use glob_files to discover files by name pattern (e.g. "src/**/*.vue").
- Use grep_files to search code across files with regex patterns.
- Use read_file to read a specific file after locating it via glob or grep.

## Reading external URLs
- Use fetch_url when the user gives or asks about an external web URL.
- Do not use fetch_url for localhost, private-network resources, local files, or credentials-bearing URLs.

## Editing the document
- Prefer replace_text or insert_text for targeted edits.
- Use apply_edit only when replacing the entire document and you can provide the complete new Markdown content.

## Style
Reply in the same language as the user's question. Format answers using GitHub-flavored Markdown (headings, lists, code blocks). Be concise.`

const buildSystemPrompt = (persona) => {
  const trimmed = (persona || '').trim()
  if (!trimmed) return SYSTEM_PROMPT
  return `${SYSTEM_PROMPT}\n\n## Writing style preferences\nThe user has set the following style preferences. Follow them whenever you produce text or edit the document:\n${trimmed}`
}

export const normalizeProvider = (provider) => {
  const value = String(provider || '').trim().toLowerCase()
  if (value === PROVIDERS.OPENAI || value === 'openai-compatible' || value === 'openai_compatible') {
    return PROVIDERS.OPENAI
  }
  return DEFAULT_PROVIDER
}

const readEnv = names => {
  if (typeof process === 'undefined' || !process.env) return ''
  for (const name of names) {
    if (process.env[name] && process.env[name].trim()) {
      return process.env[name].trim()
    }
  }
  return ''
}

const trimBaseUrl = value => value.trim().replace(/\/+$/, '')

export const resolveApiKey = (override, provider = DEFAULT_PROVIDER) => {
  if (override && override.trim()) return override.trim()
  if (normalizeProvider(provider) === PROVIDERS.OPENAI) {
    return readEnv(['OPENAI_API_KEY', 'OPENAI_AUTH_TOKEN'])
  }
  return readEnv(['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'])
}

export const resolveBaseUrl = (override, provider = DEFAULT_PROVIDER) => {
  const normalizedProvider = normalizeProvider(provider)
  if (override && override.trim()) return trimBaseUrl(override)
  const envValue = normalizedProvider === PROVIDERS.OPENAI
    ? readEnv(['OPENAI_BASE_URL'])
    : readEnv(['ANTHROPIC_BASE_URL'])
  if (envValue) {
    return trimBaseUrl(envValue)
  }
  return DEFAULT_BASE_URLS[normalizedProvider]
}

export const resolveModel = (override, provider = DEFAULT_PROVIDER) => {
  const normalizedProvider = normalizeProvider(provider)
  if (override && override.trim()) return override.trim()
  const envValue = normalizedProvider === PROVIDERS.OPENAI
    ? readEnv(['OPENAI_MODEL'])
    : readEnv(['ANTHROPIC_MODEL'])
  if (envValue) {
    return envValue
  }
  return DEFAULT_MODELS[normalizedProvider]
}

const sanitizeContentBlocks = blocks => {
  return blocks
    .filter(block => block && ['text', 'tool_use', 'tool_result', 'image'].includes(block.type))
    .map(block => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: String(block.text || '')
        }
      }
      if (block.type === 'image') {
        return {
          type: 'image',
          source: {
            type: (block.source && block.source.type) || 'base64',
            media_type: (block.source && block.source.media_type) || 'image/png',
            data: (block.source && block.source.data) || ''
          }
        }
      }
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input || {}
        }
      }
      return {
        type: 'tool_result',
        tool_use_id: block.tool_use_id,
        content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content || ''),
        is_error: Boolean(block.is_error)
      }
    })
    .filter(block => {
      if (block.type === 'text') return block.text.length > 0
      if (block.type === 'image') return Boolean(block.source && block.source.data)
      if (block.type === 'tool_use') return Boolean(block.id && block.name)
      return Boolean(block.tool_use_id)
    })
}

export const sanitizeMessages = messages => {
  return messages.map(message => {
    if (typeof message.content === 'string') {
      const msg = {
        role: message.role,
        content: message.content
      }
      if (message.reasoning_content) {
        msg.reasoning_content = message.reasoning_content
      }
      return msg
    }

    if (Array.isArray(message.content)) {
      const msg = {
        role: message.role,
        content: sanitizeContentBlocks(message.content)
      }
      if (message.reasoning_content) {
        msg.reasoning_content = message.reasoning_content
      }
      return msg
    }

    const msg = {
      role: message.role,
      content: ''
    }
    if (message.reasoning_content) {
      msg.reasoning_content = message.reasoning_content
    }
    return msg
  })
}

const readWithTimeout = (reader, timeoutMs) => {
  let timer
  const timeout = new Promise(function (resolve, reject) {
    timer = setTimeout(function () {
      reject(new Error('Stream idle timeout: no data received for ' + (timeoutMs / 1000) + 's'))
    }, timeoutMs)
  })
  return Promise.race([reader.read(), timeout]).finally(() => clearTimeout(timer))
}

const parseSseStream = async function * (response, { idleTimeoutMs = STREAM_IDLE_TIMEOUT_MS } = {}) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  const eventSeparator = /\r?\n\r?\n/
  const parseEvent = (rawEvent) => {
    const dataLine = rawEvent
      .split(/\r?\n/)
      .find(line => line.startsWith('data:'))
    if (!dataLine) return null

    const payload = dataLine.slice(5).trim()
    if (!payload || payload === '[DONE]') return null

    try {
      return JSON.parse(payload)
    } catch (err) {
      return null
    }
  }

  try {
    while (true) {
      const { value, done } = await readWithTimeout(reader, idleTimeoutMs)
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let separatorMatch
      while ((separatorMatch = buffer.match(eventSeparator))) {
        const separatorIndex = separatorMatch.index
        const rawEvent = buffer.slice(0, separatorIndex)
        buffer = buffer.slice(separatorIndex + separatorMatch[0].length)

        const event = parseEvent(rawEvent)
        if (event) yield event
      }
    }
  } finally {
    reader.releaseLock()
  }

  const trailingEvent = parseEvent(buffer)
  if (trailingEvent) yield trailingEvent
}

const buildApiUrl = (baseUrl, apiPath) => {
  const cleanBaseUrl = trimBaseUrl(baseUrl)
  if (cleanBaseUrl.endsWith('/v1') && apiPath.startsWith('/v1/')) {
    return `${cleanBaseUrl}${apiPath.slice(3)}`
  }
  return `${cleanBaseUrl}${apiPath}`
}

const callAnthropicApi = async ({ apiKey, baseUrl, model, messages, signal, persona }) => {
  const response = await fetch(buildApiUrl(baseUrl, '/v1/messages'), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(persona),
      tools: TOOLS,
      messages,
      stream: true
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Anthropic API ${response.status}: ${text || response.statusText}`)
  }

  return response
}

const toOpenAiTools = () => TOOLS.map(tool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema
  }
}))

const stringifyToolInput = input => {
  try {
    return JSON.stringify(input || {})
  } catch (err) {
    return '{}'
  }
}

const parseToolInput = value => {
  if (!value || !value.trim()) return {}
  try {
    return JSON.parse(value)
  } catch (err) {
    return {}
  }
}

const toOpenAiMessages = (messages, persona) => {
  const openAiMessages = [
    {
      role: 'system',
      content: buildSystemPrompt(persona)
    }
  ]

  for (const message of messages) {
    if (typeof message.content === 'string') {
      openAiMessages.push({
        role: message.role,
        content: message.content
      })
      continue
    }

    if (!Array.isArray(message.content)) continue

    if (message.role === 'assistant') {
      const text = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
      const toolCalls = message.content
        .filter(block => block.type === 'tool_use')
        .map(block => ({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: stringifyToolInput(block.input)
          }
        }))

      const assistantMessage = {
        role: 'assistant',
        content: text || null
      }
      if (toolCalls.length) {
        assistantMessage.tool_calls = toolCalls
      }
      if (message.reasoning_content) {
        assistantMessage.reasoning_content = message.reasoning_content
      }
      if (text || toolCalls.length || message.reasoning_content) {
        openAiMessages.push(assistantMessage)
      }
      continue
    }

    if (message.role === 'user') {
      const contentParts = []
      for (const block of message.content) {
        if (block.type === 'text') {
          contentParts.push({ type: 'text', text: block.text })
        } else if (block.type === 'image') {
          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` }
          })
        } else if (block.type === 'tool_result') {
          if (contentParts.length) {
            const hasImage = contentParts.some(p => p.type === 'image_url')
            openAiMessages.push({
              role: 'user',
              content: hasImage ? contentParts.splice(0) : contentParts.splice(0).map(p => p.text).join('\n')
            })
          }
          openAiMessages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content || ''
          })
        }
      }
      if (contentParts.length) {
        const hasImage = contentParts.some(p => p.type === 'image_url')
        openAiMessages.push({
          role: 'user',
          content: hasImage ? contentParts : contentParts.map(p => p.text).join('\n')
        })
      }
    }
  }

  return openAiMessages
}

const callOpenAiApi = async ({ apiKey, baseUrl, model, messages, signal, persona }) => {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(buildApiUrl(baseUrl, '/v1/chat/completions'), {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: toOpenAiMessages(messages, persona),
      tools: toOpenAiTools(),
      tool_choice: 'auto',
      stream: true
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`OpenAI API ${response.status}: ${text || response.statusText}`)
  }

  return response
}

const executeToolUse = async (toolUse, executeTool) => {
  let resultContent
  let isError = false
  try {
    const result = await executeTool(toolUse.name, toolUse.input || {})
    resultContent = typeof result === 'string' ? result : JSON.stringify(result)
  } catch (err) {
    resultContent = `Error: ${err.message || String(err)}`
    isError = true
  }

  return {
    block: {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: resultContent,
      is_error: isError
    },
    isError
  }
}

async function * streamAnthropicChat ({ apiKey, baseUrl, model, messages, executeTool, signal, persona }) {
  const workingMessages = sanitizeMessages(messages)
  const resolvedBaseUrl = baseUrl || DEFAULT_BASE_URLS[PROVIDERS.ANTHROPIC]
  const resolvedModel = model || DEFAULT_MODELS[PROVIDERS.ANTHROPIC]
  let toolRound = 0

  while (true) {
    const response = await callAnthropicApi({ apiKey, baseUrl: resolvedBaseUrl, model: resolvedModel, messages: workingMessages, signal, persona })

    const assistantBlocks = []
    const partialJson = new Map()

    for await (const event of parseSseStream(response)) {
      switch (event.type) {
        case 'content_block_start': {
          const block = { ...event.content_block }
          if (block.type === 'tool_use') {
            partialJson.set(event.index, '')
            block.input = block.input || {}
            yield { type: 'tool_start', name: block.name, id: block.id }
          }
          assistantBlocks[event.index] = block
          break
        }
        case 'content_block_delta': {
          const delta = event.delta
          const block = assistantBlocks[event.index]
          if (!block) break
          if (delta.type === 'text_delta') {
            block.text = (block.text || '') + delta.text
            yield { type: 'text', text: delta.text }
          } else if (delta.type === 'input_json_delta') {
            const accumulated = (partialJson.get(event.index) || '') + (delta.partial_json || '')
            partialJson.set(event.index, accumulated)
          }
          break
        }
        case 'content_block_stop': {
          const block = assistantBlocks[event.index]
          if (block && block.type === 'tool_use') {
            const raw = partialJson.get(event.index) || ''
            try {
              block.input = raw ? JSON.parse(raw) : (block.input || {})
            } catch (err) {
              block.input = block.input || {}
            }
          }
          break
        }
      }
    }

    const cleanedBlocks = sanitizeContentBlocks(assistantBlocks.filter(Boolean))
    workingMessages.push({ role: 'assistant', content: cleanedBlocks })

    const toolUses = cleanedBlocks.filter(block => block.type === 'tool_use')

    if (!toolUses.length) {
      yield { type: 'done', messages: workingMessages }
      return
    }

    toolRound++
    if (toolRound >= MAX_TOOL_ROUNDS) {
      yield { type: 'text', text: '\n\n[Tool call limit reached. Stopping automatic tool execution.]' }
      yield { type: 'done', messages: workingMessages }
      return
    }

    const toolResults = []
    for (const toolUse of toolUses) {
      const result = await executeToolUse(toolUse, executeTool)
      yield { type: 'tool_end', name: toolUse.name, id: toolUse.id, isError: result.isError }
      toolResults.push(result.block)
    }

    workingMessages.push({ role: 'user', content: toolResults })
  }
}

async function * streamOpenAiChat ({ apiKey, baseUrl, model, messages, executeTool, signal, persona }) {
  const workingMessages = sanitizeMessages(messages)
  const resolvedBaseUrl = baseUrl || DEFAULT_BASE_URLS[PROVIDERS.OPENAI]
  const resolvedModel = model || DEFAULT_MODELS[PROVIDERS.OPENAI]
  let toolRound = 0

  while (true) {
    const response = await callOpenAiApi({ apiKey, baseUrl: resolvedBaseUrl, model: resolvedModel, messages: workingMessages, signal, persona })
    let assistantText = ''
    let assistantReasoning = ''
    const toolCalls = new Map()
    const toolCallOrder = []

    for await (const event of parseSseStream(response)) {
      const choice = event.choices && event.choices[0]
      if (!choice || !choice.delta) continue

      const delta = choice.delta
      if (delta.content) {
        assistantText += delta.content
        yield { type: 'text', text: delta.content }
      }
      if (delta.reasoning_content) {
        assistantReasoning += delta.reasoning_content
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const deltaToolCall of delta.tool_calls) {
          const index = Number.isInteger(deltaToolCall.index)
            ? deltaToolCall.index
            : toolCallOrder.length
          let toolCall = toolCalls.get(index)

          if (!toolCall) {
            toolCall = {
              id: '',
              name: '',
              arguments: '',
              started: false
            }
            toolCalls.set(index, toolCall)
            toolCallOrder.push(index)
          }

          if (deltaToolCall.id) {
            toolCall.id = deltaToolCall.id
          }
          if (deltaToolCall.function) {
            if (deltaToolCall.function.name) {
              toolCall.name += deltaToolCall.function.name
            }
            if (deltaToolCall.function.arguments) {
              toolCall.arguments += deltaToolCall.function.arguments
            }
          }

          if (!toolCall.started && toolCall.name) {
            if (!toolCall.id) {
              toolCall.id = `tool-${Date.now()}-${index}`
            }
            toolCall.started = true
            yield { type: 'tool_start', name: toolCall.name, id: toolCall.id }
          }
        }
      }
    }

    const assistantBlocks = []
    if (assistantText) {
      assistantBlocks.push({
        type: 'text',
        text: assistantText
      })
    }

    for (const index of toolCallOrder) {
      const toolCall = toolCalls.get(index)
      if (!toolCall || !toolCall.name) continue
      if (!toolCall.id) {
        toolCall.id = `tool-${Date.now()}-${index}`
      }
      if (!toolCall.started) {
        yield { type: 'tool_start', name: toolCall.name, id: toolCall.id }
      }
      assistantBlocks.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.name,
        input: parseToolInput(toolCall.arguments)
      })
    }

    const cleanedBlocks = sanitizeContentBlocks(assistantBlocks)
    const assistantMsg = { role: 'assistant', content: cleanedBlocks }
    if (assistantReasoning) {
      assistantMsg.reasoning_content = assistantReasoning
    }
    workingMessages.push(assistantMsg)

    const toolUses = cleanedBlocks.filter(block => block.type === 'tool_use')

    if (!toolUses.length) {
      yield { type: 'done', messages: workingMessages }
      return
    }

    toolRound++
    if (toolRound >= MAX_TOOL_ROUNDS) {
      yield { type: 'text', text: '\n\n[Tool call limit reached. Stopping automatic tool execution.]' }
      yield { type: 'done', messages: workingMessages }
      return
    }

    const toolResults = []
    for (const toolUse of toolUses) {
      const result = await executeToolUse(toolUse, executeTool)
      yield { type: 'tool_end', name: toolUse.name, id: toolUse.id, isError: result.isError }
      toolResults.push(result.block)
    }

    workingMessages.push({ role: 'user', content: toolResults })
  }
}

export async function * streamChat (options) {
  const provider = normalizeProvider(options.provider)
  if (provider === PROVIDERS.OPENAI) {
    yield * streamOpenAiChat(options)
    return
  }
  yield * streamAnthropicChat(options)
}
