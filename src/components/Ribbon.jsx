// The single functional Home ribbon (SPEC.md §4.4). Buttons mirror the real
// operations and act on the active List + focused item. Buttons disable when
// they don't apply (e.g. Move up/down only for a focused top-level item).

function Btn({ ico, cap, title, disabled, danger, onClick }) {
  return (
    <button
      type="button"
      className={'ribbon-btn' + (danger ? ' danger' : '')}
      title={title || cap}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ico">{ico}</span>
      <span className="cap">{cap}</span>
    </button>
  )
}

export default function Ribbon({
  onHome,
  activeListId,
  focusedId,
  focusedTopLevel,
  hasCompleted,
  api,
}) {
  const noList = onHome
  const hasFocused = !!focusedId

  return (
    <div className="ribbon" role="toolbar" aria-label="Home">
      <div className="ribbon-group">
        <Btn ico="＋" cap="New item" disabled={noList} onClick={api.newItemFromRibbon} />
      </div>
      <div className="ribbon-group">
        <Btn ico="⇥" cap="Indent" disabled={noList || !hasFocused} onClick={() => api.indent(focusedId)} />
        <Btn ico="⇤" cap="Outdent" disabled={noList || !hasFocused} onClick={() => api.outdent(focusedId)} />
      </div>
      <div className="ribbon-group">
        <Btn ico="↑" cap="Move up" disabled={noList || !focusedTopLevel} onClick={() => api.moveTop(focusedId, 'up')} />
        <Btn ico="↓" cap="Move down" disabled={noList || !focusedTopLevel} onClick={() => api.moveTop(focusedId, 'down')} />
      </div>
      <div className="ribbon-group">
        <Btn ico="🗑" cap="Delete" danger disabled={noList || !hasFocused} onClick={() => api.del(focusedId)} />
        <Btn ico="🧹" cap="Clear completed" disabled={noList || !hasCompleted} onClick={api.clearCompleted} />
      </div>
      <div className="ribbon-group">
        <Btn ico="✎" cap="Rename List" disabled={noList} onClick={() => api.beginRename(activeListId, 'tab')} />
        <Btn ico="✖" cap="Delete List" danger disabled={noList} onClick={() => api.deleteList(activeListId)} />
      </div>
    </div>
  )
}
