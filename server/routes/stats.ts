import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { seedData } from '../seed.js';

export const statsRouter = Router({ mergeParams: true });

// GET /api/events/:id/stats - Operational metrics calculated dynamically
statsRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);

    // Total registrations
    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN checked_in = 0 THEN 1 ELSE 0 END) as not_arrived
      FROM attendees
      WHERE event_id = ?
    `).get(eventId) as { total: number; checked_in: number; not_arrived: number };

    const total = counts?.total || 0;
    const checkedIn = counts?.checked_in || 0;
    const notArrived = counts?.not_arrived || 0;
    const attendanceRate = total > 0 ? Number(((checkedIn / total) * 100).toFixed(1)) : 0;

    // Breakdown by ticket type
    const breakdown = db.prepare(`
      SELECT 
        ticket_type,
        COUNT(*) as total,
        SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN checked_in = 0 THEN 1 ELSE 0 END) as not_arrived
      FROM attendees
      WHERE event_id = ?
      GROUP BY ticket_type
      ORDER BY total DESC
    `).all(eventId) as Array<{ ticket_type: string; total: number; checked_in: number; not_arrived: number }>;

    const breakdownFormatted = breakdown.map(item => ({
      ticketType: item.ticket_type,
      total: item.total,
      checkedIn: item.checked_in,
      notArrived: item.not_arrived,
      rate: item.total > 0 ? Number(((item.checked_in / item.total) * 100).toFixed(1)) : 0
    }));

    // Recent check-in activities (successful check-ins)
    const recentCheckIns = db.prepare(`
      SELECT 
        a.id as attendee_id,
        a.name,
        a.email,
        a.ticket_type,
        a.pass_code,
        a.checked_in_at,
        a.gate
      FROM attendees a
      WHERE a.event_id = ? AND a.checked_in = 1
      ORDER BY a.checked_in_at DESC
      LIMIT 10
    `).all(eventId);

    // Hourly check-in trends
    const hourlyData = db.prepare(`
      SELECT 
        strftime('%H:00', checked_in_at) as hour,
        COUNT(*) as count
      FROM attendees
      WHERE event_id = ? AND checked_in = 1 AND checked_in_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour ASC
    `).all(eventId);

    res.json({
      success: true,
      data: {
        total,
        checkedIn,
        notArrived,
        attendanceRate,
        breakdown: breakdownFormatted,
        recentCheckIns,
        hourlyTrends: hourlyData
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id/logs - Full audit logs
statsRouter.get('/logs', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const { status, search } = req.query;

    let query = `
      SELECT l.*, a.name as attendee_name, a.ticket_type
      FROM check_in_logs l
      LEFT JOIN attendees a ON l.attendee_id = a.id
      WHERE l.event_id = ?
    `;
    const params: any[] = [eventId];

    if (status && status !== 'all') {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (l.pass_code LIKE ? OR a.name LIKE ? OR l.gate LIKE ? OR l.notes LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY l.scanned_at DESC LIMIT 100`;

    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id/export/attendees (CSV export)
statsRouter.get('/export/attendees', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const attendees = db.prepare(`
      SELECT 
        id, name, email, phone, ticket_type, company, pass_code,
        CASE WHEN checked_in = 1 THEN 'Checked In' ELSE 'Not Arrived' END as status,
        checked_in_at, gate, created_at
      FROM attendees
      WHERE event_id = ?
      ORDER BY created_at ASC
    `).all(eventId) as any[];

    const headers = ['Attendee ID', 'Name', 'Email', 'Phone', 'Ticket Type', 'Company', 'Pass Code', 'Status', 'Check-In Time', 'Gate', 'Registration Time'];
    
    const rows = attendees.map(a => [
      a.id,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${(a.email || '').replace(/"/g, '""')}"`,
      `"${(a.phone || '').replace(/"/g, '""')}"`,
      `"${(a.ticket_type || '').replace(/"/g, '""')}"`,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      a.pass_code,
      a.status,
      a.checked_in_at || 'N/A',
      a.gate || 'N/A',
      a.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gatepass-attendees-${eventId}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id/export/logs (CSV export)
statsRouter.get('/export/logs', (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.id);
    const logs = db.prepare(`
      SELECT 
        l.id, l.scanned_at, l.status, l.pass_code, 
        COALESCE(a.name, 'Unknown') as attendee_name,
        COALESCE(a.ticket_type, 'N/A') as ticket_type,
        l.gate, l.operator, l.notes
      FROM check_in_logs l
      LEFT JOIN attendees a ON l.attendee_id = a.id
      WHERE l.event_id = ?
      ORDER BY l.scanned_at DESC
    `).all(eventId) as any[];

    const headers = ['Log ID', 'Timestamp', 'Status', 'Pass Code', 'Attendee Name', 'Ticket Type', 'Gate', 'Operator', 'Audit Notes'];
    const rows = logs.map(l => [
      l.id,
      l.scanned_at,
      l.status,
      l.pass_code,
      `"${(l.attendee_name || '').replace(/"/g, '""')}"`,
      `"${(l.ticket_type || '').replace(/"/g, '""')}"`,
      `"${(l.gate || '').replace(/"/g, '""')}"`,
      `"${(l.operator || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gatepass-checkin-logs-${eventId}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/reset - Reset demo data
statsRouter.post('/reset', (req: Request, res: Response) => {
  try {
    seedData(true);
    res.json({ success: true, message: 'Event demo data has been reset to initial baseline.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
