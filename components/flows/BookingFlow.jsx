// components/flows/BookingFlow.jsx
// Services and locations now fetched from Supabase (services_catalogue + service_locations).
// Appointments written to the reconciled appointments table (06_launch_schema_reconciliation.sql).
'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, Info, CreditCard, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const BookingFlow = ({ onNavigate }) => {
  const [screen, setScreen]           = useState('service');
  const [step, setStep]               = useState(1);
  const [selectedService, setSelectedService] = useState(null);  // single service object
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDate, setSelectedDate]         = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [reason, setReason]           = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('subscription');
  const [confirming, setConfirming]   = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [bookedId, setBookedId]       = useState(null);

  // ─── Supabase data ────────────────────────────────────────────────────────
  const [services, setServices]       = useState([]);
  const [locations, setLocations]     = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError]     = useState(null);

  useEffect(() => {
    const fetchCatalogues = async () => {
      try {
        const [svcRes, locRes] = await Promise.all([
          supabase
            .from('services_catalogue')
            .select('id, service_key, name, category, description, icon, duration_minutes, base_fee_usd, included_in_free, available_via, phase')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
          supabase
            .from('service_locations')
            .select('id, name, location_type, address, city')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        ]);

        if (svcRes.error) throw svcRes.error;
        if (locRes.error) throw locRes.error;

        setServices(svcRes.data || []);
        setLocations(locRes.data || []);
      } catch (err) {
        console.error('Catalogue fetch error:', err);
        setDataError('Could not load services. Please check your connection and try again.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchCatalogues();
  }, []);

  // ─── Static time slots (clinician_availability table wires here post-seed) ─
  const timeSlots = [
    { id: 'slot-1', start_time: '08:00', end_time: '08:30', available: true  },
    { id: 'slot-2', start_time: '09:00', end_time: '09:30', available: true  },
    { id: 'slot-3', start_time: '10:00', end_time: '10:30', available: true  },
    { id: 'slot-4', start_time: '11:00', end_time: '11:30', available: false },
    { id: 'slot-5', start_time: '14:00', end_time: '14:30', available: true  },
    { id: 'slot-6', start_time: '15:00', end_time: '15:30', available: true  },
  ];

  // Next 14 available days (skip Fri/Sat = Somaliland weekend)
  const availableDates = Array.from({ length: 21 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 5 || d.getDay() === 6) return null;
    return d.toISOString().split('T')[0];
  }).filter(Boolean).slice(0, 14);

  const appointmentTypeFromCategory = (cat) => {
    const map = {
      primary_care: 'video',
      mental_health: 'video',
      dental: 'in_person',
      optometry: 'in_person',
      lab: 'in_person',
      triage: 'video',
      verification: 'video',
      pharmacy: 'in_person',
    };
    return map[cat] || 'video';
  };

  // ─── Confirm & write to Supabase ──────────────────────────────────────────
  const confirmBooking = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const user = await getCurrentUser();
      if (!user) { onNavigate('welcome'); return; }

      // Build scheduled_at as TIMESTAMPTZ from date + time slot
      const scheduledAt = new Date(`${selectedDate}T${selectedTimeSlot.start_time}:00`).toISOString();

      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .insert({
          user_id:          user.id,
          service_id:       selectedService.id,
          location_id:      selectedLocation?.location_type !== 'virtual' ? selectedLocation?.id : null,
          appointment_type: selectedLocation?.location_type === 'virtual'
                              ? (selectedService.available_via?.includes('audio') ? 'audio' : 'video')
                              : appointmentTypeFromCategory(selectedService.category),
          scheduled_at:     scheduledAt,
          duration_minutes: selectedService.duration_minutes || 30,
          status:           'pending',
          chief_complaint:  reason || null,
          notes:            instructions || null,
          payment_method:   paymentMethod,
          fee_usd:          paymentMethod === 'subscription' ? 0 : (selectedService.base_fee_usd || 0),
          paid:             paymentMethod === 'subscription',
        })
        .select('id')
        .single();

      if (aptError) throw aptError;
      setBookedId(apt.id);
      setScreen('success');
    } catch (err) {
      console.error('Booking error:', err);
      setConfirmError(
        err.message?.includes('does not exist')
          ? 'Appointments table not found. Run 06_launch_schema_reconciliation.sql in your Supabase SQL Editor.'
          : 'Could not confirm booking. Please try again.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const goBack = () => {
    if (screen === 'location') { setScreen('service');   setStep(1); }
    else if (screen === 'datetime') { setScreen('location'); setStep(2); }
    else if (screen === 'details')  { setScreen('datetime'); setStep(3); }
    else if (screen === 'confirm')  { setScreen('details');  setStep(4); }
    else onNavigate('appointments');
  };

  const StepBar = () => (
    <div className="flex items-center gap-2 mt-4">
      {[1,2,3,4,5].map(n => (
        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
      ))}
    </div>
  );

  const BackBtn = () => (
    <button onClick={goBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
      <ArrowLeft className="w-5 h-5" />
    </button>
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loadingData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading services...</p>
      </div>
    </div>
  );

  // ─── Screen 1: Service ────────────────────────────────────────────────────
  if (screen === 'service') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center gap-3 mb-1"><BackBtn /><h1 className="text-xl font-bold text-gray-900">Select Service</h1></div>
          <StepBar />
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 py-6">
        {dataError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl px-4 py-3 bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-xs text-red-700">{dataError}</p>
          </div>
        )}
        <p className="text-gray-500 mb-5">Choose the service you need</p>
        <div className="space-y-3">
          {services.map(srv => {
            const sel = selectedService?.id === srv.id;
            return (
              <button key={srv.id}
                onClick={() => setSelectedService(srv)}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-all ${sel ? 'ring-2 ring-blue-600' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{srv.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-gray-900">{srv.name}</div>
                      {sel && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    </div>
                    {srv.description && <p className="text-sm text-gray-500 mb-2">{srv.description}</p>}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400">{srv.duration_minutes} min</span>
                      {srv.included_in_free
                        ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                            {srv.free_quota_monthly ? `${srv.free_quota_monthly}/month free` : 'Free'}
                          </span>
                        : <span className="font-semibold text-gray-900">${Number(srv.base_fee_usd).toFixed(2)}</span>
                      }
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => { setScreen('location'); setStep(2); }} disabled={!selectedService}
          className={`w-full mt-6 py-4 rounded-xl font-semibold ${selectedService ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          Continue
        </button>
      </div>
    </div>
  );

  // ─── Screen 2: Location ───────────────────────────────────────────────────
  if (screen === 'location') {
    // Filter locations that support the selected service (if services array is populated)
    const relevantLocations = locations.filter(loc =>
      !loc.services || loc.services.length === 0 ||
      loc.services.includes(selectedService?.service_key)
    );
    const displayLocations = relevantLocations.length > 0 ? relevantLocations : locations;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-md mx-auto px-5 py-4">
            <div className="flex items-center gap-3 mb-1"><BackBtn /><h1 className="text-xl font-bold text-gray-900">Choose Location</h1></div>
            <StepBar />
          </div>
        </div>
        <div className="max-w-md mx-auto px-5 py-6">
          <div className="space-y-3">
            {displayLocations.map(loc => (
              <button key={loc.id} onClick={() => setSelectedLocation(loc)}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-all ${selectedLocation?.id === loc.id ? 'ring-2 ring-blue-600' : 'hover:shadow-md'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">{loc.name}</div>
                    {loc.address && (
                      <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4" />{loc.address}{loc.city ? `, ${loc.city}` : ''}
                      </div>
                    )}
                    {loc.location_type === 'virtual' && (
                      <div className="text-sm text-blue-600">Video call — no travel needed</div>
                    )}
                    {loc.location_type === 'lab' && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">Lab</div>
                    )}
                  </div>
                  {selectedLocation?.id === loc.id && <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => { setScreen('datetime'); setStep(3); }} disabled={!selectedLocation}
            className={`w-full mt-6 py-4 rounded-xl font-semibold ${selectedLocation ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ─── Screen 3: Date & Time ────────────────────────────────────────────────
  if (screen === 'datetime') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center gap-3 mb-1"><BackBtn /><h1 className="text-xl font-bold text-gray-900">Pick Date & Time</h1></div>
          <StepBar />
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 py-6">
        <h3 className="font-semibold text-gray-900 mb-3">Select Date</h3>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {availableDates.map(ds => {
            const d = new Date(ds + 'T00:00:00');
            const isSel = selectedDate === ds;
            return (
              <button key={ds} onClick={() => { setSelectedDate(ds); setSelectedTimeSlot(null); }}
                className={`p-3 rounded-xl text-center transition-all ${isSel ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm'}`}>
                <div className="text-xs font-medium mb-1">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-lg font-bold">{d.getDate()}</div>
                <div className="text-xs opacity-75">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
              </button>
            );
          })}
        </div>
        {selectedDate && <>
          <h3 className="font-semibold text-gray-900 mb-3">Select Time</h3>
          <div className="grid grid-cols-2 gap-2">
            {timeSlots.map(slot => {
              const isSel = selectedTimeSlot?.id === slot.id;
              return (
                <button key={slot.id} onClick={() => slot.available && setSelectedTimeSlot(slot)} disabled={!slot.available}
                  className={`p-3 rounded-xl text-center transition-all ${isSel ? 'bg-blue-600 text-white shadow-md' : slot.available ? 'bg-white text-gray-900 hover:bg-gray-50 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">{slot.start_time}</span>
                  </div>
                  <div className="text-xs opacity-75">{slot.available ? 'Available' : 'Full'}</div>
                </button>
              );
            })}
          </div>
        </>}
        <button onClick={() => { setScreen('details'); setStep(4); }} disabled={!selectedDate || !selectedTimeSlot}
          className={`w-full mt-6 py-4 rounded-xl font-semibold ${selectedDate && selectedTimeSlot ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          Continue
        </button>
      </div>
    </div>
  );

  // ─── Screen 4: Details ────────────────────────────────────────────────────
  if (screen === 'details') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center gap-3 mb-1"><BackBtn /><h1 className="text-xl font-bold text-gray-900">Add Details</h1></div>
          <StepBar />
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Reason for visit <span className="text-gray-400 font-normal">(Optional)</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Tell us briefly what you'd like to discuss..." rows={4} maxLength={500}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="text-xs text-gray-400 mt-1">{reason.length}/500</div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Special instructions <span className="text-gray-400 font-normal">(Optional)</span></label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Any special requirements or preparations?" rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong className="block mb-1">Preparation Tips</strong>
              <p>• Fast 8–12 hours for blood glucose / lipid tests</p>
              <p>• Bring your national ID</p>
              <p>• Arrive 10 minutes early</p>
            </div>
          </div>
        </div>
        <button onClick={() => { setScreen('confirm'); setStep(5); }} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
          Review Booking
        </button>
      </div>
    </div>
  );

  // ─── Screen 5: Confirm ────────────────────────────────────────────────────
  if (screen === 'confirm') {
    const fee = selectedService?.base_fee_usd || 0;
    const isFree = selectedService?.included_in_free;
    const totalDue = paymentMethod === 'subscription' && isFree ? 0 : fee;

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-md mx-auto px-5 py-4">
            <div className="flex items-center gap-3 mb-1"><BackBtn /><h1 className="text-xl font-bold text-gray-900">Confirm Booking</h1></div>
            <StepBar />
          </div>
        </div>
        <div className="max-w-md mx-auto px-5 py-6">
          {/* Summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="font-bold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
              <div className="flex gap-3 text-sm">
                <span className="text-2xl">{selectedService?.icon}</span>
                <div>
                  <div className="text-gray-500">Service</div>
                  <div className="font-semibold text-gray-900">{selectedService?.name}</div>
                  <div className="text-gray-500">{selectedService?.duration_minutes} min</div>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-gray-500">Date & Time</div>
                  <div className="font-semibold text-gray-900">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="text-gray-700">{selectedTimeSlot.start_time} – {selectedTimeSlot.end_time}</div>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-gray-500">Location</div>
                  <div className="font-semibold text-gray-900">{selectedLocation.name}</div>
                  {selectedLocation.address && <div className="text-gray-500">{selectedLocation.address}</div>}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-1">
              {isFree
                ? <span className="text-green-600 font-semibold">✓ Included in your free plan</span>
                : <span className="font-semibold text-gray-900">Pay As You Go</span>
              }
            </div>
          </div>

          {/* Payment method */}
          {isFree && (
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="font-bold text-gray-900 mb-4">Payment</h3>
              <div className="space-y-2">
                {[
                  { id: 'subscription', icon: <Check className="w-5 h-5 text-white" />, iconBg: 'bg-gradient-to-br from-blue-400 to-blue-500', label: 'Use Free Plan', sub: 'No charge' },
                  { id: 'payg', icon: <CreditCard className="w-5 h-5 text-gray-600" />, iconBg: 'bg-gray-100', label: 'Pay As You Go', sub: `$${Number(fee).toFixed(2)}` },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setPaymentMethod(opt.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${paymentMethod === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${opt.iconBg} rounded-lg flex items-center justify-center`}>{opt.icon}</div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{opt.label}</div>
                          <div className="text-sm text-gray-500">{opt.sub}</div>
                        </div>
                      </div>
                      {paymentMethod === opt.id && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-gray-900">
              {totalDue === 0 ? 'Free' : `$${Number(totalDue).toFixed(2)}`}
            </span>
          </div>

          {confirmError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{confirmError}</p>
            </div>
          )}

          <button onClick={confirmBooking} disabled={confirming}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
            {confirming && <Loader2 className="w-5 h-5 animate-spin" />}
            {confirming ? 'Confirming...' : 'Confirm Appointment'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Screen 6: Success ────────────────────────────────────────────────────
  if (screen === 'success') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-lg text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Requested!</h1>
        <p className="text-gray-500 mb-6">
          Your request has been submitted. Our team will confirm your appointment and reach out with details.
        </p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedService?.icon}</span>
            <span className="font-semibold text-gray-900">{selectedService?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{selectedTimeSlot.start_time} – {selectedTimeSlot.end_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{selectedLocation.name}</span>
          </div>
        </div>
        <button onClick={() => onNavigate('appointments')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 mb-3">
          View My Appointments
        </button>
        <button onClick={() => {
          setScreen('service'); setStep(1); setSelectedService(null);
          setSelectedLocation(null); setSelectedDate(null); setSelectedTimeSlot(null);
          setReason(''); setInstructions('');
        }} className="w-full py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:bg-gray-50">
          Book Another
        </button>
      </div>
    </div>
  );
};

export default BookingFlow;
