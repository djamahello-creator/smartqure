// components/flows/HealthDocsFlow.jsx
// Wired to Supabase — requires health_conditions, allergies, patient_medications,
// patient_documents tables. Run create_missing_tables.sql first.
'use client';
import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus, X, Edit2, Trash2, Upload, FileText, Eye, Loader2, AlertCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const HealthDocsFlow = ({ onNavigate }) => {
  const [screen, setScreen]         = useState('health');
  const [userId, setUserId]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showAdd, setShowAdd]       = useState(null); // 'condition' | 'allergy' | 'medication'

  const [conditions, setConditions]     = useState([]);
  const [allergies, setAllergies]       = useState([]);
  const [medications, setMedications]   = useState([]);
  const [documents, setDocuments]       = useState([]);

  // Add form state
  const [addForm, setAddForm] = useState({});
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setError(null);
      const user = await getCurrentUser();
      if (!user) { onNavigate('welcome'); return; }
      setUserId(user.id);

      const [cRes, aRes, mRes, dRes] = await Promise.all([
        supabase.from('health_conditions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('allergies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('patient_medications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('patient_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
      ]);

      // Surface first error if any
      const firstError = [cRes, aRes, mRes, dRes].find(r => r.error)?.error;
      if (firstError) throw firstError;

      setConditions(cRes.data || []);
      setAllergies(aRes.data || []);
      setMedications(mRes.data || []);
      setDocuments(dRes.data || []);
    } catch (err) {
      console.error('Health docs fetch error:', err);
      setError(err.message?.includes('does not exist')
        ? 'Health record tables have not been created yet. Run create_missing_tables.sql in your Supabase SQL Editor.'
        : 'Could not load health records. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Add handlers ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      if (showAdd === 'condition') {
        const { data, error } = await supabase
          .from('health_conditions')
          .insert({ user_id: userId, name: addForm.name, diagnosed: addForm.diagnosed || null })
          .select().single();
        if (error) throw error;
        setConditions(prev => [data, ...prev]);
      } else if (showAdd === 'allergy') {
        const { data, error } = await supabase
          .from('allergies')
          .insert({ user_id: userId, allergen: addForm.allergen, reaction: addForm.reaction, severity: addForm.severity || 'mild' })
          .select().single();
        if (error) throw error;
        setAllergies(prev => [data, ...prev]);
      } else if (showAdd === 'medication') {
        const { data, error } = await supabase
          .from('patient_medications')
          .insert({ user_id: userId, name: addForm.name, dosage: addForm.dosage, frequency: addForm.frequency })
          .select().single();
        if (error) throw error;
        setMedications(prev => [data, ...prev]);
      }
      setShowAdd(null);
      setAddForm({});
    } catch (err) {
      console.error('Add error:', err);
      alert('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table, id, setter) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) setter(prev => prev.filter(r => r.id !== id));
  };

  const severityColor = (s) => ({
    severe:   'bg-red-100 text-red-700',
    moderate: 'bg-orange-100 text-orange-700',
    mild:     'bg-yellow-100 text-yellow-700',
  }[s] || 'bg-yellow-100 text-yellow-700');

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading health records...</p>
      </div>
    </div>
  );

  // ─── Error ────────────────────────────────────────────────────────────────
  const ErrorBanner = () => error ? (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-red-800 font-medium">{error}</p>
        <button onClick={fetchAll} className="text-xs text-red-600 underline mt-1">Retry</button>
      </div>
    </div>
  ) : null;

  // ─── Health History ───────────────────────────────────────────────────────
  if (screen === 'health') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => onNavigate('homepage')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Health History</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 space-y-6">
        <ErrorBanner />

        {/* Conditions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Chronic Conditions</h2>
            <button onClick={() => { setShowAdd('condition'); setAddForm({}); }} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700">
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
          {conditions.length === 0
            ? <p className="text-sm text-gray-400 bg-white rounded-xl p-4 shadow-sm text-center">No conditions recorded</p>
            : <div className="space-y-2">
                {conditions.map(c => (
                  <div key={c.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      {c.diagnosed && <div className="text-sm text-gray-500">Diagnosed {new Date(c.diagnosed).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>}
                    </div>
                    <button onClick={() => handleDelete('health_conditions', c.id, setConditions)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
          }
        </section>

        {/* Allergies */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Allergies</h2>
            <button onClick={() => { setShowAdd('allergy'); setAddForm({ severity: 'mild' }); }} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700">
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
          {allergies.length === 0
            ? <p className="text-sm text-gray-400 bg-white rounded-xl p-4 shadow-sm text-center">No allergies recorded</p>
            : <div className="space-y-2">
                {allergies.map(a => (
                  <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-gray-900">{a.allergen}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${severityColor(a.severity)}`}>{a.severity}</span>
                        <button onClick={() => handleDelete('allergies', a.id, setAllergies)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                    {a.reaction && <div className="text-sm text-gray-500">Reaction: {a.reaction}</div>}
                  </div>
                ))}
              </div>
          }
        </section>

        {/* Medications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Current Medications</h2>
            <button onClick={() => { setShowAdd('medication'); setAddForm({}); }} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700">
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
          {medications.length === 0
            ? <p className="text-sm text-gray-400 bg-white rounded-xl p-4 shadow-sm text-center">No medications recorded</p>
            : <div className="space-y-2">
                {medications.map(m => (
                  <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900">{m.name}</div>
                      <div className="flex items-center gap-2">
                        {m.active && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                        <button onClick={() => handleDelete('patient_medications', m.id, setMedications)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                    {(m.dosage || m.frequency) && <div className="text-sm text-gray-500">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</div>}
                  </div>
                ))}
              </div>
          }
        </section>

        <button onClick={() => setScreen('docs')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
          View Documents
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {showAdd === 'condition' ? 'Add Condition' : showAdd === 'allergy' ? 'Add Allergy' : 'Add Medication'}
              </h3>
              <button onClick={() => setShowAdd(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {showAdd === 'condition' && <>
                <input type="text" placeholder="Condition name" value={addForm.name || ''} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="month" value={addForm.diagnosed || ''} onChange={e => setAddForm(p => ({ ...p, diagnosed: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </>}
              {showAdd === 'allergy' && <>
                <input type="text" placeholder="Allergen (e.g. Penicillin)" value={addForm.allergen || ''} onChange={e => setAddForm(p => ({ ...p, allergen: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="Reaction" value={addForm.reaction || ''} onChange={e => setAddForm(p => ({ ...p, reaction: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={addForm.severity || 'mild'} onChange={e => setAddForm(p => ({ ...p, severity: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </>}
              {showAdd === 'medication' && <>
                <input type="text" placeholder="Medication name" value={addForm.name || ''} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="Dosage (e.g. 500mg)" value={addForm.dosage || ''} onChange={e => setAddForm(p => ({ ...p, dosage: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="Frequency (e.g. Twice daily)" value={addForm.frequency || ''} onChange={e => setAddForm(p => ({ ...p, frequency: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </>}
              <button onClick={handleAdd} disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Documents ────────────────────────────────────────────────────────────
  if (screen === 'docs') return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => setScreen('health')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <p className="text-sm text-blue-900"><strong className="block mb-1">Secure Storage</strong>Your documents are encrypted and only visible to you and authorised healthcare providers.</p>
        </div>

        {documents.length === 0
          ? <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 mb-6">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-600 mb-1">No documents uploaded</p>
              <p className="text-sm text-gray-400">Upload your ID, insurance card, or health records</p>
            </div>
          : <div className="space-y-3 mb-6">
              {documents.map(d => (
                <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{d.name}</div>
                      <div className="text-sm text-gray-500">{d.file_size && `${d.file_size} · `}{new Date(d.uploaded_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-gray-50 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-100">
                        <Eye className="w-4 h-4" /> View
                      </a>
                    )}
                    <button onClick={() => handleDelete('patient_documents', d.id, setDocuments)} className="flex-1 py-2 bg-gray-50 rounded-lg text-sm font-semibold text-red-600 flex items-center justify-center gap-2 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }

        <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700">
          <Upload className="w-5 h-5" /> Upload Document
        </button>
        <div className="mt-4 text-center">
          <button onClick={() => setScreen('health')} className="text-blue-600 font-semibold text-sm">Back to Health History</button>
        </div>
      </div>
    </div>
  );
};

export default HealthDocsFlow;
