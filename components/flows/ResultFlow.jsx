// components/flows/ResultFlow.jsx
'use client';
import React from 'react';
import { Shield, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// Flag labels for human-readable display
const FLAG_LABELS = {
  expired:                  '⚠ Expired — do not use',
  recalled:                 '🚨 Batch recalled',
  batch_not_found:          'Batch number not in database',
  medication_not_found:     'Medication not found in database',
  manufacturer_unverified:  'Manufacturer not WHO-verified',
  active_alert:             '🚨 Active counterfeit alert for this medicine',
  expiry_mismatch:          'Expiry date does not match database record',
  barcode_parse_error:      'Could not fully read barcode',
  verification_error:       'Verification service error — please retry',
  unknown_gtin:             'Barcode not in medicine registry',
};

const ResultFlow = ({ result = 'caution', scan, onNavigate }) => {

  const getResultConfig = () => {
    switch (result) {
      case 'verified':
        return {
          bgGradient:  'from-emerald-500 to-emerald-600',
          icon:        CheckCircle2,
          iconColor:   'text-emerald-500',
          title:       'VERIFIED',
          subtitle:    'This medication is legitimate',
          confidence:  scan?.confidence ?? 95,
        };
      case 'caution':
        return {
          bgGradient:  'from-amber-500 to-amber-600',
          icon:        AlertTriangle,
          iconColor:   'text-amber-500',
          title:       'CAUTION',
          subtitle:    'Additional verification recommended',
          confidence:  scan?.confidence ?? 50,
        };
      case 'high_risk':
      case 'fake':
        return {
          bgGradient:  'from-rose-500 to-rose-600',
          icon:        AlertCircle,
          iconColor:   'text-rose-500',
          title:       'HIGH RISK',
          subtitle:    'Do NOT use this medication',
          confidence:  scan?.confidence ?? 0,
        };
      default:
        return {
          bgGradient:  'from-gray-500 to-gray-600',
          icon:        AlertCircle,
          iconColor:   'text-gray-500',
          title:       'UNKNOWN',
          subtitle:    'Unable to verify — manual check needed',
          confidence:  0,
        };
    }
  };

  const config     = getResultConfig();
  const ResultIcon = config.icon;
  const flags      = scan?.flags || [];
  const alert      = scan?.alert || null;

  const flagLabel = (f) => FLAG_LABELS[f] || f.replace(/_/g, ' ');

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
                <h1 className="text-base font-semibold text-gray-900">Verification Result</h1>
                <p className="text-xs text-gray-500">SmartQure RxQure</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      <div className={`bg-gradient-to-br ${config.bgGradient} px-6 py-8 mb-4`}>
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-full p-4 shadow-xl mx-auto inline-block mb-4">
            <ResultIcon className={`w-12 h-12 ${config.iconColor}`} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{config.title}</h2>
          <p className="text-sm text-white/90 mb-3">{config.subtitle}</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            <p className="text-white text-base font-semibold">
              {config.confidence}% confidence
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4">

        {/* Active counterfeit alert */}
        {alert && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <h4 className="text-sm font-bold text-rose-900">Active Alert</h4>
            </div>
            <p className="text-sm font-semibold text-rose-800 mb-1">{alert.title}</p>
            {alert.description && (
              <p className="text-xs text-rose-700 mb-2">{alert.description}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {alert.severity && (
                <span className="bg-rose-200 text-rose-800 text-xs font-semibold px-2 py-0.5 rounded-full uppercase">
                  {alert.severity}
                </span>
              )}
              {alert.source && (
                <span className="text-xs text-rose-600">Source: {alert.source}</span>
              )}
            </div>
          </div>
        )}

        {/* Medication details */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">
            {scan?.name || 'Medication'}
          </h3>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Manufacturer</p>
                <p className="text-sm font-semibold text-gray-900">
                  {scan?.manufacturer || 'Not available'}
                </p>
              </div>
              {scan?.who_eml && (
                <div>
                  <p className="text-xs text-gray-500">WHO Essential</p>
                  <p className="text-sm font-semibold text-emerald-700">✓ EML listed</p>
                </div>
              )}
            </div>
            {(scan?.batch || scan?.expiry) && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                {scan.batch && (
                  <div>
                    <p className="text-xs text-gray-500">Batch / Lot</p>
                    <p className="text-sm font-medium text-gray-700">{scan.batch}</p>
                  </div>
                )}
                {scan.expiry && (
                  <div>
                    <p className="text-xs text-gray-500">Expiry</p>
                    <p className="text-sm font-medium text-gray-700">{scan.expiry}</p>
                  </div>
                )}
              </div>
            )}
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-500">Scanned</p>
              <p className="text-sm font-medium text-gray-700">{scan?.time || 'Just now'}</p>
            </div>
          </div>
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-semibold text-amber-900">Verification flags</h4>
            </div>
            <ul className="space-y-1">
              {flags.map(f => (
                <li key={f} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {flagLabel(f)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Result-specific guidance */}
        {result === 'verified' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-semibold text-emerald-900 mb-2">Verified against:</h4>
            <div className="space-y-1">
              {[
                'SmartQure WHO Essential Medicines database',
                'Manufacturer WHO Prequalification list',
                'Active counterfeit alert registry',
              ].map(s => (
                <div key={s} className="flex items-center space-x-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result === 'caution' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-semibold text-amber-900 mb-2">Recommended actions:</h4>
            <ul className="space-y-1 text-xs text-amber-800">
              <li>• Confirm batch details with your pharmacist</li>
              <li>• Check packaging for security holograms</li>
              <li>• Only purchase from licensed pharmacies</li>
              <li>• Report suspicions using the button below</li>
            </ul>
          </div>
        )}

        {(result === 'high_risk' || result === 'fake') && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
            <h4 className="text-xs font-semibold text-rose-900 mb-2">⚠️ Immediate actions:</h4>
            <ul className="space-y-1 text-xs text-rose-800">
              <li>• <strong>Do not take</strong> this medication</li>
              <li>• Keep the packaging as evidence</li>
              <li>• Contact your doctor for a legitimate alternative</li>
              <li>• Report to health authorities (button below)</li>
              <li>• Return to the pharmacy where purchased</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {(result === 'high_risk' || result === 'fake') && (
            <button
              onClick={() => onNavigate('report', { scan })}
              className="w-full bg-rose-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-rose-700 active:scale-[0.98] transition-all"
            >
              Report to Authorities
            </button>
          )}

          {result === 'caution' && (
            <button
              onClick={() => onNavigate('report', { scan })}
              className="w-full bg-amber-500 text-white py-3 rounded-lg text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all"
            >
              Report Suspected Counterfeit
            </button>
          )}

          <button
            onClick={() => onNavigate('homepage')}
            className={`w-full py-3 rounded-lg text-sm font-semibold active:scale-[0.98] transition-all ${
              result === 'high_risk' || result === 'fake'
                ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            }`}
          >
            {result === 'high_risk' || result === 'fake' ? 'Back to Home' : 'Done'}
          </button>

          <button
            onClick={() => onNavigate('history')}
            className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            View Scan History
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 pb-2">
          SmartQure RxQure · Verification powered by WHO EML database
        </p>
      </div>
    </div>
  );
};

export default ResultFlow;
