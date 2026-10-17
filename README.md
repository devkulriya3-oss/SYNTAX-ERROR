# GatePass — QR-Based Event Check-In Platform

> **"Every entry, accounted for."**

**GatePass** is a professional, high-performance event registration and QR check-in platform built for live event operations, gate staff, and organizers. It handles attendee registration, cryptographically unique pass generation, camera & manual gate ingress validation, duplicate check-in prevention (anti-passback), real-time attendance quorum tracking, and CSV reporting.

---

## Key Features

- **Operational Overview Dashboard**:
  - Four key operational KPIs: Total Registrations, Checked In, Not Yet Arrived, and Attendance Rate.
  - Turnout breakdown by ticket tier with live progress bars.
  - Real-time check-in activity feed displaying attendee names, tiers, and ingress timestamps.
  - Hourly check-in velocity distribution chart.
- **Dedicated Entrance Scanner**:
  - Live camera scanning with camera selection (back/environment vs. front camera) and permission diagnostics via `html5-qrcode`.
  - Manual pass-code entry fallback with instant verification on Enter.
  - Real-time 3-state verification panels:
    - **Valid pass (Green)**: Validates entry, displays attendee profile & ticket tier, stamps timestamp and gate.
    - **Already used pass (Amber)**: Detects duplicate scans, blocks re-entry, displays prior entry timestamp and gate.
    - **Invalid pass (Red)**: Displays rejection notice and reason for unassigned credentials.
  - Synthetic Web Audio API chimes (success chime, amber duplicate pulse, low buzzer for invalid).
  - Quick-test demo pass chips for immediate verification without a physical camera.
  - Live session scan history stream.
- **Attendee Management**:
  - Registration form with validation and duplicate email prevention.
  - Automatic generation of unique Attendee IDs (`att_xxxx`) and alphanumeric pass identifiers (`GP-TC26-XXXXX`).
  - Searchable by name, email, company, and pass code.
  - Filterable by check-in status (All, Checked In, Not Arrived) and ticket tier.
  - Digital Ticket & QR Pass preview modal with printable badge stylesheet (`window.print()`) and SVG download.
  - Inline editing and deletion with confirmation dialogs.
  - Manual check-in and check-in reversal (undo) controls.
- **Attendance Reports & Audit Logs**:
  - Complete check-in logs tracking all scans (Success, Duplicate Attempts, Invalid Scans, Reversals) with timestamps, gates, and operator IDs.
  - One-click CSV export of Attendee Roster.
  - One-click CSV export of Entrance Audit Trail.
- **Security & Concurrency Architecture**:
  - Built-in SQLite (`gatepass.db`) persistence using Node.js native `node:sqlite`.
  - Atomic transactions (`BEGIN IMMEDIATE`) for check-in operations to prevent race conditions and duplicate check-ins across multiple scanners.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React icons
- **Build Tool**: Vite 6
- **QR Generation**: `qrcode.react` (high-contrast SVG)
- **QR Scanning**: `html5-qrcode` (cross-platform webcam & mobile camera scanner)
- **Audio Feedback**: Web Audio API (synthesized clean chimes, zero external asset dependencies)
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **Database**: Native SQLite via `node:sqlite` (zero native C++ compilation needed, rock-solid file persistence)

---

## Installation & Setup

### Prerequisites
- Node.js 22+ or Node.js 24 LTS (`v24.20.0` or higher recommended for built-in `node:sqlite`)
- npm 10+ or 11+

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (Optional)
GatePass runs out of the box with default ports. You can optionally set:
```env
PORT=3001
VITE_PORT=5173
```

### 3. Run Development Server (Concurrent Client + Backend)
To start both the Express backend API and the Vite React frontend concurrently:
```bash
npm run dev
```
- Frontend: `http://localhost:5173` (with `/api` proxy configured)
- Backend API: `http://localhost:3001`

### 4. Build for Production
To build the optimized client bundle:
```bash
npm run build
```

### 5. Start Production Server
The production Express server automatically serves the built frontend from `dist/` and hosts the REST API on a single port:
```bash
npm start
```
Open `http://localhost:3001` in any browser.

---

## Operational Verification Workflow

1. **Dashboard Quorum**:
   - Navigate to the **Overview** page.
   - Note the baseline statistics for "TechConnect 2026" (18 Registrations, 10 Checked In, 8 Not Yet Arrived, 55.6% Rate).
2. **QR Pass Inspection**:
   - Go to the **Attendees** page.
   - Click the QR icon on any attendee (e.g. Lucas Bernard).
   - Review the digital ticket badge with scannable QR code and copyable pass code (`GP-TC26-GA113`).
3. **Valid Check-In**:
   - Go to **Check-In Scanner**.
   - Under "Manual Pass Code", enter `GP-TC26-GA113` (or click the "Valid: Lucas Bernard" preset).
   - Notice the green success alert, audio chime, and check-in confirmation.
   - Check the **Overview** dashboard: Checked In immediately increments to 11, and attendance rate increases to 61.1%.
4. **Duplicate Prevention Test**:
   - Return to the scanner and re-scan `GP-TC26-GA113` (or `GP-TC26-SPK01`).
   - Notice the amber alert: *"PASS ALREADY CHECKED IN. Duplicate scan detected."* with previous check-in timestamp and gate. The attendee is not double-counted.
5. **Invalid Pass Test**:
   - Enter `GP-INVALID-CODE` in the scanner.
   - Notice the restrained red error alert: *"INVALID PASS CREDENTIAL"*.
6. **Registering a New Attendee**:
   - Click **Add Attendee**.
   - Enter Full Name and Email. Notice email validation and duplicate email check.
   - Submit: unique ID and unique pass code are generated, and counts update immediately.
7. **CSV Reporting**:
   - Go to **Attendance Reports**.
   - Download the **Attendee Roster CSV** and **Audit Logs CSV**.
8. **Resetting Demo Data**:
   - Go to **Settings** -> Click **Reset Baseline Data** to restore the default sample dataset at any time.

---

## License
MIT
