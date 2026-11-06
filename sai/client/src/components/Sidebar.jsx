import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  Settings
} from 'lucide-react';

export default function Sidebar({
  currentPage,
  onNavigate,
  netOnline,
  faceReady,
  serialConnected,
  serialSupported,
  dbStatus
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'register', label: 'Register Person', icon: UserPlus },
    { id: 'verify', label: 'Mark Attendance', icon: CheckCircle2 },
    { id: 'records', label: 'Records', icon: FileSpreadsheet },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'System Config', icon: Settings }
  ];

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="dot"></div>
        <span>Clearpoint</span>
        <span className="mern-pill">MERN</span>
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <div
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="ic">
              <Icon size={17} />
            </span>
            {item.label}
          </div>
        );
      })}

      <div className="sidebar-foot">
        <div className="status-row">
          <span className={`status-led ${netOnline ? 'led-on' : 'led-off'}`}></span>
          <span>Network: {netOnline ? 'online' : 'offline'}</span>
        </div>
        <div className="status-row">
          <span className={`status-led ${faceReady ? 'led-on' : 'led-warn'}`}></span>
          <span>Face engine: {faceReady ? 'ready' : 'loading…'}</span>
        </div>
        <div className="status-row">
          <span className={`status-led ${serialConnected ? 'led-on' : 'led-off'}`}></span>
          <span>
            Serial link:{' '}
            {serialConnected
              ? 'connected'
              : serialSupported
              ? 'not connected'
              : 'unsupported'}
          </span>
        </div>
        <div className="status-row">
          <span className={`status-led ${dbStatus?.type === 'mongodb' ? 'led-on' : 'led-warn'}`}></span>
          <span>
            Database:{' '}
            {dbStatus?.type === 'mongodb'
              ? 'MongoDB (Atlas/Local)'
              : 'JSON document store'}
          </span>
        </div>
      </div>
    </div>
  );
}
