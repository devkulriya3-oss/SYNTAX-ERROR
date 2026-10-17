import React, { useState } from 'react';
import { Event } from '../types';
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Volume2, 
  RefreshCw, 
  AlertTriangle, 
  HardDrive, 
  Check, 
  Radio, 
  Laptop 
} from 'lucide-react';

interface SettingsPageProps {
  event: Event;
  onResetData: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  event,
  onResetData
}) => {
  const [terminalName, setTerminalName] = useState('Staff Terminal 1');
  const [gateName, setGateName] = useState('Main Gate A');
  const [savedSettings, setSavedSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleSaveTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2000);
  };

  const handleExecuteReset = async () => {
    try {
      setIsResetting(true);
      await onResetData();
      setShowConfirmReset(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight">
          System & Terminal Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure local entrance hardware, check-in policies, and operational database controls.
        </p>
      </div>

      {/* Terminal Identification */}
      <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-brand-border">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-brand-text">Terminal & Entrance Ingress Lane</h3>
            <p className="text-xs text-slate-500">Labels stamped onto check-in transactions and audit trails</p>
          </div>
        </div>

        <form onSubmit={handleSaveTerminal} className="mt-4 space-y-4 max-w-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Entrance Gate / Lane
              </label>
              <input
                type="text"
                value={gateName}
                onChange={(e) => setGateName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Scanner Terminal Operator ID
              </label>
              <input
                type="text"
                value={terminalName}
                onChange={(e) => setTerminalName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-semibold rounded-lg transition-colors shadow-subtle flex items-center gap-1.5"
            >
              {savedSettings ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
              <span>{savedSettings ? 'Settings Saved' : 'Save Terminal Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Verification Policy */}
      <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-brand-border">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-brand-text">Verification Integrity Engine</h3>
            <p className="text-xs text-slate-500">Anti-tamper checks and concurrency enforcement rules</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="font-semibold text-brand-text">Atomic Transaction Check-In</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Every credential scan executes within an immediate SQLite database transaction, preventing concurrent race conditions.
              </div>
            </div>
            <span className="text-emerald-700 font-mono font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ACTIVE
            </span>
          </div>

          <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="font-semibold text-brand-text">Duplicate Entry Prevention (Anti-Passback)</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Previously used QR credentials are automatically rejected with amber alerts and logged with original timestamp and gate location.
              </div>
            </div>
            <span className="text-emerald-700 font-mono font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ENFORCED
            </span>
          </div>

          <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="font-semibold text-brand-text">Persistent Database Storage</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Backed by on-disk SQLite (<code className="font-mono text-slate-700">gatepass.db</code>). Data survives server restarts, browser refreshes, and crashes.
              </div>
            </div>
            <span className="text-blue-700 font-mono font-semibold text-[11px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              SQLITE V3
            </span>
          </div>
        </div>
      </div>

      {/* Reset Demo Data Card */}
      <div className="bg-white rounded-xl border border-red-200 p-5 shadow-subtle">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-red-100">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Reset Demo Data</h3>
            <p className="text-xs text-red-600">Restore the initial sample dataset for TechConnect 2026</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
            This will reset the attendee roster back to the default demo state (18 attendees, 10 checked in, 8 pending), resetting check-in timestamps and baseline audit logs.
          </p>

          {!showConfirmReset ? (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="px-3.5 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Baseline Data</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-subtle"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
