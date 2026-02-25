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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A1628' }}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#14A085' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading prescriptions...</p>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A1628', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50" style={{
        background: 'rgba(10,22,40,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => onNavigate('homepage')}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <ChevronRight className="w-5 h-5 rotate-180" style={{ color: 'rgba(255,255,255,0.7)' }} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
            Prescriptions
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button style={{
            background: 'linear-gradient(135deg, #1E3A5F, #0D2D4A)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: 16, color: '#fff', textAlign: 'left', cursor: 'pointer',
          }}>
            <Upload className="w-8 h-8 mb-2" style={{ color: '#14A085' }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Upload</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Add prescription photo</div>
          </button>
          <button
            onClick={() => onNavigate('drug-interaction')}
            style={{
              background: 'linear-gradient(135deg, #0D3D3D, #0A2E2E)',
              border: '1px solid rgba(13,115,119,0.3)',
              borderRadius: 16, padding: 16, color: '#fff', textAlign: 'left', cursor: 'pointer',
            }}
          >
            <Search className="w-8 h-8 mb-2" style={{ color: '#14A085' }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Check Drugs</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Interactions</div>
          </button>
        </div>

        {/* Request Review */}
        <button style={{
          width: '100%', background: '#111D33',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 16, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, background: 'rgba(168,85,247,0.15)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText className="w-5 h-5" style={{ color: '#A855F7' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#FFFFFF' }}>Request Review</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Get expert assessment in 48h</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </button>

        {/* Error state */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10,
          }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div>
              <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>{error}</p>
              <button onClick={fetchPrescriptions} style={{
                fontSize: 12, color: '#EF4444', background: 'none', border: 'none',
                textDecoration: 'underline', cursor: 'pointer', marginTop: 4,
              }}>Retry</button>
            </div>
          </div>
        )}

        {/* Prescriptions list */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', marginBottom: 12 }}>
            MY PRESCRIPTIONS
          </h2>

          {prescriptions.length === 0 && !error ? (
            <div style={{
              background: '#111D33', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 32, textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <FileText className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </div>
              <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>No prescriptions yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16, lineHeight: 1.5 }}>
                Upload a prescription photo or ask your doctor to issue one through SmartQure
              </p>
              <button style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #0D7377, #14A085)',
                border: 'none', borderRadius: 12, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Plus className="w-4 h-4" /> Add Prescription
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prescriptions.map(rx => {
                const status = getStatus(rx);
                const statusColors = {
                  active:  { bg: 'rgba(16,185,129,0.1)',  text: '#10B981' },
                  filled:  { bg: 'rgba(59,130,246,0.1)',  text: '#60A5FA' },
                  expired: { bg: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.4)' },
                };
                const sc = statusColors[status] || statusColors.expired;
                return (
                  <button
                    key={rx.id}
                    style={{
                      width: '100%', background: '#111D33',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 14, padding: 14, textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>{rx.medication_name}</div>
                        {rx.dosage && rx.frequency && (
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{rx.dosage} · {rx.frequency}</div>
                        )}
                        {rx.doctor_name && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{rx.doctor_name}</div>
                        )}
                        {rx.created_at && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{formatDate(rx.created_at)}</div>
                        )}
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: sc.bg, color: sc.text, flexShrink: 0,
                      }}>
                        {status}
                      </span>
                    </div>

                    {rx.expiry_date && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                        Expires: {formatDate(rx.expiry_date)}
                      </div>
                    )}

                    {/* AI review badge */}
                    {rx.ai_review_status && rx.ai_review_status !== 'pending' && (
                      <div style={{
                        marginTop: 6, fontSize: 11, padding: '2px 8px',
                        borderRadius: 6, display: 'inline-block', fontWeight: 600,
                        background: rx.ai_review_status === 'approved' ? 'rgba(16,185,129,0.1)' :
                                    rx.ai_review_status === 'flagged'  ? 'rgba(252,163,17,0.1)' :
                                    'rgba(255,255,255,0.07)',
                        color: rx.ai_review_status === 'approved' ? '#10B981' :
                               rx.ai_review_status === 'flagged'  ? '#FCA311' :
                               'rgba(255,255,255,0.4)',
                      }}>
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
