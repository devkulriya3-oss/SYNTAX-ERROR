import { db, initDb, transaction } from './db.js';

export function seedData(force = false) {
  initDb();

  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
  if (!force && eventCount && eventCount.count > 0) {
    console.log('[GatePass Seed] Database already contains events, skipping seed.');
    return;
  }

  console.log('[GatePass Seed] Seeding database with realistic demo event and attendee records...');

  transaction(() => {
    if (force) {
      db.exec(`
        DELETE FROM check_in_logs;
        DELETE FROM attendees;
        DELETE FROM events;
      `);
    }

    // 1. Events
    const insertEvent = db.prepare(`
      INSERT INTO events (id, name, tagline, venue, date_str, doors_open, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      'evt_techconnect_2026',
      'TechConnect 2026',
      'Annual Global Developer & Systems Architecture Summit',
      'Metropolitan Convention Center, Hall B & Grand Ballroom',
      'Saturday, Oct 24, 2026',
      '08:30 AM',
      'active'
    );

    insertEvent.run(
      'evt_devsprint_2026',
      'DevSprint AI Hackathon',
      '48-Hour Autonomous Systems Builder Challenge',
      'Pier 57 Tech Hub, Innovation Floor',
      'Friday, Nov 14, 2026',
      '09:00 AM',
      'upcoming'
    );

    // 2. Attendees for TechConnect 2026
    const insertAttendee = db.prepare(`
      INSERT INTO attendees (id, event_id, name, email, phone, ticket_type, company, pass_code, checked_in, checked_in_at, gate, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLog = db.prepare(`
      INSERT INTO check_in_logs (id, event_id, attendee_id, pass_code, status, gate, operator, notes, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const attendeesData = [
      {
        id: 'att_101',
        name: 'Elena Rostova',
        email: 'elena.rostova@cloudscale.io',
        phone: '+1 (415) 892-3401',
        ticket_type: 'Speaker',
        company: 'CloudScale Labs',
        pass_code: 'GP-TC26-SPK01',
        checked_in: 1,
        checked_in_at: '2026-10-24 08:42:15',
        gate: 'VIP/Speaker Gate A',
        notes: 'Keynote Speaker: Distributed State Machines',
        created_at: '2026-09-12 11:20:00'
      },
      {
        id: 'att_102',
        name: 'Marcus Vance',
        email: 'marcus.v@datadynamics.com',
        phone: '+1 (206) 555-0182',
        ticket_type: 'VIP',
        company: 'Data Dynamics',
        pass_code: 'GP-TC26-VIP02',
        checked_in: 1,
        checked_in_at: '2026-10-24 08:50:33',
        gate: 'VIP/Speaker Gate A',
        notes: 'Executive Pass + Speaker Lounge Access',
        created_at: '2026-09-15 14:15:20'
      },
      {
        id: 'att_103',
        name: 'Aisha Al-Mansoor',
        email: 'aisha.mansoor@vectorquant.ai',
        phone: '+1 (650) 441-9032',
        ticket_type: 'Speaker',
        company: 'VectorQuant AI',
        pass_code: 'GP-TC26-SPK03',
        checked_in: 1,
        checked_in_at: '2026-10-24 08:58:45',
        gate: 'VIP/Speaker Gate A',
        notes: 'Panelist: High-Throughput Edge Inference',
        created_at: '2026-09-18 09:30:00'
      },
      {
        id: 'att_104',
        name: 'Liam Gallagher',
        email: 'liam.g@sentrymesh.net',
        phone: '+1 (312) 670-4921',
        ticket_type: 'General Admission',
        company: 'SentryMesh Security',
        pass_code: 'GP-TC26-GA104',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:05:12',
        gate: 'North Turnstile 2',
        notes: '',
        created_at: '2026-09-22 16:45:00'
      },
      {
        id: 'att_105',
        name: 'Dr. Hiroshi Tanaka',
        email: 'htanaka@tokyo-systems.jp',
        phone: '+81 3 5555 0144',
        ticket_type: 'VIP',
        company: 'Tokyo Systems Research',
        pass_code: 'GP-TC26-VIP05',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:12:08',
        gate: 'VIP/Speaker Gate A',
        notes: 'International Delegation Head',
        created_at: '2026-09-25 10:10:00'
      },
      {
        id: 'att_106',
        name: 'Sofia Ramirez',
        email: 'sofia.ramirez@apexinfra.io',
        phone: '+1 (512) 902-8311',
        ticket_type: 'Sponsor',
        company: 'Apex Infrastructure',
        pass_code: 'GP-TC26-SPO06',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:18:50',
        gate: 'Exhibition Gate C',
        notes: 'Booth Lead #B12',
        created_at: '2026-09-28 13:20:00'
      },
      {
        id: 'att_107',
        name: 'Devon Brooks',
        email: 'dbrooks@kernelcore.org',
        phone: '+1 (415) 330-1849',
        ticket_type: 'General Admission',
        company: 'KernelCore Open Source',
        pass_code: 'GP-TC26-GA107',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:24:19',
        gate: 'North Turnstile 1',
        notes: '',
        created_at: '2026-10-01 17:05:00'
      },
      {
        id: 'att_108',
        name: 'Clara Johansson',
        email: 'clara@nordicbyte.se',
        phone: '+46 8 123 4567',
        ticket_type: 'Press',
        company: 'Nordic Tech Journal',
        pass_code: 'GP-TC26-PRS08',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:31:02',
        gate: 'Media Desk Gate B',
        notes: 'Accredited Journalist - Interview Room Access',
        created_at: '2026-10-04 11:40:00'
      },
      {
        id: 'att_109',
        name: 'Arjun Mehta',
        email: 'arjun.mehta@fintechgrid.in',
        phone: '+91 98200 12345',
        ticket_type: 'General Admission',
        company: 'FintechGrid Services',
        pass_code: 'GP-TC26-GA109',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:37:44',
        gate: 'North Turnstile 3',
        notes: '',
        created_at: '2026-10-06 15:55:00'
      },
      {
        id: 'att_110',
        name: 'Zoe Washington',
        email: 'zoe.w@chronosdata.com',
        phone: '+1 (202) 801-4490',
        ticket_type: 'General Admission',
        company: 'Chronos Data Platform',
        pass_code: 'GP-TC26-GA110',
        checked_in: 1,
        checked_in_at: '2026-10-24 09:44:28',
        gate: 'North Turnstile 2',
        notes: '',
        created_at: '2026-10-08 09:15:00'
      },
      // Not yet arrived attendees
      {
        id: 'att_111',
        name: 'Nathaniel Cole',
        email: 'nathaniel.c@hyperioncompute.com',
        phone: '+1 (617) 492-8002',
        ticket_type: 'VIP',
        company: 'Hyperion Compute',
        pass_code: 'GP-TC26-VIP11',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: 'Arriving with VP of Infrastructure at 10:30 AM',
        created_at: '2026-10-10 14:00:00'
      },
      {
        id: 'att_112',
        name: 'Maya Patel',
        email: 'maya.patel@synthetica.co',
        phone: '+1 (408) 723-9912',
        ticket_type: 'Speaker',
        company: 'Synthetica AI',
        pass_code: 'GP-TC26-SPK12',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: 'Afternoon session: Neuromorphic Pipelines',
        created_at: '2026-10-11 10:20:00'
      },
      {
        id: 'att_113',
        name: 'Lucas Bernard',
        email: 'l.bernard@quantumnext.fr',
        phone: '+33 1 42 68 55 00',
        ticket_type: 'General Admission',
        company: 'QuantumNext Paris',
        pass_code: 'GP-TC26-GA113',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: '',
        created_at: '2026-10-12 12:45:00'
      },
      {
        id: 'att_114',
        name: 'Samantha O\'Connor',
        email: 'samantha.oc@pulsefire.io',
        phone: '+1 (604) 390-1178',
        ticket_type: 'General Admission',
        company: 'PulseFire Analytics',
        pass_code: 'GP-TC26-GA114',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: '',
        created_at: '2026-10-13 16:30:00'
      },
      {
        id: 'att_115',
        name: 'Kenji Sato',
        email: 'k.sato@cybertrust.co.jp',
        phone: '+81 6 6201 3300',
        ticket_type: 'Sponsor',
        company: 'CyberTrust Global',
        pass_code: 'GP-TC26-SPO15',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: 'Sponsor Badge - Booth #A04',
        created_at: '2026-10-14 09:50:00'
      },
      {
        id: 'att_116',
        name: 'Fatima Zahra',
        email: 'f.zahra@atlascloud.ae',
        phone: '+971 4 391 0000',
        ticket_type: 'General Admission',
        company: 'Atlas Cloud MENA',
        pass_code: 'GP-TC26-GA116',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: '',
        created_at: '2026-10-15 11:15:00'
      },
      {
        id: 'att_117',
        name: 'David K. Miller',
        email: 'dkmiller@wiredstandard.com',
        phone: '+1 (212) 993-4120',
        ticket_type: 'Press',
        company: 'The Wired Standard',
        pass_code: 'GP-TC26-PRS17',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: 'Press Pass - Photo Pass Granted',
        created_at: '2026-10-16 13:40:00'
      },
      {
        id: 'att_118',
        name: 'Rachel Green-Sloan',
        email: 'rchel.green@solarisenergy.org',
        phone: '+1 (720) 419-8802',
        ticket_type: 'General Admission',
        company: 'Solaris Energy Systems',
        pass_code: 'GP-TC26-GA118',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: '',
        created_at: '2026-10-16 15:20:00'
      }
    ];

    for (const att of attendeesData) {
      insertAttendee.run(
        att.id,
        'evt_techconnect_2026',
        att.name,
        att.email,
        att.phone,
        att.ticket_type,
        att.company,
        att.pass_code,
        att.checked_in,
        att.checked_in_at,
        att.gate,
        att.notes,
        att.created_at
      );

      // If already checked in, create corresponding log record
      if (att.checked_in && att.checked_in_at) {
        insertLog.run(
          `log_${att.id}`,
          'evt_techconnect_2026',
          att.id,
          att.pass_code,
          'SUCCESS',
          att.gate || 'Main Gate',
          'Staff Terminal 1',
          'Initial entry verified',
          att.checked_in_at
        );
      }
    }

    // Add a couple of realistic duplicate scan attempts and an invalid scan attempt to logs for realistic reporting
    insertLog.run(
      'log_dup_102',
      'evt_techconnect_2026',
      'att_102',
      'GP-TC26-VIP02',
      'ALREADY_CHECKED_IN',
      'North Turnstile 1',
      'Staff Terminal 2',
      'Duplicate scan rejected. Previous entry at 08:50:33',
      '2026-10-24 09:22:10'
    );

    insertLog.run(
      'log_inv_999',
      'evt_techconnect_2026',
      null,
      'GP-EXPIRED-CODE-88',
      'INVALID',
      'North Turnstile 3',
      'Staff Terminal 3',
      'Pass code not recognized in system',
      '2026-10-24 09:35:40'
    );

    // 3. Attendees for secondary event (DevSprint)
    const devSprintAttendees = [
      {
        id: 'att_ds_01',
        name: 'Jordan Rivera',
        email: 'jrivera@hackteam.org',
        phone: '+1 (415) 777-1234',
        ticket_type: 'General Admission',
        company: 'Solo Hacker',
        pass_code: 'GP-DS26-HCK01',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: 'Track: Agent Orchestration',
        created_at: '2026-10-01 10:00:00'
      },
      {
        id: 'att_ds_02',
        name: 'Chloe Tremblay',
        email: 'chloe.t@montreal-ai.ca',
        phone: '+1 (514) 880-9900',
        ticket_type: 'VIP',
        company: 'Montreal AI Guild',
        pass_code: 'GP-DS26-VIP02',
        checked_in: 0,
        checked_in_at: null,
        gate: null,
        notes: 'Mentor / Judge',
        created_at: '2026-10-02 11:30:00'
      }
    ];

    for (const att of devSprintAttendees) {
      insertAttendee.run(
        att.id,
        'evt_devsprint_2026',
        att.name,
        att.email,
        att.phone,
        att.ticket_type,
        att.company,
        att.pass_code,
        att.checked_in,
        att.checked_in_at,
        att.gate,
        att.notes,
        att.created_at
      );
    }
  });

  console.log('[GatePass Seed] Finished seeding database successfully.');
}
