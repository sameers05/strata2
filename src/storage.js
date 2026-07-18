// Storage module — the ONLY place that knows about the persistence backend.
// Exposes load() / save(state) over IndexedDB (via the `idb` wrapper) so the
// rest of the app stays backend-agnostic (SPEC.md §10.1). Swapping the backend
// later should be a change confined to this file.
import { openDB } from 'idb'

const DB_NAME = 'strata2'
const DB_VERSION = 1
const STORE = 'appState'
// Single-user app: the whole in-memory state is persisted as one record.
const STATE_KEY = 'singleton'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

// Returns the persisted state object, or null if nothing has been saved yet.
export async function load() {
  const db = await getDB()
  const state = await db.get(STORE, STATE_KEY)
  return state ?? null
}

// Persists the entire in-memory state object.
export async function save(state) {
  const db = await getDB()
  await db.put(STORE, state, STATE_KEY)
}

// Test/reset helper — wipes persisted state. Not used by normal app flow.
export async function clear() {
  const db = await getDB()
  await db.delete(STORE, STATE_KEY)
}
