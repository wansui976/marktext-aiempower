/**
 * Smart context utilities for AI chat — allows targeted document access
 * instead of sending the full markdown every time.
 */

const MAX_SEARCH_RESULTS = 8
const SEARCH_CONTEXT_LINES = 2
const MAX_SECTION_PREVIEW_LEN = 200

/**
 * Parse markdown into sections based on ATX and setext headings.
 * Returns array of { level, title, startLine (0-based), endLine (exclusive) }.
 */
export const parseSections = markdown => {
  const lines = markdown.split('\n')
  const sections = []
  let anchor = 0

  const flush = (end) => {
    if (sections.length) {
      sections[sections.length - 1].endLine = end
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const atxMatch = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/.exec(line)
    if (atxMatch) {
      flush(i)
      sections.push({
        level: atxMatch[1].length,
        title: atxMatch[2].trim(),
        startLine: i
      })
      anchor = i
      continue
    }
    // setext: next line is === or --- (at least 3 chars)
    if (i < lines.length - 1 && /^={3,}\s*$/.test(lines[i + 1]) && line.trim()) {
      flush(i)
      sections.push({
        level: 1,
        title: line.trim(),
        startLine: anchor
      })
      i++ // skip the underline
      continue
    }
    if (i < lines.length - 1 && /^-{3,}\s*$/.test(lines[i + 1]) && line.trim() && !/^\s*$/.test(line)) {
      flush(i)
      sections.push({
        level: 2,
        title: line.trim(),
        startLine: anchor
      })
      i++
      continue
    }
  }

  flush(lines.length)

  return sections
}

/**
 * Build a human-friendly outline from sections.
 */
export const buildOutline = (sections, filename) => {
  if (!sections.length) {
    return ['# Document Outline', '', '(No headings found — the document is flat.)'].join('\n')
  }
  const lines = [`# Outline: ${filename || 'document'}`, '']
  for (const s of sections) {
    const indent = '  '.repeat(Math.max(0, s.level - 1))
    lines.push(`${indent}${'#'.repeat(s.level)} ${s.title}  (L${s.startLine + 1})`)
  }
  if (!lines.length) lines.push('(No headings)')
  return lines.join('\n')
}

/**
 * Full-text search in the markdown.
 * Returns matching paragraphs with surrounding context.
 */
export const searchDocument = (markdown, query) => {
  if (!query || !query.trim()) return '(Empty search query.)'

  const lowerQuery = query.trim().toLowerCase()
  const paragraphs = markdown.split(/\n\n+/)
  const matches = []

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi]
    if (para.toLowerCase().includes(lowerQuery)) {
      const start = Math.max(0, pi - SEARCH_CONTEXT_LINES)
      const end = Math.min(paragraphs.length, pi + SEARCH_CONTEXT_LINES + 1)
      const snippet = paragraphs.slice(start, end).join('\n\n')
      matches.push({
        index: pi,
        title: extractNearestHeading(markdown, para),
        snippet
      })
      if (matches.length >= MAX_SEARCH_RESULTS) break
    }
  }

  if (!matches.length) return `(No results found for "${query}".)`

  return matches.map((m, i) => {
    const heading = m.title ? ` (near "${m.title}")` : ''
    return `### Result ${i + 1}${heading}\n\n${m.snippet}`
  }).join('\n\n---\n\n')
}

const extractNearestHeading = (markdown, paragraph) => {
  const idx = markdown.indexOf(paragraph)
  if (idx < 0) return ''
  const before = markdown.substring(0, idx).split('\n')
  for (let i = before.length - 1; i >= 0; i--) {
    const atx = /^#{1,6}\s+(.+?)\s*$/.exec(before[i])
    if (atx) return atx[1].trim()
  }
  return ''
}

/**
 * Get the content of a specific section by heading title (substring match)
 * or by 0-based section index. Returns the markdown from that section's
 * heading to the next heading of equal or higher level.
 */
export const getSectionContent = (sections, markdown, identifier) => {
  if (!sections.length) return markdown

  let target = null

  if (typeof identifier === 'number') {
    target = sections[identifier] || null
  } else {
    const query = String(identifier || '').trim().toLowerCase()
    // Try exact match first, then substring
    target = sections.find(s => s.title.toLowerCase() === query) ||
      sections.find(s => s.title.toLowerCase().includes(query))
  }

  if (!target) {
    const titles = sections.map((s, i) => `[${i}] ${'#'.repeat(s.level)} ${s.title}`).join('\n')
    return `Section "${identifier}" not found. Available sections:\n${titles}`
  }

  const lines = markdown.split('\n')
  const endLine = target.endLine != null ? target.endLine : lines.length
  const content = lines.slice(target.startLine, endLine).join('\n')

  // If the section is very long, add a preview hint
  if (content.length > MAX_SECTION_PREVIEW_LEN * 10) {
    const preview = content.substring(0, MAX_SECTION_PREVIEW_LEN * 10)
    return preview + `\n\n[... Section "${target.title}" is ${content.length} chars. Use search_document(query) to locate specific content, or narrow the scope.]`
  }

  return content
}

/**
 * Estimate approximate token count (4 chars ≈ 1 token for English, ~2 for CJK).
 */
export const estimateTokens = text => {
  let ascii = 0
  let nonAscii = 0
  for (const ch of text) {
    if (ch.charCodeAt(0) <= 127) ascii++
    else nonAscii++
  }
  return Math.ceil(ascii / 4) + Math.ceil(nonAscii / 2)
}
