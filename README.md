Buildathon Project by Team SYNTAX ERROR at PVGCOET

## Team
Dev Kulriya
Avadhoot Jagtap
Virendra Kakade
Shravan Mhetre

## Project Links:
-Live Project: https://syntax-error-5nzh.onrender.com/
-Demo Video: 
-GitHub Repository: https://github.com/devkulriya3-oss/SYNTAX-ERROR.git

## Problem Statement:
Event organizers often manage registrations and entry manually, which can be slow, inefficient, and prone to errors. Manual verification also makes it difficult to prevent duplicate entries and monitor attendance in real time.
GatePass addresses these challenges through a digital event registration and QR-based check-in system.

## Our Solution
GatePass is a web-based event management and QR check-in platform that helps organizers register attendees, generate unique entry passes, verify credentials, prevent duplicate check-ins, and monitor attendance.

## Key Features

1. Attendee Registration
Register attendees with details such as name, email, phone, company, and ticket type.
Validate registration details and prevent duplicate email registrations.
Automatically generate unique attendee IDs and pass codes.

2. QR-Based Digital Passes
Generate a unique QR code for every attendee.
Preview and print digital tickets.
Download QR codes as SVG files.
3. QR and Manual Pass Verification
Scan QR codes using a camera.
Enter pass codes manually as an alternative.
Display immediate verification results for valid, duplicate, and invalid passes.
Provide audio feedback for scan results.
4. Duplicate Check-In Prevention
Prevent attendees from entering more than once using the same pass.
Display previous check-in details when a duplicate is detected.
Support manual check-in reversal.
5. Attendance Dashboard
Display total registrations, checked-in attendees, and attendees yet to arrive.
Show attendance percentages and ticket-tier breakdowns.
Display recent check-in activity and hourly check-in statistics.
6. Attendance Reports and Audit Logs
Maintain check-in records with timestamps and verification outcomes.
Export attendee lists as CSV files.
Export check-in audit logs as CSV files.
7. Backend and Data Persistence
Use a Node.js and Express backend.
Store event data in SQLite.
Use database transactions to help prevent concurrent duplicate check-ins.

## Backend
Runtime: Node.js (ES modules, "type": "module")
Server: Built-in Node http module. No Express or other framework, and no npm install needed.
Database: SQLite, almost certainly via Node’s built-in node:sqlite, which is why 22.13+ is required.
API style: REST/JSON under /api/*, with the same server also serving static files.
Auth: scrypt password hashing (node:crypto), HttpOnly cookie sessions lasting 7 days, and login rate limiting.
Roles: Event Manager and Guest, enforced server-side.
Concurrency safety: Check-ins run in BEGIN IMMEDIATE SQLite transactions, so the same pass can’t be admitted twice.

## Frontend
UI: React, loaded from a CDN (single public/index.html, no build step)
Styling: Tailwind CSS via CDN
QR: QR generation and scanning libraries via CDN, with camera scanning needing HTTPS (except on localhost)
Data and exports
SQLite file at data/gatepass.db (configurable via DB_PATH)
Seed data from server/seed-data.json
CSV export for attendees and logs
DevOps and deployment
Containerization: Docker (Dockerfile, with a volume mounted at /data)
Hosting targets: Render, Railway, Fly.io, or a VPS. A persistent disk is needed for the DB.

##Project Highlights
QR-based entry verification.
Manual verification fallback.
Duplicate check-in prevention.
Real-time attendance overview.
Digital ticket generation.
CSV reporting and audit logs.
Persistent database storage.
