// The Home tab: full roster of every List — create and open from here
// (SPEC.md §4.2). Flat at the top level, no folders.

function countItems(nodes) {
  let n = 0
  for (const node of nodes) n += 1 + countItems(node.children)
  return n
}

export default function HomeView({ state, api }) {
  const { listOrder, lists } = state
  return (
    <div className="home">
      <h1>Your Lists</h1>
      <p className="sub">A flat set of checklists. Open one to start outlining.</p>

      {listOrder.length === 0 ? (
        <div className="home-empty">
          No Lists yet. Create your first with <b>New List</b>.
        </div>
      ) : (
        <div className="home-grid">
          {listOrder.map((id) => {
            const list = lists[id]
            const active = countItems(list.active)
            const done = countItems(list.completed)
            return (
              <div key={id} className="home-card" onClick={() => api.openList(id)}>
                <div className="card-name">{list.name || 'Untitled'}</div>
                <div className="card-meta">
                  {active} active{done ? ` · ${done} completed` : ''}
                </div>
              </div>
            )
          })}
          <div className="home-card home-new" onClick={api.newList}>
            ＋ New List
          </div>
        </div>
      )}
    </div>
  )
}
