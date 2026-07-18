# strata2 — Build Guidance for Claude Code

This repository implements **strata2**, a local, offline, single-user hierarchical checklist
app. The complete, finalized specification is in **`SPEC.md`** at the repo root — treat it as
the source of truth.

## Ground rules
- Implement the app **exactly** as described in `SPEC.md`.
- If anything is ambiguous or seems to conflict, **ask before deviating** — do not invent scope
  or silently change specified behavior.
- The stack is fixed (see `SPEC.md` §12): **React + Vite**, **IndexedDB via `idb`** behind a
  `load()/save()` storage module, and a **single in-memory source of truth** the UI renders
  from. No packaged executable — the app must run from a local Vite dev server.

## Suggested build order
1. Scaffold Vite + React; confirm `npm run dev` serves and loads in a browser.
2. Storage module (`load()` / `save()`) over IndexedDB via `idb`, with the versioned state
   shape and UUIDs on every List and item.
3. Core state tree + completion logic (parent-gating, subtree relocation, uncheck-to-restore).
4. Shell: left sidebar, Home tab, top tabs with session restore, functional ribbon.
5. Outline interactions: keyboard building, inline edit, collapse/expand, top-level reorder.
6. Completed section, export/import (versioned JSON, merge-by-ID upsert), and Settings.

## Environment
Primary targets are a restricted work laptop (Node + local dev server only, **no packaged
executables**) and a personal machine. Everything must stay runnable via the Vite dev server.
No sync — manual JSON export/import is the only path for moving data between machines.
