// components/flows/WelcomeFlow.jsx
'use client';
import React from 'react';
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';

const WelcomeFlow = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 animate-bounce">
          <div className="bg-white rounded-3xl p-8 shadow-2xl mx-auto inline-block">
            <Shield className="w-24 h-24 text-teal-600 animate-pulse" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-3">MedVerify</h1>
        <p className="text-teal-100 text-base mb-12">
          Protect yourself from counterfeit medications
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('auth', { mode: 'signup' })}
            className="w-full bg-white text-teal-700 py-4 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            Get Started
          </button>
          
          <button
            onClick={() => onNavigate('auth', { mode: 'login' })}
            className="w-full bg-teal-400/30 backdrop-blur-sm text-white py-4 rounded-xl text-sm font-semibold border-2 border-white/30 hover:bg-teal-400/40 active:scale-[0.98] transition-all"
          >
            Sign In
          </button>
        </div>
        
        <div className="mt-12 flex items-center justify-center space-x-2 text-teal-100">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-xs">Trusted by thousands across East Africa</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeFlow;
