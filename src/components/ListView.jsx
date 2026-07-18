// A single open List: its title, the Active outline, and the Completed section.
import OutlineItem from './OutlineItem.jsx'
import CompletedSection from './CompletedSection.jsx'

export default function ListView({ list, ui, api }) {
  return (
    <div className="list-view">
      <h1 className="list-title">{list.name || 'Untitled'}</h1>

      <div className="outline">
        {list.active.length === 0 ? (
          <div className="outline-empty">
            Empty list. Press <b>New item</b> (or click here) to add your first item.
            <div style={{ marginTop: '0.6em' }}>
              <button className="btn" onClick={() => api.newItemAfter(null)}>
                ＋ Add first item
              </button>
            </div>
          </div>
        ) : (
          list.active.map((node) => (
            <OutlineItem key={node.id} node={node} depth={0} ui={ui} api={api} />
          ))
        )}
      </div>

      <CompletedSection list={list} expanded={ui.completedExpanded} api={api} />
    </div>
  )
}
