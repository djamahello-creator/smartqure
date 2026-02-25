// components/flows/ProfileFlow.jsx
'use client';
import React, { useState, useEffect } from 'react';
import {
  Shield, ArrowLeft, User, Lock, Bell, FileText,
  Clipboard, HelpCircle, LogOut, ChevronRight,
  CheckCircle2, AlertTriangle, Edit2, Loader2,
  Save, X, Eye, EyeOff
} from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const ProfileFlow = ({ onNavigate }) => {
  const [currentUser, setCurrentUser]   = useState(null);
  const [userId, setUserId]             = useState(null);
  const [loading, setLoading]           = useState(true);

  // Edit profile state
  const [editMode, setEditMode]         = useState(false);
  const [editForm, setEditForm]         = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState(null);

  // Change password state
  const [pwMode, setPwMode]             = useState(false);
  const [pwForm, setPwForm]             = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw]             = useState(false);
  const [pwSaving, setPwSaving]         = useState(false);
  const [pwMsg, setPwMsg]               = useState(null);

  useEffect(() => { fetchUserProfile(); }, []);

  const fetchUserProfile = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { onNavigate('auth', { mode: 'login' }); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const firstName = profile?.first_name || user.user_metadata?.first_name || '';
      const lastName  = profile?.last_name  || user.user_metadata?.last_name  || '';
      const fullName  = [firstName, lastName].filter(Boolean).join(' ') || 'User';

      setCurrentUser({
        name: firstName || fullName,
        fullName,
        email: profile?.email || user.email,
        phone: profile?.phone || '',
        verified: profile?.verified || false,
        verifiedAt: profile?.verified_at,
        // Clinical fields (new from 06_launch_schema_reconciliation.sql)
        date_of_birth: profile?.date_of_birth || '',
        gender: profile?.gender || '',
        blood_type: profile?.blood_type || '',
        height_cm: profile?.height_cm || '',
        weight_kg: profile?.weight_kg || '',
        emergency_contact_name:  profile?.emergency_contact_name  || '',
        emergency_contact_phone: profile?.emergency_contact_phone || '',
        insurance_provider: profile?.insurance_provider || '',
        insurance_number:   profile?.insurance_number   || '',
      });
      setEditForm({
        firstName,
        lastName,
        phone: profile?.phone || '',
        date_of_birth: profile?.date_of_birth || '',
        gender: profile?.gender || '',
        blood_type: profile?.blood_type || '',
        height_cm: profile?.height_cm ? String(profile.height_cm) : '',
        weight_kg: profile?.weight_kg ? String(profile.weight_kg) : '',
        emergency_contact_name:  profile?.emergency_contact_name  || '',
        emergency_contact_phone: profile?.emergency_contact_phone || '',
        insurance_provider: profile?.insurance_provider || '',
        insurance_number:   profile?.insurance_number   || '',
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updates = {
        first_name: editForm.firstName.trim(),
        last_name:  editForm.lastName.trim(),
        phone:      editForm.phone.trim(),
        // Clinical fields
        date_of_birth:           editForm.date_of_birth           || null,
        gender:                  editForm.gender                  || null,
        blood_type:              editForm.blood_type              || null,
        height_cm:               editForm.height_cm ? parseFloat(editForm.height_cm) : null,
        weight_kg:               editForm.weight_kg ? parseFloat(editForm.weight_kg) : null,
        emergency_contact_name:  editForm.emergency_contact_name.trim()  || null,
        emergency_contact_phone: editForm.emergency_contact_phone.trim() || null,
        insurance_provider:      editForm.insurance_provider.trim()      || null,
        insurance_number:        editForm.insurance_number.trim()        || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      const fullName = [editForm.firstName, editForm.lastName].filter(Boolean).join(' ') || 'User';
      setCurrentUser(prev => ({
        ...prev,
        name: editForm.firstName || fullName,
        fullName,
        phone: editForm.phone,
        date_of_birth: editForm.date_of_birth,
        gender: editForm.gender,
        blood_type: editForm.blood_type,
        height_cm: editForm.height_cm,
        weight_kg: editForm.weight_kg,
        emergency_contact_name:  editForm.emergency_contact_name,
        emergency_contact_phone: editForm.emergency_contact_phone,
        insurance_provider: editForm.insurance_provider,
        insurance_number:   editForm.insurance_number,
      }));
      setSaveMsg({ ok: true, text: 'Profile updated.' });
      setEditMode(false);
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message || 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      setPwMsg({ ok: true, text: 'Password updated successfully.' });
      setPwForm({ current: '', next: '', confirm: '' });
      setPwMode(false);
    } catch (err) {
      setPwMsg({ ok: false, text: err.message || 'Could not update password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onNavigate('welcome');
  };

  // ── Shared style helpers ─────────────────────────────────────
  const card = {
    background: '#111D33',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  };
  const rowBase = {
    width: '100%',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'transparent',
    cursor: 'pointer',
  };
  const labelStyle   = { fontSize: 13, fontWeight: 600, color: '#FFFFFF' };
  const subStyle     = { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 };
  const sectionHead  = {
    padding: '10px 16px 8px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#14A085',
    textTransform: 'uppercase',
    background: 'rgba(13,115,119,0.07)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    fontSize: 14,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A1628' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#14A085' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A1628', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="sticky top-0 z-50" style={{
        background: 'rgba(10,22,40,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => onNavigate('homepage')} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>Profile</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Account & settings</p>
            </div>
          </div>
          <button
            onClick={() => { setEditMode(true); setPwMode(false); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(13,115,119,0.2)', border: '1px solid rgba(13,115,119,0.3)' }}
          >
            <Edit2 className="w-3.5 h-3.5" style={{ color: '#14A085' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#14A085' }}>Edit</span>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Avatar + name */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex items-center justify-center" style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0D7377, #14A085)',
            fontSize: 28, fontWeight: 700, color: '#FFFFFF',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {currentUser?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
            {currentUser?.fullName}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{currentUser?.email}</p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full" style={{
            background: currentUser?.verified ? 'rgba(16,185,129,0.15)' : 'rgba(252,163,17,0.12)',
            border: `1px solid ${currentUser?.verified ? 'rgba(16,185,129,0.3)' : 'rgba(252,163,17,0.25)'}`,
          }}>
            {currentUser?.verified
              ? <><CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#10B981' }} /><span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>Verified ID</span></>
              : <><AlertTriangle className="w-3.5 h-3.5" style={{ color: '#FCA311' }} /><span style={{ fontSize: 12, fontWeight: 600, color: '#FCA311' }}>ID not verified</span></>
            }
          </div>
        </div>

        {/* Save message */}
        {saveMsg && (
          <div className="mb-4 p-3 rounded-xl" style={{
            background: saveMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${saveMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <p style={{ fontSize: 13, color: saveMsg.ok ? '#10B981' : '#EF4444' }}>{saveMsg.text}</p>
          </div>
        )}
        {pwMsg && (
          <div className="mb-4 p-3 rounded-xl" style={{
            background: pwMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${pwMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <p style={{ fontSize: 13, color: pwMsg.ok ? '#10B981' : '#EF4444' }}>{pwMsg.text}</p>
          </div>
        )}

        {/* ── Edit Profile form ── */}
        {editMode && (
          <div className="mb-4 rounded-2xl p-4" style={{ background: '#111D33', border: '1px solid rgba(13,115,119,0.3)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#14A085', marginBottom: 12 }}>Edit Profile</p>
            <div className="space-y-3">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>
                  First Name
                </label>
                <input
                  style={inputStyle}
                  value={editForm.firstName}
                  onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>
                  Last Name
                </label>
                <input
                  style={inputStyle}
                  value={editForm.lastName}
                  onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>
                  Phone Number
                </label>
                <input
                  style={inputStyle}
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+252 61 000 0000"
                  type="tel"
                />
              </div>
              {/* Clinical fields */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: '#14A085', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Medical Info</p>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Date of Birth</label>
                <input type="date" style={inputStyle} value={editForm.date_of_birth || ''} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Gender</label>
                <select style={inputStyle} value={editForm.gender || ''} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Blood Type</label>
                <select style={inputStyle} value={editForm.blood_type || ''} onChange={e => setEditForm({ ...editForm, blood_type: e.target.value })}>
                  <option value="">Unknown</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Height (cm)</label>
                  <input type="number" step="0.1" placeholder="165" style={inputStyle} value={editForm.height_cm || ''} onChange={e => setEditForm({ ...editForm, height_cm: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Weight (kg)</label>
                  <input type="number" step="0.1" placeholder="70" style={inputStyle} value={editForm.weight_kg || ''} onChange={e => setEditForm({ ...editForm, weight_kg: e.target.value })} />
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: '#14A085', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Emergency Contact</p>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Name</label>
                <input type="text" placeholder="Contact name" style={inputStyle} value={editForm.emergency_contact_name || ''} onChange={e => setEditForm({ ...editForm, emergency_contact_name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Phone</label>
                <input type="tel" placeholder="+252 61 000 0000" style={inputStyle} value={editForm.emergency_contact_phone || ''} onChange={e => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })} />
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: '#14A085', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Insurance</p>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Provider</label>
                <input type="text" placeholder="e.g. Jubilee Insurance" style={inputStyle} value={editForm.insurance_provider || ''} onChange={e => setEditForm({ ...editForm, insurance_provider: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>Member / Policy Number</label>
                <input type="text" placeholder="Policy number" style={inputStyle} value={editForm.insurance_number || ''} onChange={e => setEditForm({ ...editForm, insurance_number: e.target.value })} />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #0D7377, #14A085)', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /><span>Save</span></>}
                </button>
                <button
                  onClick={() => { setEditMode(false); setSaveMsg(null); }}
                  className="px-4 py-2.5 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Change Password form ── */}
        {pwMode && (
          <div className="mb-4 rounded-2xl p-4" style={{ background: '#111D33', border: '1px solid rgba(13,115,119,0.3)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#14A085', marginBottom: 12 }}>Change Password</p>
            <div className="space-y-3">
              {[
                { key: 'next', label: 'New Password', placeholder: '••••••••' },
                { key: 'confirm', label: 'Confirm New Password', placeholder: '••••••••' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 5 }}>
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      style={{ ...inputStyle, paddingRight: 40 }}
                      value={pwForm[key]}
                      onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #0D7377, #14A085)', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}
                >
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /><span>Update Password</span></>}
                </button>
                <button
                  onClick={() => { setPwMode(false); setPwMsg(null); }}
                  className="px-4 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Account section ── */}
        <div style={card}>
          <div style={sectionHead}>Account</div>

          <button style={rowBase} onClick={() => { setEditMode(true); setPwMode(false); setSaveMsg(null); }}>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5" style={{ color: '#14A085' }} />
              <div>
                <p style={labelStyle}>Edit Profile</p>
                <p style={subStyle}>Name and phone number</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>

          <button style={{ ...rowBase, borderBottom: 'none' }} onClick={() => { setPwMode(true); setEditMode(false); setPwMsg(null); }}>
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              <div>
                <p style={labelStyle}>Change Password</p>
                <p style={subStyle}>Update your account password</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>

        {/* ── Health section ── */}
        <div style={card}>
          <div style={sectionHead}>My Health</div>

          <button style={rowBase} onClick={() => onNavigate('health-docs')}>
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" style={{ color: '#10B981' }} />
              <div>
                <p style={labelStyle}>Health Records</p>
                <p style={subStyle}>Conditions, allergies, medications</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>

          <button style={rowBase} onClick={() => onNavigate('prescriptions')}>
            <div className="flex items-center space-x-3">
              <Clipboard className="w-5 h-5" style={{ color: '#FCA311' }} />
              <div>
                <p style={labelStyle}>Prescriptions</p>
                <p style={subStyle}>View and upload your prescriptions</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>

          <button style={{ ...rowBase, borderBottom: 'none' }} onClick={() => onNavigate('appointments')}>
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5" style={{ color: '#0EA5E9' }} />
              <div>
                <p style={labelStyle}>My Appointments</p>
                <p style={subStyle}>Upcoming and past bookings</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>

        {/* ── Medical Info section ── */}
        <div style={card}>
          <div style={sectionHead}>Medical Info</div>

          {[
            { label: 'Date of Birth', value: currentUser?.date_of_birth ? new Date(currentUser.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
            { label: 'Gender',        value: currentUser?.gender        ? currentUser.gender.replace(/_/g, ' ') : null },
            { label: 'Blood Type',    value: currentUser?.blood_type    || null },
            { label: 'Height',        value: currentUser?.height_cm     ? `${currentUser.height_cm} cm` : null },
            { label: 'Weight',        value: currentUser?.weight_kg     ? `${currentUser.weight_kg} kg` : null },
          ].map(({ label, value }, idx, arr) => (
            <div key={label} style={{ ...rowBase, borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'default' }}>
              <div>
                <p style={subStyle}>{label}</p>
                <p style={{ ...labelStyle, fontSize: 13 }}>{value || <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', fontSize: 12 }}>Not set</span>}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Emergency Contact ── */}
        {(currentUser?.emergency_contact_name || currentUser?.insurance_provider) && (
          <div style={card}>
            <div style={sectionHead}>Emergency & Insurance</div>
            {currentUser?.emergency_contact_name && (
              <div style={{ ...rowBase, cursor: 'default' }}>
                <div>
                  <p style={subStyle}>Emergency Contact</p>
                  <p style={{ ...labelStyle, fontSize: 13 }}>{currentUser.emergency_contact_name}</p>
                  {currentUser?.emergency_contact_phone && <p style={{ ...subStyle, marginTop: 2 }}>{currentUser.emergency_contact_phone}</p>}
                </div>
              </div>
            )}
            {currentUser?.insurance_provider && (
              <div style={{ ...rowBase, borderBottom: 'none', cursor: 'default' }}>
                <div>
                  <p style={subStyle}>Insurance</p>
                  <p style={{ ...labelStyle, fontSize: 13 }}>{currentUser.insurance_provider}</p>
                  {currentUser?.insurance_number && <p style={{ ...subStyle, marginTop: 2 }}>#{currentUser.insurance_number}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Verification section ── */}
        {!currentUser?.verified && (
          <div style={card}>
            <div style={sectionHead}>Verification</div>
            <button style={{ ...rowBase, borderBottom: 'none' }} onClick={() => onNavigate('id-verification')}>
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5" style={{ color: '#FCA311' }} />
                <div>
                  <p style={labelStyle}>Verify Your ID</p>
                  <p style={subStyle}>Unlock prescriptions and pharmacy routing</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
        )}

        {/* ── Support section ── */}
        <div style={card}>
          <div style={sectionHead}>Support</div>
          <button style={rowBase} onClick={() => onNavigate('alerts')}>
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5" style={{ color: '#F43F5E' }} />
              <div>
                <p style={labelStyle}>News & Alerts</p>
                <p style={subStyle}>Drug safety alerts and updates</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
          <button style={{ ...rowBase, borderBottom: 'none' }}>
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <div>
                <p style={labelStyle}>Help & Privacy</p>
                <p style={subStyle}>support@smartqure.app</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>

        {/* ── Sign out ── */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl mb-4 transition-all active:scale-[0.98]"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 14, fontWeight: 600 }}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>

        <p className="text-center pb-4" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          SmartQure v1.0.0
        </p>

      </div>
    </div>
  );
};

export default ProfileFlow;
