import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { seedData } from './seed.js';
import { eventsRouter } from './routes/events.js';
import { attendeesRouter, singleAttendeeRouter } from './routes/attendees.js';
import { checkInRouter } from './routes/checkIn.js';
import { statsRouter } from './routes/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database and seed initial demo data
initDb();
seedData();

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'GatePass API', timestamp: new Date().toISOString() });
});

// Mount API Routers
app.use('/api/events', eventsRouter);
app.use('/api/events/:id', attendeesRouter);
app.use('/api/events/:id', statsRouter);
app.use('/api/attendees', singleAttendeeRouter);
app.use('/api/check-in', checkInRouter);

// Serve Vite frontend build if dist folder exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    // If not an /api route, serve frontend index.html
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[GatePass Server Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  GatePass Full-Stack Platform`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
