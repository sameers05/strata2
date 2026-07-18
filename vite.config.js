import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev server only — no packaged executable (see SPEC.md §12).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
