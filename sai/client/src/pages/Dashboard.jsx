import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { RefreshCw, Users, ShieldCheck, CheckCircle, Percent } from 'lucide-react';

export default function Dashboard({ faceReady, serialSupported, netOnline }) {
  const [stats, setStats] = useState({
    studentsCount: 0,
    staffCount: 0,
    totalEnrolled: 0,
    presentTodayCount: 0,
    rate: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const channels = [
    {
      key: 'face',
      label: 'Face recognition',
      ok: faceReady,
      note: faceReady
        ? 'face-api.js neural models loaded; camera ready'
        : 'Model loading — will fall back to manual verification'
    },
    {
      key: 'rfid',
      label: 'RFID (Web Serial)',
      ok: serialSupported,
      note: serialSupported
        ? 'Web Serial API supported (RC522 reader ready)'
        : 'Web Serial unsupported on this browser — simulation active'
    },
    {
      key: 'finger',
      label: 'Fingerprint (Web Serial)',
      ok: serialSupported,
      note: serialSupported
        ? 'Web Serial API supported (R307/AS608 sensor ready)'
        : 'Web Serial unsupported on this browser — simulation active'
    },
    {
      key: 'qr',
      label: 'QR scan',
      ok: true,
      note: 'jsQR client scanner ready for camera or token verification'
    },
    {
      key: 'otp',
      label: 'OTP delivery',
      ok: netOnline,
      note: netOnline
        ? 'Nodemailer mailer connected — instant delivery'
        : 'Offline mode active — OTPs queue locally and flush on reconnect'
    }
  ];

  return (
    <div className="page" id="page-dashboard">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} /> System Overview (MERN Architecture)
          </div>
          <h1>Today's Attendance Console</h1>
          <div className="sub">
            Live multi-factor status across face, fingerprint, RFID, QR and OTP channels feeding into MongoDB for students and staff.
          </div>
        </div>
        <button onClick={loadStats} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="num">{stats.studentsCount}</div>
          <div className="lbl">Enrolled students</div>
        </div>
        <div className="card stat violet">
          <div className="num">{stats.staffCount}</div>
          <div className="lbl">Enrolled staff</div>
        </div>
        <div className="card stat accent">
          <div className="num">{stats.presentTodayCount}</div>
          <div className="lbl">Marked present today</div>
        </div>
        <div className="card stat amber">
          <div className="num">{stats.rate}%</div>
          <div className="lbl">Today's attendance rate</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Verification channel health</h3>
          <div className="hint">
            Current operational status of hardware links and AI verification engines on this terminal.
          </div>
          <div>
            {channels.map((c) => (
              <div key={c.key} className="toggle-row">
                <div>
                  <div className="name">{c.label}</div>
                  <div className="desc">{c.note}</div>
                </div>
                <span className={`badge ${c.ok ? 'badge-ok' : 'badge-pending'}`}>
                  {c.ok ? 'OK' : 'LIMITED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Recent activity</h3>
          <div className="hint">
            Latest attendance check-ins synchronized to the database.
          </div>
          <div>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((r, i) => (
                <div key={i} className="toggle-row">
                  <div>
                    <div className="name">
                      {r.personName}{' '}
                      <span
                        className={`badge ${
                          r.personType === 'staff' ? 'badge-staff' : 'badge-student'
                        }`}
                        style={{ marginLeft: 6 }}
                      >
                        {r.personType}
                      </span>
                    </div>
                    <div className="desc">
                      {r.date} · {r.time} · {Array.isArray(r.methods) ? r.methods.join(' + ') : r.methods}
                    </div>
                  </div>
                  <span className="badge badge-ok">present</span>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '24px 0' }}>
                <div className="big">◎</div>
                No attendance events recorded today yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
