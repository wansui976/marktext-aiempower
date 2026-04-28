const STORAGE_KEY = 'marktext.documentPositions'
const MAX_POSITIONS = 500

const readPositions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const positions = raw ? JSON.parse(raw) : {}
    return positions && typeof positions === 'object' ? positions : {}
  } catch (err) {
    return {}
  }
}

const writePositions = positions => {
  try {
    const entries = Object.entries(positions)
      .sort((a, b) => Number(b[1].updatedAt || 0) - Number(a[1].updatedAt || 0))
      .slice(0, MAX_POSITIONS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch (err) {
    // Ignore storage errors; positions are a convenience cache.
  }
}

export const readDocumentPosition = pathname => {
  if (!pathname) return null
  const positions = readPositions()
  return positions[pathname] || null
}

export const writeDocumentPosition = (pathname, position) => {
  if (!pathname || !position) return

  const positions = readPositions()
  positions[pathname] = Object.assign({}, positions[pathname], position, {
    updatedAt: Date.now()
  })
  writePositions(positions)
}
