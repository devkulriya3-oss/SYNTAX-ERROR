import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'gatepass.db');

export const db = new DatabaseSync(dbPath);

// Initialize database schema
export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      venue TEXT NOT NULL,
      date_str TEXT NOT NULL,
      doors_open TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      ticket_type TEXT NOT NULL DEFAULT 'General Admission',
      company TEXT,
      pass_code TEXT NOT NULL UNIQUE,
      checked_in INTEGER NOT NULL DEFAULT 0,
      checked_in_at TEXT,
      gate TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_event_email ON attendees (event_id, email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_pass_code ON attendees (pass_code);
    CREATE INDEX IF NOT EXISTS idx_attendees_event_status ON attendees (event_id, checked_in);

    CREATE TABLE IF NOT EXISTS check_in_logs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      attendee_id TEXT,
      pass_code TEXT NOT NULL,
      status TEXT NOT NULL, -- 'SUCCESS', 'ALREADY_CHECKED_IN', 'INVALID'
      gate TEXT NOT NULL DEFAULT 'Main Gate',
      operator TEXT NOT NULL DEFAULT 'Staff Terminal 1',
      notes TEXT,
      scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_logs_event ON check_in_logs (event_id, scanned_at DESC);
  `);

  console.log('[GatePass DB] Initialized SQLite schema successfully at', dbPath);
}

// Transaction helper
export function transaction<T>(callback: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
