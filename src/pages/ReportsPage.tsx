import React, { useState, useEffect } from 'react';
import { Event, EventStats, CheckInLog } from '../types';
import { api } from '../api/client';
import { getTicketBadgeStyle, formatTimestamp } from '../utils/formatters';
import { 
  FileBarChart, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Undo2,
  Users, 
  UserCheck, 
  Clock, 
  Percent, 
  Filter,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

interface ReportsPageProps {
  event: Event;
  stats: EventStats | null;
  onRefresh: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  event,
  stats,
  onRefresh
}) => {
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await api.getLogs(event.id, {
        status: logStatusFilter,
        search: logSearch
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load check-in logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [event.id, logStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const total = stats?.total ?? 0;
  const checkedIn = stats?.checkedIn ?? 0;
  const notArrived = stats?.notArrived ?? 0;
  const rate = stats?.attendanceRate ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight">
              Attendance Reports & Audits
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {event.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete reconciliation, attendance velocity, and exportable compliance records.
          </p>
        </div>

        {/* CSV Export Action Group */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <a
            href={api.getExportAttendeesUrl(event.id)}
            download
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-brand-border text-slate-700 hover:bg-slate-50 transition-colors shadow-subtle"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Attendees CSV</span>
          </a>

          <a
            href={api.getExportLogsUrl(event.id)}
            download
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand-navy hover:bg-brand-navy-light text-white transition-colors shadow-subtle"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Export Audit Logs CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Registrations
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-brand-text font-mono">{total}</span>
            <span className="text-xs text-slate-400">100% Roster</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Verified Checked-In
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">{checkedIn}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {rate}% Ingress
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Absent / Not Yet Arrived
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 font-mono">{notArrived}</span>
            <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {total > 0 ? Math.round((notArrived / total) * 100) : 0}% Pending
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-border shadow-subtle">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Attendance Rate
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-brand-blue font-mono">{rate}%</span>
            <span className="text-xs text-slate-400">Audited</span>
          </div>
        </div>
      </div>

      {/* Ticket Breakdown Detailed Table */}
      <div className="bg-white rounded-xl border border-brand-border shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-brand-text">Turnout Breakdown by Ticket Tier</h3>
            <p className="text-xs text-slate-500 mt-0.5">Category-specific verification rates and arrival accounting</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-brand-border text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket Tier</th>
                <th className="py-3 px-4">Total Registered</th>
                <th className="py-3 px-4">Checked In</th>
                <th className="py-3 px-4">Not Arrived</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4 w-48">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {stats?.breakdown && stats.breakdown.length > 0 ? (
                stats.breakdown.map((item) => {
                  const badge = getTicketBadgeStyle(item.ticketType);
                  return (
                    <tr key={item.ticketType} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-brand-text">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1.5`}></span>
                          {item.ticketType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{item.total}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-600">{item.checkedIn}</td>
                      <td className="py-3 px-4 font-mono text-amber-700">{item.notArrived}</td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-text">{item.rate}%</td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-blue h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(item.rate, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No ticket tiers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Audit & Check-In Log */}
      <div className="bg-white rounded-xl border border-brand-border shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-brand-text">Entrance Verification Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological record of all scans, duplicates, and validation events</p>
          </div>

          {/* Filter & Search */}
          <div className="flex items-center space-x-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search log records..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </form>

            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-brand-border rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Events</option>
              <option value="SUCCESS">Success Only</option>
              <option value="ALREADY_CHECKED_IN">Duplicate Attempts</option>
              <option value="INVALID">Invalid Scans</option>
              <option value="UNDO">Reversals</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-brand-border text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Status</th>
                <th className="py-3 px-4">Attendee / Subject</th>
                <th className="py-3 px-4">Pass Code</th>
                <th className="py-3 px-4">Gate & Terminal</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loadingLogs ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No log records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {log.scanned_at}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Success
                          </span>
                        ) : log.status === 'ALREADY_CHECKED_IN' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                            Duplicate Blocked
                          </span>
                        ) : log.status === 'UNDO' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Undo2 className="w-3 h-3 mr-1 text-blue-600" />
                            Reverted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3 mr-1 text-red-600" />
                            Invalid Pass
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 font-medium text-brand-text">
                        {log.attendee_name || (
                          <span className="text-slate-400 italic">Unidentified / Invalid</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {log.pass_code}
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        <div>{log.gate}</div>
                        <div className="text-slate-400 text-[10px]">{log.operator}</div>
                      </td>

                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-50/80 border-t border-brand-border flex items-center justify-between text-xs text-slate-500">
          <span>Displaying latest {logs.length} audit entries</span>
          <span className="font-mono text-[11px] text-slate-400">Audit retention: Indefinite</span>
        </div>
      </div>
    </div>
  );
};
