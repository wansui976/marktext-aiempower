const DB_NAME = 'marktext-ai-sessions'
const DB_VERSION = 1
const STORE_META = 'sessionMeta'
const STORE_MESSAGES = 'sessionMessages'

class SessionDb {
  constructor () {
    this._db = null
    this._opening = null
  }

  open () {
    if (this._db) return Promise.resolve(this._db)
    if (this._opening) return this._opening

    this._opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_META)) {
          const metaStore = db.createObjectStore(STORE_META, { keyPath: 'id' })
          metaStore.createIndex('documentKey', 'documentKey', { unique: false })
          metaStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          db.createObjectStore(STORE_MESSAGES, { keyPath: 'sessionId' })
        }
      }
      request.onsuccess = (event) => {
        this._db = event.target.result
        resolve(this._db)
      }
      request.onerror = (event) => {
        this._opening = null
        reject(event.target.error)
      }
    })
    return this._opening
  }

  async _tx (storeNames, mode, fn) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode)
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()
      fn(tx)
    })
  }

  async getSessionsByDocumentKey (documentKey) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly')
      const store = tx.objectStore(STORE_META)
      const index = store.index('documentKey')
      const request = index.getAll(documentKey)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getAllMeta () {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly')
      const store = tx.objectStore(STORE_META)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getSessionMessages (sessionId) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly')
      const store = tx.objectStore(STORE_MESSAGES)
      const request = store.get(sessionId)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? { displayMessages: result.displayMessages || [], apiMessages: result.apiMessages || [] } : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveSession (meta, messages) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META, STORE_MESSAGES], 'readwrite')
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE_META).put(meta)
      tx.objectStore(STORE_MESSAGES).put({
        sessionId: meta.id,
        displayMessages: messages.displayMessages,
        apiMessages: messages.apiMessages
      })
    })
  }

  async saveMeta (meta) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite')
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE_META).put(meta)
    })
  }

  async deleteSession (sessionId) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META, STORE_MESSAGES], 'readwrite')
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE_META).delete(sessionId)
      tx.objectStore(STORE_MESSAGES).delete(sessionId)
    })
  }

  async deleteAllSessions () {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META, STORE_MESSAGES], 'readwrite')
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE_META).clear()
      tx.objectStore(STORE_MESSAGES).clear()
    })
  }

  async importSessions (sessions) {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META, STORE_MESSAGES], 'readwrite')
      tx.onerror = () => reject(tx.error)
      tx.oncomplete = () => resolve()
      const metaStore = tx.objectStore(STORE_META)
      const msgStore = tx.objectStore(STORE_MESSAGES)
      for (const session of sessions) {
        metaStore.put({
          id: session.id,
          documentKey: session.documentKey,
          documentLabel: session.documentLabel,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        })
        msgStore.put({
          sessionId: session.id,
          displayMessages: session.displayMessages || [],
          apiMessages: session.apiMessages || []
        })
      }
    })
  }
}

export default new SessionDb()
