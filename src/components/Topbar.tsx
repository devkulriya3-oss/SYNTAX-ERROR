import React from 'react';
import { Event } from '../types';
import { 
  Calendar, 
  MapPin, 
  ChevronDown, 
  QrCode, 
  UserPlus, 
  Menu,
  Sparkles
} from 'lucide-react';

interface TopbarProps {
  events: Event[];
  selectedEvent: Event | null;
  onSelectEvent: (eventId: string) => void;
  onOpenScanner: () => void;
  onOpenAddAttendee: () => void;
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onOpenScanner,
  onOpenAddAttendee,
  onToggleMobileMenu
}) => {
  return (
    <header className="h-16 bg-white border-b border-brand-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Event Selector Dropdown */}
        <div className="relative">
          <div className="flex items-center space-x-2">
            <div className="text-xs font-medium text-slate-400 hidden sm:inline-block">Event:</div>
            <div className="relative">
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => onSelectEvent(e.target.value)}
                className="appearance-none bg-slate-50 border border-brand-border hover:border-slate-300 font-semibold text-brand-text text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors cursor-pointer"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} {evt.status === 'active' ? '• Live' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Event Venue and Date Badges (Desktop) */}
        {selectedEvent && (
          <div className="hidden md:flex items-center space-x-3 text-xs text-slate-500 border-l border-brand-border pl-4">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedEvent.date_str}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1.5 truncate max-w-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{selectedEvent.venue}</span>
            </div>
            {selectedEvent.status === 'active' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Check-In Open
              </span>
            )}
          </div>
        )}
      </div>

      {/* Primary Actions */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenScanner}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-brand-blue hover:bg-brand-blue-hover text-white transition-colors shadow-subtle"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Pass</span>
        </button>

        <button
          onClick={onOpenAddAttendee}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-brand-border bg-white hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Add Attendee</span>
        </button>
      </div>
    </header>
  );
};
