// components/flows/BookingFlow.jsx
// Steps 1-4 use hardcoded service/location/slot options (no DB tables for these yet).
// Step 5 (Confirm) writes a real row to the appointments + appointment_services tables.
// Run create_missing_tables.sql first.
'use client';
import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, Info, CreditCard, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const BookingFlow = ({ onNavigate }) => {
  const [screen, setScreen]                     = useState('service');
  const [step, setStep]                         = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDate, setSelectedDate]         = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [reason, setReason]                     = useState('');
  const [instructions, setInstructions]         = useState('');
  const [paymentMethod, setPaymentMethod]       = useState('subscription');
  const [confirming, setConfirming]             = useState(false);
  const [confirmError, setConfirmError]         = useState(null);
  const [bookedId, setBookedId]                 = useState(null);

  // NOTE: These would eventually come from Supabase `services` and `locations` tables.
  // Once those tables exist, replace with a useEffect fetch.
  const userSubscription = { plan_type: 'core', status: 'active' };

  const services = [
    { id: 'srv-1', name: 'Full Health Check',   category: 'screening',    description: 'Comprehensive baseline testing',         duration_minutes: 30, price_payg: 50.00, included_in_plans: ['core', 'sensitive_care', 'travel'], icon: '🩺' },
    { id: 'srv-2', name: 'Blood Type Test',     category: 'lab_test',     description: 'ABO and Rh blood typing',                duration_minutes: 15, price_payg: 15.00, included_in_plans: ['core', 'sensitive_care', 'travel'], icon: '💉' },
    { id: 'srv-3', name: 'STI Screening',       category: 'lab_test',     description: 'Complete STI panel with private results', duration_minutes: 20, price_payg: 75.00, included_in_plans: ['sensitive_care'],                  icon: '🔐' },
    { id: 'srv-4', name: 'GP Consultation',     category: 'consultation', description: 'Talk to a licensed GP',                  duration_minutes: 20, price_payg: 30.00, included_in_plans: ['core', 'sensitive_care', 'travel'], icon: '👨‍⚕️' },
  ];

  const locations = [
    { id: 'loc-1', name: 'SmartQure Lab - Central', type: 'smartqure_lab', address: '123 Main Street, Hargeisa', distance: '2.3 km' },
    { id: 'loc-2', name: 'SmartQure Lab - East',    type: 'smartqure_lab', address: '456 Hospital Road, Hargeisa', distance: '5.1 km' },
    { id: 'loc-3', name: 'Virtual Consultation',    type: 'virtual',       address: null,                          distance: null      },
  ];

  // Generate next 7 available dates from today
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    // Skip Fridays (5) and Saturdays (6) — adjust for your region
    if (d.getDay() === 5 || d.getDay() === 6) return null;
    return d.toISOString().split('T')[0];
  }).filter(Boolean);

  const timeSlots = [
    { id: 'slot-1', start_time: '08:00', end_time: '08:30', available: true  },
    { id: 'slot-2', start_time: '09:00', end_time: '09:30', available: true  },
    { id: 'slot-3', start_time: '10:00', end_time: '10:30', available: true  },
    { id: 'slot-4', start_time: '11:00', end_time: '11:30', available: false },
    { id: 'slot-5', start_time: '14:00', end_time: '14:30', available: true  },
    { id: 'slot-6', start_time: '15:00', end_time: '15:30', available: true  },
  ];

  const isIncluded = (srv) => srv.included_in_plans?.includes(userSubscription.plan_type);

  const total = selectedServices.reduce((acc, id) => {
    const srv = services.find(s => s.id === id);
    return acc + (paymentMethod === 'payg' || !isIncluded(srv) ? srv.price_payg : 0);
  }, 0);

  const appointmentType = () => {
    const cats = selectedServices.map(id => services.find(s => s.id === id)?.category);
    if (cats.includes('consultation')) return 'gp_consultation';
    if (cats.includes('lab_test') || cats.includes('screening')) return 'lab_visit';
    return 'lab_visit';
  };

  // ─── Confirm & write to Supabase ──────────────────────────────────────────
  const confirmBooking = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const user = await getCurrentUser();
      if (!user) { onNavigate('welcome'); return; }

      // Insert appointment row
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .insert({
          user_id:          user.id,
          appointment_type: appointmentType(),
          status:           'scheduled',
          appointment_date: selectedDate,
          appointment_time: selectedTimeSlot.start_time,
          duration_minutes: Math.max(...selectedServices.map(id => services.find(s => s.id === id)?.duration_minutes || 30)),
          location_name:    selectedLocation.name,
          location_address: selectedLocation.address,
          location_type:    selectedLocation.type,
          reason:           reason || null,
          notes:            instructions || null,
          payment_method:   paymentMethod,
          amount:           paymentMethod === 'subscription' ? 0 : total,
          payment_status:   paymentMethod === 'subscription' ? 'paid' : 'unpaid',
        })
        .select('id')
        .single();

      if (aptError) throw aptError;
      setBookedId(apt.id);

      // Insert appointment_services rows
      const serviceRows = selectedServices.map(id => {
        const srv = services.find(s => s.id === id);
        return { appointment_id: apt.id, service_name: srv.name, service_category: srv.category };
      });
      const { error: srvError } = await supabase.from('appointment_services').insert(serviceRows);
      if (srvError) console.warn('Services insert error (non-fatal):', srvError.message);

      setScreen('success');
    } catch (err) {
      console.error('Booking error:', err);
      setConfirmError(err.message?.includes('does not exist')
        ? 'Appointments table not found. Run create_missing_tables.sql in your Supabase SQL Editor.'
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
        {/* Demo data notice */}
        <div className="mb-4 flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(252,163,17,0.08)', border: '1px solid rgba(252,163,17,0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FCA311' }} />
          <p className="text-xs" style={{ color: '#FCA311' }}>
            <span className="font-semibold">Demo data</span> — services and locations are sample entries while we connect your Supabase catalogue tables.
          </p>
        </div>
        <p className="text-gray-500 mb-5">Choose the services you need</p>
        <div className="space-y-3">
          {services.map(srv => {
            const sel = selectedServices.includes(srv.id);
            return (
              <button key={srv.id}
                onClick={() => setSelectedServices(sel ? selectedServices.filter(id => id !== srv.id) : [...selectedServices, srv.id])}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-all ${sel ? 'ring-2 ring-blue-600' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{srv.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-gray-900">{srv.name}</div>
                      {sel && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{srv.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400">{srv.duration_minutes} min</span>
                      {isIncluded(srv)
                        ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">Included</span>
                        : <span className="font-semibold text-gray-900">${srv.price_payg.toFixed(2)}</span>
                      }
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => { setScreen('location'); setStep(2); }} disabled={selectedServices.length === 0}
          className={`w-full mt-6 py-4 rounded-xl font-semibold ${selectedServices.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          Continue ({selectedServices.length} selected)
        </button>
      </div>
    </div>
  );

  // ─── Screen 2: Location ───────────────────────────────────────────────────
  if (screen === 'location') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center gap-3 mb-1"><BackBtn /><h1 className="text-xl font-bold text-gray-900">Choose Location</h1></div>
          <StepBar />
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 py-6">
        <div className="space-y-3">
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setSelectedLocation(loc)}
              className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-all ${selectedLocation?.id === loc.id ? 'ring-2 ring-blue-600' : 'hover:shadow-md'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{loc.name}</div>
                  {loc.address && <div className="text-sm text-gray-500 flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" />{loc.address}</div>}
                  {loc.distance && <div className="text-xs text-gray-400">{loc.distance} away</div>}
                  {loc.type === 'virtual' && <div className="text-sm text-blue-600">Video call — no travel needed</div>}
                </div>
                {selectedLocation?.id === loc.id && <CheckCircle className="w-5 h-5 text-blue-600" />}
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
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Any special requirements?" rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong className="block mb-1">Preparation Tips</strong>
              <p>• Fast 8–12 hours for glucose/lipid tests</p>
              <p>• Bring ID and member card</p>
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
    const selectedServiceDetails = selectedServices.map(id => services.find(s => s.id === id));
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
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-gray-500">Date & Time</div>
                  <div className="font-semibold text-gray-900">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
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
            <div className="text-sm text-gray-500 mb-2">Services</div>
            {selectedServiceDetails.map(srv => (
              <div key={srv.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2"><span className="text-lg">{srv.icon}</span><span className="text-sm font-medium text-gray-900">{srv.name}</span></div>
                <span className="text-sm font-semibold">{isIncluded(srv) ? <span className="text-green-600">Included</span> : `$${srv.price_payg.toFixed(2)}`}</span>
              </div>
            ))}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="font-bold text-gray-900 mb-4">Payment</h3>
            <div className="space-y-2">
              {[
                { id: 'subscription', icon: <Check className="w-5 h-5 text-white" />, iconBg: 'bg-gradient-to-br from-blue-400 to-blue-500', label: 'Use Subscription', sub: 'Core Plan' },
                { id: 'payg',         icon: <CreditCard className="w-5 h-5 text-gray-600" />, iconBg: 'bg-gray-100', label: 'Pay As You Go', sub: `$${total.toFixed(2)}` },
              ].map(opt => (
                <button key={opt.id} onClick={() => setPaymentMethod(opt.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${paymentMethod === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${opt.iconBg} rounded-lg flex items-center justify-center`}>{opt.icon}</div>
                      <div className="text-left"><div className="font-semibold text-gray-900">{opt.label}</div><div className="text-sm text-gray-500">{opt.sub}</div></div>
                    </div>
                    {paymentMethod === opt.id && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-gray-900">{paymentMethod === 'subscription' && total === 0 ? 'Included' : `$${total.toFixed(2)}`}</span>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h1>
        <p className="text-gray-500 mb-6">Your appointment has been saved. You'll receive a reminder 24 hours before.</p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /><span className="font-semibold text-gray-900">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span className="text-gray-900">{selectedTimeSlot.start_time} – {selectedTimeSlot.end_time}</span></div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span className="text-gray-900">{selectedLocation.name}</span></div>
        </div>
        <button onClick={() => onNavigate('appointments')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 mb-3">
          View My Appointments
        </button>
        <button onClick={() => { setScreen('service'); setStep(1); setSelectedServices([]); setSelectedLocation(null); setSelectedDate(null); setSelectedTimeSlot(null); setReason(''); setInstructions(''); }}
          className="w-full py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:bg-gray-50">
          Book Another
        </button>
      </div>
    </div>
  );
};

export default BookingFlow;
