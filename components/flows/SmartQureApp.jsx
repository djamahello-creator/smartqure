// MedVerifyApp.jsx - SmartQure Main Application Router
'use client';
import React, { useState } from 'react';

// Core flows
import WelcomeFlow        from './WelcomeFlow';
import AuthFlow           from './AuthFlow';
import HomepageFlow       from './HomepageFlow';

// RxQure — Medicine verification
import ScannerFlow        from './ScannerFlow';
import ManualEntryFlow    from './ManualEntryFlow';
import ResultFlow         from './ResultFlow';
import HistoryFlow        from './HistoryFlow';
import HistoryDetailFlow  from './HistoryDetailFlow';
import ReportFlow         from './ReportFlow';
import AlertsFlow         from './AlertsFlow';

// SmartQure Care Navigator (AI Triage)
import TriageFlow         from './TriageFlow';

// Pharmacies
import PharmaciesFlow     from './PharmaciesFlow';

// Identity & Profile
import IDVerificationFlow from './IDVerificationFlow';
import IDResultFlow       from './IDResultFlow';
import ProfileFlow        from './ProfileFlow';

// Shell
import BottomNav          from '../BottomNav';

const SmartQureApp = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [screenData, setScreenData]       = useState({});
  const [currentUser, setCurrentUser]     = useState(null);

  const navigateTo = (screen, data = {}) => {
    setCurrentScreen(screen);
    setScreenData(data);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  const renderScreen = () => {
    switch (currentScreen) {

      // ── Onboarding ────────────────────────────────────────────────────────
      case 'welcome':
        return <WelcomeFlow onNavigate={navigateTo} />;

      case 'auth':
        return (
          <AuthFlow
            initialMode={screenData.mode || 'login'}
            onNavigate={navigateTo}
            onAuthSuccess={(user) => {
              setCurrentUser(user);
              navigateTo('homepage');
            }}
          />
        );

      // ── Main home ─────────────────────────────────────────────────────────
      case 'homepage':
        return <HomepageFlow onNavigate={navigateTo} user={currentUser} />;

      // ── AI Care Navigator (Triage) ────────────────────────────────────────
      case 'triage':
        return <TriageFlow onNavigate={navigateTo} user={currentUser} navigateTo={navigateTo} />;

      // ── RxQure — Verification flows ───────────────────────────────────────
      case 'scanner':
        return <ScannerFlow onNavigate={navigateTo} />;

      case 'manual-entry':
        return <ManualEntryFlow onNavigate={navigateTo} />;

      case 'result-verified':
        return <ResultFlow result="verified"  scan={screenData.scan} onNavigate={navigateTo} />;

      case 'result-caution':
        return <ResultFlow result="caution"   scan={screenData.scan} onNavigate={navigateTo} />;

      // 'fake' from /api/verify maps here
      case 'result-fake':
        return <ResultFlow result="high_risk" scan={screenData.scan} onNavigate={navigateTo} />;

      // legacy alias
      case 'result-high-risk':
        return <ResultFlow result="high_risk" scan={screenData.scan} onNavigate={navigateTo} />;

      case 'result-unknown':
        return <ResultFlow result="unknown"   scan={screenData.scan} onNavigate={navigateTo} />;

      // ── History & reporting ───────────────────────────────────────────────
      case 'history':
        return <HistoryFlow onNavigate={navigateTo} />;

      case 'history-detail':
        return <HistoryDetailFlow scan={screenData.scan} onNavigate={navigateTo} />;

      case 'report':
        return <ReportFlow scan={screenData.scan} onNavigate={navigateTo} />;

      case 'alerts':
        return <AlertsFlow onNavigate={navigateTo} />;

      case 'pharmacies':
        return <PharmaciesFlow onNavigate={navigateTo} />;

      // ── Identity verification ─────────────────────────────────────────────
      case 'id-verification':
        return <IDVerificationFlow onNavigate={navigateTo} />;

      case 'id-result-verified':
        return <IDResultFlow result="verified" confidence={screenData.confidence || 95} onNavigate={navigateTo} />;

      case 'id-result-caution':
        return <IDResultFlow result="caution"  confidence={screenData.confidence || 60} onNavigate={navigateTo} />;

      // ── Profile ───────────────────────────────────────────────────────────
      case 'profile':
        return <ProfileFlow onNavigate={navigateTo} />;

      default:
        return <WelcomeFlow onNavigate={navigateTo} />;
    }
  };

  const screensWithBottomNav = [
    'homepage', 'history', 'history-detail',
    'alerts', 'profile',
    'result-verified', 'result-caution', 'result-fake', 'result-high-risk', 'result-unknown',
  ];

  return (
    <div className="min-h-screen">
      {renderScreen()}
      {screensWithBottomNav.includes(currentScreen) && (
        <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
      )}
    </div>
  );
};

export default SmartQureApp;
