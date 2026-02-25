// components/BottomNav.jsx
'use client';
import React from 'react';
import { Home, Calendar, Pill, Bell, User } from 'lucide-react';

const BottomNav = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'homepage',     icon: Home,     label: 'Home'         },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'scanner',      icon: Pill,     label: 'RxQure'       },
    { id: 'alerts',       icon: Bell,     label: 'Alerts'       },
    { id: 'profile',      icon: User,     label: 'Profile'      },
  ];

  // Screens that belong to each tab (for active-highlight purposes)
  const tabOwns = {
    homepage:     ['homepage'],
    appointments: ['appointments', 'booking'],
    scanner:      ['scanner', 'manual-entry', 'result-verified', 'result-caution',
                   'result-fake', 'result-high-risk', 'result-unknown'],
    alerts:       ['alerts'],
    profile:      ['profile', 'id-verification', 'id-result-verified', 'id-result-caution',
                   'health-docs', 'prescriptions'],
  };

  const activeTab = Object.keys(tabOwns).find(tab =>
    tabOwns[tab].includes(currentScreen)
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: '#0A1628',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all"
                style={{ minWidth: 56 }}
              >
                <div
                  className="flex items-center justify-center rounded-lg transition-all"
                  style={{
                    width: 36,
                    height: 36,
                    background: isActive ? 'rgba(13,115,119,0.2)' : 'transparent',
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: isActive ? '#14A085' : 'rgba(255,255,255,0.45)' }}
                  />
                </div>
                <span
                  className="text-xs mt-0.5 font-medium"
                  style={{
                    color: isActive ? '#14A085' : 'rgba(255,255,255,0.4)',
                    fontSize: 10,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
