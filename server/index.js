// GatePass backend: Node built-ins only (http + node:sqlite). No npm install needed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3001);
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'gatepass.db');
const TICKET_TYPES = ['General Admission', 'VIP', 'Speaker', 'Sponsor', 'Press'];
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'));

// ---------- Database ----------
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const DEMO_ID = 'evt_techconnect_2026';
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

const hasTable = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
const tableCols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);

// Databases from the single-event version: keep their data, attach it to the demo event.
const migrating = hasTable('attendees') && !tableCols('attendees').includes('event_id');
if (migrating) db.exec('ALTER TABLE attendees RENAME TO attendees_old;');
if (hasTable('logs') && !tableCols('logs').includes('event_id')) db.exec('ALTER TABLE logs ADD COLUMN event_id TEXT;');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    venue TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attendees (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    phone TEXT DEFAULT '',
    ticket_type TEXT NOT NULL,
    company TEXT DEFAULT '',
    pass_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    checked_in INTEGER NOT NULL DEFAULT 0,
    checked_in_at TEXT,
    gate TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    user_id TEXT,
    UNIQUE (event_id, email)
  );
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    pass_code TEXT,
    attendee_name TEXT,
    ticket_type TEXT,
    status TEXT NOT NULL,
    gate TEXT,
    scanned_at TEXT NOT NULL,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager','guest')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_logs_time ON logs(scanned_at DESC);
  CREATE INDEX IF NOT EXISTS idx_att_event ON attendees(event_id);
`);

if (!tableCols('attendees').includes('user_id')) db.exec('ALTER TABLE attendees ADD COLUMN user_id TEXT;');

const nowStr = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
const uid = (p) => `${p}_${crypto.randomBytes(6).toString('hex')}`;

function ensureDemoEvent() {
  db.prepare(`INSERT OR IGNORE INTO events (id,code,name,venue,event_date,event_time,description,created_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(DEMO_ID, 'TC26', 'TechConnect 2026',
    'Metropolitan Convention Center, Hall B & Grand Ballroom', '2026-10-24', '08:30',
    'Annual Global Developer & Systems Architecture Summit (demo event)', new Date().toISOString());
}

// Restores the demo event and its 18 attendees. Other events are untouched.
function seedDemoData() {
  ensureDemoEvent();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM attendees WHERE event_id = ?').run(DEMO_ID);
    db.prepare('DELETE FROM logs WHERE event_id = ?').run(DEMO_ID);
    const a = db.prepare(`INSERT INTO attendees
      (id,event_id,name,email,phone,ticket_type,company,pass_code,checked_in,checked_in_at,gate,notes,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const x of seed.attendees)
      a.run(x.id, DEMO_ID, x.name, x.email, x.phone || '', x.ticket_type, x.company || '', x.pass_code,
        x.checked_in, x.checked_in_at, x.gate, x.notes || '', nowStr());
    const l = db.prepare(`INSERT INTO logs (id,event_id,pass_code,attendee_name,ticket_type,status,gate,scanned_at,notes)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    for (const x of seed.logs)
      l.run(x.id, DEMO_ID, x.pass_code, x.attendee_name, x.ticket_type, x.status, x.gate, x.scanned_at, x.notes);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

if (db.prepare('PRAGMA user_version').get().user_version < 2) {
  if (migrating) {
    ensureDemoEvent();
    db.prepare(`INSERT INTO attendees (id,event_id,name,email,phone,ticket_type,company,pass_code,checked_in,checked_in_at,gate,notes,created_at)
      SELECT id,?,name,email,phone,ticket_type,company,pass_code,checked_in,checked_in_at,gate,notes,created_at FROM attendees_old`).run(DEMO_ID);
    db.exec('DROP TABLE attendees_old');
    db.prepare('UPDATE logs SET event_id = ? WHERE event_id IS NULL').run(DEMO_ID);
  } else if (db.prepare('SELECT COUNT(*) AS n FROM attendees').get().n === 0) {
    seedDemoData(); // brand-new database
  }
  db.exec('PRAGMA user_version = 2');
}

const addLog = (eventId, passCode, name, tier, status, gate, notes) =>
  db.prepare(`INSERT INTO logs (id,event_id,pass_code,attendee_name,ticket_type,status,gate,scanned_at,notes)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(uid('log'), eventId || null, passCode, name, tier, status, gate, nowStr(), notes);

const findAttendee = (id) => db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
const EVENT_SQL = `SELECT e.*,
  (SELECT COUNT(*) FROM attendees a WHERE a.event_id = e.id) AS attendee_count,
  (SELECT COALESCE(SUM(checked_in),0) FROM attendees a WHERE a.event_id = e.id) AS checked_in_count
  FROM events e`;
const findEvent = (id) => db.prepare(`${EVENT_SQL} WHERE e.id = ?`).get(id);
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

function newPassCode(eventCode) {
  for (;;) {
    const c = `GP-${eventCode}-` + crypto.randomBytes(4).toString('hex').substring(0, 5).toUpperCase();
    if (!db.prepare('SELECT 1 FROM attendees WHERE pass_code = ?').get(c)) return c;
  }
}
function newEventCode() {
  for (;;) {
    const c = crypto.randomBytes(3).toString('hex').substring(0, 4).toUpperCase();
    if (!db.prepare('SELECT 1 FROM events WHERE code = ?').get(c)) return c;
  }
}

// ---------- API handlers ----------
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// ---------- Auth ----------
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + (await scrypt(pw, salt)).toString('hex');
}
const DUMMY_HASH = crypto.randomBytes(16).toString('hex') + ':' + crypto.randomBytes(64).toString('hex');
async function verifyPassword(pw, stored) {
  const [saltHex, keyHex] = String(stored).split(':');
  const key = await scrypt(pw, Buffer.from(saltHex, 'hex'));
  const expected = Buffer.from(keyHex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

const SESSION_DAYS = 7;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionUser(req) {
  const token = parseCookies(req).gp_session;
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha(token), new Date().toISOString()) || null;
}
function cookieHeader(req, token, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1';
  return `gp_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function startSession(req, userId) {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(sha(token), userId, expires);
  return cookieHeader(req, token, SESSION_DAYS * 86400);
}

// Slow down password guessing: 10 failures per 15 minutes per IP + email.
const attempts = new Map();
const attemptKey = (req, email) => `${req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress}|${email}`;
function checkRate(key) {
  const a = attempts.get(key);
  if (a && Date.now() - a.first > 15 * 60_000) attempts.delete(key);
  if ((attempts.get(key)?.count || 0) >= 10) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
}
function recordFailure(key) {
  const a = attempts.get(key) || { count: 0, first: Date.now() };
  a.count++; attempts.set(key, a);
}

function validateAccount(b) {
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), password = String(b.password ?? '');
  if (!name) throw new HttpError(400, 'Name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'A valid email is required.');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  if (password.length > 200) throw new HttpError(400, 'Password is too long.');
  return { name, email, password };
}
const managerExists = () => !!db.prepare("SELECT 1 FROM users WHERE role = 'manager'").get();

async function createAccount(req, b, role) {
  const v = validateAccount(b);
  const hash = await hashPassword(v.password);
  const id = uid('usr');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (role === 'manager' && managerExists()) throw new HttpError(403, 'Setup is already complete.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(v.email)) throw new HttpError(409, 'An account with this email already exists.');
    db.prepare('INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)')
      .run(id, v.name, v.email, hash, role, new Date().toISOString());
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return { status: 201, __raw: true, body: { user: publicUser(user) }, headers: { 'Set-Cookie': startSession(req, id) } };
}

async function login(req, b) {
  const email = clean(b.email, 200).toLowerCase(), password = String(b.password ?? '').slice(0, 200);
  const key = attemptKey(req, email);
  checkRate(key);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) { recordFailure(key); throw new HttpError(401, 'Invalid email or password.'); }
  if (b.as && b.as !== user.role)
    throw new HttpError(403, user.role === 'manager'
      ? 'This is an event manager account. Use the Event Manager login.'
      : 'This is a guest account. Use the Guest login.');
  attempts.delete(key);
  return { __raw: true, status: 200, body: { user: publicUser(user) }, headers: { 'Set-Cookie': startSession(req, user.id) } };
}

function validateEvent(b) {
  const name = clean(b.name, 120), venue = clean(b.venue, 200);
  const event_date = clean(b.event_date, 10), event_time = clean(b.event_time, 5);
  if (!name) throw new HttpError(400, 'Event name is required.');
  if (!venue) throw new HttpError(400, 'Event venue is required.');
  const d = /^\d{4}-\d{2}-\d{2}$/.test(event_date) ? new Date(event_date + 'T00:00:00Z') : null;
  if (!d || isNaN(d) || d.toISOString().slice(0, 10) !== event_date) throw new HttpError(400, 'A valid event date is required.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event_time)) throw new HttpError(400, 'A valid event time is required.');
  return { name, venue, event_date, event_time, description: clean(b.description, 300) };
}

function validateAttendee(b, eventId, excludeId) {
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase();
  if (!name) throw new HttpError(400, 'Name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Valid email is required.');
  const ticket_type = TICKET_TYPES.includes(b.ticket_type) ? b.ticket_type : 'General Admission';
  const dup = db.prepare('SELECT id,name FROM attendees WHERE event_id = ? AND email = ? AND id != ?').get(eventId, email, excludeId || '');
  if (dup) throw new HttpError(409, `An attendee with email "${email}" is already registered for this event (${dup.name}).`);
  return { name, email, ticket_type, company: clean(b.company), phone: clean(b.phone, 40), notes: clean(b.notes, 500) };
}

function checkIn(body) {
  let code = clean(body.code, 500);
  const gate = clean(body.gate, 60) || 'Main Gate A';
  const eventId = clean(body.event_id, 60);
  if (eventId && !findEvent(eventId)) throw new HttpError(400, 'Unknown event.');
  if (!code) return { success: false, status: 'INVALID', message: 'No pass code provided.' };
  if (code.startsWith('{') && code.endsWith('}')) {
    try { const p = JSON.parse(code); code = clean(p.passCode || p.code || code, 500); } catch { /* keep raw */ }
  }
  // BEGIN IMMEDIATE takes the write lock up front, so two scanners can never admit the same pass.
  db.exec('BEGIN IMMEDIATE');
  try {
    const m = db.prepare(`SELECT * FROM attendees WHERE (pass_code = ? OR id = ?) ${eventId ? 'AND event_id = ?' : ''}`)
      .get(...(eventId ? [code, code, eventId] : [code, code]));
    let result;
    if (!m) {
      const other = eventId && db.prepare('SELECT 1 FROM attendees WHERE pass_code = ?').get(code);
      addLog(eventId, code, 'Unrecognized', 'N/A', 'INVALID', gate,
        other ? 'Pass belongs to a different event' : 'Pass code not recognized in system');
      result = { success: false, status: 'INVALID', passCode: code,
        message: other ? 'Invalid pass: This pass was issued for a different event.'
          : 'Invalid pass: Pass code was not recognized in the event roster.' };
    } else if (m.checked_in === 1) {
      addLog(m.event_id, m.pass_code, m.name, m.ticket_type, 'ALREADY_CHECKED_IN', gate,
        `Duplicate scan rejected. Original entry recorded at ${m.checked_in_at || 'earlier'}`);
      result = { success: false, status: 'ALREADY_CHECKED_IN', attendee: m,
        previousCheckInTime: m.checked_in_at, previousGate: m.gate || gate,
        message: `Warning: This pass has already been used at ${m.checked_in_at || 'earlier time'}.` };
    } else {
      const ts = nowStr();
      db.prepare('UPDATE attendees SET checked_in = 1, checked_in_at = ?, gate = ? WHERE id = ?').run(ts, gate, m.id);
      addLog(m.event_id, m.pass_code, m.name, m.ticket_type, 'SUCCESS', gate, 'Valid pass verified');
      result = { success: true, status: 'SUCCESS', attendee: findAttendee(m.id), checkInTime: ts,
        message: `Check-in confirmed for ${m.name} (${m.ticket_type}).` };
    }
    db.exec('COMMIT');
    return result;
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

function csv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

async function route(req, url, body) {
  const m = req.method, p = url.pathname;
  const evt = url.searchParams.get('event') || '';
  const where = evt ? 'WHERE event_id = ?' : '';
  const args = evt ? [evt] : [];
  let r;
  if (m === 'GET' && p === '/api/health') return { ok: true, time: nowStr() };

  // --- auth (public) ---
  if (m === 'GET' && p === '/api/auth/me') return { user: req.user ? publicUser(req.user) : null, setupRequired: !managerExists() };
  if (m === 'POST' && p === '/api/auth/login') return login(req, body);
  if (m === 'POST' && p === '/api/auth/signup') return createAccount(req, body, 'guest'); // role is never read from the request
  if (m === 'POST' && p === '/api/auth/setup') return createAccount(req, body, 'manager'); // only works until the first manager exists
  if (m === 'POST' && p === '/api/auth/logout') {
    const t = parseCookies(req).gp_session;
    if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t));
    return { __raw: true, status: 200, body: { ok: true }, headers: { 'Set-Cookie': cookieHeader(req, '', 0) } };
  }

  // --- guest self-service ---
  if (m === 'GET' && p === '/api/guest/passes')
    return db.prepare(`SELECT a.id, a.name, a.email, a.phone, a.company, a.ticket_type, a.pass_code, a.checked_in, a.event_id,
        e.name AS event_name, e.venue, e.event_date, e.event_time
      FROM attendees a JOIN events e ON e.id = a.event_id WHERE a.user_id = ? ORDER BY e.event_date, e.event_time`).all(req.user.id);
  if (m === 'POST' && p === '/api/guest/register') {
    const ev = findEvent(clean(body.event_id, 60));
    if (!ev) throw new HttpError(400, 'Please choose an event.');
    const name = clean(body.name, 120);
    if (!name) throw new HttpError(400, 'Name is required.');
    if (db.prepare('SELECT 1 FROM attendees WHERE event_id = ? AND (user_id = ? OR email = ?)').get(ev.id, req.user.id, req.user.email))
      throw new HttpError(409, 'You are already registered for this event.');
    const id = uid('att'), pass = newPassCode(ev.code);
    // Guests always get a General Admission pass; only managers can change ticket tiers.
    db.prepare(`INSERT INTO attendees (id,event_id,name,email,phone,ticket_type,company,pass_code,notes,created_at,user_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, ev.id, name, req.user.email, clean(body.phone, 40), 'General Admission',
      clean(body.company), pass, '', new Date().toISOString(), req.user.id);
    return { status: 201, body: { id, event_id: ev.id, event_name: ev.name, venue: ev.venue, event_date: ev.event_date,
      event_time: ev.event_time, name, email: req.user.email, phone: clean(body.phone, 40), company: clean(body.company),
      ticket_type: 'General Admission', pass_code: pass, checked_in: 0 } };
  }

  // --- events ---
  if (m === 'GET' && p === '/api/events') {
    if (req.user.role !== 'manager') // guests see event details only, never attendance numbers
      return db.prepare('SELECT id,name,venue,event_date,event_time,description FROM events ORDER BY event_date, event_time, name').all();
    return db.prepare(`${EVENT_SQL} ORDER BY e.event_date, e.event_time, e.name`).all();
  }
  if (m === 'POST' && p === '/api/events') {
    const v = validateEvent(body);
    const id = uid('evt');
    db.prepare(`INSERT INTO events (id,code,name,venue,event_date,event_time,description,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, newEventCode(), v.name, v.venue, v.event_date, v.event_time, v.description, new Date().toISOString());
    return { status: 201, body: findEvent(id) };
  }
  if ((r = p.match(/^\/api\/events\/([\w-]+)$/))) {
    const e = findEvent(r[1]);
    if (!e) throw new HttpError(404, 'Event not found.');
    if (m === 'GET') return e;
    if (m === 'PUT') {
      const v = validateEvent({ ...e, ...body });
      db.prepare('UPDATE events SET name=?,venue=?,event_date=?,event_time=?,description=? WHERE id=?')
        .run(v.name, v.venue, v.event_date, v.event_time, v.description, e.id);
      return findEvent(e.id);
    }
    if (m === 'DELETE') {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM attendees WHERE event_id = ?').run(e.id);
        db.prepare('DELETE FROM logs WHERE event_id = ?').run(e.id);
        db.prepare('DELETE FROM events WHERE id = ?').run(e.id);
        db.exec('COMMIT');
      } catch (err) { db.exec('ROLLBACK'); throw err; }
      return { deleted: true };
    }
  }

  // --- attendees ---
  if (m === 'GET' && p === '/api/attendees')
    return db.prepare(`SELECT * FROM attendees ${where} ORDER BY created_at DESC, name`).all(...args);
  if (m === 'POST' && p === '/api/attendees') {
    const ev = findEvent(clean(body.event_id, 60));
    if (!ev) throw new HttpError(400, 'Create or select an event first.');
    const v = validateAttendee(body, ev.id);
    const id = uid('att'), pass = newPassCode(ev.code);
    db.prepare(`INSERT INTO attendees (id,event_id,name,email,phone,ticket_type,company,pass_code,notes,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, ev.id, v.name, v.email, v.phone, v.ticket_type, v.company, pass, v.notes, new Date().toISOString());
    return { status: 201, body: findAttendee(id) };
  }
  if ((r = p.match(/^\/api\/attendees\/([\w-]+)$/))) {
    const a = findAttendee(r[1]);
    if (!a) throw new HttpError(404, 'Attendee not found.');
    if (m === 'PUT') {
      const v = validateAttendee({ ...a, ...body }, a.event_id, a.id);
      db.prepare('UPDATE attendees SET name=?,email=?,phone=?,ticket_type=?,company=?,notes=? WHERE id=?')
        .run(v.name, v.email, v.phone, v.ticket_type, v.company, v.notes, a.id);
      return findAttendee(a.id);
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM attendees WHERE id = ?').run(a.id); return { deleted: true }; }
  }
  if (m === 'POST' && (r = p.match(/^\/api\/attendees\/([\w-]+)\/undo$/))) {
    const a = findAttendee(r[1]);
    if (!a) throw new HttpError(404, 'Attendee not found.');
    db.prepare('UPDATE attendees SET checked_in = 0, checked_in_at = NULL, gate = NULL WHERE id = ?').run(a.id);
    addLog(a.event_id, a.pass_code, a.name, a.ticket_type, 'REVERSED', 'Admin', 'Check-in reversed by operator');
    return findAttendee(a.id);
  }

  // --- check-in, logs, stats, exports ---
  if (m === 'POST' && p === '/api/checkin') return checkIn(body);
  if (m === 'GET' && p === '/api/logs')
    return db.prepare(`SELECT * FROM logs ${where} ORDER BY scanned_at DESC, rowid DESC LIMIT 1000`).all(...args);
  if (m === 'GET' && p === '/api/stats') {
    const t = db.prepare(`SELECT COUNT(*) total, COALESCE(SUM(checked_in),0) checkedIn FROM attendees ${where}`).get(...args);
    return { total: t.total, checkedIn: t.checkedIn, notArrived: t.total - t.checkedIn,
      attendanceRate: t.total ? Number(((t.checkedIn / t.total) * 100).toFixed(1)) : 0,
      byTier: db.prepare(`SELECT ticket_type ticketType, COUNT(*) total, SUM(checked_in) checkedIn FROM attendees ${where} GROUP BY ticket_type`).all(...args) };
  }
  if (m === 'POST' && p === '/api/reset') { seedDemoData(); return { reset: true }; }
  if (m === 'GET' && p === '/api/export/attendees.csv') {
    const rows = db.prepare(`SELECT * FROM attendees ${where} ORDER BY name`).all(...args).map((a) =>
      [a.id, a.name, a.email, a.phone, a.ticket_type, a.company, a.pass_code,
        a.checked_in ? 'Checked In' : 'Not Arrived', a.checked_in_at || 'N/A', a.gate || 'N/A']);
    return { csv: csv([['Attendee ID', 'Name', 'Email', 'Phone', 'Ticket Type', 'Company', 'Pass Code', 'Status', 'Check-In Time', 'Gate'], ...rows]), name: 'gatepass-attendees.csv' };
  }
  if (m === 'GET' && p === '/api/export/logs.csv') {
    const rows = db.prepare(`SELECT * FROM logs ${where} ORDER BY scanned_at DESC`).all(...args).map((l) =>
      [l.id, l.scanned_at, l.status, l.pass_code, l.attendee_name, l.ticket_type, l.gate, l.notes]);
    return { csv: csv([['Log ID', 'Timestamp', 'Status', 'Pass Code', 'Attendee', 'Ticket Type', 'Gate', 'Audit Notes'], ...rows]), name: 'gatepass-checkin-logs.csv' };
  }
  throw new HttpError(404, 'Not found.');
}

// ---------- HTTP plumbing ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 100_000) { reject(new HttpError(413, 'Body too large.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Invalid JSON.')); }
    });
    req.on('error', reject);
  });
}

const send = (res, status, data, headers = {}) => {
  const isStr = typeof data === 'string';
  res.writeHead(status, { 'Content-Type': isStr ? 'text/plain' : 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(isStr ? data : JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      req.user = sessionUser(req);
      const publicPaths = ['/api/health', '/api/auth/me', '/api/auth/login', '/api/auth/signup', '/api/auth/setup', '/api/auth/logout'];
      if (!publicPaths.includes(url.pathname)) {
        if (!req.user) throw new HttpError(401, 'Please sign in.');
        const guestAllowed = url.pathname.startsWith('/api/guest/') || (req.method === 'GET' && url.pathname === '/api/events');
        if (req.user.role !== 'manager' && !guestAllowed) throw new HttpError(403, 'Event manager access required.');
      }
      // CSRF defence: browsers cannot send JSON content-type cross-site without a CORS preflight, which we never allow.
      if (req.method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json'))
        throw new HttpError(415, 'Content-Type must be application/json.');
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
      const out = await route(req, url, body);
      if (out && out.csv !== undefined)
        return send(res, 200, out.csv, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${out.name}"` });
      if (out && out.__raw) return send(res, out.status, out.body, out.headers);
      if (out && out.status && out.body) return send(res, out.status, out.body);
      return send(res, 200, out);
    }
    // static files
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(ROOT, 'public', rel));
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
      return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Internal server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`GatePass running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
const shutdown = () => { server.close(); db.close(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
