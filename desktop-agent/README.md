# FocusOS Desktop Companion

A lightweight, cross-platform (macOS / Windows / Linux) Node.js background
agent that tracks which application/window is active on your machine and
syncs that usage data to the FocusOS backend.

**This is a plain Node.js CLI process, not a code-signed native installer.**
There is no `.app`, `.exe`, `.dmg`, or menu-bar UI here - it's `npm install`
+ `npm start`, matching the honest scope of the rest of this project. If you
want it to run on login, wire it up with your OS's own tooling (e.g. a
`launchd` plist on macOS, Task Scheduler on Windows, or a `systemd --user`
unit on Linux) - that's outside what this package does for you.

## What it does

- Polls the active window every 5 seconds (`src/tracker.ts`) using
  [`active-win`](https://github.com/sindresorhus/active-win).
- Buckets consecutive polls of the same app+window into ~60s session rows.
- Infers idle time when the active app/window hasn't changed for a
  configurable threshold (default 120s) - see the "Idle detection" note
  below for why this is a heuristic, not a real OS idle API.
- Writes every session row to a local durable queue
  (`~/.focusos/queue.db`, SQLite via `better-sqlite3`) so nothing is lost
  if the network or backend is unavailable.
- Every 30 seconds, pushes up to 200 queued rows to the FocusOS backend. On
  failure it leaves the rows queued and backs off (5s -> 30s -> 120s cap)
  before retrying - it never drops data on a failed sync.

## OS permissions you may need

`active-win` needs OS-level permission to read window titles from other
applications:

- **macOS**: grant the terminal/process running this agent **Accessibility**
  access (System Settings -> Privacy & Security -> Accessibility), and
  **Screen Recording** access if you want real window titles (without it,
  titles come back empty but app names still work).
- **Windows**: no special permission is normally required.
- **Linux**: window title access depends on your window manager/compositor
  (X11 generally works; some Wayland compositors restrict this). If window
  titles aren't available, the agent still records the app name.

If permissions are missing, the agent does not crash - `active-win` simply
returns less detail (e.g. an empty title), which is passed through as-is.

## Idle detection - an honest limitation

There is no consistent, cross-platform "seconds since last input" API wired
up here. `active-win` does not reliably expose one either. Instead,
`src/idle.ts` infers idleness: if the active app/window signature hasn't
changed across the configured threshold (default 120s) of polling, the
current bucket is marked idle. This means a user who is actively reading
(no window switches, no detectable input) will eventually be flagged idle
even though they're present. This is a documented trade-off, not a bug -
we chose not to fabricate access to real OS idle APIs (e.g.
`IOKit`/`GetLastInputInfo`/`XScreenSaverQueryInfo`) that aren't wired up.

## Install

```bash
cd desktop-agent
npm install
```

Requires Node.js >= 18 (uses native `fetch`).

## Pair with your FocusOS account

You need a FocusOS JWT access token (from logging into the web app / API).

Non-interactive (good for scripting/CI):

```bash
npm run register -- --token=<jwt> --api-base=http://localhost:5000/api --name="My Laptop"
```

Interactive (prompts for anything not passed as a flag or env var):

```bash
npm run register
```

You can also supply the token via environment variables:

```bash
FOCUSOS_TOKEN=<jwt> FOCUSOS_API_BASE=http://localhost:5000/api npm run register
```

This calls `POST /api/v5/desktop/register` and saves the returned
`deviceId` + `syncToken` to `~/.focusos/config.json`. That token, not your
login JWT, is what's used for all future syncs.

## Run

```bash
npm start        # runs the built dist/index.js
# or, during development:
npm run dev       # tsx watch mode
```

If you haven't registered yet, the agent prints a message telling you to
run `npm run register` first and exits cleanly (no crash, no stack trace).

On start it begins polling the active window and syncing queued events in
the background. Press `Ctrl+C` (SIGINT) or send SIGTERM to stop it
gracefully - it finishes flushing the current bucket and closes the local
database cleanly.

## Configuration

All local state lives under `~/.focusos/`:

- `~/.focusos/config.json` - `{ apiBase, deviceId, syncToken, pollIntervalMs, syncIntervalMs }`
- `~/.focusos/queue.db` - SQLite queue of not-yet-synced (and briefly,
  in-flight) events.

Edit `pollIntervalMs` / `syncIntervalMs` in `config.json` directly if you
want different polling/sync cadences; defaults are 5s poll / 30s sync.

## Build

```bash
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```
