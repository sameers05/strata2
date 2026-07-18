// Settings modal (SPEC.md §9): theme, UI scale, per-area fonts, and data
// export/import. Reached from the sidebar's pinned Settings button.
import { useRef, useState } from 'react'
import * as S from '../state.js'
import { FONTS } from '../fonts.js'

const FONT_AREAS = [
  ['sidebar', 'Sidebar'],
  ['ribbon', 'Ribbon'],
  ['items', 'List items'],
]

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Settings({ state, onClose, applyState }) {
  const { settings } = state
  const fileRef = useRef(null)
  const [note, setNote] = useState(null) // { kind: 'ok'|'err', text }

  const set = (patch) => applyState(S.updateSettings(state, patch))
  const setFont = (area, val) => applyState(S.updateFont(state, area, val))

  const doExport = () => {
    const payload = S.buildExport(state)
    const stamp = new Date().toISOString().slice(0, 10)
    download(`strata2-backup-${stamp}.json`, JSON.stringify(payload, null, 2))
    setNote({ kind: 'ok', text: 'Exported all Lists to a JSON file.' })
  }

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    try {
      const text = await file.text()
      const obj = JSON.parse(text)
      S.validateImport(obj)
      const { state: merged, added, overwritten } = S.mergeImport(state, obj)
      applyState(merged)
      setNote({
        kind: 'ok',
        text: `Imported: ${added} new List(s), ${overwritten} updated.`,
      })
    } catch (err) {
      setNote({ kind: 'err', text: `Import failed: ${err.message}` })
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="x" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {/* Theme */}
          <div className="setting">
            <label className="title">Theme</label>
            <div className="controls">
              <div className="seg">
                <button
                  className={settings.theme === 'light' ? 'on' : ''}
                  onClick={() => set({ theme: 'light' })}
                >
                  Light
                </button>
                <button
                  className={settings.theme === 'dark' ? 'on' : ''}
                  onClick={() => set({ theme: 'dark' })}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          {/* UI scale */}
          <div className="setting">
            <label className="title">UI scale / font size</label>
            <div className="controls">
              <input
                type="range"
                min="0.8"
                max="1.6"
                step="0.05"
                value={settings.scale}
                onChange={(e) => set({ scale: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ width: '3.5em', textAlign: 'right' }}>
                {Math.round(settings.scale * 100)}%
              </span>
              <button className="btn" onClick={() => set({ scale: 1 })}>
                Reset
              </button>
            </div>
          </div>

          {/* Per-area fonts */}
          <div className="setting">
            <label className="title">Fonts</label>
            <div className="desc">Choose a different font per region of the app.</div>
            {FONT_AREAS.map(([key, label]) => (
              <div className="field-row" key={key}>
                <span>{label}</span>
                <select value={settings.fonts[key]} onChange={(e) => setFont(key, e.target.value)}>
                  {Object.entries(FONTS).map(([fk, f]) => (
                    <option key={fk} value={fk}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Data */}
          <div className="setting">
            <label className="title">Data</label>
            <div className="desc">
              Manual backup — the only way to move Lists between machines (no sync).
              Import merges by ID: matching Lists are overwritten, new ones added.
            </div>
            <div className="controls">
              <button className="btn primary" onClick={doExport}>
                Export all Lists…
              </button>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                Import…
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={onImportFile}
              />
            </div>
            {note && <div className={'import-note ' + note.kind}>{note.text}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
