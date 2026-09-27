# Coursework — a personal assignment tracker

A lean, local-only desktop app: classes → assignments → due dates, with a
calendar view and a checklist view. Everything is stored in a SQLite file on
your own machine (`tracker.db`, inside the app's local data folder) — no
accounts, no network, no browser tab.

Built with **Tauri 2** (Rust shell + native window) and **React + TypeScript**
for the UI, so the same codebase produces a Windows `.exe`/installer now and a
macOS `.app`/`.dmg` later.

---

## One-time setup (do this once per machine)

You need three things installed: **Node.js**, **Rust**, and the Tauri
platform prerequisites.

### On Windows

1. **Node.js** — install the LTS version from https://nodejs.org.
2. **Rust** — install via https://rustup.rs (run the installer, accept
   defaults).
3. **Microsoft C++ Build Tools** — Tauri needs these to compile the native
   shell. Install "Desktop development with C++" via the
   [Visual Studio Build Tools installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
4. **WebView2** — almost certainly already installed (it ships with Windows
   10/11 and Edge). If not, Tauri's docs link the installer.

Restart your terminal after installing so `node`, `npm`, and `cargo` are all
on PATH.

### On macOS (later, when you move to Mac)

1. Install **Xcode Command Line Tools**: `xcode-select --install`
2. Install **Rust**: https://rustup.rs
3. Install **Node.js** (via https://nodejs.org, or `brew install node`)

No other setup needed — the same project folder works unchanged.

---

## Running it

From inside this project folder:

```bash
npm install        # first time only — installs frontend dependencies
npm run tauri dev  # launches the app in dev mode with hot reload
```

The first `tauri dev` will take a few minutes as Rust compiles the native
shell. After that, startup is fast, and editing files in `src/` hot-reloads
instantly.

## Building a real installer

```bash
npm run tauri build
```

This produces a native installer:
- **Windows**: `.msi` and `.exe` installers under
  `src-tauri/target/release/bundle/`
- **macOS**: `.app` and `.dmg` under the same path, when built on a Mac

Install it like any normal application — it'll show up in your Start Menu /
Applications folder as **Coursework**, launches in its own window, and
doesn't touch a browser at all.

---

## How the data is organized

- **Classes**: name, color (used throughout the UI), optional term.
- **Assignments**: belong to one class, with a title, optional due date, a
  status (Not started / In progress / Done), a free-text **details** field
  for the assignment specs, and a separate **progress notes** field for
  "where I left off / what's left to do."

Both views (Checklist and Calendar) read from the same data — the checklist
groups by due date (Overdue / Today / Tomorrow / This week / Later / no due
date), and the calendar shows a normal month grid with a click-through day
panel. Double-clicking a day in the calendar adds a new assignment due that
day.

Everything lives in one SQLite file, so backing up your data is just copying
that file. To find it: it's wherever Tauri's app-local-data directory is for
your OS — on Windows that's typically
`%APPDATA%\com.personal.coursework-tracker\`.

## Project layout

```
src/                 React frontend
  components/        Sidebar, CalendarView, ChecklistView, modals
  db.ts              All SQLite queries (the only file that talks to the DB)
  dateUtils.ts        Date/bucket/calendar-grid helpers
  types.ts           Shared TypeScript types + class color palette
src-tauri/           Rust shell
  src/main.rs        Registers the SQLite plugin + table migrations
  tauri.conf.json    Window size, app identifier, bundle icon config
  capabilities/      Permission grants for the SQLite plugin
```

## Extending it later

Some natural next steps, all straightforward additions to this structure:
- Recurring assignments (e.g. weekly readings)
- A "week" calendar view alongside the month view
- Export/import (e.g. dump to JSON, or import from an actual Canvas .ics feed)
- Notifications/reminders as a due date approaches
