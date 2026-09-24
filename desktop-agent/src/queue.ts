import path from "node:path";
import Database from "better-sqlite3";
import { getConfigDir, ensureConfigDir } from "./config.js";

/**
 * `eventType` distinguishes ordinary app-session rows from the inferred
 * power-state events added in the V5.1 pass (see powerEvents.ts). Existing
 * rows/writers that don't pass an eventType default to 'APP_SESSION' so V5.0
 * behavior is unchanged. `detectionMethod` is only ever set to 'INFERRED' for
 * the power events - real app-session rows leave it null.
 */
export type EventType = "APP_SESSION" | "SLEEP" | "WAKE" | "LOCK" | "UNLOCK";

export interface QueueRow {
  id: number;
  occurredAt: string;
  appName: string;
  windowTitle: string | null;
  isIdle: number;
  durationSeconds: number;
  syncStatus: string;
  createdAt: string;
  eventType: EventType;
  detectionMethod: string | null;
}

export interface NewEventRow {
  occurredAt: string;
  appName: string;
  windowTitle: string | null;
  isIdle: boolean;
  durationSeconds: number;
  eventType?: EventType;
  detectionMethod?: string | null;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  ensureConfigDir();
  const dbPath = path.join(getConfigDir(), "queue.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurredAt TEXT NOT NULL,
      appName TEXT NOT NULL,
      windowTitle TEXT,
      isIdle INTEGER NOT NULL DEFAULT 0,
      durationSeconds INTEGER NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'QUEUED',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_syncStatus ON events(syncStatus);`);
  migrateSchema(db);
  return db;
}

/**
 * Additive schema migration for queue.db files created by older (V5.0)
 * builds of the agent, which predate the eventType/detectionMethod columns.
 * Rather than requiring users to delete ~/.focusos/queue.db on upgrade, we
 * detect missing columns and ALTER TABLE them in, defaulting existing rows
 * to eventType='APP_SESSION' (which is exactly what they were). This is
 * wrapped defensively so a queue.db in an unexpected shape never crashes
 * the agent on startup.
 */
function migrateSchema(database: Database.Database): void {
  try {
    const columns = database.prepare(`PRAGMA table_info(events)`).all() as { name: string }[];
    const columnNames = new Set(columns.map((c) => c.name));
    if (!columnNames.has("eventType")) {
      database.exec(`ALTER TABLE events ADD COLUMN eventType TEXT NOT NULL DEFAULT 'APP_SESSION'`);
    }
    if (!columnNames.has("detectionMethod")) {
      database.exec(`ALTER TABLE events ADD COLUMN detectionMethod TEXT`);
    }
  } catch (err) {
    // Never crash the agent over a migration issue on a pre-existing local
    // queue file - worst case, new rows still insert fine since better-sqlite3
    // will surface a clear error at insert time if the column truly is missing.
    console.error(`[focusos-agent] queue.db schema migration warning: ${String(err)}`);
  }
}

export function enqueue(row: NewEventRow): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO events (occurredAt, appName, windowTitle, isIdle, durationSeconds, syncStatus, eventType, detectionMethod)
    VALUES (@occurredAt, @appName, @windowTitle, @isIdle, @durationSeconds, 'QUEUED', @eventType, @detectionMethod)
  `);
  const result = stmt.run({
    occurredAt: row.occurredAt,
    appName: row.appName,
    windowTitle: row.windowTitle,
    isIdle: row.isIdle ? 1 : 0,
    durationSeconds: row.durationSeconds,
    eventType: row.eventType ?? "APP_SESSION",
    detectionMethod: row.detectionMethod ?? null,
  });
  return Number(result.lastInsertRowid);
}

export function getQueuedBatch(limit: number): QueueRow[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM events WHERE syncStatus = 'QUEUED' ORDER BY id ASC LIMIT ?
  `);
  return stmt.all(limit) as QueueRow[];
}

export function markSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const database = getDb();
  const placeholders = ids.map(() => "?").join(",");
  database.prepare(`DELETE FROM events WHERE id IN (${placeholders})`).run(...ids);
}

export function markFailed(ids: number[]): void {
  if (ids.length === 0) return;
  const database = getDb();
  const placeholders = ids.map(() => "?").join(",");
  database
    .prepare(`UPDATE events SET syncStatus = 'QUEUED' WHERE id IN (${placeholders})`)
    .run(...ids);
}

export function countQueued(): number {
  const database = getDb();
  const row = database
    .prepare(`SELECT COUNT(*) as count FROM events WHERE syncStatus = 'QUEUED'`)
    .get() as { count: number };
  return row.count;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
