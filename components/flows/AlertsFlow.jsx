// components/flows/AlertsFlow.jsx
'use client';
import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, AlertTriangle, TrendingUp, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AlertsFlow = ({ onNavigate }) => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('fake_news_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        setAlerts(data);
      } else {
        // No fallback data - show empty state
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (selectedAlert) {
    const colors = selectedAlert.severity === 'high'
      ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' }
      : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Alert Details</h1>
                <p className="text-xs text-gray-500">{selectedAlert.published_date}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Alert Banner */}
          <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 mb-4`}>
            <div className="flex items-start space-x-3">
              <div className={`${colors.dot} rounded-full p-2 animate-pulse`}>
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase bg-white">
                  {selectedAlert.severity} Risk
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-1">
                  {selectedAlert.medication_name}
                </h2>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Alert Summary</h3>
            <p className="text-sm text-gray-700 mb-3">{selectedAlert.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Affected Area</p>
                  <p className="text-sm font-medium text-gray-900">{selectedAlert.affected_area}</p>
                </div>
              </div>
              {selectedAlert.batch_number && (
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Batch Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedAlert.batch_number}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-2">
                <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="text-sm font-medium text-gray-900">{selectedAlert.source}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Info */}
          <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 mb-4`}>
            <h4 className="text-xs font-semibold text-gray-900 mb-2">What to do:</h4>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>• Do not use this medication if you have it</li>
              <li>• Check your medication against this batch number</li>
              <li>• Report any suspicious medications to authorities</li>
              <li>• Purchase from verified pharmacies only</li>
            </ul>
          </div>

          <button
            onClick={() => onNavigate('homepage')}
            className="w-full bg-teal-500 text-white py-3 rounded-lg text-sm font-semibold hover:bg-teal-600 active:scale-[0.98] transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Alert List View
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
                <h1 className="text-base font-semibold text-gray-900">News Alerts</h1>
                <p className="text-xs text-gray-500">Counterfeit warnings</p>
              </div>
            </div>
            <div className="bg-rose-500 rounded-lg p-1.5">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Info Banner */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-teal-900">
              <span className="font-semibold">Live alerts</span> from WHO, MoH, and verified health authorities
            </p>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">No active alerts</p>
              <p className="text-xs text-gray-600">We'll notify you when new alerts are posted</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`w-full ${alert.severity === 'high' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4 text-left hover:shadow-md transition-all active:scale-[0.99]`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`${alert.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'} rounded-full p-1.5 animate-pulse flex-shrink-0`}>
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase bg-white">
                      {alert.severity}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 mt-1 truncate">
                      {alert.medication_name}
                    </h3>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                      {alert.description}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-600 mt-2">
                      <span>{alert.location}</span>
                      <span>•</span>
                      <span>{alert.published_date}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsFlow;
