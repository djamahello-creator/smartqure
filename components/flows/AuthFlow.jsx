// components/flows/AuthFlow.jsx
'use client';
import React, { useState } from 'react';
import { Shield, Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AuthFlow = ({ initialMode = 'login', onNavigate }) => {
  const [authMode, setAuthMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (authMode === 'signup') {
        // Create new user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            }
          }
        });

        if (signUpError) throw signUpError;

        // Create profile in profiles table
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw - profile might already exist
          }
        }

        alert('Account created! Please check your email to verify your account.');
        onNavigate('homepage');
      } else {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;

        // Ensure profile exists
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            // Create profile if it doesn't exist
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                first_name: data.user.user_metadata?.first_name || '',
                last_name: data.user.user_metadata?.last_name || '',
                email: data.user.email,
              });
          }
        }

        onNavigate('homepage');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{background:'linear-gradient(135deg,#0A1628 0%,#14213D 60%,#0D4A4D 100%)'}}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-4" style={{width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,#0D7377,#14A085)',boxShadow:'0 6px 24px rgba(13,115,119,0.45)'}}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" style={{fontFamily:"'Space Grotesk', sans-serif"}}>SmartQure</h1>
          <p className="text-sm" style={{color:"rgba(255,255,255,0.5)",fontFamily:"'Inter', sans-serif"}}>Your connected health platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMode === 'login' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                authMode === 'signup' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 pl-11 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pl-11 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 text-white py-3.5 rounded-lg text-sm font-bold shadow-lg hover:bg-teal-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <button
          onClick={() => onNavigate('welcome')}
          className="mt-4 w-full text-white text-sm font-medium hover:text-teal-100"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default AuthFlow;
