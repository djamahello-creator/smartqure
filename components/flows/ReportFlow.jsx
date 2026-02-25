// components/flows/ReportFlow.jsx
'use client';
import React, { useState } from 'react';
import { Shield, ArrowLeft, Flag, Loader2 } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const ReportFlow = ({ scan, onNavigate }) => {
  const [reportType, setReportType] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reportTypes = [
    { value: 'counterfeit', label: 'Suspected Counterfeit' },
    { value: 'substandard', label: 'Poor Quality/Substandard' },
    { value: 'packaging', label: 'Damaged Packaging' },
    { value: 'adverse', label: 'Adverse Reaction' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportType || !details.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await getCurrentUser();
      if (!user) {
        alert('Please sign in to submit a report');
        onNavigate('auth', { mode: 'login' });
        return;
      }

      const reportData = {
        user_id: user.id,
        scan_id: scan?.id || null,
        report_type: reportType,
        details: details.trim(),
        medication_name: scan?.name || null,
        batch_number: scan?.batch || null,
        status: 'pending',
      };

      const { data, error: insertError } = await supabase
        .from('reports')
        .insert(reportData)
        .select();

      if (insertError) throw insertError;

      alert('Report submitted successfully! Thank you for helping protect others.');
      onNavigate('history');
    } catch (err) {
      console.error('Report submission error:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
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
                onClick={() => onNavigate('history')}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Report Issue</h1>
                <p className="text-xs text-gray-500">Help us improve safety</p>
              </div>
            </div>
            <div className="bg-rose-500 rounded-lg p-1.5">
              <Flag className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              What type of issue? <span className="text-rose-500">*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Select issue type...</option>
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Describe the issue <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide details about the issue you encountered..."
              rows={6}
              required
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Be as specific as possible to help us investigate
            </p>
          </div>

          {scan && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">Related Scan:</p>
              <p className="text-sm text-gray-900 font-medium">{scan.name}</p>
              <p className="text-xs text-gray-500">Batch: {scan.batch}</p>
              <p className="text-xs text-gray-500">Scanned: {scan.time}</p>
            </div>
          )}

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <p className="text-xs text-rose-900">
              <span className="font-semibold">Your report helps protect others.</span> All reports are anonymous and shared with health authorities.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !reportType || !details.trim()}
            className="w-full bg-rose-600 text-white py-3 rounded-lg text-sm font-semibold shadow-sm hover:bg-rose-700 active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Report</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Reports are reviewed within 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportFlow;
