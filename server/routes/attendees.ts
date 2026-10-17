import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';

export const attendeesRouter = Router({ mergeParams: true });

function generatePassCode(eventPrefix = 'TC26'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GP-${eventPrefix}-${randomPart}`;
}

// GET /api/events/:id/attendees
attendeesRouter.get('/attendees', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const { search, status, ticketType, limit, offset } = req.query;

    let query = `
      SELECT * FROM attendees 
      WHERE event_id = ?
    `;
    const params: any[] = [eventId];

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (name LIKE ? OR email LIKE ? OR pass_code LIKE ? OR company LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (status && status !== 'all') {
      if (status === 'checked_in') {
        query += ` AND checked_in = 1`;
      } else if (status === 'not_arrived') {
        query += ` AND checked_in = 0`;
      }
    }

    if (ticketType && ticketType !== 'all') {
      query += ` AND ticket_type = ?`;
      params.push(ticketType);
    }

    query += ` ORDER BY checked_in DESC, created_at DESC`;

    if (limit && Number(limit) > 0) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset || 0));
    }

    const attendees = db.prepare(query).all(...params);
    res.json({ success: true, data: attendees, count: attendees.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/attendees - Register new attendee
attendeesRouter.post('/attendees', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const { name, email, phone, ticket_type, company, notes } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    // Check duplicate email for this event
    const existing = db.prepare('SELECT id, name FROM attendees WHERE event_id = ? AND LOWER(email) = ?').get(eventId, cleanEmail);
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: `An attendee with the email "${cleanEmail}" is already registered (${(existing as any).name}).` 
      });
    }

    // Generate unique ID and Pass Code
    const attendeeId = 'att_' + crypto.randomBytes(4).toString('hex');
    let passCode = generatePassCode();
    let collisionCheck = db.prepare('SELECT id FROM attendees WHERE pass_code = ?').get(passCode);
    while (collisionCheck) {
      passCode = generatePassCode();
      collisionCheck = db.prepare('SELECT id FROM attendees WHERE pass_code = ?').get(passCode);
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const insert = db.prepare(`
      INSERT INTO attendees (id, event_id, name, email, phone, ticket_type, company, pass_code, checked_in, checked_in_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
    `);

    insert.run(
      attendeeId,
      eventId,
      name.trim(),
      cleanEmail,
      phone ? phone.trim() : null,
      ticket_type || 'General Admission',
      company ? company.trim() : null,
      passCode,
      notes ? notes.trim() : null,
      now
    );

    const created = db.prepare('SELECT * FROM attendees WHERE id = ?').get(attendeeId);

    res.status(201).json({
      success: true,
      data: created,
      message: 'Attendee registered successfully.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update attendee
export const singleAttendeeRouter = Router();

singleAttendeeRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const attendee = db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Attendee not found.' });
    }
    res.json({ success: true, data: attendee });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

singleAttendeeRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, email, phone, ticket_type, company, notes } = req.body;

    const current = db.prepare('SELECT * FROM attendees WHERE id = ?').get(id) as any;
    if (!current) {
      return res.status(404).json({ success: false, error: 'Attendee not found.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }

    // Check duplicate email collision with other attendee in same event
    const duplicate = db.prepare('SELECT id FROM attendees WHERE event_id = ? AND LOWER(email) = ? AND id != ?').get(current.event_id, cleanEmail, id);
    if (duplicate) {
      return res.status(409).json({ success: false, error: `Email "${cleanEmail}" is already used by another attendee.` });
    }

    db.prepare(`
      UPDATE attendees 
      SET name = ?, email = ?, phone = ?, ticket_type = ?, company = ?, notes = ?
      WHERE id = ?
    `).run(
      name.trim(),
      cleanEmail,
      phone ? phone.trim() : null,
      ticket_type || current.ticket_type,
      company ? company.trim() : null,
      notes !== undefined ? notes : current.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Attendee information updated.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete attendee
singleAttendeeRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const current = db.prepare('SELECT * FROM attendees WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Attendee not found.' });
    }

    db.prepare('DELETE FROM check_in_logs WHERE attendee_id = ?').run(id);
    db.prepare('DELETE FROM attendees WHERE id = ?').run(id);

    res.json({ success: true, message: 'Attendee registration deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
