// Persistent left navigator: every List by name, in canonical order. New List
// and Settings pinned at the bottom (SPEC.md §4.1).
import RenameField from './RenameField.jsx'

export default function Sidebar({ state, activeTabId, renameTarget, api }) {
  const { listOrder, lists } = state
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">strata2</div>
      <div className="sidebar-list">
        {listOrder.length === 0 && <div className="sidebar-empty">No Lists yet</div>}
        {listOrder.map((id, i) => {
          const list = lists[id]
          const renaming = renameTarget === id
          return (
            <div
              key={id}
              className={'sidebar-item' + (id === activeTabId ? ' active' : '')}
              onClick={() => !renaming && api.openList(id)}
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
                  className="name"
                  title={list.name || 'Untitled'}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    api.beginRename(id)
                  }}
                >
                  {list.name || 'Untitled'}
                </span>
              )}
              {/* Reorder in the single canonical order (mirrored in the tabs). */}
              <button
                className="row-btn"
                title="Move List up"
                disabled={i === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  api.moveList(id, 'up')
                }}
              >
                ↑
              </button>
              <button
                className="row-btn"
                title="Move List down"
                disabled={i === listOrder.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  api.moveList(id, 'down')
                }}
              >
                ↓
              </button>
              <button
                className="del"
                title="Delete List"
                onClick={(e) => {
                  e.stopPropagation()
                  api.deleteList(id)
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
      <div className="sidebar-footer">
        <button className="primary" onClick={api.newList}>
          <span>＋</span> New List
        </button>
        <button onClick={api.openSettings}>
          <span>⚙</span> Settings
        </button>
      </div>
    </aside>
  )
}
