import { Router, Request, Response } from 'express';
import { db, transaction } from '../db.js';
import crypto from 'node:crypto';

export const checkInRouter = Router();

// Helper to extract clean pass code from string, JSON, or URL
export function extractPassCode(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let trimmed = input.trim();

  // If input is JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.passCode) return String(parsed.passCode).trim();
      if (parsed.code) return String(parsed.code).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch {
      // not valid json, continue
    }
  }

  // If input is a URL (e.g. https://.../verify?code=GP-XXXX)
  if (trimmed.includes('?code=') || trimmed.includes('&code=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed}`);
      const code = url.searchParams.get('code');
      if (code) return code.trim();
    } catch {
      // ignore
    }
  }

  return trimmed;
}

// POST /api/check-in/verify - Preview / verify pass without marking checked-in
checkInRouter.post('/verify', (req: Request, res: Response) => {
  try {
    const rawInput = req.body.passCode || req.body.code || '';
    const eventId = req.body.eventId;
    const passCode = extractPassCode(rawInput);

    if (!passCode) {
      return res.status(400).json({
        success: false,
        status: 'INVALID',
        message: 'No pass code or QR payload provided.'
      });
    }

    // Look up attendee by pass_code or id (case-insensitive for convenience)
    let query = `
      SELECT a.*, e.name as event_name, e.venue, e.date_str
      FROM attendees a
      JOIN events e ON a.event_id = e.id
      WHERE (UPPER(a.pass_code) = UPPER(?) OR a.id = ?)
    `;
    const params: any[] = [passCode, passCode];

    if (eventId) {
      query += ` AND a.event_id = ?`;
      params.push(eventId);
    }

    const attendee = db.prepare(query).get(...params) as any;

    if (!attendee) {
      return res.json({
        success: false,
        status: 'INVALID',
        passCode,
        message: 'Invalid pass. Pass code not found in event roster.'
      });
    }

    if (attendee.checked_in === 1) {
      return res.json({
        success: false,
        status: 'ALREADY_CHECKED_IN',
        attendee,
        previousCheckInTime: attendee.checked_in_at,
        previousGate: attendee.gate || 'Main Gate',
        message: `Pass already checked in at ${attendee.checked_in_at || 'earlier time'}.`
      });
    }

    return res.json({
      success: true,
      status: 'VALID',
      attendee,
      message: 'Pass is valid and ready for check-in.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/check-in - ATOMIC check-in operation
checkInRouter.post('/', (req: Request, res: Response) => {
  const rawInput = req.body.passCode || req.body.code || '';
  const eventId = req.body.eventId || 'evt_techconnect_2026';
  const gate = req.body.gate || 'Main Gate';
  const operator = req.body.operator || 'Staff Terminal 1';
  const passCode = extractPassCode(rawInput);

  if (!passCode) {
    return res.status(400).json({
      success: false,
      status: 'INVALID',
      message: 'No pass code or QR payload provided.'
    });
  }

  try {
    const result = transaction(() => {
      // 1. Look up attendee inside transaction
      let query = `
        SELECT a.*, e.name as event_name, e.venue, e.date_str
        FROM attendees a
        JOIN events e ON a.event_id = e.id
        WHERE (UPPER(a.pass_code) = UPPER(?) OR a.id = ?)
      `;
      const params: any[] = [passCode, passCode];

      if (eventId) {
        query += ` AND a.event_id = ?`;
        params.push(eventId);
      }

      const attendee = db.prepare(query).get(...params) as any;

      const logId = 'log_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Case 1: Attendee not found -> INVALID
      if (!attendee) {
        db.prepare(`
          INSERT INTO check_in_logs (id, event_id, attendee_id, pass_code, status, gate, operator, notes, scanned_at)
          VALUES (?, ?, NULL, ?, 'INVALID', ?, ?, 'Pass code not found in records', ?)
        `).run(logId, eventId, passCode, gate, operator, now);

        return {
          statusCode: 200,
          body: {
            success: false,
            status: 'INVALID',
            passCode,
            message: 'Invalid pass: Pass code was not recognized in the system.'
          }
        };
      }

      // Case 2: Already checked in -> ALREADY_CHECKED_IN (Prevent duplicate check-in)
      if (attendee.checked_in === 1) {
        db.prepare(`
          INSERT INTO check_in_logs (id, event_id, attendee_id, pass_code, status, gate, operator, notes, scanned_at)
          VALUES (?, ?, ?, ?, 'ALREADY_CHECKED_IN', ?, ?, ?, ?)
        `).run(
          logId,
          attendee.event_id,
          attendee.id,
          attendee.pass_code,
          gate,
          operator,
          `Duplicate scan rejected. Original entry recorded at ${attendee.checked_in_at || 'earlier'} via ${attendee.gate || 'Main Gate'}`,
          now
        );

        return {
          statusCode: 200,
          body: {
            success: false,
            status: 'ALREADY_CHECKED_IN',
            attendee,
            previousCheckInTime: attendee.checked_in_at,
            previousGate: attendee.gate || 'Main Gate',
            message: `Warning: This pass has already been used at ${attendee.checked_in_at || 'earlier'} (${attendee.gate || 'Main Gate'}).`
          }
        };
      }

      // Case 3: Pass is valid and not checked in -> ATOMIC UPDATE
      const updateResult = db.prepare(`
        UPDATE attendees
        SET checked_in = 1, checked_in_at = ?, gate = ?
        WHERE id = ? AND checked_in = 0
      `).run(now, gate, attendee.id);

      // If another concurrent request just updated it first (defensive check)
      if (updateResult.changes === 0) {
        return {
          statusCode: 200,
          body: {
            success: false,
            status: 'ALREADY_CHECKED_IN',
            attendee,
            message: 'Pass was just checked in by another scanner.'
          }
        };
      }

      // Insert successful check-in log
      db.prepare(`
        INSERT INTO check_in_logs (id, event_id, attendee_id, pass_code, status, gate, operator, notes, scanned_at)
        VALUES (?, ?, ?, ?, 'SUCCESS', ?, ?, 'Valid pass check-in confirmed', ?)
      `).run(logId, attendee.event_id, attendee.id, attendee.pass_code, gate, operator, now);

      const updatedAttendee = db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendee.id) as any;

      return {
        statusCode: 200,
        body: {
          success: true,
          status: 'SUCCESS',
          attendee: updatedAttendee,
          checkInTime: now,
          gate,
          message: `Check-in confirmed for ${updatedAttendee.name} (${updatedAttendee.ticket_type}).`
        }
      };
    });

    res.status(result.statusCode).json(result.body);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/check-in/undo - Reverse accidental check-in
checkInRouter.post('/undo', (req: Request, res: Response) => {
  try {
    const { attendeeId } = req.body;
    if (!attendeeId) {
      return res.status(400).json({ success: false, error: 'attendeeId is required.' });
    }

    const attendee = db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendeeId) as any;
    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Attendee not found.' });
    }

    db.prepare(`
      UPDATE attendees
      SET checked_in = 0, checked_in_at = NULL, gate = NULL
      WHERE id = ?
    `).run(attendeeId);

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logId = 'log_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO check_in_logs (id, event_id, attendee_id, pass_code, status, gate, operator, notes, scanned_at)
      VALUES (?, ?, ?, ?, 'UNDO', 'Operations Desk', 'Staff', 'Check-in was reverted manually', ?)
    `).run(logId, attendee.event_id, attendee.id, attendee.pass_code, now);

    const updated = db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendeeId);

    res.json({
      success: true,
      message: `Check-in reverted for ${attendee.name}.`,
      attendee: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
