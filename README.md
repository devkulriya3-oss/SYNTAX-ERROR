# GatePass - QR Event Check-In (full-stack)

A web app with a real backend: **Node.js + SQLite**. No `npm install` needed, because the server uses only Node built-ins.

## Run it
Requires **Node.js 22.13 or newer** (https://nodejs.org).

    node server/index.js        # or: npm start   (Windows: double-click start.bat)

Open http://localhost:3001. The database is created at `data/gatepass.db` and seeded with the demo event on first run.
The UI loads React, Tailwind and the QR libraries from CDNs, so the browser needs internet access.

## Accounts and roles
The login page has two tabs.
- **Event Manager** - full access to events, attendees, scanning, reports and exports. The first time you open the site there is no manager yet, so the Event Manager tab shows a one-time setup form. Create it right away: whoever does this first becomes the manager, and it cannot be done again.
- **Guest** - anyone can create a guest account. Guests can only see the list of events, register themselves (name, phone, company; their account email is used), and view or download their own QR pass (PNG or print). They always get a General Admission pass, and cannot see other attendees, reports or the scanner.

These rules are enforced on the server, not just hidden in the UI. Passwords are hashed with scrypt, sessions use an HttpOnly cookie that lasts 7 days, and repeated wrong passwords are rate-limited. If you forget the manager password, stop the server, delete the manager row from the `users` table (or delete `data/gatepass.db` to start fresh), and set it up again.

## Events
Open the **Events** page to add an event (name, venue, date, time). Each event has its own attendees, passes, check-ins and reports; switch between them with the dropdown in the top bar. All other endpoints below are manager-only (guests can only read the basic event list). A pass only works for the event it was issued for. Databases from the earlier single-event version upgrade automatically on first start.

## Layout
    server/index.js       REST API + static file server + SQLite
    server/seed-data.json demo attendees and logs
    public/index.html     the web app (calls /api/*)

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login, /signup, /setup, /logout; GET /api/auth/me | sign in / create guest account / first-time manager setup / sign out / current user |
| GET | /api/guest/passes | guest: my passes |
| POST | /api/guest/register | guest: register for an event |
| GET / POST | /api/events | list events / create an event (name, venue, event_date, event_time) |
| PUT / DELETE | /api/events/:id | edit an event / delete it with its attendees and logs |
| GET | /api/attendees?event=ID | list attendees of one event |
| POST | /api/attendees | register for an event (`event_id`; validates email, rejects duplicates, issues pass code) |
| PUT / DELETE | /api/attendees/:id | edit / delete |
| POST | /api/attendees/:id/undo | reverse a check-in (audit-logged) |
| POST | /api/checkin | `{code, gate, event_id}` returns SUCCESS / ALREADY_CHECKED_IN / INVALID |
| GET | /api/logs?event=ID | audit trail |
| GET | /api/stats | totals and per-tier numbers |
| GET | /api/export/attendees.csv, /api/export/logs.csv | CSV downloads |
| POST | /api/reset | restore the TechConnect 2026 demo event (other events untouched) |

Check-in runs inside a `BEGIN IMMEDIATE` SQLite transaction, so two scanners can never admit the same pass.

## Configuration (environment variables)
- `PORT` (default 3001)
- `DB_PATH` (default `data/gatepass.db`)
- `COOKIE_SECURE=1` - force the Secure flag on the login cookie (it is set automatically when the site is served over HTTPS behind a proxy that sends `X-Forwarded-Proto`)

## Phones / other devices
Open `http://<your-computer-ip>:3001` on the same Wi-Fi. **Camera scanning needs HTTPS** everywhere except localhost, so for phone cameras use a hosted deployment or a tunnel (Cloudflare Tunnel, ngrok). Manual pass-code entry works over plain HTTP.

## Deploy
Use a host that runs Node (Render, Railway, Fly.io, a VPS); static hosts like Netlify or GitHub Pages cannot run the backend.
- Start command: `node server/index.js`
- Attach a **persistent disk** and point `DB_PATH` at it, or data is lost on redeploy.
- Open the site over HTTPS (Render, Railway and Fly.io do this for you) so passwords and login cookies are encrypted.
- Or use the included `Dockerfile` (mount a volume at `/data`).
