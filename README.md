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
date). The calendar has a **Month** view (a normal month grid with a
click-through day panel) and a **Week** view (all 7 days shown in full, no
truncation). Double-clicking a day in either adds a new assignment due that
day.

## Syncing with D2L / Brightspace

**Automatic sync (recommended).** In D2L, open *Calendar*, click *Subscribe*,
and copy the link. In the app, click **D2L calendar sync** in the sidebar,
paste the link, and hit *Connect & sync*.

- The first sync asks you to match each D2L course to one of your classes
  (or create a new one, or ignore it). Those choices are remembered.
- After that, the app syncs every time it opens, and any time you press
  *Sync now*. New assignments appear; changed titles/due dates update.
- Your own work is never overwritten: status, details, and progress notes
  are left alone.
- If something disappears from the feed, it's flagged "No longer in D2L
  feed" in the checklist rather than deleted.
- The link is like a password (anyone with it can read your calendar). It's
  stored only in the app's local database on your computer.

**File import (fallback).** *Import .ics file* in the sidebar takes a
downloaded calendar file instead, with a review screen before anything is
written. Items imported this way are recognized by later syncs, so nothing
gets duplicated if you switch to the link afterward.

If auto-matching of course names looks off for your school's feed, send me
a sample (course names are enough) and I'll tune the parser.

## Sending this to someone on a Mac (without owning a Mac yourself)

You can't cross-compile a macOS app from Windows — Apple's build tools only
run on macOS. But you don't need to buy a Mac either: this project includes
a GitHub Actions workflow (`.github/workflows/build-macos.yml`) that builds
the macOS app on a free, temporary Mac that GitHub provides.

1. Push this project to a GitHub repository.
2. Open the repo's **Actions** tab, select **"Build macOS App"**, and click
   **Run workflow**. (It only runs when you trigger it manually — pushing
   commits won't kick it off, so you won't burn build minutes on every
   commit.)
3. Once it finishes (a few minutes), open the workflow run and download the
   **Coursework-macOS-installer** artifact — it's a `.dmg`.
4. Send that `.dmg` to the Mac user however you'd send any file (AirDrop,
   Google Drive, email). They open it and drag the app into Applications.

**One caveat:** since this isn't signed with a paid Apple Developer account,
Gatekeeper will show a warning the first time it's opened. The fix is a
one-time, non-technical step: **right-click the app → Open → Open** (instead
of double-clicking). After that first launch, it opens normally from then on.

## Building it yourself on your own Mac (later)

If you eventually have Mac access directly, you don't need any of the above
— just run `npm install && npm run tauri build` from the project folder like
you would on Windows, and the `.dmg`/`.app` show up under
`src-tauri/target/release/bundle/`.

## Extending it later

Some natural next steps, all straightforward additions to this structure:
- Recurring assignments (e.g. weekly readings)
- A "week" calendar view alongside the month view
- Export/import (e.g. dump to JSON, or import from an actual Canvas .ics feed)
- Notifications/reminders as a due date approaches
