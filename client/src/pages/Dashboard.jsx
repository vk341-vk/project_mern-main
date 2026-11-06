import React, { useState, useEffect } from 'react';
import { getSummary, getConfig } from '../api';
import { CheckCircle2, UserPlus, RefreshCw, Cpu, Activity, ShieldCheck, ArrowRight } from 'lucide-react';

const Dashboard = ({ setActivePage, isFaceReady, isSerialActive, isOnline, showToast }) => {
  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalEnrolled: 0,
    presentToday: 0,
    attendanceRate: 0,
    today: new Date().toISOString().slice(0, 10),
    recentActivity: []
  });
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, cfgRes] = await Promise.all([getSummary(), getConfig()]);
      if (sumRes.success) setSummary(sumRes.data);
      if (cfgRes.success) setConfig(cfgRes.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      showToast('Error', 'Failed to load live dashboard stats.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const channels = [
    {
      key: 'face',
      label: 'Face recognition',
      enabled: config?.face,
      ok: isFaceReady,
      statusText: isFaceReady ? 'Model weights loaded, ready' : 'Weights initializing / fallback ready',
      detail: 'TinyFaceDetector + Euclidean distance matching'
    },
    {
      key: 'rfid',
      label: 'RFID tap (Web Serial)',
      enabled: config?.rfid,
      ok: typeof navigator !== 'undefined' && 'serial' in navigator,
      statusText: isSerialActive ? 'Arduino RC522 connected' : ('serial' in navigator ? 'Web Serial API supported' : 'Manual UID entry only'),
      detail: 'Arduino RC522 via Web Serial API'
    },
    {
      key: 'finger',
      label: 'Fingerprint sensor',
      enabled: config?.finger,
      ok: typeof navigator !== 'undefined' && 'serial' in navigator,
      statusText: isSerialActive ? 'Sensor link active' : ('serial' in navigator ? 'Web Serial API supported' : 'Manual ID entry only'),
      detail: 'Arduino R307 / AS608 optical module'
    },
    {
      key: 'qr',
      label: 'QR camera scan',
      enabled: config?.qr,
      ok: typeof window !== 'undefined' && !!window.jsQR,
      statusText: typeof window !== 'undefined' && !!window.jsQR ? 'jsQR engine loaded & ready' : 'Scanner unavailable',
      detail: 'Dynamic token generation & camera decoding'
    },
    {
      key: 'otp',
      label: 'OTP verification',
      enabled: config?.otp,
      ok: isOnline,
      statusText: isOnline ? 'Network reachable' : 'Offline — OTP requests queue locally',
      detail: '6-digit time-sensitive challenge code'
    }
  ];

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Activity size={13} />
            System Overview · {summary.today}
          </div>
          <h1>Today's Attendance Console</h1>
          <div className="sub">
            Live multi-factor attendance pipeline backed by MongoDB, Express, and React. Verifies students and staff seamlessly across face biometrics, RFID, fingerprint, QR tokens, and OTP challenges.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn-primary" onClick={() => setActivePage('verify')}>
            <CheckCircle2 size={15} />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="num">{summary.totalStudents}</div>
          <div className="lbl">Enrolled Students</div>
        </div>
        <div className="card stat violet">
          <div className="num">{summary.totalStaff}</div>
          <div className="lbl">Enrolled Staff</div>
        </div>
        <div className="card stat accent">
          <div className="num">{summary.presentToday}</div>
          <div className="lbl">Marked Present Today</div>
        </div>
        <div className="card stat amber">
          <div className="num">{summary.attendanceRate}%</div>
          <div className="lbl">Today's Attendance Rate</div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-2">
        {/* Verification Channels Health */}
        <div className="card">
          <h3>
            <Cpu size={16} />
            Verification Channel Health
          </h3>
          <div className="hint">
            Active verification hardware and browser API status. Enabled layers form the sequential verification pipeline in Mark Attendance.
          </div>

          <div style={{ marginTop: 10 }}>
            {channels.map((c) => (
              <div key={c.key} className="toggle-row">
                <div>
                  <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.label}
                    {c.enabled && <span className="badge badge-ok" style={{ fontSize: 9.5 }}>ACTIVE LAYER</span>}
                  </div>
                  <div className="desc">{c.statusText} · <span style={{ color: 'var(--text-dim)' }}>{c.detail}</span></div>
                </div>
                <span className={`badge ${c.ok ? 'badge-ok' : 'badge-pending'}`}>
                  {c.ok ? 'READY' : 'LIMITED'}
                </span>
              </div>
            ))}
          </div>

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn-sm btn-secondary" onClick={() => setActivePage('settings')}>
              Configure Layers <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Recent Attendance Activity */}
        <div className="card">
          <h3>
            <ShieldCheck size={16} />
            Recent Activity Log
          </h3>
          <div className="hint">
            Real-time feed of the latest attendance events recorded in the MongoDB database.
          </div>

          {summary.recentActivity.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              {summary.recentActivity.map((r, idx) => (
                <div key={r._id || idx} className="toggle-row">
                  <div>
                    <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.personName}
                      <span className={`badge ${r.personType === 'staff' ? 'badge-staff' : 'badge-student'}`}>
                        {r.personType}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        ({r.personId})
                      </span>
                    </div>
                    <div className="desc">
                      {r.date} · {r.time} · {r.methods?.join(' + ')}
                    </div>
                  </div>
                  <span className="badge badge-ok">present</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="big">▤</div>
              No attendance records yet for today. Start verification to record attendance!
            </div>
          )}

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn-sm btn-secondary" onClick={() => setActivePage('records')}>
              View All Records <ArrowRight size={12} />
            </button>
            <button className="btn-sm" onClick={() => setActivePage('register')}>
              <UserPlus size={12} /> Register Person
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
