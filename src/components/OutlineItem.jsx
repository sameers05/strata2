// One row of the Active outline, rendered recursively. Two interaction modes:
//   * select mode  — the row div holds DOM focus; Space/Delete/arrows/Alt+arrows
//     act on it (SPEC.md §8 focused-item shortcuts).
//   * edit mode    — a borderless input is shown & focused; Enter builds a new
//     item, Tab/Shift+Tab re-indent, Escape returns to select mode (§6.2, §6.3).
import { useEffect, useRef } from 'react'
import { isGated } from '../state.js'

export default function OutlineItem({ node, depth, ui, api }) {
  const selected = ui.focusedId === node.id
  const editing = ui.editingId === node.id
  const gated = isGated(node)
  const hasChildren = node.children.length > 0
  const isCollapsed = ui.collapsed.has(node.id)

  const rowRef = useRef(null)
  const inputRef = useRef(null)

  // Give the row DOM focus while it's the selected (non-editing) item, so the
  // select-mode keyboard shortcuts land here.
  useEffect(() => {
    if (selected && !editing) rowRef.current?.focus()
  }, [selected, editing])

  // Focus the input and drop the caret at the end when entering edit mode.
  useEffect(() => {
    if (editing) {
      const el = inputRef.current
      if (el) {
        el.focus()
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    }
  }, [editing])

  const onRowKeyDown = (e) => {
    if (editing) return // the input handles keys in edit mode
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        e.altKey ? api.moveTop(node.id, 'up') : api.moveFocus('up')
        break
      case 'ArrowDown':
        e.preventDefault()
        e.altKey ? api.moveTop(node.id, 'down') : api.moveFocus('down')
        break
      case ' ':
        e.preventDefault() // don't scroll the page
        api.toggle(node.id)
        break
      case 'Delete':
        e.preventDefault()
        api.del(node.id)
        break
      case 'Enter':
        e.preventDefault()
        api.editItem(node.id)
        break
      case 'Tab':
        e.preventDefault()
        e.shiftKey ? api.outdent(node.id) : api.indent(node.id)
        break
      default:
        break
    }
  }

  const onInputKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        api.newItemAfter(node.id)
        break
      case 'Tab':
        e.preventDefault()
        e.shiftKey ? api.outdent(node.id) : api.indent(node.id)
        break
      case 'Escape':
        e.preventDefault()
        api.stopEdit()
        break
      case 'ArrowUp':
        e.preventDefault()
        api.editAdjacent(node.id, 'up')
        break
      case 'ArrowDown':
        e.preventDefault()
        api.editAdjacent(node.id, 'down')
        break
      default:
        break
    }
  }

  return (
    <div>
      <div
        ref={rowRef}
        className={'row' + (selected ? ' selected' : '') + (node.done ? ' done' : '')}
        tabIndex={-1}
        style={{ marginLeft: `${depth * 1.4}em` }}
        onKeyDown={onRowKeyDown}
        onClick={() => api.select(node.id)}
      >
        <span
          className={'twist' + (hasChildren ? '' : ' empty')}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) api.toggleCollapse(node.id)
          }}
        >
          {hasChildren ? (isCollapsed ? '▸' : '▾') : '•'}
        </span>

        <input
          type="checkbox"
          className="checkbox"
          checked={node.done}
          disabled={gated && !node.done}
          title={gated && !node.done ? 'Complete all sub-items first' : 'Toggle complete'}
          onClick={(e) => e.stopPropagation()}
          onChange={() => api.toggle(node.id)}
        />

        {editing ? (
          <input
            ref={inputRef}
            className="text-input"
            value={node.text}
            onChange={(e) => api.setText(node.id, e.target.value)}
            onKeyDown={onInputKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={'text' + (node.text ? '' : ' placeholder')}
            onClick={(e) => {
              e.stopPropagation()
              api.editItem(node.id)
            }}
          >
            {node.text || 'Untitled item'}
          </span>
        )}
      </div>

      {hasChildren &&
        !isCollapsed &&
        node.children.map((child) => (
          <OutlineItem key={child.id} node={child} depth={depth + 1} ui={ui} api={api} />
        ))}
    </div>
  )
}
