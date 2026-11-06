import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Records from './pages/Records';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { api } from './api';
import { faceService } from './utils/faceApi';
import { serialService } from './utils/serial';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [netOnline, setNetOnline] = useState(navigator.onLine);
  const [faceReady, setFaceReady] = useState(false);
  const [serialSupported, setSerialSupported] = useState(serialService.isSupported());
  const [serialConnected, setSerialConnected] = useState(serialService.isConnected());
  const [dbStatus, setDbStatus] = useState(null);

  const showToast = (title, body = '', isErr = false) => {
    setToast({ title, body, isErr });
    setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 4000);
  };

  // Initialize status monitors and neural face models
  useEffect(() => {
    const handleOnline = () => {
      setNetOnline(true);
      showToast('Network Connected', 'Terminal is now online.');
    };
    const handleOffline = () => {
      setNetOnline(false);
      showToast('Network Offline', 'Running in offline queuing mode.', true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check DB health
    api
      .getHealth()
      .then((res) => {
        setDbStatus(res.database);
      })
      .catch((e) => {
        setDbStatus({ type: 'offline', connected: false });
      });

    // Load face-api neural weights in background
    faceService
      .loadModels()
      .then((ready) => {
        setFaceReady(ready);
      })
      .catch((e) => {
        setFaceReady(false);
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        netOnline={netOnline}
        faceReady={faceReady}
        serialConnected={serialConnected}
        serialSupported={serialSupported}
        dbStatus={dbStatus}
      />

      <main className="main">
        {currentPage === 'dashboard' && (
          <Dashboard
            faceReady={faceReady}
            serialSupported={serialSupported}
            netOnline={netOnline}
          />
        )}
        {currentPage === 'register' && (
          <Register
            showToast={showToast}
            faceReady={faceReady}
            serialSupported={serialSupported}
          />
        )}
        {currentPage === 'verify' && (
          <Verify
            showToast={showToast}
            faceReady={faceReady}
            serialSupported={serialSupported}
            netOnline={netOnline}
          />
        )}
        {currentPage === 'records' && <Records showToast={showToast} />}
        {currentPage === 'reports' && <Reports showToast={showToast} />}
        {currentPage === 'settings' && (
          <Settings
            showToast={showToast}
            onConfigUpdated={() => {
              showToast('Security Stack Updated', 'New verification rules in effect.');
            }}
          />
        )}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
