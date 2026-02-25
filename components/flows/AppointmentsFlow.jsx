// components/flows/AppointmentsFlow.jsx
// Wired to Supabase — requires appointments + appointment_services tables.
// Run create_missing_tables.sql first if you see a "relation does not exist" error.
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
          appointment_date,
          appointment_time,
          duration_minutes,
          location_name,
          location_address,
          location_type,
          provider_name,
          reason,
          notes,
          payment_method,
          amount,
          created_at,
          appointment_services (
            service_name,
            service_category
          )
        `)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true });

      if (fetchError) throw fetchError;
      setAppointments(data || []);
    } catch (err) {
      console.error('Appointments fetch error:', err);
      setError(err.message?.includes('does not exist')
        ? 'The appointments table has not been created yet. Run create_missing_tables.sql in your Supabase SQL Editor.'
        : 'Could not load appointments. Please try again.'
      );
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
        .update({ status: 'cancelled', cancel_reason: cancelReason, updated_at: new Date().toISOString() })
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
        (a.status === 'scheduled' || a.status === 'confirmed') &&
        new Date(a.appointment_date) >= now
      );
    if (filterTab === 'past')
      return appointments.filter(a =>
        a.status === 'completed' || a.status === 'cancelled' ||
        new Date(a.appointment_date) < now
      );
    return appointments;
  };

  const statusColor = (s) => ({
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed:  'bg-green-100 text-green-700',
    completed:  'bg-gray-100 text-gray-600',
    cancelled:  'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-600');

  const typeLabel = (t) => ({
    lab_visit:       'Lab Visit',
    gp_consultation: 'GP Consultation',
    vaccination:     'Vaccination',
  }[t] || 'Appointment');

  const canCancel = (a) => {
    const hrs = (new Date(a.appointment_date) - new Date()) / 3_600_000;
    return hrs > 2 && (a.status === 'scheduled' || a.status === 'confirmed');
  };

  const canReschedule = (a) => {
    const hrs = (new Date(a.appointment_date) - new Date()) / 3_600_000;
    return hrs > 24 && a.status === 'scheduled';
  };

  const formatDate = (d, t) => {
    const date = new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return t ? `${date} at ${t.slice(0, 5)}` : date;
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
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-medium">{error}</p>
                <button onClick={fetchAppointments} className="text-xs text-red-600 underline mt-1">Retry</button>
              </div>
            </div>
          )}

          {/* Empty */}
          {!error && filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments</h3>
              <p className="text-gray-500 mb-6">You don't have any {filterTab} appointments</p>
              <button onClick={() => onNavigate('booking')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                Book Your First Appointment
              </button>
            </div>
          )}

          {/* List */}
          {!error && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map(apt => (
                <div key={apt.id} onClick={() => { setSelected(apt); setCurrentView('detail'); }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">{typeLabel(apt.appointment_type)}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {formatDate(apt.appointment_date, apt.appointment_time)}
                      </div>
                      {apt.location_name && (
                        <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 flex-shrink-0" />{apt.location_name}
                        </div>
                      )}
                      {apt.provider_name && (
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <User className="w-4 h-4 flex-shrink-0" />{apt.provider_name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor(apt.status)}`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  {apt.appointment_services?.length > 0 && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      {apt.appointment_services.map(s => s.service_name).join(', ')}
                    </div>
                  )}
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

          {/* Details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Details</h3>
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">Date & Time</div>
                <div className="font-semibold text-gray-900">
                  {new Date(apt.appointment_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                {apt.appointment_time && (
                  <div className="text-gray-700">{apt.appointment_time.slice(0,5)} ({apt.duration_minutes} min)</div>
                )}
              </div>
            </div>
            {apt.location_name && (
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="font-semibold text-gray-900">{apt.location_name}</div>
                  {apt.location_address && <div className="text-sm text-gray-500">{apt.location_address}</div>}
                  {apt.location_type === 'virtual' && <div className="text-sm text-blue-600 mt-1">Video call link sent 15 min before</div>}
                </div>
              </div>
            )}
            {apt.provider_name && (
              <div className="flex gap-3">
                <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Provider</div>
                  <div className="font-semibold text-gray-900">{apt.provider_name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Services */}
          {apt.appointment_services?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Services</h3>
              {apt.appointment_services.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-gray-900">{s.service_name}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{s.service_category}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reason / Notes */}
          {(apt.reason || apt.notes) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              {apt.reason && <div className="mb-3"><div className="text-sm text-gray-500 mb-1">Reason</div><div className="text-gray-900">{apt.reason}</div></div>}
              {apt.notes  && <div><div className="text-sm text-gray-500 mb-1">Notes</div><div className="text-gray-900">{apt.notes}</div></div>}
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Payment</h3>
            <div className="flex items-center justify-between">
              <div><div className="text-sm text-gray-500">Method</div><div className="font-semibold text-gray-900 capitalize">{apt.payment_method}</div></div>
              <div className="text-right"><div className="text-sm text-gray-500">Amount</div><div className="font-semibold text-gray-900">{apt.amount === 0 ? 'Included' : `$${Number(apt.amount).toFixed(2)}`}</div></div>
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
