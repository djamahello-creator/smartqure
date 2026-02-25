// components/flows/HomepageFlow.jsx
'use client';
import React, { useState, useEffect } from 'react';
import {
  Calendar, Pill, MessageCircle, Bell, Mail, ChevronRight,
  FileText, Activity, Heart, Droplet, Shield,
  CheckCircle2, AlertTriangle, TestTube, Loader2
} from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const HomepageFlow = ({ onNavigate }) => {
  const [currentUser, setCurrentUser]         = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [recentScans, setRecentScans]         = useState([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { onNavigate('welcome'); return; }

      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const firstName = profile?.first_name || user.user_metadata?.first_name || '';
      const lastName  = profile?.last_name  || user.user_metadata?.last_name  || '';
      const fullName  = [firstName, lastName].filter(Boolean).join(' ') || 'there';
      setCurrentUser({
        name: firstName || fullName,
        fullName,
        email: profile?.email || user.email,
        verified: profile?.verified || false,
      });

      // Next upcoming appointment
      const { data: appts } = await supabase
        .from('appointments')
        .select('*, appointment_services(service_name)')
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .limit(1);
      if (appts?.length) setNextAppointment(appts[0]);

      // Recent scans
      const { data: scans } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(3);
      if (scans) setRecentScans(scans);

    } catch (err) {
      console.error('Homepage fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const resultColor = (r) => {
    if (r === 'verified') return '#10B981';
    if (r === 'caution')  return '#FCA311';
    return '#EF4444';
  };
  const resultLabel = (r) => {
    if (r === 'verified') return 'Verified';
    if (r === 'caution')  return 'Caution';
    return 'High Risk';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A1628' }}>
        <div className="flex flex-col items-center space-y-3">
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #0D7377, #14A085)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield className="w-7 h-7 text-white" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#14A085' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A1628', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-50" style={{
        background: 'rgba(10,22,40,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="max-w-md mx-auto px-5 py-4 flex justify-between items-center">
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 1 }}>{greeting()},</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
              {currentUser?.name}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('alerts')}
              className="relative flex items-center justify-center rounded-full transition-all"
              style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.07)' }}
            >
              <Mail className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
            <button
              onClick={() => onNavigate('alerts')}
              className="relative flex items-center justify-center rounded-full transition-all"
              style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.07)' }}
            >
              <Bell className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, #0D7377, #14A085)',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                {currentUser?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5">

        {/* ── ID Verification banner ── */}
        {!currentUser?.verified && (
          <div className="mt-5 rounded-2xl p-4 flex items-start space-x-3" style={{
            background: 'rgba(252,163,17,0.1)',
            border: '1px solid rgba(252,163,17,0.25)',
          }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FCA311' }} />
            <div className="flex-1">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#FCA311', marginBottom: 2 }}>Verify your ID</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                Unlock prescriptions, pharmacy routing and full health records
              </p>
              <button
                onClick={() => onNavigate('id-verification')}
                className="px-4 py-1.5 rounded-lg transition-all active:scale-95"
                style={{ background: '#FCA311', color: '#0A1628', fontSize: 12, fontWeight: 700 }}
              >
                Verify Now
              </button>
            </div>
          </div>
        )}

        {/* ── Upcoming appointment banner ── */}
        {nextAppointment && (
          <button
            onClick={() => onNavigate('appointments')}
            className="w-full mt-5 rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #0C2434 0%, #14213D 100%)',
              border: '1px solid rgba(14,165,233,0.25)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0EA5E9', letterSpacing: '0.08em', marginBottom: 6 }}>
              UPCOMING APPOINTMENT
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', marginBottom: 3 }}>
              {nextAppointment.appointment_services?.[0]?.service_name || nextAppointment.appointment_type}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {new Date(nextAppointment.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}{nextAppointment.appointment_time?.slice(0, 5)}
            </div>
            {nextAppointment.location_name && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {nextAppointment.location_name}
              </div>
            )}
          </button>
        )}

        {/* ── Quick Actions ── */}
        <div className="mt-6">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#14A085', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: Calendar,
                label: 'Book Appointment',
                sub: 'Lab, GP, dentistry',
                gradient: 'linear-gradient(135deg, #0284C7, #0EA5E9)',
                action: 'booking',
              },
              {
                icon: MessageCircle,
                label: 'AI Care Navigator',
                sub: 'Describe your symptoms',
                gradient: 'linear-gradient(135deg, #0D7377, #14A085)',
                action: 'triage',
              },
              {
                icon: Pill,
                label: 'Verify Medicine',
                sub: 'Scan or type a drug',
                gradient: 'linear-gradient(135deg, #047857, #10B981)',
                action: 'scanner',
              },
              {
                icon: FileText,
                label: 'Health Records',
                sub: 'Conditions, allergies, meds',
                gradient: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                action: 'health-docs',
              },
            ].map((item) => (
              <button
                key={item.action}
                onClick={() => onNavigate(item.action)}
                className="rounded-2xl p-4 text-left transition-all active:scale-[0.97]"
                style={{
                  background: '#111D33',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center justify-center mb-3" style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: item.gradient,
                }}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3 }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {item.sub}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── More services row ── */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: TestTube, label: 'Prescriptions', action: 'prescriptions', color: '#FCA311' },
            { icon: Activity, label: 'Appointments', action: 'appointments', color: '#0EA5E9' },
            { icon: Heart, label: 'My Alerts', action: 'alerts', color: '#F43F5E' },
          ].map((item) => (
            <button
              key={item.action}
              onClick={() => onNavigate(item.action)}
              className="rounded-xl py-3 px-2 flex flex-col items-center transition-all active:scale-95"
              style={{ background: '#111D33', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <item.icon className="w-5 h-5 mb-1.5" style={{ color: item.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Recent Scans ── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
              Recent Scans
            </p>
            <button onClick={() => onNavigate('history')}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#14A085' }}>View all</span>
            </button>
          </div>

          {recentScans.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{
              background: '#111D33', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <Pill className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No scans yet</p>
              <button
                onClick={() => onNavigate('scanner')}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(13,115,119,0.2)', color: '#14A085', border: '1px solid rgba(13,115,119,0.3)' }}
              >
                Scan your first medicine
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => onNavigate('history-detail', { scan })}
                  className="w-full rounded-xl p-3.5 flex items-center space-x-3 transition-all active:scale-[0.98]"
                  style={{ background: '#111D33', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{
                    background: `${resultColor(scan.result)}20`,
                  }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: resultColor(scan.result) }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }} className="truncate">
                      {scan.medication_name}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(scan.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0"
                    style={{
                      background: `${resultColor(scan.result)}20`,
                      color: resultColor(scan.result),
                    }}
                  >
                    {resultLabel(scan.result)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Trust footer ── */}
        <div className="mt-8 mb-4 rounded-2xl p-4 flex items-start space-x-3" style={{
          background: 'rgba(13,115,119,0.08)',
          border: '1px solid rgba(13,115,119,0.2)',
        }}>
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#14A085' }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#14A085', marginBottom: 2 }}>
              Free to use, always private
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Your health data is encrypted and only accessible by you.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomepageFlow;
