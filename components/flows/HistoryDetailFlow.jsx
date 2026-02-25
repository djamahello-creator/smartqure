// components/flows/HistoryDetailFlow.jsx
'use client';
import React from 'react';
import { Shield, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Share2, Flag } from 'lucide-react';

const HistoryDetailFlow = ({ scan, onNavigate }) => {
  if (!scan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <button
          onClick={() => onNavigate('history')}
          className="bg-teal-500 text-white px-6 py-3 rounded-lg"
        >
          Back to History
        </button>
      </div>
    );
  }

  const getResultIcon = (result) => {
    switch (result) {
      case 'verified':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'caution':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'high_risk':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'verified':
        return 'bg-emerald-50 border-emerald-200';
      case 'caution':
        return 'bg-amber-50 border-amber-200';
      case 'high_risk':
        return 'bg-rose-50 border-rose-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getResultTitle = (result) => {
    switch (result) {
      case 'verified':
        return 'VERIFIED';
      case 'caution':
        return 'CAUTION';
      case 'high_risk':
        return 'HIGH RISK';
      default:
        return 'UNKNOWN';
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
                <h1 className="text-base font-semibold text-gray-900">Scan Details</h1>
                <p className="text-xs text-gray-500">{scan.time}</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Result Badge */}
        <div className={`${getResultColor(scan.result)} border rounded-xl p-4 mb-4`}>
          <div className="flex items-center space-x-3">
            {getResultIcon(scan.result)}
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                {getResultTitle(scan.result)}
              </h3>
              <p className="text-xs text-gray-700">
                {scan.confidence}% confidence match
              </p>
            </div>
          </div>
        </div>

        {/* Medication Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">{scan.name}</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Manufacturer</p>
              <p className="text-sm font-semibold text-gray-900">{scan.manufacturer}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-xs text-gray-500">Batch/Lot</p>
                <p className="text-sm font-medium text-gray-700">{scan.batch}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Scanned</p>
                <p className="text-sm font-medium text-gray-700">{scan.time}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert if present */}
        {scan.hasAlert && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900 mb-1">News Alert</p>
                <p className="text-xs text-amber-700">
                  This medication has been flagged in recent counterfeit warnings. 
                  Check the alerts section for more information.
                </p>
                <button
                  onClick={() => onNavigate('alerts')}
                  className="mt-2 text-xs font-semibold text-amber-700 underline"
                >
                  View Alert Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Sources */}
        {scan.result === 'verified' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Verified Against</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>GS1 Global Registry</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>WHO Prequalified List</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>National Drug Regulatory Database</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button 
            onClick={() => alert('Share feature coming soon')}
            className="w-full bg-teal-500 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 hover:bg-teal-600 active:scale-[0.98] transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Result</span>
          </button>
          
          <button
            onClick={() => onNavigate('report', { scan })}
            className="w-full bg-white text-gray-700 py-3 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
          >
            <Flag className="w-4 h-4" />
            <span>Report Issue</span>
          </button>
        </div>

        {/* Timestamp */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Scan ID: {scan.id.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailFlow;
