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

## Sleep/wake and lock/unlock - inferred, not real OS events

`src/powerEvents.ts` adds four more event types to the local queue and sync
payload: `SLEEP`, `WAKE`, `LOCK`, `UNLOCK`. **None of these come from a real
OS power/lock hook** - Node has no risk-free, cross-platform way to get one
without adding native bindings per platform (macOS `IOKit`, Windows
`WM_POWERBROADCAST`, Linux `systemd-logind` DBus), so this agent doesn't. All
four are inferred from behavior the agent already observes, and every one of
them is tagged `detectionMethod: 'INFERRED'` all the way through - local
queue row, sync payload, and (per the backend's schema) the resulting
`UnifiedEvent.metadataJson`.

- **SLEEP/WAKE**: the tracker polls the active window every
  `pollIntervalMs` (default 5s). While the machine is asleep, `setInterval`
  doesn't fire, so the next successful poll after waking lands much later
  than expected. If the gap between two consecutive successful polls is
  more than 2x the configured poll interval, we emit a `SLEEP` event dated
  at the last successful poll (with `durationSeconds` = the gap length) and
  a `WAKE` event dated at the new poll (`durationSeconds: 0`). This can
  also false-positive on anything else that stalls the process for a while
  (thermal throttling, a blocked event loop) - it's "the agent stopped
  being scheduled," not a verified sleep/wake syscall.
- **LOCK/UNLOCK**: reuses the idle-signature tracking already described
  below. If the active app/window signature stays unchanged for 2x the
  normal idle threshold (default 120s, so 240s), we infer the screen was
  locked and emit `LOCK`; when the signature changes again, we emit
  `UNLOCK`. This is a proxy, not real lock-state detection - a user who
  steps away without locking will eventually be flagged "locked" too, and
  the inferred `LOCK` timestamp is necessarily later than a real lock event
  would be (it can only fire once the threshold has been crossed).

These thresholds are defined in `src/powerEvents.ts` (`SleepWakeTracker`,
`LockProxyTracker`) if you want to tune them.

## Privacy settings - client-side best-effort, server-side authoritative

`src/settings.ts` fetches `GET {apiBase}/v5/desktop/settings` on startup and
every 5 minutes, caching `collectWindowTitles`, `collectAppNames`,
`excludedApplications`, and `excludedWindowPatterns` in memory.
`tracker.ts` consults this cache before enqueueing each session row:

- If the active app matches `excludedApplications`, or the window title
  contains any `excludedWindowPatterns` substring, the row is dropped
  entirely (never written to the local queue).
- If `collectWindowTitles` is `false`, the window title is omitted.
- If `collectAppNames` is `false`, the app name is replaced with `"Unknown"`.

**This is bandwidth-saving/defense-in-depth only - it is not the source of
truth.** The backend enforces these same settings server-side (redacting or
dropping data at sync time, per `desktopAgent.service.ts`), independent of
what this agent does locally. If the settings endpoint is unreachable,
returns an error, or doesn't exist yet, the agent logs a note once and
**fails open** - it keeps tracking normally with permissive defaults rather
than crashing or silently going dark.

One known gap worth flagging explicitly: this agent is an unattended
background process and only ever holds a per-device `syncToken` (see
"Pair with your FocusOS account" below), never a user JWT. The settings
fetch reuses that same `X-Sync-Token` header. If the backend's settings
route turns out to require a JWT instead, this fetch will simply get a 401
and fall back to defaults per the fail-open behavior above - client-side
filtering would then effectively be a no-op until that's reconciled, but
server-side enforcement is unaffected either way.

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
  in-flight) events. Rows carry an `eventType` (`APP_SESSION` by default, or
  `SLEEP`/`WAKE`/`LOCK`/`UNLOCK` for the inferred power events above) and an
  optional `detectionMethod`. If you have a `queue.db` from before this
  version, the agent detects the missing columns on startup and adds them
  automatically (`ALTER TABLE`) - you don't need to delete it, and existing
  queued rows are treated as `APP_SESSION`, which is what they always were.

Edit `pollIntervalMs` / `syncIntervalMs` in `config.json` directly if you
want different polling/sync cadences; defaults are 5s poll / 30s sync.

## Build

```bash
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```
