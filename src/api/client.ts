import { Event, Attendee, CheckInLog, EventStats, CheckInResult } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = json.error || json.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Events
  async getEvents(): Promise<Event[]> {
    const res = await fetch(`${API_BASE}/events`);
    return handleResponse<Event[]>(res);
  },

  async getEvent(id: string): Promise<Event> {
    const res = await fetch(`${API_BASE}/events/${id}`);
    return handleResponse<Event>(res);
  },

  // Attendees
  async getAttendees(
    eventId: string,
    params?: { search?: string; status?: string; ticketType?: string; limit?: number; offset?: number }
  ): Promise<Attendee[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.ticketType) searchParams.set('ticketType', params.ticketType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const url = `${API_BASE}/events/${eventId}/attendees?${searchParams.toString()}`;
    const res = await fetch(url);
    return handleResponse<Attendee[]>(res);
  },

  async registerAttendee(
    eventId: string,
    data: { name: string; email: string; phone?: string; ticket_type?: string; company?: string; notes?: string }
  ): Promise<Attendee> {
    const res = await fetch(`${API_BASE}/events/${eventId}/attendees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Attendee>(res);
  },

  async updateAttendee(
    id: string,
    data: { name: string; email: string; phone?: string; ticket_type?: string; company?: string; notes?: string }
  ): Promise<Attendee> {
    const res = await fetch(`${API_BASE}/attendees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Attendee>(res);
  },

  async deleteAttendee(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/attendees/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Check-In
  async verifyPass(passCode: string, eventId?: string): Promise<CheckInResult> {
    const res = await fetch(`${API_BASE}/check-in/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passCode, eventId }),
    });
    return res.json();
  },

  async checkIn(passCode: string, eventId?: string, gate?: string, operator?: string): Promise<CheckInResult> {
    const res = await fetch(`${API_BASE}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passCode, eventId, gate, operator }),
    });
    return res.json();
  },

  async undoCheckIn(attendeeId: string): Promise<{ success: boolean; message: string; attendee: Attendee }> {
    const res = await fetch(`${API_BASE}/check-in/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendeeId }),
    });
    return res.json();
  },

  // Stats & Reports
  async getStats(eventId: string): Promise<EventStats> {
    const res = await fetch(`${API_BASE}/events/${eventId}/stats`);
    return handleResponse<EventStats>(res);
  },

  async getLogs(eventId: string, params?: { status?: string; search?: string }): Promise<CheckInLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    const res = await fetch(`${API_BASE}/events/${eventId}/logs?${searchParams.toString()}`);
    return handleResponse<CheckInLog[]>(res);
  },

  async resetDemoData(eventId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/reset`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  getExportAttendeesUrl(eventId: string): string {
    return `${API_BASE}/events/${eventId}/export/attendees`;
  },

  getExportLogsUrl(eventId: string): string {
    return `${API_BASE}/events/${eventId}/export/logs`;
  },
};
