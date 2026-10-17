export type TicketType = 'VIP' | 'General Admission' | 'Speaker' | 'Sponsor' | 'Press';

export interface Event {
  id: string;
  name: string;
  tagline: string;
  venue: string;
  date_str: string;
  doors_open: string;
  status: 'active' | 'upcoming' | 'concluded';
  created_at: string;
  total_attendees?: number;
  checked_in_count?: number;
}

export interface Attendee {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string | null;
  ticket_type: TicketType;
  company: string | null;
  pass_code: string;
  checked_in: number; // 0 or 1
  checked_in_at: string | null;
  gate: string | null;
  notes: string | null;
  created_at: string;
  event_name?: string;
  venue?: string;
  date_str?: string;
}

export interface CheckInLog {
  id: string;
  event_id: string;
  attendee_id: string | null;
  pass_code: string;
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID' | 'UNDO';
  gate: string;
  operator: string;
  notes: string | null;
  scanned_at: string;
  attendee_name?: string;
  ticket_type?: TicketType;
}

export interface TicketBreakdown {
  ticketType: TicketType;
  total: number;
  checkedIn: number;
  notArrived: number;
  rate: number;
}

export interface RecentCheckIn {
  attendee_id: string;
  name: string;
  email: string;
  ticket_type: TicketType;
  pass_code: string;
  checked_in_at: string;
  gate: string;
}

export interface HourlyTrend {
  hour: string;
  count: number;
}

export interface EventStats {
  total: number;
  checkedIn: number;
  notArrived: number;
  attendanceRate: number;
  breakdown: TicketBreakdown[];
  recentCheckIns: RecentCheckIn[];
  hourlyTrends: HourlyTrend[];
}

export interface CheckInResult {
  success: boolean;
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID';
  message: string;
  attendee?: Attendee;
  checkInTime?: string;
  previousCheckInTime?: string;
  previousGate?: string;
  gate?: string;
  passCode?: string;
}
