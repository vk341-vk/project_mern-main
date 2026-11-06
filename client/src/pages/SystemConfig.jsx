import React, { useState, useEffect } from 'react';
import { getConfig, updateConfig, getHealth } from '../api';
import { isWebSerialSupported, connectSerialDevice } from '../utils/webSerial';
import { Settings, Save, Shield, Cpu, Database, CheckCircle, AlertTriangle } from 'lucide-react';

const SystemConfig = ({ showToast, onConfigUpdated }) => {
  const [config, setConfig] = useState({
    face: true,
    rfid: false,
    finger: false,
    qr: false,
    otp: false,
    institutionName: 'Clearpoint Multi-Factor Attendance',
    lateThreshold: '09:30:00',
    allowManualFallback: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [cfgRes, hltRes] = await Promise.all([getConfig(), getHealth()]);
      if (cfgRes.success) {
        setConfig(cfgRes.data);
      }
      setHealthInfo(hltRes);
    } catch (err) {
      showToast('Error', 'Failed to load configuration.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleToggle = (key) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateConfig(config);
      if (res.success) {
        showToast('Saved', 'System configuration updated successfully.');
        if (onConfigUpdated) onConfigUpdated(res.data);
      }
    } catch (err) {
      showToast('Save Failed', err.message, true);
    } finally {
      setSaving(false);
    }
  };

  // Diagnostic tests
  const handleTestWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      showToast('Camera Test Passed', 'Webcam is functional and granted permission.');
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      showToast('Camera Test Failed', err.message, true);
    }
  };

  const handleTestSerial = async () => {
    if (!isWebSerialSupported()) {
      showToast('Serial Unsupported', 'Web Serial API requires Chrome or Edge.', true);
      return;
    }
    try {
      await connectSerialDevice(9600);
      showToast('Serial Port Connected', 'Arduino serial connection established at 9600 baud.');
    } catch (err) {
      showToast('Serial Test Note', err.message, true);
    }
  };

  const handleTestDatabase = async () => {
    try {
      const res = await getHealth();
      setHealthInfo(res);
      showToast('MongoDB Connected', `Database '${res.database.name}' is healthy on ${res.database.host}.`);
    } catch (err) {
      showToast('Database Error', 'Could not reach Express/MongoDB API.', true);
    }
  };

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Settings size={13} />
            Control Center
          </div>
          <h1>System Configuration</h1>
          <div className="sub">
            Customize required verification layers for attendance. Selected methods apply universally to both students and staff.
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Verification Layers Form */}
        <div className="card">
          <h3>
            <Shield size={16} />
            Required Verification Layers
          </h3>
          <div className="hint">
            Attendance is only marked once all enabled layers clear in sequence.
          </div>

          <form onSubmit={handleSave}>
            <div className="toggle-row">
              <div>
                <div className="name">Face Recognition</div>
                <div className="desc">Webcam face capture & Euclidean distance matching against MongoDB</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.face}
                  onChange={() => handleToggle('face')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <div className="name">RFID Card Tap</div>
                <div className="desc">Arduino + RC522 over Web Serial API or simulation</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.rfid}
                  onChange={() => handleToggle('rfid')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <div className="name">Fingerprint Sensor</div>
                <div className="desc">Arduino + R307/AS608 biometric module over Web Serial</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.finger}
                  onChange={() => handleToggle('finger')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <div className="name">QR Code Credential</div>
                <div className="desc">Camera scan of generated attendance badge token</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.qr}
                  onChange={() => handleToggle('qr')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <div className="name">OTP (Second Factor)</div>
                <div className="desc">6-digit time-sensitive challenge code delivered via email / console</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.otp}
                  onChange={() => handleToggle('otp')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div style={{ marginTop: 18 }}>
              <label>Institution Name</label>
              <input
                type="text"
                value={config.institutionName || ''}
                onChange={(e) => setConfig({ ...config, institutionName: e.target.value })}
              />

              <label>Late Attendance Threshold (HH:MM:SS)</label>
              <input
                type="text"
                value={config.lateThreshold || '09:30:00'}
                onChange={(e) => setConfig({ ...config, lateThreshold: e.target.value })}
              />
            </div>

            <div className="btn-row">
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Diagnostics & Engineering Notes */}
        <div>
          {/* Hardware & Diagnostics */}
          <div className="card" style={{ marginBottom: 18 }}>
            <h3>
              <Cpu size={16} />
              Hardware Diagnostics & Tests
            </h3>
            <div className="hint">
              Verify your local devices and backend connection.
            </div>

            <div className="btn-row" style={{ marginTop: 10 }}>
              <button type="button" onClick={handleTestWebcam}>
                Test Camera
              </button>
              <button type="button" onClick={handleTestSerial}>
                Test Arduino Serial
              </button>
              <button type="button" onClick={handleTestDatabase}>
                Ping MongoDB
              </button>
            </div>

            {healthInfo && (
              <div className="flow-note" style={{ marginTop: 14 }}>
                <b>MongoDB Status:</b> {healthInfo.database?.status} ({healthInfo.database?.name})<br />
                <b>Server Platform:</b> {healthInfo.system?.platform} · Node {healthInfo.system?.nodeVersion}<br />
                <b>Server Uptime:</b> {healthInfo.system?.uptime}s
              </div>
            )}
          </div>

          {/* Architecture Notes */}
          <div className="card">
            <h3>Engineering Highlights — MERN Architecture</h3>
            <div className="flow-note">
              <b>Hardware Cost:</b> Modularity ensures institutions only pay for sensors they deploy. A webcam alone allows full face-recognition attendance.
            </div>
            <div className="flow-note">
              <b>Biometric Integrity:</b> 128-element Float32 face embeddings are computed client-side with TinyFaceDetector and stored in MongoDB, guaranteeing high-speed matching.
            </div>
            <div className="flow-note">
              <b>Web Serial Integration:</b> Arduino RC522 and R307 sensors communicate seamlessly via browser Web Serial API without needing custom native drivers.
            </div>
            <div className="flow-note">
              <b>Dual Person Pipeline:</b> Students and staff share one normalized MongoDB collection with polymorphic attributes (`year` vs `designation`), streamlining all reporting queries.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
