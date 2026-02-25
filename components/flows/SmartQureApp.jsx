// SmartQureApp.jsx - SmartQure Main Application Router
'use client';
import React, { useState } from 'react';

// ── Onboarding ────────────────────────────────────────────────────────────────
import WelcomeFlow        from './WelcomeFlow';
import AuthFlow           from './AuthFlow';

// ── Home ──────────────────────────────────────────────────────────────────────
import HomepageFlow       from './HomepageFlow';

// ── Appointments & Booking ────────────────────────────────────────────────────
import AppointmentsFlow   from './AppointmentsFlow';
import BookingFlow        from './BookingFlow';

// ── Health Records ────────────────────────────────────────────────────────────
import HealthDocsFlow     from './HealthDocsFlow';

// ── Prescriptions ─────────────────────────────────────────────────────────────
import PrescriptionsFlow  from './PrescriptionsFlow';

// ── RxQure — Medicine verification ───────────────────────────────────────────
import ScannerFlow        from './ScannerFlow';
import ManualEntryFlow    from './ManualEntryFlow';
import ResultFlow         from './ResultFlow';
import HistoryFlow        from './HistoryFlow';
import HistoryDetailFlow  from './HistoryDetailFlow';
import ReportFlow         from './ReportFlow';
import AlertsFlow         from './AlertsFlow';

// ── AI Care Navigator (Triage) ────────────────────────────────────────────────
import TriageFlow         from './TriageFlow';

// ── Pharmacies ────────────────────────────────────────────────────────────────
import PharmaciesFlow     from './PharmaciesFlow';

// ── Identity & Profile ────────────────────────────────────────────────────────
import IDVerificationFlow from './IDVerificationFlow';
import IDResultFlow       from './IDResultFlow';
import ProfileFlow        from './ProfileFlow';

// ── Shell ─────────────────────────────────────────────────────────────────────
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

      // ── Onboarding ──────────────────────────────────────────────────────────
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

      // ── Home ────────────────────────────────────────────────────────────────
      case 'homepage':
        return <HomepageFlow onNavigate={navigateTo} user={currentUser} />;

      // ── Appointments & Booking ───────────────────────────────────────────────
      case 'appointments':
        return <AppointmentsFlow onNavigate={navigateTo} user={currentUser} />;

      case 'booking':
        return <BookingFlow onNavigate={navigateTo} user={currentUser} />;

      // ── Health Records ───────────────────────────────────────────────────────
      case 'health-docs':
        return <HealthDocsFlow onNavigate={navigateTo} user={currentUser} />;

      // ── Prescriptions ────────────────────────────────────────────────────────
      case 'prescriptions':
        return <PrescriptionsFlow onNavigate={navigateTo} user={currentUser} />;

      // ── AI Care Navigator ────────────────────────────────────────────────────
      case 'triage':
        return <TriageFlow onNavigate={navigateTo} navigateTo={navigateTo} user={currentUser} />;

      // ── RxQure — Verification flows ──────────────────────────────────────────
      case 'scanner':
        return <ScannerFlow onNavigate={navigateTo} />;

      case 'manual-entry':
        return <ManualEntryFlow onNavigate={navigateTo} />;

      case 'result-verified':
        return <ResultFlow result="verified"  scan={screenData.scan} onNavigate={navigateTo} />;

      case 'result-caution':
        return <ResultFlow result="caution"   scan={screenData.scan} onNavigate={navigateTo} />;

      case 'result-fake':
        return <ResultFlow result="high_risk" scan={screenData.scan} onNavigate={navigateTo} />;

      case 'result-high-risk':
        return <ResultFlow result="high_risk" scan={screenData.scan} onNavigate={navigateTo} />;

      case 'result-unknown':
        return <ResultFlow result="unknown"   scan={screenData.scan} onNavigate={navigateTo} />;

      // ── History & Reporting ──────────────────────────────────────────────────
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

      // ── Identity Verification ────────────────────────────────────────────────
      case 'id-verification':
        return <IDVerificationFlow onNavigate={navigateTo} />;

      case 'id-result-verified':
        return <IDResultFlow result="verified" confidence={screenData.confidence || 95} onNavigate={navigateTo} />;

      case 'id-result-caution':
        return <IDResultFlow result="caution"  confidence={screenData.confidence || 60} onNavigate={navigateTo} />;

      // ── Profile ──────────────────────────────────────────────────────────────
      case 'profile':
        return <ProfileFlow onNavigate={navigateTo} />;

      default:
        return <WelcomeFlow onNavigate={navigateTo} />;
    }
  };

  const screensWithBottomNav = [
    'homepage', 'appointments', 'history', 'history-detail',
    'alerts', 'profile', 'prescriptions', 'health-docs',
    'result-verified', 'result-caution', 'result-fake',
    'result-high-risk', 'result-unknown',
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
