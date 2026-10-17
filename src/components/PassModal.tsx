import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Attendee, Event } from '../types';
import { Modal } from './Modal';
import { getTicketBadgeStyle, formatTimestamp } from '../utils/formatters';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  User, 
  Building 
} from 'lucide-react';

interface PassModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: Attendee | null;
  event: Event | null;
}

export const PassModal: React.FC<PassModalProps> = ({
  isOpen,
  onClose,
  attendee,
  event
}) => {
  const [copied, setCopied] = useState(false);

  if (!attendee || !event) return null;

  const badgeStyle = getTicketBadgeStyle(attendee.ticket_type);

  // Payload encoded inside the QR code
  // We encode a structured JSON string or the raw passCode.
  // Including JSON with passCode makes it scannable by GatePass scanner while being secure
  const qrPayload = JSON.stringify({
    passCode: attendee.pass_code,
    eventId: event.id,
    attendeeId: attendee.id,
    name: attendee.name,
    type: attendee.ticket_type
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(attendee.pass_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    const svgElement = document.getElementById('pass-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `GatePass-${attendee.pass_code}-${attendee.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital GatePass & Ticket"
      subtitle={`Unique pass credentials for ${attendee.name}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Printable Ticket Card */}
        <div id="printable-ticket" className="bg-white rounded-xl border border-brand-border shadow-subtle overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-brand-navy text-white p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-brand-blue flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect width="18" height="18" x="3" y="3" rx="3" />
                    <rect width="4" height="4" x="7" y="7" />
                    <rect width="4" height="4" x="13" y="7" />
                    <rect width="4" height="4" x="7" y="13" />
                    <path d="M13 13h4v4" />
                  </svg>
                </div>
                <span className="font-bold text-sm tracking-tight">GatePass Official Ticket</span>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {attendee.ticket_type}
              </span>
            </div>

            <h4 className="text-lg font-bold text-white tracking-tight leading-snug">
              {event.name}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{event.tagline}</p>

            <div className="mt-3 pt-3 border-t border-brand-navy-light/60 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{event.date_str}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Doors: {event.doors_open}</span>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-5">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* QR Code Container */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <QRCodeSVG
                    id="pass-qr-svg"
                    value={qrPayload}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pass Code</div>
                  <div className="font-mono text-xs font-bold text-brand-text flex items-center justify-center gap-1 mt-0.5">
                    {attendee.pass_code}
                    <button
                      onClick={handleCopyCode}
                      className="text-slate-400 hover:text-brand-blue transition-colors p-0.5"
                      title="Copy Pass Code"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendee Details */}
              <div className="flex-1 w-full space-y-3 border-t sm:border-t-0 sm:border-l border-brand-border pt-4 sm:pt-0 sm:pl-5 text-left">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Attendee</span>
                  <div className="text-base font-bold text-brand-text leading-tight mt-0.5">{attendee.name}</div>
                  <div className="text-xs text-slate-600 truncate">{attendee.email}</div>
                </div>

                {attendee.company && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Organization</span>
                    <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {attendee.company}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Venue Access</span>
                  <div className="text-xs text-slate-600 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{event.venue}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">ID: {attendee.id}</span>
                  {attendee.checked_in === 1 ? (
                    <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                      Checked In ({formatTimestamp(attendee.checked_in_at)})
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Not Yet Arrived
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Security Footer */}
          <div className="bg-slate-50 px-5 py-2.5 border-t border-brand-border flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Cryptographically assigned unique pass identifier</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">v1.2.0</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>Tip:</span>
            <span>You can scan this QR code directly with the check-in scanner!</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadQr}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-brand-border bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-subtle"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-brand-navy hover:bg-brand-navy-light text-white transition-colors shadow-subtle"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Print Badge</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
