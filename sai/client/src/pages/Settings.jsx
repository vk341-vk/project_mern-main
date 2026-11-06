import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Settings as SettingsIcon, Save, Sliders, Database, Cpu } from 'lucide-react';

export default function Settings({ showToast, onConfigUpdated }) {
  const [config, setConfig] = useState({
    face: true,
    rfid: false,
    finger: false,
    qr: false,
    otp: false,
    minDetectionScore: 0.72,
    faceMatchThreshold: 0.5
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.getConfig();
        if (res.success) {
          setConfig(res.data);
        }
      } catch (err) {
        showToast('Error', 'Failed to load system config', true);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateConfig(config);
      showToast('Config Saved', res.message);
      if (onConfigUpdated) onConfigUpdated(res.data);
    } catch (err) {
      showToast('Error', err.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" id="page-settings">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <SettingsIcon size={14} /> System Configuration & Security Rules
          </div>
          <h1>System Config</h1>
          <div className="sub">
            Customize which verification layers are mandatory for granting attendance. Applies equally to students and faculty.
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save configuration'}
        </button>
      </div>

      <div className="grid grid-2">
        {/* Verification Layers Card */}
        <div className="card">
          <h3>Required verification layers</h3>
          <div className="hint">
            Attendance is only marked once all checked layers clear in this order.
          </div>

          <div className="toggle-row">
            <div>
              <div className="name">Face recognition</div>
              <div className="desc">Webcam + on-device 128-d neural matching (face-api.js)</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.face}
                onChange={(e) => setConfig({ ...config, face: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="name">RFID card tap</div>
              <div className="desc">Arduino + RC522 reader over Web Serial or tap simulation</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.rfid}
                onChange={(e) => setConfig({ ...config, rfid: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="name">Fingerprint</div>
              <div className="desc">Arduino + R307/AS608 optical sensor over Web Serial or scan simulation</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.finger}
                onChange={(e) => setConfig({ ...config, finger: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="name">QR code</div>
              <div className="desc">Camera scan of person's cryptographic token badge (jsQR)</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.qr}
                onChange={(e) => setConfig({ ...config, qr: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="name">OTP (second factor)</div>
              <div className="desc">6-digit one-time code delivered via Nodemailer email service</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.otp}
                onChange={(e) => setConfig({ ...config, otp: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div style={{ marginTop: 20 }}>
            <label>
              Minimum Face Detection Score ({Math.round((config.minDetectionScore || 0.72) * 100)}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.01"
              value={config.minDetectionScore || 0.72}
              onChange={(e) => setConfig({ ...config, minDetectionScore: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--mint)' }}
            />

            <label>
              Face Euclidean Match Distance Ceiling ({config.faceMatchThreshold || 0.5})
            </label>
            <input
              type="range"
              min="0.3"
              max="0.7"
              step="0.02"
              value={config.faceMatchThreshold || 0.5}
              onChange={(e) => setConfig({ ...config, faceMatchThreshold: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--mint)' }}
            />
          </div>

          <div className="btn-row">
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={14} /> Save configuration to Database
            </button>
          </div>
        </div>

        {/* Engineering Solutions Card */}
        <div className="card">
          <h3>Engineering notes — challenge solutions</h3>
          <div className="flow-note">
            <b>1. Hardware Cost & Flexibility.</b> Every layer above is an independent toggle. Deployments only require the sensors actually purchased — a simple laptop webcam is sufficient for face-only mode.
          </div>
          <div className="flow-note">
            <b>2. Lighting & Glare Resilience.</b> The face verification pipeline strictly enforces <code className="inline">minDetectionScore</code> to reject blurry or low-light frames before calculating 128-d descriptor distances.
          </div>
          <div className="flow-note">
            <b>3. Hardware Maintenance.</b> RC522 and R307/AS608 communicate through an asynchronous Web Serial stream; sensor faults surface as actionable alerts rather than blocking attendance.
          </div>
          <div className="flow-note">
            <b>4. Network Dependency for OTP.</b> OTP requests leverage Nodemailer with an automatic offline retry queue (<code className="inline">navigator.onLine</code>) so verification continues uninterrupted.
          </div>
          <div className="flow-note">
            <b>5. Unified MERN Pipeline.</b> Students and faculty share the same MongoDB schemas (<code className="inline">Person</code>, <code className="inline">Attendance</code>) with indexed queries for sub-millisecond lookups.
          </div>
        </div>
      </div>
    </div>
  );
}
