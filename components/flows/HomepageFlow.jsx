// components/flows/HomepageFlow.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Camera, FileText, Bell, Menu, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, MessageCircle, MapPin } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const HomepageFlow = ({ onNavigate }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        onNavigate('welcome');
        return;
      }

      // Fetch user profile
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
        });
      } else {
        setCurrentUser({
          name: user.user_metadata?.first_name || 'User',
          fullName: user.user_metadata?.first_name || 'User',
          email: user.email,
          verified: false,
        });
      }

      // Fetch recent scans
      const { data: scans } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(5);

      if (scans) {
        const formattedScans = scans.map(scan => ({
          id: scan.id,
          name: scan.medication_name,
          result: scan.result,
          confidence: scan.confidence,
          time: new Date(scan.scanned_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }),
          hasAlert: scan.has_alert,
          batch: scan.batch_number || 'N/A',
          manufacturer: scan.manufacturer || 'Unknown'
        }));
        setRecentScans(formattedScans);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'caution':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'fake':
      case 'high_risk':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'caution':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'fake':
      case 'high_risk':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
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
          <p className="text-sm text-gray-600">Loading...</p>
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
            <div className="flex items-center space-x-2">
              <div className="bg-teal-500 rounded-lg p-1.5">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">SmartQure</h1>
                <p className="text-xs text-gray-500">Health &amp; Medicine Safety</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('alerts')}
                className="relative p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="absolute right-4 top-16 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => { onNavigate('profile'); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Profile Settings
              </button>
              <button
                onClick={() => { onNavigate('alerts'); setMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                News Alerts
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Welcome back, {currentUser?.name}
          </h2>
          <p className="text-sm text-gray-600">What can we help you with today?</p>
        </div>

        {/* ID Verification Banner */}
        {!currentUser?.verified && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Verify Your ID</h3>
                <p className="text-xs text-amber-700 mb-3">
                  Unlock full access to prescriptions, reminders, and pharmacy routing
                </p>
                <button
                  onClick={() => onNavigate('id-verification')}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-amber-700 active:scale-[0.98] transition-all"
                >
                  Verify Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">

          {/* AI Care Navigator — primary CTA */}
          <button
            onClick={() => onNavigate('triage')}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl p-4 flex items-center justify-between shadow-md active:scale-[0.98] transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold">Find Care</h3>
                <p className="text-xs text-teal-100">Talk to our AI care navigator</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>

          {/* Scan medicine */}
          <button
            onClick={() => onNavigate('scanner')}
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 rounded-xl p-3.5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-teal-50 rounded-lg p-2">
                <Camera className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Verify Medicine</h3>
                <p className="text-xs text-gray-500">Scan barcode or enter details</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {/* Manual entry */}
          <button
            onClick={() => onNavigate('manual-entry')}
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 rounded-xl p-3.5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 rounded-lg p-2">
                <FileText className="w-4 h-4 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Enter Medicine Name</h3>
                <p className="text-xs text-gray-500">No barcode? Type details manually</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {/* Find a pharmacy */}
          <button
            onClick={() => onNavigate('pharmacies')}
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 rounded-xl p-3.5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-teal-50 rounded-lg p-2">
                <MapPin className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Find a Pharmacy</h3>
                <p className="text-xs text-gray-500">Verified pharmacies near you</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Recent Scans */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Scans</h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {recentScans.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No scans yet</p>
                <p className="text-xs text-gray-500 mt-1">Start by scanning a medication</p>
              </div>
            ) : (
              recentScans.slice(0, 3).map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => onNavigate('history-detail', { scan })}
                  className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg p-3 flex items-center space-x-3 shadow-sm hover:shadow transition-all active:scale-[0.99]"
                >
                  <div className="flex-shrink-0">{getResultIcon(scan.result)}</div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{scan.name}</h4>
                    <p className="text-xs text-gray-500">{scan.time}</p>
                  </div>
                  {scan.hasAlert && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">
                      Alert
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getResultBadge(scan.result)}`}>
                    {scan.confidence}%
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-teal-900 mb-0.5">Free to scan anytime</p>
              <p className="text-xs text-teal-700">
                Your verifications help detect counterfeit medications
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageFlow;
