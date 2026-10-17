import React, { useState, useEffect, useCallback } from 'react';
import { Event, Attendee, EventStats, TicketType } from './types';
import { api } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OverviewPage } from './pages/OverviewPage';
import { AttendeesPage } from './pages/AttendeesPage';
import { ScannerPage } from './pages/ScannerPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PassModal } from './components/PassModal';
import { AttendeeFormModal } from './components/AttendeeFormModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Data states
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('evt_techconnect_2026');
  const [stats, setStats] = useState<EventStats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [viewingPassAttendee, setViewingPassAttendee] = useState<Attendee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, description?: string) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load events
  useEffect(() => {
    api.getEvents()
      .then((data) => {
        setEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load events:', err);
      });
  }, []);

  // Fetch current event stats and attendee list
  const refreshCurrentEventData = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      setLoading(true);
      const [statsData, attendeesData] = await Promise.all([
        api.getStats(selectedEventId),
        api.getAttendees(selectedEventId)
      ]);
      setStats(statsData);
      setAttendees(attendeesData);
    } catch (err: any) {
      console.error('Failed to refresh event data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    refreshCurrentEventData();
  }, [refreshCurrentEventData]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  // Handlers for Attendee operations
  const handleSaveAttendee = async (data: {
    name: string;
    email: string;
    phone?: string;
    ticket_type?: TicketType;
    company?: string;
    notes?: string;
  }) => {
    if (editingAttendee) {
      await api.updateAttendee(editingAttendee.id, data);
      addToast('success', 'Attendee updated', `Saved changes for ${data.name}`);
    } else {
      const created = await api.registerAttendee(selectedEventId, data);
      addToast('success', 'Attendee registered', `Issued pass code ${created.pass_code} for ${data.name}`);
    }
    await refreshCurrentEventData();
  };

  const handleDeleteAttendee = async () => {
    if (!deletingAttendee) return;
    await api.deleteAttendee(deletingAttendee.id);
    addToast('info', 'Registration deleted', `Removed record for ${deletingAttendee.name}`);
    await refreshCurrentEventData();
  };

  const handleToggleCheckIn = async (attendee: Attendee) => {
    try {
      if (attendee.checked_in === 1) {
        // Undo check-in
        await api.undoCheckIn(attendee.id);
        addToast('info', 'Check-In Reverted', `Marked ${attendee.name} as not yet arrived.`);
      } else {
        // Check in
        const res = await api.checkIn(attendee.pass_code, selectedEventId, 'Main Gate Override', 'Operations Desk');
        if (res.status === 'SUCCESS') {
          addToast('success', 'Checked In', `Confirmed entry for ${attendee.name}`);
        } else {
          addToast('warning', 'Notice', res.message);
        }
      }
      await refreshCurrentEventData();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  const handleResetData = async () => {
    try {
      await api.resetDemoData(selectedEventId);
      addToast('success', 'Demo Data Reset', 'Restored TechConnect 2026 baseline records.');
      await refreshCurrentEventData();
    } catch (err: any) {
      addToast('error', 'Reset failed', err.message);
    }
  };

  const handleViewAttendeePassById = (attendeeId: string) => {
    const found = attendees.find((a) => a.id === attendeeId);
    if (found) {
      setViewingPassAttendee(found);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg text-brand-text">
      {/* Desktop Left Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setMobileMenuOpen(false);
          }}
          checkedInCount={stats?.checkedIn ?? 0}
          totalCount={stats?.total ?? 0}
        />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-brand-navy z-10">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              currentTab={currentTab}
              onTabChange={(tab) => {
                setCurrentTab(tab);
                setMobileMenuOpen(false);
              }}
              checkedInCount={stats?.checkedIn ?? 0}
              totalCount={stats?.total ?? 0}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact Top Bar */}
        <Topbar
          events={events}
          selectedEvent={selectedEvent}
          onSelectEvent={(id) => setSelectedEventId(id)}
          onOpenScanner={() => setCurrentTab('scanner')}
          onOpenAddAttendee={() => {
            setEditingAttendee(null);
            setIsAddModalOpen(true);
          }}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {selectedEvent ? (
            <>
              {currentTab === 'overview' && (
                <OverviewPage
                  event={selectedEvent}
                  stats={stats}
                  onOpenScanner={() => setCurrentTab('scanner')}
                  onOpenAddAttendee={() => {
                    setEditingAttendee(null);
                    setIsAddModalOpen(true);
                  }}
                  onViewAttendeePass={handleViewAttendeePassById}
                  onNavigateToAttendees={() => setCurrentTab('attendees')}
                />
              )}

              {currentTab === 'attendees' && (
                <AttendeesPage
                  attendees={attendees}
                  loading={loading}
                  onOpenAddModal={() => {
                    setEditingAttendee(null);
                    setIsAddModalOpen(true);
                  }}
                  onEditAttendee={(att) => {
                    setEditingAttendee(att);
                    setIsAddModalOpen(true);
                  }}
                  onDeleteAttendee={(att) => setDeletingAttendee(att)}
                  onViewPass={(att) => setViewingPassAttendee(att)}
                  onToggleCheckIn={handleToggleCheckIn}
                />
              )}

              {currentTab === 'scanner' && (
                <ScannerPage
                  event={selectedEvent}
                  onCheckInSuccess={refreshCurrentEventData}
                  onViewAttendeePass={handleViewAttendeePassById}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsPage
                  event={selectedEvent}
                  stats={stats}
                  onRefresh={refreshCurrentEventData}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPage
                  event={selectedEvent}
                  onResetData={handleResetData}
                />
              )}
            </>
          ) : (
            <div className="py-20 text-center text-slate-400">
              Initializing GatePass operational data...
            </div>
          )}
        </main>
      </div>

      {/* Digital Pass / Ticket Modal */}
      <PassModal
        isOpen={!!viewingPassAttendee}
        onClose={() => setViewingPassAttendee(null)}
        attendee={viewingPassAttendee}
        event={selectedEvent}
      />

      {/* Add / Edit Attendee Modal */}
      <AttendeeFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAttendee(null);
        }}
        onSubmit={handleSaveAttendee}
        initialData={editingAttendee}
        mode={editingAttendee ? 'edit' : 'create'}
      />

      {/* Confirm Delete Registration Dialog */}
      <ConfirmModal
        isOpen={!!deletingAttendee}
        onClose={() => setDeletingAttendee(null)}
        onConfirm={handleDeleteAttendee}
        title="Delete Attendee Registration"
        message={`Are you sure you want to revoke and delete the registration for ${deletingAttendee?.name} (${deletingAttendee?.email})? This will invalidate pass code ${deletingAttendee?.pass_code} immediately.`}
        confirmText="Revoke & Delete"
        danger={true}
      />

      {/* Notification Toast Stream */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
