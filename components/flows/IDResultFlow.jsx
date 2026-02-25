// components/flows/IDResultFlow.jsx
'use client';
import React from 'react';
import { Shield, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

const IDResultFlow = ({ result = 'verified', confidence = 95, onNavigate }) => {
  const isVerified = result === 'verified';

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
                <p className="text-xs text-gray-500">ID verification complete</p>
              </div>
            </div>
            <div className={`${isVerified ? 'bg-emerald-500' : 'bg-amber-500'} rounded-lg p-1.5`}>
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      <div className={`${isVerified ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-amber-600'} px-6 py-8 mb-4`}>
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-full p-4 shadow-xl mx-auto inline-block mb-4 animate-bounce">
            {isVerified ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-amber-500" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isVerified ? 'ID VERIFIED' : 'VERIFICATION NEEDS REVIEW'}
          </h2>
          <p className="text-sm text-white/90 mb-3">
            {isVerified 
              ? 'Your identity has been successfully verified'
              : 'We need to review your documents manually'
            }
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            <p className="text-white text-base font-semibold">{confidence}% Match</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="max-w-md mx-auto px-4">
        {isVerified ? (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">What's Next?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Full access to prescription wallet and reminders</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Verified badge on your profile</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Access to verified pharmacy routing</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Ability to receive e-prescriptions</span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-emerald-900">
                <span className="font-semibold">Your data is secure.</span> We use bank-level encryption and never share your information without consent.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Next Steps</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Our team will review your submission within 24 hours</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>You'll receive an email notification when complete</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>You can still use basic scan features</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-900">
                <span className="font-semibold">Why manual review?</span> Your photo quality or lighting may need adjustment. Our team ensures your security.
              </p>
            </div>

            <button
              onClick={() => onNavigate('id-verification')}
              className="w-full bg-amber-600 text-white py-3 rounded-lg text-sm font-semibold mb-3 hover:bg-amber-700 active:scale-[0.98] transition-all"
            >
              Try Again
            </button>
          </>
        )}

        <button
          onClick={() => onNavigate('profile')}
          className="w-full bg-teal-500 text-white py-3 rounded-lg text-sm font-semibold hover:bg-teal-600 active:scale-[0.98] transition-all"
        >
          {isVerified ? 'View My Profile' : 'Back to Profile'}
        </button>
      </div>
    </div>
  );
};

export default IDResultFlow;
