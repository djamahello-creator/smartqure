// components/flows/HistoryFlow.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, MoreVertical, Share2, Flag, Trash2 } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

const HistoryFlow = ({ onNavigate }) => {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({ verified: 0, caution: 0, high_risk: 0 });
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        onNavigate('auth', { mode: 'login' });
        return;
      }

      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedScans = data.map(scan => ({
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
        setScans(formattedScans);

        // Calculate stats
        const verified = data.filter(s => s.result === 'verified').length;
        const caution = data.filter(s => s.result === 'caution').length;
        const high_risk = data.filter(s => s.result === 'high_risk').length;
        setStats({ verified, caution, high_risk });
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scanId) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;

    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', scanId);

      if (error) throw error;

      // Refresh list
      fetchScans();
      setMenuOpen(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete scan');
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'caution':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'high_risk':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading history...</p>
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
                <h1 className="text-base font-semibold text-gray-900">Scan History</h1>
                <p className="text-xs text-gray-500">All verifications</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Stats Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="bg-emerald-50 rounded-lg w-10 h-10 flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.verified}</p>
              <p className="text-xs text-gray-600">Verified</p>
            </div>
            <div className="text-center">
              <div className="bg-amber-50 rounded-lg w-10 h-10 flex items-center justify-center mx-auto mb-1.5">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.caution}</p>
              <p className="text-xs text-gray-600">Cautions</p>
            </div>
            <div className="text-center">
              <div className="bg-rose-50 rounded-lg w-10 h-10 flex items-center justify-center mx-auto mb-1.5">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.high_risk}</p>
              <p className="text-xs text-gray-600">High Risk</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-600">
              Total scans: <span className="font-semibold text-gray-900">{scans.length}</span>
            </p>
          </div>
        </div>

        {/* Scan Timeline */}
        <div className="space-y-2">
          {scans.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">No scans yet</p>
              <p className="text-xs text-gray-600 mb-4">Start by scanning a medication</p>
              <button
                onClick={() => onNavigate('scanner')}
                className="bg-teal-500 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-600"
              >
                Scan Now
              </button>
            </div>
          ) : (
            scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all relative"
              >
                <button
                  onClick={() => onNavigate('history-detail', { scan })}
                  className="w-full flex items-center space-x-3 text-left"
                >
                  <div className="flex-shrink-0">
                    {getResultIcon(scan.result)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                      {scan.name}
                    </h3>
                    <p className="text-xs text-gray-500">{scan.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {scan.confidence}%
                    </span>
                  </div>
                </button>

                {/* Menu Button */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === scan.id ? null : scan.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>

                  {menuOpen === scan.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button 
                        onClick={() => alert('Share feature coming soon')}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(null);
                          onNavigate('report', { scan });
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Flag className="w-3 h-3" />
                        <span>Report</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(scan.id)}
                        className="w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-teal-900 text-center">
            Your data is encrypted and private.{' '}
            <button className="font-semibold underline">Privacy Details</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoryFlow;
