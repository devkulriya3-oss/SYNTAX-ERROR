import React, { useState, useMemo } from 'react';
import { Attendee, TicketType } from '../types';
import { getTicketBadgeStyle, formatTimestamp, getInitials } from '../utils/formatters';
import { 
  Search, 
  Filter, 
  UserPlus, 
  QrCode, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  MoreVertical,
  X,
  ExternalLink,
  Undo2
} from 'lucide-react';

interface AttendeesPageProps {
  attendees: Attendee[];
  loading: boolean;
  onOpenAddModal: () => void;
  onEditAttendee: (attendee: Attendee) => void;
  onDeleteAttendee: (attendee: Attendee) => void;
  onViewPass: (attendee: Attendee) => void;
  onToggleCheckIn: (attendee: Attendee) => void;
}

export const AttendeesPage: React.FC<AttendeesPageProps> = ({
  attendees,
  loading,
  onOpenAddModal,
  onEditAttendee,
  onDeleteAttendee,
  onViewPass,
  onToggleCheckIn
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'not_arrived'>('all');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyPassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        a.name.toLowerCase().includes(search) ||
        a.email.toLowerCase().includes(search) ||
        a.pass_code.toLowerCase().includes(search) ||
        (a.company && a.company.toLowerCase().includes(search));

      // Status
      let matchesStatus = true;
      if (statusFilter === 'checked_in') {
        matchesStatus = a.checked_in === 1;
      } else if (statusFilter === 'not_arrived') {
        matchesStatus = a.checked_in === 0;
      }

      // Ticket Type
      let matchesTicket = true;
      if (ticketFilter !== 'all') {
        matchesTicket = a.ticket_type === ticketFilter;
      }

      return matchesSearch && matchesStatus && matchesTicket;
    });
  }, [attendees, searchTerm, statusFilter, ticketFilter]);

  const uniqueTicketTypes = useMemo(() => {
    const set = new Set<string>();
    attendees.forEach((a) => set.add(a.ticket_type));
    return Array.from(set);
  }, [attendees]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTicketFilter('all');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || ticketFilter !== 'all';

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight">
              Attendee Roster
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredAttendees.length} of {attendees.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage registrations, credentials, digital pass issuance, and manual gate overrides.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-blue hover:bg-brand-blue-hover text-white transition-colors shadow-subtle self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Attendee</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-brand-border shadow-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search attendees by name, email, company, or pass code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-50 border border-brand-border rounded-lg text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2.5 self-auto">
          {/* Status Segmented Control */}
          <div className="inline-flex rounded-lg border border-brand-border bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-brand-text shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('checked_in')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'checked_in'
                  ? 'bg-white text-emerald-700 shadow-subtle font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Checked In
            </button>
            <button
              onClick={() => setStatusFilter('not_arrived')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'not_arrived'
                  ? 'bg-white text-amber-700 shadow-subtle font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Not Arrived
            </button>
          </div>

          {/* Ticket Type Select */}
          <div className="relative">
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-brand-border rounded-lg pl-2.5 pr-7 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors cursor-pointer"
            >
              <option value="all">All Tiers</option>
              {uniqueTicketTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-brand-blue hover:text-brand-blue-hover font-medium underline px-1.5"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-xl border border-brand-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-brand-border text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Attendee</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Ticket Tier</th>
                <th className="py-3 px-4">Pass Identifier</th>
                <th className="py-3 px-4">Status & Ingress</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-xs">
              {loading && attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading attendee roster...
                  </td>
                </tr>
              ) : filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Search className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-brand-text">No attendees match your criteria</h4>
                      <p className="text-xs text-slate-500">
                        Try adjusting your search terms or filters to find what you're looking for.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-xs font-semibold text-brand-blue hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((attendee) => {
                  const badge = getTicketBadgeStyle(attendee.ticket_type);
                  return (
                    <tr
                      key={attendee.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Company */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center flex-shrink-0 border border-slate-200">
                            {getInitials(attendee.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-brand-text text-sm">
                              {attendee.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {attendee.company || 'Individual Registration'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium">{attendee.email}</div>
                        {attendee.phone && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {attendee.phone}
                          </div>
                        )}
                      </td>

                      {/* Ticket Tier */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1.5`}></span>
                          {attendee.ticket_type}
                        </span>
                      </td>

                      {/* Pass Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 font-mono text-xs text-slate-700 bg-slate-50 border border-slate-200/80 rounded px-2 py-1 w-max">
                          <span>{attendee.pass_code}</span>
                          <button
                            onClick={() => handleCopyPassCode(attendee.pass_code)}
                            className="text-slate-400 hover:text-brand-blue transition-colors p-0.5"
                            title="Copy pass code"
                          >
                            {copiedCode === attendee.pass_code ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {attendee.checked_in === 1 ? (
                          <div>
                            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Checked In
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {formatTimestamp(attendee.checked_in_at)} • {attendee.gate || 'Main Gate'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            Not Arrived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View QR Pass */}
                          <button
                            onClick={() => onViewPass(attendee)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-brand-blue hover:bg-slate-100 transition-colors"
                            title="View QR Pass & Printable Ticket"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Quick Toggle Check-in/Undo */}
                          <button
                            onClick={() => onToggleCheckIn(attendee)}
                            className={`p-1.5 rounded-md transition-colors ${
                              attendee.checked_in === 1
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={attendee.checked_in === 1 ? 'Revert Check-In' : 'Manual Check-In'}
                          >
                            {attendee.checked_in === 1 ? (
                              <Undo2 className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEditAttendee(attendee)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit Attendee"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteAttendee(attendee)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Registration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-brand-border flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredAttendees.length} registrations</span>
          <span className="font-mono text-[11px] text-slate-400">Total database records: {attendees.length}</span>
        </div>
      </div>
    </div>
  );
};
