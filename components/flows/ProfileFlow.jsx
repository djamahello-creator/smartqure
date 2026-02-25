// components/flows/ProfileFlow.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, User, Lock, Bell, Settings, HelpCircle, LogOut, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const ProfileFlow = ({ onNavigate }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        onNavigate('auth', { mode: 'login' });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUser({
          name: profile.first_name || 'User',
          fullName: profile.full_name || profile.first_name || 'User',
          email: profile.email || user.email,
          verified: profile.verified || false,
          verifiedAt: profile.verified_at,
        });
      } else {
        setCurrentUser({
          name: user.user_metadata?.first_name || 'User',
          fullName: user.user_metadata?.first_name || 'User',
          email: user.email,
          verified: false,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onNavigate('welcome');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-base font-semibold text-gray-900">Profile</h1>
                <p className="text-xs text-gray-500">Account settings</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-200 rounded-xl p-6 mb-6 text-center">
          <div className="bg-teal-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-3">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{currentUser?.fullName}</h2>
          <p className="text-sm text-gray-600 mb-3">{currentUser?.email}</p>
          
          {currentUser?.verified ? (
            <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified ID</span>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('id-verification')}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-600 active:scale-[0.98] transition-all"
            >
              Verify ID for Premium Access
            </button>
          )}
        </div>

        {/* Verification Prompt */}
        {!currentUser?.verified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Complete ID Verification</h3>
                <p className="text-xs text-amber-700 mb-3">
                  Unlock prescriptions, reminders, and pharmacy routing
                </p>
                <button
                  onClick={() => onNavigate('id-verification')}
                  className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-700 active:scale-[0.98] transition-all"
                >
                  Start Verification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Account Settings */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <h3 className="px-4 py-3 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
              ACCOUNT SETTINGS
            </h3>
            <div className="w-full px-4 py-3 flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Edit Profile</span>
                  <p className="text-xs text-gray-500">Not yet available</p>
                </div>
              </div>
            </div>
            <div className="w-full px-4 py-3 flex items-center justify-between opacity-50 cursor-not-allowed border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Change Password</span>
                  <p className="text-xs text-gray-500">Not yet available</p>
                </div>
              </div>
            </div>
          </div>

          {/* App Settings */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <h3 className="px-4 py-3 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
              APP SETTINGS
            </h3>
            <div className="w-full px-4 py-3 flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Notifications</span>
                  <p className="text-xs text-gray-500">Not yet available</p>
                </div>
              </div>
            </div>
            <div className="w-full px-4 py-3 flex items-center justify-between opacity-50 cursor-not-allowed border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Preferences</span>
                  <p className="text-xs text-gray-500">Not yet available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <h3 className="px-4 py-3 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
              SUPPORT
            </h3>
            <div className="w-full px-4 py-3 flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Help Center</span>
                  <p className="text-xs text-gray-500">Not yet available</p>
                </div>
              </div>
            </div>
            <div className="w-full px-4 py-3 flex items-center justify-between opacity-50 cursor-not-allowed border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Privacy Policy</span>
                  <p className="text-xs text-gray-500">Not yet available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="w-full bg-rose-50 border border-rose-200 text-rose-600 py-3 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 hover:bg-rose-100 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-gray-500 mt-6">
          MedVerify v1.0.0
        </p>
      </div>
    </div>
  );
};

export default ProfileFlow;
