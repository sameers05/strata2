// Top document-style tabs: fixed Home tab (never closes) plus one persistent
// tab per open List, in canonical order. Double-click a List tab to rename;
// the × closes it (keeps the sidebar entry). Session restore is automatic since
// openTabs/activeTabId live in persisted state (SPEC.md §4.2, §4.3).
import RenameField from './RenameField.jsx'

export default function TabStrip({ state, activeTabId, renameTarget, api }) {
  const { openTabs } = state.session
  const { lists } = state

  return (
    <div className="tabstrip" role="tablist">
      <div
        className={'tab tab-home' + (activeTabId === 'home' ? ' active' : '')}
        onClick={() => api.setActiveTab('home')}
      >
        <span className="label">Home</span>
      </div>

      {openTabs
        .filter((id) => lists[id])
        .map((id) => {
          const list = lists[id]
          const renaming = renameTarget?.id === id && renameTarget.where === 'tab'
          return (
            <div
              key={id}
              className={'tab' + (id === activeTabId ? ' active' : '')}
              onClick={() => !renaming && api.setActiveTab(id)}
            >
              {renaming ? (
                <RenameField
                  className="rename-input"
                  initial={list.name}
                  onCommit={(v) => api.commitRename(id, v)}
                  onCancel={api.cancelRename}
                />
              ) : (
                <span
                  className="label"
                  title={list.name || 'Untitled'}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    api.beginRename(id, 'tab')
                  }}
                >
                  {list.name || 'Untitled'}
                </span>
              )}
              <button
                className="close"
                title="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  api.closeTab(id)
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
    </div>
  )
}
