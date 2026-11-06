import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import RegisterPerson from './pages/RegisterPerson';
import MarkAttendance from './pages/MarkAttendance';
import PeopleDirectory from './pages/PeopleDirectory';
import Records from './pages/Records';
import Reports from './pages/Reports';
import SystemConfig from './pages/SystemConfig';
import { initFaceApi, isFaceApiReady } from './utils/faceApi';
import { isSerialConnected } from './utils/webSerial';
import { getHealth } from './api';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [isSerialActive, setIsSerialActive] = useState(false);
  const [dbStatus, setDbStatus] = useState('connecting');

  const showToast = (title, body = '', isErr = false) => {
    setToast({ title, body, isErr });
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Online', 'Network connection restored.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode', 'Network disconnected — OTPs and requests will queue locally.', true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize face-api.js weights & check MongoDB connection
  useEffect(() => {
    const initSystem = async () => {
      // Check MongoDB via Express API
      try {
        const health = await getHealth();
        if (health.database?.connected) {
          setDbStatus('connected');
        } else {
          setDbStatus(health.database?.status || 'disconnected');
        }
      } catch (e) {
        setDbStatus('disconnected');
        console.warn('API connection check failed:', e.message);
      }

      // Initialize Face API weights
      try {
        const loaded = await initFaceApi();
        setIsFaceReady(loaded);
      } catch (err) {
        console.warn('Face API load error:', err);
        setIsFaceReady(false);
      }
    };

    initSystem();

    // Check serial connection periodically
    const serialTimer = setInterval(() => {
      setIsSerialActive(isSerialConnected());
    }, 2000);

    return () => clearInterval(serialTimer);
  }, []);

  return (
    <>
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOnline={isOnline}
        isFaceReady={isFaceReady}
        isSerialActive={isSerialActive}
        dbStatus={dbStatus}
      />

      <div className="main">
        {activePage === 'dashboard' && (
          <Dashboard
            setActivePage={setActivePage}
            isFaceReady={isFaceReady}
            isSerialActive={isSerialActive}
            isOnline={isOnline}
            showToast={showToast}
          />
        )}

        {activePage === 'verify' && (
          <MarkAttendance
            showToast={showToast}
            isFaceReady={isFaceReady}
            isOnline={isOnline}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'register' && (
          <RegisterPerson
            showToast={showToast}
            isFaceReady={isFaceReady}
          />
        )}

        {activePage === 'people' && (
          <PeopleDirectory
            showToast={showToast}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'records' && (
          <Records
            showToast={showToast}
          />
        )}

        {activePage === 'reports' && (
          <Reports
            showToast={showToast}
          />
        )}

        {activePage === 'settings' && (
          <SystemConfig
            showToast={showToast}
          />
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

export default App;
