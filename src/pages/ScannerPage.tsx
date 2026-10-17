import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Event, CheckInResult, Attendee } from '../types';
import { api } from '../api/client';
import { sound } from '../utils/sound';
import { getTicketBadgeStyle, formatTimestamp } from '../utils/formatters';
import { 
  Camera, 
  CameraOff, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ScannerPageProps {
  event: Event;
  onCheckInSuccess: () => void;
  onViewAttendeePass: (attendeeId: string) => void;
}

interface ScanHistoryItem {
  id: string;
  timestamp: string;
  passCode: string;
  result: CheckInResult;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({
  event,
  onCheckInSuccess,
  onViewAttendeePass
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Latest check-in result
  const [latestResult, setLatestResult] = useState<CheckInResult | null>(null);

  // Session scan history
  const [sessionHistory, setSessionHistory] = useState<ScanHistoryItem[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewport';
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  // Sync sound service preference
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Discover available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment/back camera if available
          const backCam = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No camera devices detected on this system.');
        }
      })
      .catch((err) => {
        // Camera permission denied or HTTPS requirement
        console.warn('Camera discovery error:', err);
        setCameraError(
          window.isSecureContext === false
            ? 'Camera access requires a secure connection (HTTPS or localhost).'
            : 'Camera access denied or unavailable. You can use Manual Code Entry anytime.'
        );
      });

    return () => {
      stopCameraScanning();
    };
  }, []);

  const startCameraScanning = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const cameraIdOrConfig = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraIdOrConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        (errorMessage) => {
          // Frame parse failure (normal when no QR code in frame)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setIsScanning(false);
      setCameraError(err?.message || 'Could not access camera. Please check browser permissions.');
    }
  };

  const stopCameraScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        // Ignore stop error
      }
    }
    setIsScanning(false);
  };

  // Process code from camera or manual entry
  const processPassCode = async (rawCode: string) => {
    if (!rawCode || isProcessing) return;

    try {
      setIsProcessing(true);
      const result = await api.checkIn(rawCode, event.id, 'Main Gate A', 'Staff Terminal 1');

      setLatestResult(result);

      // Play audio feedback based on result status
      if (result.status === 'SUCCESS') {
        sound.playSuccess();
        onCheckInSuccess();
      } else if (result.status === 'ALREADY_CHECKED_IN') {
        sound.playDuplicate();
      } else {
        sound.playInvalid();
      }

      // Add to session scan history
      setSessionHistory((prev) => [
        {
          id: 'scan_' + Date.now(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
          passCode: rawCode,
          result
        },
        ...prev.slice(0, 19) // keep last 20
      ]);

      if (activeTab === 'manual') {
        setManualCode('');
      }
    } catch (err: any) {
      const errorResult: CheckInResult = {
        success: false,
        status: 'INVALID',
        message: err.message || 'Verification failed. Server connection error.',
        passCode: rawCode
      };
      setLatestResult(errorResult);
      sound.playInvalid();
    } finally {
      setIsProcessing(false);
    }
  };

  // Throttled camera scan handler
  const handleDetectedCode = (decodedText: string) => {
    const now = Date.now();
    // Prevent re-scanning the exact same code within 3 seconds
    if (decodedText === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 3000) {
      return;
    }

    lastScannedCodeRef.current = decodedText;
    lastScanTimestampRef.current = now;

    processPassCode(decodedText);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processPassCode(manualCode.trim());
  };

  const handleTestPass = (code: string) => {
    setManualCode(code);
    processPassCode(code);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Entrance Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-brand-border shadow-subtle">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-brand-text tracking-tight">
              Entrance Check-In Terminal
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Gate 1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Scanning credentials for <strong className="text-slate-700">{event.name}</strong> • Metropolitan Convention Center
          </p>
        </div>

        {/* Audio Mute / Unmute & Mode Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-slate-50 text-slate-700 border-brand-border hover:bg-slate-100'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title={soundEnabled ? 'Mute scanner chime' : 'Unmute scanner chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Input Area (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Method Selector Tabs */}
          <div className="flex items-center border-b border-brand-border bg-white rounded-t-xl px-4 pt-2">
            <button
              onClick={() => {
                setActiveTab('camera');
                if (!isScanning) startCameraScanning();
              }}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                activeTab === 'camera'
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scanner</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('manual');
                stopCameraScanning();
              }}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Manual Pass Code</span>
            </button>
          </div>

          {/* Active Tab View */}
          <div className="bg-white rounded-b-xl border border-t-0 border-brand-border p-5 shadow-subtle min-h-[380px] flex flex-col justify-center">
            {activeTab === 'camera' ? (
              <div className="space-y-4">
                {/* Viewport for html5-qrcode */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-square max-w-[340px] mx-auto flex items-center justify-center">
                  <div id={scannerContainerId} className="w-full h-full" />

                  {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300 bg-slate-900/90 z-10">
                      <Camera className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-300 font-medium">Camera is currently paused.</p>
                      <button
                        onClick={startCameraScanning}
                        className="mt-3 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-semibold rounded-lg shadow transition-colors"
                      >
                        Start Camera
                      </button>
                    </div>
                  )}

                  {/* Target frame overlay when scanning */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-brand-blue/80 rounded-xl relative shadow-lg">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-brand-blue"></div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-brand-blue"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-brand-blue"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-brand-blue"></div>
                        <div className="w-full h-0.5 bg-brand-blue/70 absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera controls & errors */}
                {cameraError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold block">Camera Notice:</span>
                      <span>{cameraError}</span>
                      <div className="mt-1">
                        <button
                          onClick={() => setActiveTab('manual')}
                          className="text-brand-blue font-semibold hover:underline"
                        >
                          Switch to Manual Pass Code entry
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 text-xs">
                  {cameras.length > 1 && (
                    <div className="flex items-center space-x-1.5 text-slate-600">
                      <span>Camera:</span>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          setSelectedCameraId(e.target.value);
                          if (isScanning) {
                            stopCameraScanning().then(() => startCameraScanning());
                          }
                        }}
                        className="bg-slate-50 border border-brand-border rounded px-2 py-1 text-xs"
                      >
                        {cameras.map((cam) => (
                          <option key={cam.id} value={cam.id}>
                            {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="ml-auto">
                    {isScanning ? (
                      <button
                        onClick={stopCameraScanning}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <CameraOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>Stop Camera</span>
                      </button>
                    ) : (
                      <button
                        onClick={startCameraScanning}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Start Camera</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Manual Code Entry */
              <div className="space-y-5 max-w-md mx-auto w-full py-4">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Enter Pass Identifier or Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. GP-TC26-GA113 or att_111"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="w-full pl-10 pr-24 py-3 text-base font-mono font-bold uppercase tracking-wider bg-slate-50 border border-brand-border rounded-xl text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isProcessing || !manualCode.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 shadow-subtle"
                      >
                        <span>Verify</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Type the attendee pass code or paste JSON payload and press Enter.
                    </p>
                  </div>
                </form>

                {/* Quick-Test Demo Buttons */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Quick-Test Preset Passes
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleTestPass('GP-TC26-GA113')}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors font-mono flex items-center gap-1"
                    >
                      <span>Valid: Lucas Bernard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestPass('GP-TC26-SPK01')}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors font-mono flex items-center gap-1"
                    >
                      <span>Duplicate: Elena Rostova</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestPass('GP-INVALID-SAMPLE-99')}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg transition-colors font-mono flex items-center gap-1"
                    >
                      <span>Invalid Code</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Result Panel (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Verification Status
              </span>
              {latestResult && (
                <button
                  onClick={() => setLatestResult(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Verification State Render */}
            <div className="flex-1 flex flex-col justify-center my-4">
              {!latestResult ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-brand-text">Awaiting Pass Scan</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      Position attendee QR pass inside camera viewport, or enter pass code manually.
                    </p>
                  </div>
                </div>
              ) : latestResult.status === 'SUCCESS' ? (
                /* 1. GREEN SUCCESS BANNER */
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-status-success-bg border border-status-success-border rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-status-success-text">
                          ENTRY VERIFIED & CHECKED IN
                        </div>
                        <div className="text-xs text-emerald-800 mt-0.5">
                          {latestResult.message}
                        </div>
                      </div>
                    </div>
                  </div>

                  {latestResult.attendee && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Attendee Details
                        </span>
                        <div className="text-base font-bold text-brand-text mt-0.5">
                          {latestResult.attendee.name}
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {latestResult.attendee.email}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/80">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Tier</span>
                          <div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-800">
                              {latestResult.attendee.ticket_type}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Check-In Time</span>
                          <div className="font-mono font-medium text-slate-800 mt-0.5">
                            {formatTimestamp(latestResult.checkInTime || latestResult.attendee.checked_in_at)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">
                          Code: {latestResult.attendee.pass_code}
                        </span>
                        <button
                          onClick={() => onViewAttendeePass(latestResult.attendee!.id)}
                          className="text-brand-blue font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Full Pass</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : latestResult.status === 'ALREADY_CHECKED_IN' ? (
                /* 2. AMBER WARNING: ALREADY USED */
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-status-warning-bg border border-status-warning-border rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-status-warning-text">
                          PASS ALREADY CHECKED IN
                        </div>
                        <div className="text-xs text-amber-900 mt-0.5">
                          Duplicate scan detected. This pass was already validated.
                        </div>
                      </div>
                    </div>
                  </div>

                  {latestResult.attendee && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Registered Attendee
                        </span>
                        <div className="text-base font-bold text-brand-text mt-0.5">
                          {latestResult.attendee.name}
                        </div>
                        <div className="text-xs text-slate-600">
                          {latestResult.attendee.email} • {latestResult.attendee.ticket_type}
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs space-y-1">
                        <div className="text-amber-900 font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Initial Entry Timestamp:</span>
                        </div>
                        <div className="font-mono text-amber-950 font-bold pl-5">
                          {formatTimestamp(latestResult.previousCheckInTime || latestResult.attendee.checked_in_at)}
                        </div>
                        <div className="text-[11px] text-amber-800 pl-5">
                          Validated via: {latestResult.previousGate || latestResult.attendee.gate || 'Main Gate'}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic">
                        Security Notice: To prevent unauthorized pass sharing, duplicate entries are blocked.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* 3. RED ERROR: INVALID PASS */
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-status-error-bg border border-status-error-border rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-status-error-text">
                          INVALID PASS CREDENTIAL
                        </div>
                        <div className="text-xs text-red-900 mt-0.5">
                          {latestResult.message}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Scanned Code
                    </span>
                    <div className="font-mono text-sm font-bold text-slate-800 bg-white p-2 rounded border border-slate-200 break-all">
                      {latestResult.passCode || 'UNKNOWN_CODE'}
                    </div>
                    <p className="text-slate-500 text-[11px] pt-1">
                      Check if the pass code was entered correctly or if the attendee is registered for a different event session.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom summary / status */}
            <div className="pt-3 border-t border-brand-border flex items-center justify-between text-xs text-slate-400">
              <span>Terminal: Staff Terminal 1</span>
              <span>Lane: Main Gate A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Session Scans Log */}
      <div className="bg-white rounded-xl border border-brand-border p-5 shadow-subtle">
        <div className="flex items-center justify-between pb-3 border-b border-brand-border">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-brand-text">Session Scan History</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {sessionHistory.length} events
            </span>
          </div>
          {sessionHistory.length > 0 && (
            <button
              onClick={() => setSessionHistory([])}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear Session Log
            </button>
          )}
        </div>

        {sessionHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No scans logged in this terminal session yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {sessionHistory.map((item) => {
              const res = item.result;
              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    {res.status === 'SUCCESS' ? (
                      <span className="p-1 rounded bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : res.status === 'ALREADY_CHECKED_IN' ? (
                      <span className="p-1 rounded bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-red-100 text-red-700">
                        <XCircle className="w-3.5 h-3.5" />
                      </span>
                    )}

                    <div>
                      <div className="font-semibold text-brand-text">
                        {res.attendee ? res.attendee.name : `Scanned: ${item.passCode}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {res.status === 'SUCCESS' ? (
                          <span className="text-emerald-700 font-medium">Checked In ({res.attendee?.ticket_type})</span>
                        ) : res.status === 'ALREADY_CHECKED_IN' ? (
                          <span className="text-amber-700 font-medium">Duplicate blocked (Prior at {res.previousCheckInTime})</span>
                        ) : (
                          <span className="text-red-600 font-medium">Invalid pass identifier</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[11px] text-slate-400">{item.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
