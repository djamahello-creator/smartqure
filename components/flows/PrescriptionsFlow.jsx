// components/flows/PrescriptionsFlow.jsx
// Fully wired to Supabase — prescriptions table (user_id, doctor_name, medication_name,
// dosage, frequency, start_date, expiry_date, prescription_photo_url, ai_review_status, filled_at)
'use client';
import React, { useState, useEffect } from 'react';
import { Upload, Search, FileText, ChevronRight, Loader2, AlertCircle, Plus } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const PrescriptionsFlow = ({ onNavigate }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  useEffect(() => { fetchPrescriptions(); }, []);

  const fetchPrescriptions = async () => {
    try {
      setError(null);
      const user = await getCurrentUser();
      if (!user) { onNavigate('welcome'); return; }

      const { data, error: fetchError } = await supabase
        .from('prescriptions')
        .select(`
          id,
          doctor_name,
          doctor_license,
          medication_name,
          dosage,
          frequency,
          duration_days,
          start_date,
          expiry_date,
          prescription_photo_url,
          ai_review_status,
          ai_review_notes,
          filled_at,
          pharmacy_id,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPrescriptions(data || []);
    } catch (err) {
      console.error('Prescriptions fetch error:', err);
      setError('Could not load prescriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Derive status from real fields
  const getStatus = (rx) => {
    if (rx.expiry_date && new Date(rx.expiry_date) < new Date()) return 'expired';
    if (rx.filled_at) return 'filled';
    return 'active';
  };

  const statusStyle = (status) => ({
    active:  'bg-green-100 text-green-700',
    filled:  'bg-blue-100 text-blue-700',
    expired: 'bg-gray-100 text-gray-600',
  }[status] || 'bg-gray-100 text-gray-600');

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading prescriptions...</p>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => onNavigate('homepage')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Prescriptions</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]">
            <Upload className="w-8 h-8 mb-2" />
            <div className="font-semibold">Upload</div>
            <div className="text-xs text-blue-100">Add prescription photo</div>
          </button>
          <button
            onClick={() => onNavigate('manual-entry')}
            className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
          >
            <Search className="w-8 h-8 mb-2" />
            <div className="font-semibold">Check Drugs</div>
            <div className="text-xs text-teal-100">Interactions</div>
          </button>
        </div>

        {/* Request Review */}
        <button className="w-full bg-white rounded-2xl p-4 shadow-sm mb-6 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">Request Review</div>
              <div className="text-sm text-gray-500">Get expert assessment in 48h</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">{error}</p>
              <button onClick={fetchPrescriptions} className="text-xs text-red-600 underline mt-1">Retry</button>
            </div>
          </div>
        )}

        {/* Prescriptions list */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">My Prescriptions</h2>

          {prescriptions.length === 0 && !error ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center border border-gray-100">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">No prescriptions yet</p>
              <p className="text-sm text-gray-500 mb-4">Upload a prescription photo or ask your doctor to issue one through SmartQure</p>
              <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" /> Add Prescription
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map(rx => {
                const status = getStatus(rx);
                return (
                  <button
                    key={rx.id}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-semibold text-gray-900 truncate">{rx.medication_name}</div>
                        {rx.dosage && rx.frequency && (
                          <div className="text-sm text-gray-500 mt-0.5">{rx.dosage} · {rx.frequency}</div>
                        )}
                        {rx.doctor_name && (
                          <div className="text-xs text-gray-400 mt-1">{rx.doctor_name}</div>
                        )}
                        {rx.created_at && (
                          <div className="text-xs text-gray-400 mt-0.5">{formatDate(rx.created_at)}</div>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${statusStyle(status)}`}>
                        {status}
                      </span>
                    </div>

                    {rx.expiry_date && (
                      <div className="text-xs text-gray-400 mt-1">
                        Expires: {formatDate(rx.expiry_date)}
                      </div>
                    )}

                    {/* AI review badge */}
                    {rx.ai_review_status && rx.ai_review_status !== 'pending' && (
                      <div className={`mt-2 text-xs px-2 py-1 rounded-lg inline-block font-medium ${
                        rx.ai_review_status === 'approved' ? 'bg-green-50 text-green-700' :
                        rx.ai_review_status === 'flagged'  ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        AI Review: {rx.ai_review_status}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionsFlow;
