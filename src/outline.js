// UI-side outline helpers (pure, no state mutation). Kept out of state.js
// because these concern rendering/navigation, not the persisted model.

// Flatten the active forest into visible rows in display order, honoring the
// session-only `collapsed` set. Returns [{ node, depth }]. A collapsed node is
// shown but its descendants are omitted.
export function flattenVisible(nodes, collapsed, depth = 0, out = []) {
  for (const node of nodes) {
    out.push({ node, depth })
    if (node.children.length > 0 && !collapsed.has(node.id)) {
      flattenVisible(node.children, collapsed, depth + 1, out)
    }
  }
  return out
}

// True if `id` is a top-level active item (only those can be vertically
// reordered, SPEC.md §6.4).
export function isTopLevelActive(list, id) {
  return !!list && list.active.some((n) => n.id === id)
}

// Depth-first find of a node within a forest.
export function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}
