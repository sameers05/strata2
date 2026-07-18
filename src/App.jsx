import { useEffect, useMemo, useRef, useState } from 'react'
import { load, save } from './storage.js'
import * as S from './state.js'
import { fontStack } from './fonts.js'
import { flattenVisible, isTopLevelActive } from './outline.js'
import Sidebar from './components/Sidebar.jsx'
import TabStrip from './components/TabStrip.jsx'
import Ribbon from './components/Ribbon.jsx'
import HomeView from './components/HomeView.jsx'
import ListView from './components/ListView.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  // ---- Persisted domain state (single source of truth) -------------------
  const [state, setState] = useState(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    load().then((raw) => {
      setState(S.normalizeState(raw))
      loadedRef.current = true
    })
  }, [])

  useEffect(() => {
    if (state && loadedRef.current) save(state)
  }, [state])

  // ---- Ephemeral UI state (NOT persisted) --------------------------------
  const [focusedId, setFocusedId] = useState(null) // selected item (active area)
  const [editingId, setEditingId] = useState(null) // item in inline text-edit
  const [collapsed, setCollapsed] = useState(() => new Set()) // session-only
  const [completedExpanded, setCompletedExpanded] = useState(false)
  // Which List is being inline-renamed, and WHERE. A List shows in both the
  // sidebar and its tab, so we must target one location — otherwise two rename
  // inputs mount for the same id and their focus effects fight (the 2nd blurs
  // the 1st, firing onBlur→commit and tearing both down). Shape: {id, where}.
  const [renameTarget, setRenameTarget] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const activeTabId = state?.session.activeTabId ?? 'home'
  const activeList = activeTabId !== 'home' ? state?.lists[activeTabId] : null

  // Switching lists/tabs resets transient outline state and re-collapses the
  // Completed section (each List opens with Completed collapsed, SPEC.md §7.4).
  useEffect(() => {
    setFocusedId(null)
    setEditingId(null)
    setCompletedExpanded(false)
    setRenameTarget(null)
  }, [activeTabId])

  if (!state) return <div style={{ padding: 24 }}>Loading…</div>

  const { settings } = state
  const listId = activeList?.id ?? null

  // ---- helpers -----------------------------------------------------------
  const collapseCompleted = () => setCompletedExpanded(false)
  const visible = () => (activeList ? flattenVisible(activeList.active, collapsed) : [])

  // ---- item actions (active list) ----------------------------------------
  // Selecting a row also leaves edit mode (clicking away from a line you were
  // editing). Clicking an item's text goes through editItem instead, so this
  // only fires for non-text clicks on a row.
  const select = (id) => {
    setFocusedId(id)
    setEditingId(null)
  }
  const editItem = (id) => {
    setFocusedId(id)
    setEditingId(id)
  }
  const stopEdit = () => setEditingId(null)

  const setText = (id, text) => setState(S.updateItemText(state, listId, id, text))

  const newItemAfter = (afterId) => {
    const { state: ns, id } = S.addItem(state, listId, afterId)
    setState(ns)
    setFocusedId(id)
    setEditingId(id)
    collapseCompleted()
  }

  const indent = (id) => {
    setState(S.indentItem(state, listId, id))
    setFocusedId(id)
    collapseCompleted()
  }
  const outdent = (id) => {
    setState(S.outdentItem(state, listId, id))
    setFocusedId(id)
    collapseCompleted()
  }

  const toggle = (id) => {
    setState(S.toggleItem(state, listId, id))
    setFocusedId(id)
    collapseCompleted()
  }
  // Restore/interact within Completed — does NOT collapse the section.
  const restore = (id) => setState(S.toggleItem(state, listId, id))

  const del = (id) => {
    if (!confirm('Delete this item and everything under it?')) return
    setState(S.deleteItem(state, listId, id))
    if (focusedId === id) setFocusedId(null)
    if (editingId === id) setEditingId(null)
    collapseCompleted()
  }
  const delCompleted = (id) => {
    if (!confirm('Delete this completed item?')) return
    setState(S.deleteItem(state, listId, id))
  }

  const moveTop = (id, dir) => {
    setState(S.moveTopLevel(state, listId, id, dir))
    setFocusedId(id)
    collapseCompleted()
  }

  const moveFocus = (dir) => {
    const rows = visible()
    if (rows.length === 0) return
    const i = rows.findIndex((r) => r.node.id === focusedId)
    let j
    if (i === -1) j = dir === 'up' ? rows.length - 1 : 0
    else j = dir === 'up' ? Math.max(0, i - 1) : Math.min(rows.length - 1, i + 1)
    setFocusedId(rows[j].node.id)
  }

  // Move edit caret to the adjacent visible item (keeps keyboard building fluid).
  const editAdjacent = (fromId, dir) => {
    const rows = visible()
    const i = rows.findIndex((r) => r.node.id === fromId)
    if (i === -1) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= rows.length) return
    editItem(rows[j].node.id)
  }

  const toggleCollapse = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const clearCompleted = () => {
    if (!activeList || activeList.completed.length === 0) return
    if (!confirm('Clear ALL completed items in this List? This cannot be undone.')) return
    setState(S.clearCompleted(state, listId))
  }

  // ---- list / tab actions ------------------------------------------------
  const newList = () => setState(S.addList(state).state)
  const openList = (id) => setState(S.openList(state, id))
  const setActiveTab = (id) => setState(S.setActiveTab(state, id))
  const closeTab = (id) => setState(S.closeList(state, id))
  const renameList = (id, name) => setState(S.renameList(state, id, name))
  const moveList = (id, dir) => setState(S.moveList(state, id, dir))
  const deleteList = (id) => {
    const l = state.lists[id]
    if (!confirm(`Delete the List "${l?.name || 'Untitled'}"? This cannot be undone.`)) return
    setState(S.deleteList(state, id))
  }
  const beginRename = (id, where = 'tab') => setRenameTarget({ id, where })
  const commitRename = (id, name) => {
    setState(S.renameList(state, id, name))
    setRenameTarget(null)
  }
  const cancelRename = () => setRenameTarget(null)

  // ---- settings actions --------------------------------------------------
  const applyState = (ns) => setState(ns) // used by Settings import/mutations

  const focusedTopLevel = focusedId ? isTopLevelActive(activeList, focusedId) : false

  const api = {
    select, editItem, stopEdit, setText, newItemAfter, indent, outdent, toggle, restore,
    del, delCompleted, moveTop, moveFocus, editAdjacent, toggleCollapse,
    toggleCompleted: () => setCompletedExpanded((v) => !v),
    clearCompleted,
    openList, setActiveTab, closeTab, moveList, deleteList,
    beginRename, commitRename, cancelRename, newList,
    openSettings: () => setSettingsOpen(true),
    newItemFromRibbon: () => newItemAfter(focusedId ?? null),
  }
  const ui = { focusedId, editingId, collapsed, completedExpanded, renameTarget }

  const appStyle = {
    '--scale': settings.scale,
    '--font-ui': fontStack('system'),
    '--font-sidebar': fontStack(settings.fonts.sidebar),
    '--font-ribbon': fontStack(settings.fonts.ribbon),
    '--font-items': fontStack(settings.fonts.items),
  }

  return (
    <div className="app" data-theme={settings.theme} style={appStyle}>
      <Sidebar
        state={state}
        activeTabId={activeTabId}
        renameTarget={renameTarget}
        api={api}
      />
      <div className="main">
        <TabStrip state={state} activeTabId={activeTabId} renameTarget={renameTarget} api={api} />
        <Ribbon
          onHome={activeTabId === 'home'}
          activeListId={listId}
          focusedId={focusedId}
          focusedTopLevel={focusedTopLevel}
          hasCompleted={!!activeList && activeList.completed.length > 0}
          api={api}
        />
        <div className="content">
          {activeList ? (
            <ListView list={activeList} ui={ui} api={api} />
          ) : (
            <HomeView state={state} api={api} />
          )}
        </div>
      </div>

      {settingsOpen && (
        <Settings
          state={state}
          onClose={() => setSettingsOpen(false)}
          applyState={applyState}
        />
      )}
    </div>
  )
}
