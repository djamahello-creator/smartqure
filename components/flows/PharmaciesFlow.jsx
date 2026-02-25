'use client';
// PharmaciesFlow.jsx — Verified Pharmacies Finder (RxQure)
// Wired to the `pharmacies` Supabase table (from PharmaQure/pharmapos_mvp_schema.sql)
// Falls back gracefully if pharmacies table not yet populated.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Phone, Star, Clock, Search, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

export default function PharmaciesFlow({ onNavigate }) {
  const [pharmacies, setPharmacies]   = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyOpen, setOnlyOpen]       = useState(false);
  const [selected, setSelected]       = useState(null);
  const [userCity, setUserCity]       = useState(null);

  useEffect(() => {
    loadPharmacies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pharmacies, search, onlyVerified, onlyOpen]);

  const loadPharmacies = async () => {
    try {
      // Try to get user's city for relevance sorting
      const user = await getCurrentUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('city, country')
          .eq('id', user.id)
          .single();
        if (profile?.city) setUserCity(profile.city);
      }

      // Load verified pharmacies
      const { data, error } = await supabase
        .from('pharmacies')
        .select(`
          id, name, license_number, license_verified,
          city, country, address,
          phone, email,
          operating_hours,
          is_verified, subscription_plan,
          accepts_digital_rx,
          currency
        `)
        .eq('is_verified', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Pharmacies load error:', error);
        setPharmacies([]);
      } else {
        setPharmacies(data || []);
      }
    } catch (err) {
      console.error('Pharmacies error:', err);
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let list = [...pharmacies];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
      );
    }

    if (onlyVerified) list = list.filter(p => p.is_verified);

    // Operating hours: parse if stored as JSON {mon: "8:00-20:00", ...}
    if (onlyOpen) {
      const now     = new Date();
      const dayKey  = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
      const nowMins = now.getHours() * 60 + now.getMinutes();

      list = list.filter(p => {
        if (!p.operating_hours) return true; // unknown = assume open
        const hours = typeof p.operating_hours === 'string'
          ? JSON.parse(p.operating_hours)
          : p.operating_hours;
        const slot = hours[dayKey] || hours.daily;
        if (!slot || slot === 'closed') return false;
        if (slot === '24h') return true;
        const [open, close] = slot.split('-').map(t => {
          const [h, m] = t.trim().split(':');
          return parseInt(h) * 60 + (parseInt(m) || 0);
        });
        return nowMins >= open && nowMins < close;
      });
    }

    setFiltered(list);
  };

  const isOpenNow = (pharmacy) => {
    if (!pharmacy.operating_hours) return null;
    const now    = new Date();
    const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
    const nowMins = now.getHours() * 60 + now.getMinutes();
    try {
      const hours = typeof pharmacy.operating_hours === 'string'
        ? JSON.parse(pharmacy.operating_hours)
        : pharmacy.operating_hours;
      const slot = hours[dayKey] || hours.daily;
      if (!slot) return null;
      if (slot === 'closed') return false;
      if (slot === '24h') return true;
      const [open, close] = slot.split('-').map(t => {
        const [h, m] = t.trim().split(':');
        return parseInt(h) * 60 + (parseInt(m) || 0);
      });
      return nowMins >= open && nowMins < close;
    } catch { return null; }
  };

  const hoursDisplay = (pharmacy) => {
    if (!pharmacy.operating_hours) return null;
    const now    = new Date();
    const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
    try {
      const hours = typeof pharmacy.operating_hours === 'string'
        ? JSON.parse(pharmacy.operating_hours)
        : pharmacy.operating_hours;
      const slot = hours[dayKey] || hours.daily;
      if (!slot) return null;
      if (slot === '24h') return '24 hours';
      if (slot === 'closed') return 'Closed today';
      return slot;
    } catch { return null; }
  };

  // ─── Selected pharmacy detail view ─────────────────────────────────────────
  if (selected) {
    const openStatus = isOpenNow(selected);
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center space-x-3">
            <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900 truncate">{selected.name}</h1>
              <p className="text-xs text-gray-500">{selected.city}</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-5 space-y-4">
          {/* Status + badges */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {selected.is_verified && (
                  <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> SmartQure Verified
                  </span>
                )}
                {selected.accepts_digital_rx && (
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Digital Rx ✓
                  </span>
                )}
              </div>
              {openStatus !== null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  openStatus ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {openStatus ? 'Open now' : 'Closed'}
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {selected.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{selected.address}, {selected.city}</span>
                </div>
              )}
              {selected.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${selected.phone}`} className="text-teal-600 font-medium">
                    {selected.phone}
                  </a>
                </div>
              )}
              {hoursDisplay(selected) && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">Today: {hoursDisplay(selected)}</span>
                </div>
              )}
              {selected.license_number && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">License: {selected.license_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {selected.phone && (
            <a
              href={`tel:${selected.phone}`}
              className="block w-full bg-teal-500 text-white py-3 rounded-xl text-sm font-semibold text-center hover:bg-teal-600 transition-all"
            >
              Call Pharmacy
            </a>
          )}

          {selected.accepts_digital_rx && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
              <strong>Digital prescriptions accepted.</strong> Show your SmartQure QR code at the counter to fill your e-prescription.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main list view ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => onNavigate('homepage')} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Find a Pharmacy</h1>
                <p className="text-xs text-gray-500">SmartQure verified pharmacies</p>
              </div>
            </div>
            <div className="bg-teal-500 rounded-lg p-1.5">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Filter toggles */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              onlyOpen
                ? 'bg-teal-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            Open now
          </button>
          <button
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              onlyVerified
                ? 'bg-teal-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            Verified only
          </button>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-500 mb-3">
            {filtered.length === 0
              ? 'No pharmacies found'
              : `${filtered.length} pharmacy${filtered.length !== 1 ? 'ies' : ''} found`}
            {userCity ? ` near ${userCity}` : ''}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">No pharmacies found</p>
            <p className="text-xs text-gray-500">
              {pharmacies.length === 0
                ? 'Pharmacy data is being added. Check back soon.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}

        {/* Pharmacy list */}
        <div className="space-y-3">
          {filtered.map(pharmacy => {
            const openStatus = isOpenNow(pharmacy);
            const hours      = hoursDisplay(pharmacy);
            return (
              <button
                key={pharmacy.id}
                onClick={() => setSelected(pharmacy)}
                className="w-full bg-white border border-gray-200 hover:border-teal-300 rounded-xl p-4 text-left shadow-sm hover:shadow transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{pharmacy.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {pharmacy.city}{pharmacy.address ? `, ${pharmacy.address}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {pharmacy.is_verified && (
                      <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                    {openStatus !== null && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        openStatus ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {openStatus ? '● Open' : '● Closed'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {hours}
                    </span>
                  )}
                  {pharmacy.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {pharmacy.phone}
                    </span>
                  )}
                  {pharmacy.accepts_digital_rx && (
                    <span className="text-indigo-600 font-medium">Digital Rx ✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-xs text-teal-800">
            <strong>Only SmartQure-verified pharmacies are listed.</strong> These meet our standards
            for medicine storage, licensing, and authentic sourcing.
          </p>
        </div>
      </div>
    </div>
  );
}
