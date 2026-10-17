import React from 'react';
import { Event, EventStats, Attendee } from '../types';
import { getTicketBadgeStyle, formatTimestamp, formatTimeAgo, getInitials } from '../utils/formatters';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Percent, 
  QrCode, 
  UserPlus, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface OverviewPageProps {
  event: Event;
  stats: EventStats | null;
  onOpenScanner: () => void;
  onOpenAddAttendee: () => void;
  onViewAttendeePass: (attendeeId: string) => void;
  onNavigateToAttendees: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  event,
  stats,
  onOpenScanner,
  onOpenAddAttendee,
  onViewAttendeePass,
  onNavigateToAttendees
}) => {
  const total = stats?.total ?? event.total_attendees ?? 0;
  const checkedIn = stats?.checkedIn ?? event.checked_in_count ?? 0;
  const notArrived = stats?.notArrived ?? (total - checkedIn);
  const attendanceRate = stats?.attendanceRate ?? (total > 0 ? Number(((checkedIn / total) * 100).toFixed(1)) : 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Operational Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight">
              {event.name} Dashboard
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time gate ingress, credential validation, and attendance accounting.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenScanner}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-blue hover:bg-brand-blue-hover text-white transition-colors shadow-subtle"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch Scanner</span>
          </button>
          <button
            onClick={onOpenAddAttendee}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-brand-border bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-subtle"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>Add Attendee</span>
          </button>
        </div>
      </div>

      {/* 4 Core Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Registrations
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-brand-text font-mono">{total}</span>
            <span className="text-xs text-slate-500">Active Roster</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Verified credentials issued</span>
            <span className="font-mono text-slate-700 font-medium">100%</span>
          </div>
        </div>

        {/* Checked In */}
        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Checked In
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">{checkedIn}</span>
            <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Inside Venue
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Scan rate</span>
            <span className="font-mono text-slate-700 font-medium">{checkedIn} / {total} entries</span>
          </div>
        </div>

        {/* Not Yet Arrived */}
        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Not Yet Arrived
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 font-mono">{notArrived}</span>
            <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Expected
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Pending arrival</span>
            <span className="font-mono text-slate-700 font-medium">
              {total > 0 ? Math.round((notArrived / total) * 100) : 0}% remaining
            </span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-brand-text font-mono">{attendanceRate}%</span>
            <span className="text-xs text-slate-500">Live Quorum</span>
          </div>
          {/* Progress Mini Bar */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-brand-blue h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(attendanceRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Operational Details & Right Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overall Attendance Progress & Ticket Breakdown */}
          <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-text">Turnout by Ticket Tier</h3>
                <p className="text-xs text-slate-500 mt-0.5">Checked-in progress against registered quotas</p>
              </div>
              <button 
                onClick={onNavigateToAttendees}
                className="text-xs font-medium text-brand-blue hover:text-brand-blue-hover flex items-center gap-1 transition-colors"
              >
                <span>View Full Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-3.5">
              {stats?.breakdown && stats.breakdown.length > 0 ? (
                stats.breakdown.map((item) => {
                  const badge = getTicketBadgeStyle(item.ticketType);
                  return (
                    <div key={item.ticketType} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                          <span className="font-medium text-slate-700">{item.ticketType}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-500 font-mono text-[11px]">
                          <span className="font-semibold text-brand-text">{item.checkedIn}</span>
                          <span>/</span>
                          <span>{item.total}</span>
                          <span className="text-slate-400">({item.rate}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-blue h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(item.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">No ticket data available.</div>
              )}
            </div>
          </div>

          {/* Hourly Ingress Trends */}
          <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-text">Check-In Velocity</h3>
              </div>
              <span className="text-xs text-slate-400">Hourly volume</span>
            </div>

            {stats?.hourlyTrends && stats.hourlyTrends.length > 0 ? (
              <div className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats.hourlyTrends.map((trend) => (
                    <div key={trend.hour} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-center">
                      <div className="text-xs font-mono text-slate-500">{trend.hour}</div>
                      <div className="text-lg font-bold text-brand-text font-mono mt-0.5">{trend.count}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">entries</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                Waiting for check-in scans to populate velocity curves.
              </div>
            )}
          </div>

          {/* Event Venue & Operational Info */}
          <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle">
            <h3 className="text-sm font-semibold text-brand-text mb-3">Event Logistics & Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Venue Location</div>
                <div className="font-semibold text-brand-text mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-blue flex-shrink-0 mt-0.5" />
                  <span>{event.venue}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Operational Date</div>
                <div className="font-semibold text-brand-text mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
                  <span>{event.date_str}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Doors Open</div>
                <div className="font-semibold text-brand-text mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
                  <span>{event.doors_open}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Check-in Activity Stream */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-sm font-semibold text-brand-text">Recent Check-In Activity</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Real-Time</span>
            </div>

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[520px]">
              {stats?.recentCheckIns && stats.recentCheckIns.length > 0 ? (
                stats.recentCheckIns.map((item) => {
                  const badge = getTicketBadgeStyle(item.ticket_type);
                  return (
                    <div 
                      key={item.attendee_id} 
                      className="py-3 flex items-center justify-between hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center flex-shrink-0 border border-slate-200">
                          {getInitials(item.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-brand-text truncate">
                            {item.name}
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {item.ticket_type}
                            </span>
                            <span>•</span>
                            <span>{item.gate || 'Main Gate'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-xs font-mono font-medium text-slate-600">
                          {formatTimestamp(item.checked_in_at)}
                        </div>
                        <button
                          onClick={() => onViewAttendeePass(item.attendee_id)}
                          className="text-[10px] text-brand-blue hover:text-brand-blue-hover flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                        >
                          <span>Pass</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No attendees have checked in yet today.
                  <div className="mt-3">
                    <button
                      onClick={onOpenScanner}
                      className="text-xs font-medium text-brand-blue hover:underline"
                    >
                      Start scanning credentials
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-brand-border mt-auto">
              <button
                onClick={onOpenScanner}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-blue" />
                <span>Open Entrance Scanner</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
