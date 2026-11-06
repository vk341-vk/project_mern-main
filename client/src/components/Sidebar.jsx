import React from 'react';
import { LayoutDashboard, UserPlus, CheckCircle2, Users, FileText, BarChart3, Settings } from 'lucide-react';

const Sidebar = ({
  activePage,
  setActivePage,
  isOnline,
  isFaceReady,
  isSerialActive,
  dbStatus
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verify', label: 'Mark Attendance', icon: CheckCircle2 },
    { id: 'register', label: 'Register Person', icon: UserPlus },
    { id: 'people', label: 'People Directory', icon: Users },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'System Config', icon: Settings }
  ];

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="dot"></div>
        <div className="brand-title">Clearpoint</div>
        <span className="brand-tag">MERN</span>
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="ic">
              <Icon size={17} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="sidebar-foot">
        <div className="status-row">
          <span className={`status-led ${isOnline ? 'led-on' : 'led-danger'}`}></span>
          <span>Network: {isOnline ? 'online' : 'offline'}</span>
        </div>
        <div className="status-row">
          <span className={`status-led ${isFaceReady ? 'led-on' : 'led-warn'}`}></span>
          <span>Face engine: {isFaceReady ? 'ready' : 'loading…'}</span>
        </div>
        <div className="status-row">
          <span className={`status-led ${isSerialActive ? 'led-on' : 'led-off'}`}></span>
          <span>Serial link: {isSerialActive ? 'connected' : 'standby'}</span>
        </div>
        <div className="status-row">
          <span className={`status-led ${dbStatus === 'connected' ? 'led-on' : 'led-danger'}`}></span>
          <span>MongoDB: {dbStatus === 'connected' ? 'connected' : dbStatus}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
