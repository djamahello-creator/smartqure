// components/BottomNav.jsx
'use client';
import React from 'react';
import { Home, History, Bell, User } from 'lucide-react';

const BottomNav = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'homepage', icon: Home, label: 'Home' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-teal-600' : 'text-gray-600'}`}>
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
