// components/flows/WelcomeFlow.jsx
'use client';
import React from 'react';
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';

const WelcomeFlow = ({ onNavigate }) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A1628 0%, #14213D 60%, #0D4A4D 100%)' }}
    >
      {/* Background glow orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-80px',
          right: '-80px',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,115,119,0.3) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-md w-full text-center relative z-10">

        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div
            className="flex items-center justify-center"
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #0D7377, #14A085)',
              boxShadow: '0 8px 32px rgba(13,115,119,0.5)',
            }}
          >
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Brand name */}
        <h1
          className="font-bold text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, letterSpacing: '-0.02em' }}
        >
          SmartQure
        </h1>
        <p
          className="mb-12"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.55)' }}
        >
          Smarter healthcare for East Africa
        </p>

        {/* CTA buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('auth', { mode: 'signup' })}
            className="w-full flex items-center justify-center space-x-2 py-4 rounded-xl font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #0D7377, #14A085)',
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              boxShadow: '0 4px 20px rgba(13,115,119,0.45)',
            }}
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('auth', { mode: 'login' })}
            className="w-full py-4 rounded-xl font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            Sign In
          </button>
        </div>

        {/* Trust line */}
        <div className="mt-12 flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-4 h-4" style={{ color: '#14A085' }} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Trusted by patients across East Africa
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeFlow;
