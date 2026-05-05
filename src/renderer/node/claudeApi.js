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

export const TOOLS = [
  {
    name: 'get_document',
    description: 'Get the full Markdown content of the document the user is currently reading in the editor. Use this whenever the user asks about "this document", "the current file", or refers to content visible in the editor.',
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
  }
]

const SYSTEM_PROMPT = `You are an AI assistant embedded in MarkText, a Markdown editor. The user is reading or writing a Markdown document in the editor and asks you questions about it.

When the user refers to "this document", "the current file", or content they are looking at, call the get_document tool to read the content. For targeted document edits, prefer replace_text or insert_text. Use apply_edit only when replacing the entire document and you can provide the complete new Markdown content.

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
      return {
        role: message.role,
        content: message.content
      }
    }

    if (Array.isArray(message.content)) {
      return {
        role: message.role,
        content: sanitizeContentBlocks(message.content)
      }
    }

    return {
      role: message.role,
      content: ''
    }
  })
}

const parseSseStream = async function * (response) {
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

  while (true) {
    const { value, done } = await reader.read()
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
      if (text || toolCalls.length) {
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

  while (true) {
    const response = await callOpenAiApi({ apiKey, baseUrl: resolvedBaseUrl, model: resolvedModel, messages: workingMessages, signal, persona })
    let assistantText = ''
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
    workingMessages.push({ role: 'assistant', content: cleanedBlocks })

    const toolUses = cleanedBlocks.filter(block => block.type === 'tool_use')

    if (!toolUses.length) {
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
