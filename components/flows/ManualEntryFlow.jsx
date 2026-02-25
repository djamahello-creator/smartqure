// components/flows/ManualEntryFlow.jsx
'use client';
import React, { useState } from 'react';
import { Shield, ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const ManualEntryFlow = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    medicationName: '',
    batchNumber: '',
    expiryDate: '',
    manufacturerName: '',
    countryOfOrigin: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const countries = [
    'Kenya', 'Ethiopia', 'Somalia', 'Uganda', 'Tanzania', 'Rwanda',
    'India', 'China', 'Egypt', 'South Africa', 'United States', 'United Kingdom',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        onNavigate('auth', { mode: 'login' });
        return;
      }

      // Call the real verification API (server-side)
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:              'manual',
          medication_name:   formData.medicationName,
          manufacturer_name: formData.manufacturerName || null,
          batch_number:      formData.batchNumber      || null,
          expiry_date:       formData.expiryDate       || null,
          user_id:           user.id,
          location_country:  formData.countryOfOrigin  || null,
        }),
      });

      if (!res.ok) throw new Error(`Verification service error (${res.status})`);
      const verification = await res.json();

      // Map result to correct screen
      const resultScreen =
        verification.result === 'verified' ? 'result-verified' :
        verification.result === 'fake'     ? 'result-fake'     :
        'result-caution';

      const scanResult = {
        id:           verification.scan_id,
        name:         verification.medication?.name  || formData.medicationName,
        result:       verification.result,
        confidence:   verification.confidence,
        time:         'Just now',
        hasAlert:     !!verification.alert,
        alert:        verification.alert             || null,
        batch:        verification.batch?.batch_number || formData.batchNumber || 'N/A',
        expiry:       verification.batch?.expiry_date || formData.expiryDate   || 'N/A',
        manufacturer: verification.manufacturer?.name || formData.manufacturerName || 'Unknown',
        flags:        verification.flags             || [],
        who_eml:      verification.medication?.who_eml || false,
      };

      onNavigate(resultScreen, { scan: scanResult });

    } catch (error) {
      console.error('Manual entry error:', error);
      onNavigate('result-caution', {
        scan: {
          name:    formData.medicationName,
          result:  'unknown',
          confidence: 0,
          flags:   ['verification_error'],
          error:   error.message || 'Verification service unavailable',
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('homepage')}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Manual Entry</h1>
                <p className="text-xs text-gray-500">Enter medication details</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Medication Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.medicationName}
              onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
              placeholder="e.g., Metformin 500mg"
              required
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Batch/Lot Number
            </label>
            <input
              type="text"
              value={formData.batchNumber}
              onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              placeholder="e.g., XYZ123456"
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1 text-xs text-gray-500">Found on medication packaging</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Expiry Date
            </label>
            <input
              type="month"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Manufacturer Name
            </label>
            <input
              type="text"
              value={formData.manufacturerName}
              onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
              placeholder="e.g., ABC Pharma"
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Country of Origin
            </label>
            <select
              value={formData.countryOfOrigin}
              onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select country...</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Photo (Optional)
            </label>
            {!photoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-all">
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Upload medication photo</p>
                  <p className="text-xs text-gray-500 mt-0.5">PNG, JPG up to 10MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative w-full h-32 bg-white border border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={photoPreview}
                  alt="Medication preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!formData.medicationName || loading}
              className="w-full bg-teal-500 text-white py-3 rounded-lg text-sm font-semibold shadow-sm hover:bg-teal-600 active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify Medication</span>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            All information is encrypted and stored securely
          </p>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryFlow;
