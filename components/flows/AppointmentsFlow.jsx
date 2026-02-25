// components/flows/AppointmentsFlow.jsx
// Wired to Supabase — uses reconciled appointments schema (06_launch_schema_reconciliation.sql).
// Joins services_catalogue, service_locations, clinician_profiles for display names.
'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, User, ChevronRight, X, AlertCircle, Edit2, Trash2, Loader2, Plus } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const AppointmentsFlow = ({ onNavigate }) => {
  const [appointments, setAppointments]           = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [currentView, setCurrentView]             = useState('list');
  const [selected, setSelected]                   = useState(null);
  const [filterTab, setFilterTab]                 = useState('upcoming');
  const [showCancelModal, setShowCancelModal]      = useState(false);
  const [cancelReason, setCancelReason]           = useState('');
  const [cancelling, setCancelling]               = useState(false);

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    try {
      setError(null);
      const user = await getCurrentUser();
      if (!user) { onNavigate('welcome'); return; }

      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_type,
          status,
          scheduled_at,
          duration_minutes,
          chief_complaint,
          notes,
          payment_method,
          fee_usd,
          paid,
          video_room_url,
          created_at,
          services_catalogue ( name, icon, category ),
          service_locations ( name, address, location_type ),
          clinician_profiles ( full_name )
        `)
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (fetchError) throw fetchError;
      setAppointments(data || []);
    } catch (err) {
      console.error('Appointments fetch error:', err);
      setError('Could not load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', cancellation_reason: cancelReason, updated_at: new Date().toISOString() })
        .eq('id', selected.id);

      if (updateError) throw updateError;

      // Update local state immediately
      setAppointments(prev => prev.map(a =>
        a.id === selected.id ? { ...a, status: 'cancelled' } : a
      ));
      setShowCancelModal(false);
      setCurrentView('list');
      setCancelReason('');
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Could not cancel appointment. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getFiltered = () => {
    const now = new Date();
    if (filterTab === 'upcoming')
      return appointments.filter(a =>
        (a.status === 'pending' || a.status === 'confirmed') &&
        new Date(a.scheduled_at) >= now
      );
    if (filterTab === 'past')
      return appointments.filter(a =>
        a.status === 'completed' || a.status === 'cancelled' ||
        new Date(a.scheduled_at) < now
      );
    return appointments;
  };

  const statusColor = (s) => ({
    pending:    'bg-amber-100 text-amber-700',
    confirmed:  'bg-green-100 text-green-700',
    completed:  'bg-gray-100 text-gray-600',
    cancelled:  'bg-red-100 text-red-700',
    no_show:    'bg-red-100 text-red-700',
    rescheduled:'bg-blue-100 text-blue-700',
  }[s] || 'bg-gray-100 text-gray-600');

  const statusLabel = (s) => ({
    pending:     'Pending',
    confirmed:   'Confirmed',
    completed:   'Completed',
    cancelled:   'Cancelled',
    no_show:     'No Show',
    in_progress: 'In Progress',
    rescheduled: 'Rescheduled',
  }[s] || s);

  // Use joined service name or fall back to appointment_type
  const getServiceName = (apt) =>
    apt.services_catalogue?.name || apt.appointment_type || 'Appointment';

  const getServiceIcon = (apt) =>
    apt.services_catalogue?.icon || '🗓️';

  const getLocationName = (apt) =>
    apt.service_locations?.name || null;

  const getLocationAddress = (apt) =>
    apt.service_locations?.address || null;

  const getIsVirtual = (apt) =>
    apt.service_locations?.location_type === 'virtual' ||
    apt.appointment_type === 'video' || apt.appointment_type === 'audio';

  const getClinicianName = (apt) =>
    apt.clinician_profiles?.full_name || null;

  const canCancel = (a) => {
    const hrs = (new Date(a.scheduled_at) - new Date()) / 3_600_000;
    return hrs > 2 && (a.status === 'pending' || a.status === 'confirmed');
  };

  const canReschedule = (a) => {
    const hrs = (new Date(a.scheduled_at) - new Date()) / 3_600_000;
    return hrs > 24 && a.status === 'pending';
  };

  const formatScheduledAt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateOnly = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTimeOnly = (iso, durationMins) => {
    if (!iso) return '';
    const start = new Date(iso);
    const end = new Date(start.getTime() + (durationMins || 30) * 60000);
    const fmt = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading appointments...</p>
      </div>
    </div>
  );

  // ─── LIST ─────────────────────────────────────────────────────────────────
  if (currentView === 'list') {
    const filtered = getFiltered();
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-md mx-auto px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => onNavigate('homepage')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Appointments</h1>
              </div>
              <button onClick={() => onNavigate('booking')} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Book New
              </button>
            </div>
            <div className="flex gap-2">
              {['upcoming', 'past', 'all'].map(tab => (
                <button key={tab} onClick={() => setFilterTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterTab === tab ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-6">
          {/* Error — styled as a calm empty state, not a scary banner */}
          {error && (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(13,115,119,0.12), rgba(20,160,133,0.08))', border: '1.5px solid rgba(13,115,119,0.15)' }}>
                <Calendar className="w-9 h-9" style={{ color: '#0D7377' }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Appointments unavailable</h3>
              <p className="text-sm text-gray-500 mb-1 max-w-xs">
                We couldn't load your appointments right now.
              </p>
              <p className="text-xs text-gray-400 mb-6 max-w-xs">
                This usually resolves on its own — try refreshing, or book a new appointment below.
              </p>
              <div className="flex gap-3">
                <button onClick={fetchAppointments}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50">
                  Try again
                </button>
                <button onClick={() => onNavigate('booking')}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0D7377, #14A085)' }}>
                  Book New
                </button>
              </div>
            </div>
          )}

          {/* Empty */}
          {!error && filtered.length === 0 && (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(13,115,119,0.12), rgba(20,160,133,0.08))', border: '1.5px solid rgba(13,115,119,0.15)' }}>
                <Calendar className="w-9 h-9" style={{ color: '#0D7377' }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {filterTab === 'upcoming' ? 'No upcoming appointments' : filterTab === 'past' ? 'No past appointments' : 'No appointments yet'}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                {filterTab === 'upcoming'
                  ? 'Book a GP, mental health, or specialist appointment in minutes.'
                  : 'Your appointment history will appear here once you've had a visit.'}
              </p>
              {filterTab !== 'past' && (
                <button onClick={() => onNavigate('booking')}
                  className="px-6 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0D7377, #14A085)' }}>
                  Book an Appointment
                </button>
              )}
            </div>
          )}

          {/* List */}
          {!error && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map(apt => (
                <div key={apt.id} onClick={() => { setSelected(apt); setCurrentView('detail'); }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getServiceIcon(apt)}</span>
                        <span className="font-semibold text-gray-900">{getServiceName(apt)}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {formatScheduledAt(apt.scheduled_at)}
                      </div>
                      {getLocationName(apt) && (
                        <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 flex-shrink-0" />{getLocationName(apt)}
                        </div>
                      )}
                      {getClinicianName(apt) && (
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <User className="w-4 h-4 flex-shrink-0" />{getClinicianName(apt)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor(apt.status)}`}>
                        {statusLabel(apt.status)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── DETAIL ───────────────────────────────────────────────────────────────
  if (currentView === 'detail' && selected) {
    const apt = selected;
    const isVirtual = getIsVirtual(apt);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
            <button onClick={() => setCurrentView('list')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Appointment Details</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-6 space-y-4">
          {/* Status banner */}
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${
            apt.status === 'confirmed' ? 'bg-green-50 border border-green-100' :
            apt.status === 'completed' ? 'bg-gray-50 border border-gray-100' :
            apt.status === 'cancelled' ? 'bg-red-50 border border-red-100' :
            'bg-blue-50 border border-blue-100'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              apt.status === 'confirmed' ? 'bg-green-100' :
              apt.status === 'completed' ? 'bg-gray-100' :
              apt.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <Calendar className={`w-5 h-5 ${
                apt.status === 'confirmed' ? 'text-green-600' :
                apt.status === 'completed' ? 'text-gray-600' :
                apt.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="font-semibold text-gray-900">
              {apt.status === 'scheduled' && 'Your appointment is scheduled'}
              {apt.status === 'confirmed' && 'Confirmed — see you soon!'}
              {apt.status === 'completed' && 'Appointment completed'}
              {apt.status === 'cancelled' && 'This appointment was cancelled'}
            </div>
          </div>

          {/* Service + Details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Details</h3>

            {/* Service */}
            <div className="flex gap-3">
              <span className="text-2xl">{getServiceIcon(apt)}</span>
              <div>
                <div className="text-sm text-gray-500">Service</div>
                <div className="font-semibold text-gray-900">{getServiceName(apt)}</div>
                {apt.duration_minutes && <div className="text-sm text-gray-500">{apt.duration_minutes} min</div>}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Date & Time</div>
                <div className="font-semibold text-gray-900">{formatDateOnly(apt.scheduled_at)}</div>
                {apt.scheduled_at && (
                  <div className="text-gray-700">{formatTimeOnly(apt.scheduled_at, apt.duration_minutes)}</div>
                )}
              </div>
            </div>

            {/* Location */}
            {getLocationName(apt) && (
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="font-semibold text-gray-900">{getLocationName(apt)}</div>
                  {getLocationAddress(apt) && <div className="text-sm text-gray-500">{getLocationAddress(apt)}</div>}
                  {getIsVirtual(apt) && <div className="text-sm text-blue-600 mt-1">Video call — link sent 15 min before</div>}
                </div>
              </div>
            )}

            {/* Clinician */}
            {getClinicianName(apt) ? (
              <div className="flex gap-3">
                <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Clinician</div>
                  <div className="font-semibold text-gray-900">{getClinicianName(apt)}</div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                <User className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-800">Clinician will be assigned after confirmation</p>
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          {(apt.chief_complaint || apt.notes) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              {apt.chief_complaint && <div className="mb-3"><div className="text-sm text-gray-500 mb-1">Reason</div><div className="text-gray-900">{apt.chief_complaint}</div></div>}
              {apt.notes  && <div><div className="text-sm text-gray-500 mb-1">Notes</div><div className="text-gray-900">{apt.notes}</div></div>}
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Payment</h3>
            <div className="flex items-center justify-between">
              <div><div className="text-sm text-gray-500">Method</div><div className="font-semibold text-gray-900 capitalize">{apt.payment_method || '—'}</div></div>
              <div className="text-right"><div className="text-sm text-gray-500">Amount</div><div className="font-semibold text-gray-900">{apt.fee_usd == 0 ? 'Free' : `$${Number(apt.fee_usd || 0).toFixed(2)}`}</div></div>
            </div>
          </div>

          {/* Actions */}
          {apt.status !== 'completed' && apt.status !== 'cancelled' && (
            <div className="space-y-3 pb-4">
              {canReschedule(apt) && (
                <button onClick={() => onNavigate('booking')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Edit2 className="w-5 h-5" /> Reschedule
                </button>
              )}
              {canCancel(apt) && (
                <button onClick={() => setShowCancelModal(true)} className="w-full py-4 bg-white border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 flex items-center justify-center gap-2">
                  <Trash2 className="w-5 h-5" /> Cancel Appointment
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cancel modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Cancel Appointment</h3>
                <button onClick={() => setShowCancelModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-800">Cancelling less than 24 hours before may incur a fee.</p>
                </div>
              </div>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancelling (optional)" rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Keep</button>
                <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />} Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};

export default AppointmentsFlow;
