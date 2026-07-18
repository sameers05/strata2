// The Completed section (SPEC.md §7.4): always visible at the bottom, collapsed
// by default, expandable. Completed subtrees keep their structure; unchecking
// any of them restores the whole root to the Active area (§7.5). Items can be
// deleted here (confirmed).

function CompletedItem({ node, depth, api }) {
  return (
    <div>
      <div className="row done" style={{ marginLeft: `${depth * 1.4}em` }}>
        <span className="twist empty">•</span>
        <input
          type="checkbox"
          className="checkbox"
          checked={node.done}
          title="Uncheck to restore this item to the Active area"
          onChange={() => api.restore(node.id)}
        />
        <span className="text">{node.text || 'Untitled item'}</span>
        <button
          className="del"
          title="Delete completed item"
          style={{ opacity: 1, border: 'none', background: 'none', cursor: 'pointer' }}
          onClick={() => api.delCompleted(node.id)}
        >
          🗑
        </button>
      </div>
      {node.children.map((child) => (
        <CompletedItem key={child.id} node={child} depth={depth + 1} api={api} />
      ))}
    </div>
  )
}

export default function CompletedSection({ list, expanded, api }) {
  const count = list.completed.length
  return (
    <div className="completed">
      <div className="completed-header" onClick={api.toggleCompleted}>
        <span className="twist">{expanded ? '▾' : '▸'}</span>
        <span>Completed ({count})</span>
        {count > 0 && (
          <button
            className="clear"
            onClick={(e) => {
              e.stopPropagation()
              api.clearCompleted()
            }}
          >
            Clear completed
          </button>
        )}
      </div>
      {expanded && (
        <div className="completed-body">
          {count === 0 ? (
            <div className="completed-empty">Nothing completed yet.</div>
          ) : (
            list.completed.map((node) => (
              <CompletedItem key={node.id} node={node} depth={0} api={api} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
