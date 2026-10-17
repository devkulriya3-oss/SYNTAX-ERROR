import { db, initDb } from './db.js';
import { seedData } from './seed.js';

async function runTests() {
  console.log('--- Starting GatePass Verification Test Suite ---');
  initDb();
  seedData(true); // reset to clean baseline

  // 1. Initial count
  const initialStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN checked_in = 0 THEN 1 ELSE 0 END) as not_arrived
    FROM attendees
    WHERE event_id = 'evt_techconnect_2026'
  `).get() as any;

  console.log('1. Initial Baseline Stats:', initialStats);
  if (initialStats.total !== 18 || initialStats.checked_in !== 10 || initialStats.not_arrived !== 8) {
    throw new Error('Baseline counts mismatch!');
  }

  // 2. Test registration
  const newAttendeeId = 'att_test_999';
  const newEmail = 'test.engineer@antigravity.dev';
  const newPassCode = 'GP-TC26-TEST1';

  db.prepare(`
    INSERT INTO attendees (id, event_id, name, email, phone, ticket_type, company, pass_code, checked_in)
    VALUES (?, 'evt_techconnect_2026', 'Sarah Connor', ?, '+1 555-0199', 'VIP', 'Cyberdyne', ?, 0)
  `).run(newAttendeeId, newEmail, newPassCode);

  const afterRegStats = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN checked_in = 0 THEN 1 ELSE 0 END) as not_arrived 
    FROM attendees WHERE event_id = 'evt_techconnect_2026'
  `).get() as any;

  console.log('2. After Registration Stats:', afterRegStats);
  if (afterRegStats.total !== 19 || afterRegStats.not_arrived !== 9) {
    throw new Error('Registration did not increment total and not_arrived count properly!');
  }

  // 3. Test duplicate registration prevention
  try {
    db.prepare(`
      INSERT INTO attendees (id, event_id, name, email, pass_code)
      VALUES ('att_test_dup', 'evt_techconnect_2026', 'Duplicate Sarah', ?, 'GP-TC26-DUP99')
    `).run(newEmail);
    throw new Error('Duplicate email constraint did not trigger!');
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('3. Duplicate Email Constraint: PASSED (Rejected properly)');
    } else {
      throw err;
    }
  }

  // 4. Test Check-In of unarrived pass (GP-TC26-GA113 - Lucas Bernard)
  const lucasBefore = db.prepare('SELECT * FROM attendees WHERE pass_code = ?').get('GP-TC26-GA113') as any;
  console.log('4. Lucas Bernard Before Check-In:', { name: lucasBefore.name, checked_in: lucasBefore.checked_in });
  if (lucasBefore.checked_in !== 0) throw new Error('Lucas was already checked in!');

  // Simulate atomic check-in
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const updateResult = db.prepare(`
    UPDATE attendees
    SET checked_in = 1, checked_in_at = ?, gate = 'North Turnstile 2'
    WHERE pass_code = ? AND checked_in = 0
  `).run(now, 'GP-TC26-GA113');

  if (updateResult.changes !== 1) throw new Error('Check-in update failed!');

  db.prepare(`
    INSERT INTO check_in_logs (id, event_id, attendee_id, pass_code, status, gate, operator, notes, scanned_at)
    VALUES ('log_test_lucas', 'evt_techconnect_2026', ?, 'GP-TC26-GA113', 'SUCCESS', 'North Turnstile 2', 'Terminal 1', 'Test scan verified', ?)
  `).run(lucasBefore.id, now);

  const lucasAfter = db.prepare('SELECT * FROM attendees WHERE pass_code = ?').get('GP-TC26-GA113') as any;
  console.log('5. Lucas Bernard After Check-In:', { name: lucasAfter.name, checked_in: lucasAfter.checked_in, time: lucasAfter.checked_in_at });
  if (lucasAfter.checked_in !== 1) throw new Error('Lucas was not marked checked in!');

  // 5. Test Repeated Scan (Duplicate Check-In Rejection)
  const repeatUpdate = db.prepare(`
    UPDATE attendees
    SET checked_in = 1, checked_in_at = ?, gate = 'North Turnstile 2'
    WHERE pass_code = ? AND checked_in = 0
  `).run(now, 'GP-TC26-GA113');

  console.log('6. Repeated Scan Changes:', repeatUpdate.changes);
  if (repeatUpdate.changes !== 0) throw new Error('Repeated scan was not blocked! Race condition vulnerability!');
  console.log('   Duplicate Check-In Prevention: PASSED (Atomic barrier held)');

  // 6. Test invalid pass code
  const invalidCheck = db.prepare('SELECT * FROM attendees WHERE pass_code = ?').get('GP-INVALID-FAKE-CODE');
  if (invalidCheck) throw new Error('Invalid code matched someone!');
  console.log('7. Invalid Pass Code Detection: PASSED');

  // 7. Verify updated dashboard stats
  const finalStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN checked_in = 0 THEN 1 ELSE 0 END) as not_arrived
    FROM attendees
    WHERE event_id = 'evt_techconnect_2026'
  `).get() as any;

  console.log('8. Final Updated Stats:', finalStats);
  const expectedRate = Number(((finalStats.checked_in / finalStats.total) * 100).toFixed(1));
  console.log(`   Attendance Rate: ${expectedRate}% (${finalStats.checked_in} / ${finalStats.total})`);

  // Clean up test attendee and restore baseline
  seedData(true);
  console.log('--- All GatePass Core Operational Invariants Verified Successfully! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
