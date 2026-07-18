// Small controlled inline-rename input: autofocuses + selects, commits on Enter
// or blur, cancels on Escape. Reused by the sidebar and the top tabs.
import { useEffect, useRef, useState } from 'react'

export default function RenameField({ initial, onCommit, onCancel, className }) {
  const [value, setValue] = useState(initial ?? '')
  const ref = useRef(null)
  const committedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  const commit = () => {
    if (committedRef.current) return
    committedRef.current = true
    onCommit(value.trim() || 'Untitled')
  }

  return (
    <input
      ref={ref}
      className={className}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          committedRef.current = true
          onCancel()
        }
      }}
    />
  )
}
