# Hierarchical Checklist App — Requirements Specification

*Status: requirements and tech stack finalized. No implementation yet — next step is the Claude Code build.*

---

## 1. Overview

A single-user, local, offline application for organizing a personal **work stack** as a
collection of nested checklists.

- **Visual / UX inspiration:** OnlyOffice Desktop Editors — a persistent left sidebar, a
  top ribbon with a **Home** tab, document-style tabs across the top, and a clean look with
  crisp scaling.
- **Behavioral inspiration:** MS To-Do + Obsidian/Workflowy-style keyboard outlining.

The app is deliberately **flat at the top level**: no projects, no folders. It is just a set
of checklists ("**Lists**"), each an arbitrarily deep, indented, checkbox-driven outline.

---

## 2. Scope & Non-Goals

**In scope**

- Local, offline, single-user use — all data on the user's own machine.
- Multiple checklists ("Lists"), each a nested outline of single-line items.
- Full keyboard-driven outlining plus a functional ribbon and mouse interactions.
- Manual data export/import for backup and moving between machines.

**Explicitly out of scope (non-goals)**

- Sync across devices.
- Multi-user or collaboration.
- Accounts / login.
- Search or filtering.
- Per-item notes or any long-form detail (items are one line only).
- Cloud storage of any kind.

---

## 3. Terminology

| Term | Meaning |
|---|---|
| **List** | A single checklist. Appears on the Home roster, in the sidebar, and (when open) as a top tab. |
| **Item** | One single-line, checkable entry within a List. |
| **Active area** | The working region of a List, holding all not-yet-relocated items. |
| **Completed section** | A dedicated section at the bottom of a List that collects completed subtrees. |
| **Home tab** | The fixed leftmost tab; the full roster of all Lists (create/open from here). |
| **Sidebar** | The persistent left navigator listing every List by name. |
| **Ribbon** | The OnlyOffice-style top toolbar (Home tab) with functional action buttons. |

---

## 4. Application Shell / Layout

### 4.1 Left sidebar
- Always visible; persistent quick-switcher listing **all** Lists by name.
- Clicking a List opens/jumps to it without needing to return to the Home tab.
- **New List** and **Settings** buttons are pinned at the **bottom** of the sidebar.

### 4.2 Home tab
- The fixed **leftmost** tab; can never be closed.
- The full roster of every List — the place to create and open Lists.

### 4.3 Top tabs
- Opening a List adds it as a **persistent tab** along the top.
- Multiple Lists can be open at once; switch by clicking tabs.
- **Session restore:** on relaunch, the app reopens the tabs that were open in the last
  session, including which tab was active.

### 4.4 Ribbon
- **Functional**, not decorative. A single **Home** ribbon tab holds action buttons that
  mirror the real operations:
  - New item
  - Indent / Outdent
  - Move up / Move down
  - Delete
  - Clear completed
  - Rename List / Delete List

---

## 5. Lists — Lifecycle

- **Create:** the **New List** button creates an **"Untitled"** List and immediately opens it
  as an active tab with an empty checklist, ready for the first item.
- **Rename:** via the ribbon **Rename** button **or** by double-clicking the List name on its
  top tab or its sidebar entry (inline rename).
- **Delete:** available from either the List's top tab or its sidebar entry. Always
  confirmed. Deletes the List entirely.
- **Close:** removes the List's top tab but **keeps** its entry in the sidebar (close ≠
  delete).
- **Reorder:** one at a time via up/down moves (same feel as reordering items). There is a
  **single canonical order** shared by the top-tab row and the sidebar — reordering in one is
  reflected in the other.
- **Identity:** each List carries a **stable UUID** (assigned at creation, preserved across
  export/import). Lists are distinguished by this ID, never by name — duplicate names are fine.

---

## 6. Items & the Outline Model

### 6.1 Item basics
- Each item is a **single line of plain text** — no notes, no long-form detail.
- Every item has a **checkbox** at its start, including nested items.
- Every item carries a **stable UUID** (assigned at creation, preserved across export/import) —
  required for reliable, duplicate-free imports.

### 6.2 Building the outline (keyboard-driven)
Obsidian/Workflowy feel:
- **Enter** — create a new item.
- **Tab** — indent the item under the item above it.
- **Shift+Tab** — outdent.
- Type directly to fill in the text.

Nesting depth is arbitrary.

### 6.3 Editing
- **Single click** on an item's text makes that line editable inline.
- Clicking the **checkbox** only toggles completion (never enters edit mode).

### 6.4 Rearranging (Active area only)
- **Re-indent:** any active item can be re-indented with Tab/Shift+Tab at any time.
  Re-parenting via indent level is therefore allowed while active. Re-indenting a parent
  **moves its whole subtree** with it (standard outliner behavior).
- **Vertical reorder:** only **top-level parents** can be moved, one up/down step at a time,
  **clamped** at the top and bottom (reaching the top means it can only move down again, and
  vice versa). Sub-items are **not** reordered among their siblings.

### 6.5 Collapse / expand
- Parents that have children show a **disclosure triangle** to hide/show their subtree.
- Collapse state is **not persisted**: every List opens **fully expanded**.

---

## 7. Completion Model

### 7.1 Parent gating
- A parent with any incomplete child shows a **grayed-out (disabled) checkbox** and cannot be
  completed until **all** its children are complete.

### 7.2 Completion is always deliberate
- When the last child of a parent is checked, the parent merely **un-grays** (becomes
  checkable). It does **not** auto-check and does **not** auto-roll-up.
- Nothing moves to Completed until the user **explicitly checks the top parent**.

### 7.3 Relocation to Completed
- An item reaches the Completed section only when its **topmost parent** is completed.
- At that point the **entire subtree** relocates together into Completed, with its indented
  structure intact.
- A top-level item with **no children** is its own topmost parent, so checking it sends it
  straight to Completed.

### 7.4 The Completed section
- **Always visible** at the bottom of the List, but **collapsed by default**.
- Can be expanded to view/manage completed items; **auto-collapses again** on any action in
  the Active area.
- Newly completed subtrees are **appended at the bottom** (order = completion order).
- **Not a permanent archive:** items can be cleared/deleted from it (deletions confirmed).

### 7.5 Reversal (uncheck)
- Unchecking a completed root **pulls the entire subtree back** into the Active area.
- Every item in the returned subtree is **reset to incomplete**. (Because children come back
  unchecked, the root re-grays automatically — no special handling needed.)

---

## 8. Keyboard & Interaction Reference

**Building / editing**
| Input | Action |
|---|---|
| Enter | New item |
| Tab | Indent under item above |
| Shift+Tab | Outdent |
| Single click on text | Edit line inline |
| Single click on checkbox | Toggle completion |
| Double click tab / sidebar name | Rename List |

**Focused-item shortcuts**
| Input | Action |
|---|---|
| Space | Toggle complete on focused item (no effect on a grayed parent) |
| Delete | Delete focused item (fires confirmation) |
| Alt+↑ / Alt+↓ | Move a focused **top-level parent** up/down |
| ↑ / ↓ | Move focus between items |

---

## 9. Settings

Reached via the Settings button pinned at the bottom of the sidebar. Contains:

- **Theme:** light / dark toggle.
- **UI scale / font size.**
- **Per-area fonts:** ability to choose different fonts for different regions of the app
  (e.g., sidebar vs ribbon vs list items).
- **Data:** export / import (manual backup of all Lists).

---

## 10. Data & Persistence

### 10.1 Storage
- Persistence uses **IndexedDB**, accessed through the **`idb`** wrapper.
- It sits behind a small storage module exposing **`load()`** and **`save(state)`**, so the
  rest of the app is backend-agnostic (swapping the backend later is a one-file change).
- Persisted state includes: all Lists and their full item trees (each with UUIDs), completion
  state, the canonical List order, and the last session's open tabs + active tab.
- **Not** persisted: per-item collapse/expand state (opens fully expanded each time).

### 10.2 Export
- Exports the entire in-memory state to a single **JSON file** the user downloads.
- The file includes a **schema/version field** so future format changes don't break older
  backups.
- Export reads the in-memory state object and is independent of the storage backend.

### 10.3 Import — merge by ID (upsert)
- Import reads a chosen JSON file, validates it (including the version field), then merges by
  **UUID**:
  - If a List/item UUID in the file **already exists**, it is **overwritten** — the imported
    file wins on ID match.
  - If a UUID **does not exist**, it is **added**.
- This keeps imports **duplicate-free** and lets the user combine data from the work laptop and
  home machine into one set. Existing Lists/items not present in the file are left untouched.
- Because storage is per-browser per-machine and there is no sync, this export → import flow is
  the intended way to move or reconcile data between the two machines.

---

## 11. Assumptions & Design-Time Details

These follow from the requirements above but were not each explicitly decided; sensible
defaults are proposed. Flag any you want changed.

- **Deletions never have undo** — the always-on confirmation prompt is the safeguard instead.
- **"Clear completed"** clears **all** completed items in the *current* List, and is confirmed
  (it is a bulk delete).
- **Clicking a grayed parent checkbox** does nothing (no error, no partial complete).
- **No multi-select** — operations act on one item at a time.
- **No drag-and-drop** — structure changes are via Tab/Shift+Tab and up/down moves only.
- **Long item text** wraps within its line rather than truncating (final call at design time).
- **Empty states** (no Lists on Home, a brand-new empty List, an empty Completed section) get
  simple placeholder hints — exact copy/visuals decided at design time.
- **Duplicate List names** are permitted (Lists are distinguished by identity, not name).

---

## 12. Tech Stack (finalized)

- **UI framework:** React, built/served with **Vite** — a local Node dev server, which is
  permitted on the restricted work laptop (no packaged executable involved).
- **Delivery:** a browser-served web app on both the work laptop and the home machine.
  Optionally **PWA-installable** for an app-like standalone window, if the work laptop's
  browser policy allows — still no executable install.
- **Persistence:** IndexedDB via `idb`, behind the `load()/save()` abstraction (see §10).
- **State architecture:** a **single in-memory source of truth** (the tree + app state) that
  the UI renders from — no scattered or ad-hoc DOM mutation.
- **Ruled out:** PySide6/Qt (QSS styling effort plus the packaged-executable restriction) and
  SQLite (overkill for small text data; browser-side WASM persistence adds complexity for no
  benefit here).
- **Build:** the whole app is built in one pass with Claude Code once this spec is approved.
