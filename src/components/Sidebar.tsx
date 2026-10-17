import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  QrCode, 
  FileBarChart, 
  Settings, 
  CheckCircle2,
  Radio,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  checkedInCount: number;
  totalCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  checkedInCount,
  totalCount
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendees', label: 'Attendees', icon: Users, badge: totalCount > 0 ? String(totalCount) : undefined },
    { id: 'scanner', label: 'Check-In Scanner', icon: QrCode, highlight: true },
    { id: 'reports', label: 'Attendance Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-brand-navy text-white flex flex-col h-full border-r border-brand-navy-light select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-brand-navy-light/60">
        <div className="flex items-center space-x-2.5">
          {/* Custom QR/Ticket Brand Icon */}
          <div className="w-9 h-9 rounded-lg bg-brand-blue flex items-center justify-center shadow-subtle flex-shrink-0">
            <svg 
              className="w-5 h-5 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="3" />
              <rect width="4" height="4" x="7" y="7" />
              <rect width="4" height="4" x="13" y="7" />
              <rect width="4" height="4" x="7" y="13" />
              <path d="M13 13h4v4" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-base tracking-tight leading-none text-white flex items-center gap-1.5">
              GatePass
              <span className="text-[10px] font-semibold bg-brand-blue/30 text-blue-200 px-1.5 py-0.5 rounded border border-blue-400/20">PRO</span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight mt-0.5">
              Every entry, accounted for.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-blue text-white shadow-subtle'
                  : 'text-slate-300 hover:text-white hover:bg-brand-navy-light/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                  isActive ? 'bg-white/20 text-white' : 'bg-brand-navy-light text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.highlight && !isActive && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live Terminal Status Indicator */}
      <div className="px-4 py-3 mx-3 mb-3 bg-brand-navy-dark/70 rounded-lg border border-brand-navy-light/60">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Gate 1 Entrance
          </span>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold">ONLINE</span>
        </div>
        <div className="text-[11px] text-slate-300 flex justify-between">
          <span>Processed today:</span>
          <span className="font-mono font-semibold text-white">{checkedInCount} / {totalCount}</span>
        </div>
      </div>

      {/* Organizer Profile Bottom Bar */}
      <div className="p-3.5 border-t border-brand-navy-light/60 bg-brand-navy-dark/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-semibold text-xs flex items-center justify-center border border-slate-600">
              SC
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">Sarah Chen</div>
              <div className="text-[11px] text-slate-400 truncate">Lead Event Ops</div>
            </div>
          </div>
          <button 
            onClick={() => onTabChange('settings')}
            title="Account & Terminal Settings"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-brand-navy-light rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
