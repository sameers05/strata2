// Core state model + pure operations. This is the single in-memory source of
// truth the UI renders from (SPEC.md §12). Every operation is a pure function
// (state, ...args) -> newState, so React re-renders from a fresh object and the
// persistence layer can save the whole thing. We clone via structuredClone and
// mutate the clone: clear and correct, and cheap at personal-checklist scale.

export const SCHEMA_VERSION = 1

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------
// state = {
//   version: number,
//   lists: { [listId]: List },
//   listOrder: [listId],          // single canonical order (tabs + sidebar)
//   session: { openTabs: [listId], activeTabId: listId | 'home' },
// }
//
// List = {
//   id, name,
//   active:    [Item],   // top-level roots + their subtrees, not yet completed
//   completed: [Item],   // relocated completed subtree roots, in completion order
// }
//
// Item = { id, text, done: boolean, children: [Item] }
//
// NOTE: collapse/expand state is intentionally NOT stored here (SPEC.md §6.5,
// §10.1) — the UI keeps it as ephemeral state and every List opens expanded.

function uuid() {
  // crypto.randomUUID() only exists in a SECURE context (https or
  // http://localhost). When the Vite server is reached over a LAN IP
  // (http://192.168.x.x) that's a non-secure context and randomUUID is
  // undefined — so fall back to a v4 UUID built from getRandomValues (which
  // *is* available in non-secure contexts), and to Math.random as a last resort.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const b = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(b)
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  }
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // variant 10
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
}

export function createItem(text = '') {
  return { id: uuid(), text, done: false, children: [] }
}

export function createList(name = 'Untitled') {
  return { id: uuid(), name, active: [], completed: [] }
}

export function defaultSettings() {
  return {
    theme: 'light', // 'light' | 'dark'
    scale: 1, // UI scale / font-size multiplier
    fonts: { sidebar: 'system', ribbon: 'system', items: 'system' },
  }
}

export function createInitialState() {
  return {
    version: SCHEMA_VERSION,
    lists: {},
    listOrder: [],
    session: { openTabs: [], activeTabId: 'home' },
    settings: defaultSettings(),
  }
}

// Coerce whatever load() returned into a valid, current-version state object.
// Keeps the app resilient to an empty DB or a partially-shaped record.
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== SCHEMA_VERSION) {
    return createInitialState()
  }
  const base = createInitialState()
  const ds = defaultSettings()
  return {
    version: SCHEMA_VERSION,
    lists: raw.lists ?? base.lists,
    listOrder: raw.listOrder ?? base.listOrder,
    session: {
      openTabs: raw.session?.openTabs ?? [],
      activeTabId: raw.session?.activeTabId ?? 'home',
    },
    settings: {
      theme: raw.settings?.theme === 'dark' ? 'dark' : 'light',
      scale: typeof raw.settings?.scale === 'number' ? raw.settings.scale : ds.scale,
      fonts: { ...ds.fonts, ...(raw.settings?.fonts ?? {}) },
    },
  }
}

// ---------------------------------------------------------------------------
// Tree helpers (internal)
// ---------------------------------------------------------------------------

// Depth-first search over a forest. Returns location info for `id`, or null.
// `parent` is the parent Item (null for top-level roots); `root` is the
// top-level ancestor Item that the match lives under.
function locate(roots, id, parent = null, root = null) {
  for (let i = 0; i < roots.length; i++) {
    const node = roots[i]
    const nodeRoot = parent === null ? node : root
    if (node.id === id) {
      return { node, siblings: roots, parent, index: i, root: nodeRoot }
    }
    const found = locate(node.children, id, node, nodeRoot)
    if (found) return found
  }
  return null
}

// Locate within a List, tracking which area (active vs completed) it's in.
function locateInList(list, id) {
  const a = locate(list.active, id)
  if (a) return { ...a, area: 'active' }
  const c = locate(list.completed, id)
  if (c) return { ...c, area: 'completed' }
  return null
}

// A parent is "gated" (grayed / uncheckable) while any direct child is not done
// (SPEC.md §7.1). Gating is naturally recursive: a child can only be done if its
// own children were all done, so all-direct-children-done => whole subtree done.
export function isGated(node) {
  return node.children.length > 0 && node.children.some((c) => !c.done)
}

function resetDone(node) {
  node.done = false
  node.children.forEach(resetDone)
}

// ---------------------------------------------------------------------------
// List operations
// ---------------------------------------------------------------------------

// Creates an "Untitled" List, opens it as a tab, and makes it active
// (SPEC.md §5). Returns { state, id } since callers need the new id.
export function addList(state, name = 'Untitled') {
  const next = structuredClone(state)
  const list = createList(name)
  next.lists[list.id] = list
  next.listOrder.push(list.id)
  if (!next.session.openTabs.includes(list.id)) next.session.openTabs.push(list.id)
  next.session.activeTabId = list.id
  return { state: next, id: list.id }
}

export function renameList(state, listId, name) {
  const next = structuredClone(state)
  if (next.lists[listId]) next.lists[listId].name = name
  return next
}

// Deletes a List entirely and removes it from order + open tabs (SPEC.md §5).
export function deleteList(state, listId) {
  const next = structuredClone(state)
  delete next.lists[listId]
  next.listOrder = next.listOrder.filter((id) => id !== listId)
  next.session.openTabs = next.session.openTabs.filter((id) => id !== listId)
  if (next.session.activeTabId === listId) next.session.activeTabId = 'home'
  return next
}

// Reorder a List up/down by one step in the single canonical order, clamped at
// the ends (SPEC.md §5). Tabs and sidebar both read this order.
export function moveList(state, listId, dir) {
  const next = structuredClone(state)
  const i = next.listOrder.indexOf(listId)
  if (i === -1) return state
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= next.listOrder.length) return state
  const [id] = next.listOrder.splice(i, 1)
  next.listOrder.splice(j, 0, id)
  return next
}

// Open (or focus) a List as a top tab without altering the canonical order.
export function openList(state, listId) {
  const next = structuredClone(state)
  if (!next.session.openTabs.includes(listId)) next.session.openTabs.push(listId)
  next.session.activeTabId = listId
  return next
}

// Close a tab but keep the List in the sidebar (close != delete, SPEC.md §5).
export function closeList(state, listId) {
  const next = structuredClone(state)
  const tabs = next.session.openTabs
  const wasActive = next.session.activeTabId === listId
  const idx = tabs.indexOf(listId)
  next.session.openTabs = tabs.filter((id) => id !== listId)
  if (wasActive) {
    const remaining = next.session.openTabs
    // Prefer the neighbour to the left, else the new first tab, else Home.
    const fallback = remaining[idx - 1] ?? remaining[0] ?? 'home'
    next.session.activeTabId = fallback
  }
  return next
}

export function setActiveTab(state, tabId) {
  const next = structuredClone(state)
  next.session.activeTabId = tabId
  return next
}

// ---------------------------------------------------------------------------
// Item operations (all within a List's active area unless noted)
// ---------------------------------------------------------------------------

// Insert a new empty item as a sibling immediately after `afterId` at the same
// depth (Enter behavior, SPEC.md §6.2). If afterId is null, append at top level.
// Returns { state, id }.
export function addItem(state, listId, afterId = null) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return { state, id: null }
  const item = createItem()
  if (afterId == null) {
    list.active.push(item)
  } else {
    const loc = locate(list.active, afterId)
    if (!loc) list.active.push(item)
    else loc.siblings.splice(loc.index + 1, 0, item)
  }
  return { state: next, id: item.id }
}

export function updateItemText(state, listId, itemId, text) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return state
  const loc = locateInList(list, itemId)
  if (loc) loc.node.text = text
  return next
}

// Tab: indent an active item under its previous sibling, moving its whole
// subtree with it (SPEC.md §6.4). No-op if there is no previous sibling.
export function indentItem(state, listId, itemId) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return state
  const loc = locate(list.active, itemId)
  if (!loc || loc.index === 0) return state
  const prev = loc.siblings[loc.index - 1]
  loc.siblings.splice(loc.index, 1)
  prev.children.push(loc.node)
  return next
}

// Shift+Tab: outdent an active item to become the next sibling of its former
// parent, subtree intact (SPEC.md §6.4). No-op if already top-level.
export function outdentItem(state, listId, itemId) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return state
  const loc = locate(list.active, itemId)
  if (!loc || loc.parent === null) return state
  const parentLoc = locate(list.active, loc.parent.id)
  loc.siblings.splice(loc.index, 1)
  parentLoc.siblings.splice(parentLoc.index + 1, 0, loc.node)
  return next
}

// Move a TOP-LEVEL active parent up/down one step, clamped (SPEC.md §6.4).
// Sub-items cannot be vertically reordered among siblings — only top-level ones.
export function moveTopLevel(state, listId, itemId, dir) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return state
  const i = list.active.findIndex((n) => n.id === itemId)
  if (i === -1) return state // not a top-level active item
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= list.active.length) return state
  const [n] = list.active.splice(i, 1)
  list.active.splice(j, 0, n)
  return next
}

// Delete an item (and its subtree) from wherever it lives. Confirmation is a UI
// concern; this just performs the removal.
export function deleteItem(state, listId, itemId) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return state
  let loc = locate(list.active, itemId)
  if (loc) {
    loc.siblings.splice(loc.index, 1)
    return next
  }
  loc = locate(list.completed, itemId)
  if (loc) {
    loc.siblings.splice(loc.index, 1)
    return next
  }
  return state
}

// Clear ALL completed subtrees in a List (bulk delete, SPEC.md §11).
export function clearCompleted(state, listId) {
  const next = structuredClone(state)
  if (next.lists[listId]) next.lists[listId].completed = []
  return next
}

// ---------------------------------------------------------------------------
// Completion logic (SPEC.md §7) — the heart of the model.
// ---------------------------------------------------------------------------
//
//  - Parent gating: checking a gated parent is a no-op.
//  - Checking a top-level root (its whole subtree already done) relocates the
//    entire subtree into Completed.
//  - Checking a non-root, checkable item just marks it done; it stays in the
//    Active area until its top-level root is checked.
//  - Toggling anything in the Completed area restores its whole root subtree to
//    the Active area, reset to incomplete.
export function toggleItem(state, listId, itemId) {
  const next = structuredClone(state)
  const list = next.lists[listId]
  if (!list) return state
  const loc = locateInList(list, itemId)
  if (!loc) return state
  const { node, parent, root, area } = loc

  if (area === 'completed') {
    // Reversal (SPEC.md §7.5): pull the whole subtree back, reset to incomplete.
    resetDone(root)
    list.completed = list.completed.filter((n) => n.id !== root.id)
    list.active.push(root)
    return next
  }

  // area === 'active'
  if (!node.done) {
    // Attempting to check.
    if (isGated(node)) return state // grayed parent — no-op (SPEC.md §7.1, §11)
    node.done = true
    if (parent === null) {
      // Top-level root completed -> relocate entire subtree to Completed.
      list.active = list.active.filter((n) => n.id !== node.id)
      list.completed.push(node)
    }
    // Non-root: just mark done; it stays put until the root is checked.
  } else {
    // Unchecking an intermediate active parent that was previously checked.
    // (A top-level leaf never sits done-in-active: checking it relocates it.)
    node.done = false
  }
  return next
}

// ---------------------------------------------------------------------------
// Settings (SPEC.md §9)
// ---------------------------------------------------------------------------

export function updateSettings(state, patch) {
  const next = structuredClone(state)
  next.settings = { ...next.settings, ...patch }
  return next
}

export function updateFont(state, area, value) {
  const next = structuredClone(state)
  next.settings.fonts = { ...next.settings.fonts, [area]: value }
  return next
}

// ---------------------------------------------------------------------------
// Export / Import (SPEC.md §10.2, §10.3)
// ---------------------------------------------------------------------------

// Build the versioned export payload from in-memory state. Independent of the
// storage backend (§10.2). Settings/session are machine-local and NOT exported;
// only the portable data (Lists + their canonical order) travels.
export function buildExport(state) {
  return {
    schema: 'strata2',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    lists: state.lists,
    listOrder: state.listOrder,
  }
}

// Validate a parsed import object. Throws with a human-readable message.
export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('File is not valid JSON.')
  if (obj.schema !== 'strata2') throw new Error('Not a strata2 backup (missing schema tag).')
  if (obj.version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version: ${obj.version} (this app is v${SCHEMA_VERSION}).`)
  }
  if (!obj.lists || typeof obj.lists !== 'object') throw new Error('Malformed backup: no lists.')
  return true
}

// Merge an imported (already-validated) payload into state by List UUID
// (upsert). On an ID match the imported List WINS wholesale; new Lists are
// appended to the canonical order; existing Lists absent from the file are left
// untouched (SPEC.md §10.3).
//
// NOTE: The spec also describes item-level UUID upsert. Merging two arbitrary
// trees item-by-item has no unambiguous home for existing items whose imported
// parent moved or vanished, so we upsert at LIST granularity (imported List
// replaces the matching List). This is duplicate-free and satisfies the stated
// goal of combining data between machines. Flagged for confirmation.
export function mergeImport(state, incoming) {
  const next = structuredClone(state)
  const incomingLists = incoming.lists ?? {}
  // Preserve the incoming canonical order for newly-added lists.
  const orderedIds = [
    ...(incoming.listOrder ?? []).filter((id) => incomingLists[id]),
    ...Object.keys(incomingLists).filter((id) => !(incoming.listOrder ?? []).includes(id)),
  ]
  let added = 0
  let overwritten = 0
  for (const id of orderedIds) {
    if (next.lists[id]) overwritten++
    else {
      added++
      next.listOrder.push(id)
    }
    next.lists[id] = structuredClone(incomingLists[id])
  }
  return { state: next, added, overwritten }
}
