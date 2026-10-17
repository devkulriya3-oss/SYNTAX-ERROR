import { Router, Request, Response } from 'express';
import { db } from '../db.js';

export const eventsRouter = Router();

// GET all events
eventsRouter.get('/', (req: Request, res: Response) => {
  try {
    const events = db.prepare(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM attendees a WHERE a.event_id = e.id) as total_attendees,
        (SELECT COUNT(*) FROM attendees a WHERE a.event_id = e.id AND a.checked_in = 1) as checked_in_count
      FROM events e
      ORDER BY e.created_at ASC
    `).all();
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET event by ID
eventsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
