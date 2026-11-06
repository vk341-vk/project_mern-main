import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { faceService } from '../utils/faceApi';
import { serialService } from '../utils/serial';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, CreditCard, Fingerprint, QrCode, Check, RefreshCw } from 'lucide-react';

export default function Register({ showToast, faceReady, serialSupported }) {
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [personType, setPersonType] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    dept: '',
    year: '',
    email: ''
  });

  // Enrolment view states
  const [activeEnrolTab, setActiveEnrolTab] = useState(null); // 'face' | 'rfid' | 'finger' | 'qr'
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReadingSerial, setIsReadingSerial] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const loadPeople = async () => {
    try {
      const res = await api.getPeople();
      if (res.success) {
        setPeople(res.data);
        if (!selectedPersonId && res.data.length > 0) {
          setSelectedPersonId(res.data[0].id);
        }
      }
    } catch (e) {
      showToast('Error', 'Failed to load enrolled people', true);
    }
  };

  useEffect(() => {
    loadPeople();
    return () => stopCamera();
  }, []);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;

  const handleCreatePerson = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.id.trim()) {
      showToast('Missing fields', 'Name and ID are required.', true);
      return;
    }

    try {
      const res = await api.createPerson({
        ...formData,
        type: personType
      });
      showToast('Person Registered', res.message);
      setFormData({ name: '', id: '', dept: '', year: '', email: '' });
      await loadPeople();
      setSelectedPersonId(res.data.id);
    } catch (err) {
      showToast('Registration Error', err.message, true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsCapturing(false);
  };

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      showToast('Camera Unavailable', 'Could not access webcam. You can enrol manually.', true);
      setCameraActive(false);
    }
  };

  // Face Capture Handler
  const handleCaptureFace = async () => {
    if (!selectedPerson) return;
    setIsCapturing(true);

    try {
      if (faceService.isReady() && videoRef.current) {
        const det = await faceService.detectDescriptor(videoRef.current, 0.72);
        if (!det.detected) {
          showToast('Face Detection Warning', det.message || 'Face not clear. Look directly into camera.', true);
          setIsCapturing(false);
          return;
        }

        await api.enrolCredential(selectedPerson.id, 'face', det.descriptor);
        showToast('Face Enrolled', `Biometric face descriptor saved for ${selectedPerson.name}.`);
      } else {
        // Fallback placeholder
        await api.enrolCredential(selectedPerson.id, 'face', 'SIMULATED');
        showToast('Face Enrolled (Simulated)', `Placeholder reference saved for ${selectedPerson.name}.`);
      }
      stopCamera();
      setActiveEnrolTab(null);
      await loadPeople();
    } catch (err) {
      showToast('Enrolment Error', err.message, true);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualFaceEnrol = async () => {
    if (!selectedPerson) return;
    try {
      await api.enrolCredential(selectedPerson.id, 'face', 'SIMULATED');
      showToast('Face Enrolled (Manual)', `Face credentials assigned to ${selectedPerson.name}.`);
      stopCamera();
      setActiveEnrolTab(null);
      await loadPeople();
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  // RFID Enrolment
  const handleReadSerialRfid = async () => {
    if (!selectedPerson) return;
    setIsReadingSerial(true);
    try {
      if (!serialService.isConnected()) {
        await serialService.requestAndConnect(9600);
      }
      showToast('Serial Connected', 'Tap your RFID card on the RC522 sensor now...');
      const uid = await serialService.readNextLine(15000);
      await api.enrolCredential(selectedPerson.id, 'rfid', uid);
      showToast('RFID Enrolled', `Card UID '${uid}' assigned to ${selectedPerson.name}.`);
      setActiveEnrolTab(null);
      await loadPeople();
    } catch (err) {
      showToast('Serial Error', err.message, true);
    } finally {
      setIsReadingSerial(false);
    }
  };

  const handleSaveManualCredential = async (kind) => {
    if (!selectedPerson || !manualInput.trim()) {
      showToast('Empty Code', 'Please enter a valid credential code.', true);
      return;
    }
    try {
      await api.enrolCredential(selectedPerson.id, kind, manualInput.trim());
      showToast('Credential Saved', `${kind.toUpperCase()} code assigned to ${selectedPerson.name}.`);
      setManualInput('');
      setActiveEnrolTab(null);
      await loadPeople();
    } catch (err) {
      showToast('Enrolment Error', err.message, true);
    }
  };

  // Fingerprint Enrolment
  const handleReadSerialFinger = async () => {
    if (!selectedPerson) return;
    setIsReadingSerial(true);
    try {
      if (!serialService.isConnected()) {
        await serialService.requestAndConnect(9600);
      }
      showToast('Serial Connected', 'Place finger on R307/AS608 sensor now...');
      const fid = await serialService.readNextLine(15000);
      await api.enrolCredential(selectedPerson.id, 'finger', fid);
      showToast('Fingerprint Enrolled', `Slot ID '${fid}' assigned to ${selectedPerson.name}.`);
      setActiveEnrolTab(null);
      await loadPeople();
    } catch (err) {
      showToast('Serial Error', err.message, true);
    } finally {
      setIsReadingSerial(false);
    }
  };

  // QR Code Generation
  const handleGenerateQr = async () => {
    if (!selectedPerson) return;
    try {
      const token = `CLPT-${selectedPerson.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await api.enrolCredential(selectedPerson.id, 'qr', token);
      showToast('QR Code Generated', `Secure token generated for ${selectedPerson.name}.`);
      await loadPeople();
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  return (
    <div className="page" id="page-register">
      <div className="page-head">
        <div>
          <div className="eyebrow">Enrollment Center</div>
          <h1>Register a Person</h1>
          <div className="sub">
            Capture identity once as a student or staff member, then enrol biometrics and physical credentials into MongoDB.
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Form Card */}
        <div className="card">
          <h3>Person details</h3>
          <form onSubmit={handleCreatePerson}>
            <label>Person type</label>
            <div className="seg">
              <button
                type="button"
                className={personType === 'student' ? 'on' : ''}
                onClick={() => setPersonType('student')}
              >
                Student
              </button>
              <button
                type="button"
                className={personType === 'staff' ? 'on staff-on' : ''}
                onClick={() => setPersonType('staff')}
              >
                Staff
              </button>
            </div>

            <label>Full name</label>
            <input
              type="text"
              placeholder="e.g. Ananya Rao"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <label>
              {personType === 'staff' ? 'Staff ID / Employee Number' : 'Student ID / Roll Number'}
            </label>
            <input
              type="text"
              placeholder={personType === 'staff' ? 'e.g. EMP-1042' : 'e.g. CS21B045'}
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              required
            />

            <label>Department</label>
            <input
              type="text"
              placeholder="e.g. Computer Science & Engineering"
              value={formData.dept}
              onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
            />

            <label>{personType === 'staff' ? 'Designation' : 'Academic Year'}</label>
            <input
              type="text"
              placeholder={personType === 'staff' ? 'e.g. Associate Professor' : 'e.g. 3rd Year (Semester 6)'}
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />

            <label>Email Address (for OTP delivery)</label>
            <input
              type="email"
              placeholder="e.g. ananya@college.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <div className="btn-row">
              <button type="submit" className="btn-primary">
                Add Record to Database
              </button>
            </div>
          </form>

          <div className="flow-note">
            Add the person record first. Face, RFID card, fingerprint, and QR credentials attach directly to this ID in the database.
          </div>
        </div>

        {/* Biometrics & Credential Enrolment Card */}
        <div className="card">
          <h3>Enrol biometrics & credentials</h3>
          <label>Select person to enrol</label>
          <select
            value={selectedPersonId}
            onChange={(e) => {
              setSelectedPersonId(e.target.value);
              setActiveEnrolTab(null);
              stopCamera();
            }}
          >
            {people.length === 0 && <option value="">— Register a person first —</option>}
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.id} ({p.type})
              </option>
            ))}
          </select>

          {selectedPerson && (
            <>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveEnrolTab('face');
                    startCamera();
                  }}
                >
                  <Camera size={14} /> Enrol Face
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveEnrolTab('rfid');
                    setManualInput(selectedPerson.rfid || '');
                  }}
                >
                  <CreditCard size={14} /> Enrol RFID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveEnrolTab('finger');
                    setManualInput(selectedPerson.fingerId || '');
                  }}
                >
                  <Fingerprint size={14} /> Enrol Fingerprint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveEnrolTab('qr');
                    if (!selectedPerson.qrToken) handleGenerateQr();
                  }}
                >
                  <QrCode size={14} /> Generate QR
                </button>
              </div>

              {/* Dynamic Enrolment Area */}
              <div style={{ marginTop: 18 }}>
                {activeEnrolTab === 'face' && (
                  <div>
                    <div className="cam-wrap" style={{ minHeight: 220 }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ display: cameraActive ? 'block' : 'none' }}
                      />
                      {!cameraActive && (
                        <div className="empty" style={{ padding: 40 }}>
                          <Camera size={36} />
                          <div>Camera initializing or disabled...</div>
                        </div>
                      )}
                    </div>
                    <div className="hint" style={{ marginTop: 8 }}>
                      Look straight at the camera with clear lighting. One neural descriptor frame is extracted.
                    </div>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleCaptureFace}
                        disabled={isCapturing}
                      >
                        <Check size={14} /> {isCapturing ? 'Analyzing...' : 'Capture Face Frame'}
                      </button>
                      <button type="button" onClick={handleManualFaceEnrol}>
                        Enrol Manually (Simulated)
                      </button>
                    </div>
                  </div>
                )}

                {activeEnrolTab === 'rfid' && (
                  <div>
                    <label>RFID Card UID</label>
                    <input
                      type="text"
                      placeholder="e.g. A1:B2:C3:D4"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    />
                    <div className="btn-row">
                      {serialSupported && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleReadSerialRfid}
                          disabled={isReadingSerial}
                        >
                          {isReadingSerial ? 'Waiting for Card Tap...' : 'Read from RC522 Reader'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleSaveManualCredential('rfid')}
                      >
                        Save UID
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setManualInput(
                            Array.from({ length: 4 }, () =>
                              Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
                            ).join(':')
                          )
                        }
                      >
                        Generate Random Test UID
                      </button>
                    </div>
                  </div>
                )}

                {activeEnrolTab === 'finger' && (
                  <div>
                    <label>Fingerprint Slot ID</label>
                    <input
                      type="text"
                      placeholder="e.g. FP-101"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    />
                    <div className="btn-row">
                      {serialSupported && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleReadSerialFinger}
                          disabled={isReadingSerial}
                        >
                          {isReadingSerial ? 'Scanning Finger...' : 'Read from R307 Sensor'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleSaveManualCredential('finger')}
                      >
                        Save Finger ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualInput(`FP-${Math.floor(100 + Math.random() * 900)}`)}
                      >
                        Generate Random Test ID
                      </button>
                    </div>
                  </div>
                )}

                {activeEnrolTab === 'qr' && (
                  <div>
                    <div className="qr-box">
                      {selectedPerson.qrToken ? (
                        <QRCodeSVG value={selectedPerson.qrToken} size={160} />
                      ) : (
                        <div className="empty">Click Generate QR to create badge</div>
                      )}
                    </div>
                    <div className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
                      Token: <span className="mono">{selectedPerson.qrToken || 'None'}</span>
                    </div>
                    <div className="btn-row" style={{ justifyContent: 'center' }}>
                      <button type="button" className="btn-primary" onClick={handleGenerateQr}>
                        Regenerate QR Token
                      </button>
                      {selectedPerson.qrToken && (
                        <button type="button" onClick={() => setShowBadgeModal(true)}>
                          Preview & Print Badge
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Pills */}
              <div className="pill-row">
                <span className="pill">Type: {selectedPerson.type}</span>
                <span className={`pill ${selectedPerson.faceDescriptor ? 'active' : ''}`}>
                  Face: {selectedPerson.faceDescriptor ? 'enrolled ✓' : '—'}
                </span>
                <span className={`pill ${selectedPerson.rfid ? 'active' : ''}`}>
                  RFID: {selectedPerson.rfid || '—'}
                </span>
                <span className={`pill ${selectedPerson.fingerId ? 'active' : ''}`}>
                  Fingerprint: {selectedPerson.fingerId || '—'}
                </span>
                <span className={`pill ${selectedPerson.qrToken ? 'active' : ''}`}>
                  QR: {selectedPerson.qrToken ? 'generated ✓' : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Printable ID Badge Modal */}
      {showBadgeModal && selectedPerson && (
        <div className="modal-backdrop" onClick={() => setShowBadgeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h3>Institutional Access Badge</h3>
              <button
                type="button"
                className="btn-sm"
                onClick={() => setShowBadgeModal(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: '#121820',
                border: '2px solid #5EEAD4',
                borderRadius: 12,
                padding: '24px 20px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(94, 234, 212, 0.15)'
              }}
            >
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 2, color: '#5EEAD4', textTransform: 'uppercase' }}>
                Clearpoint Security Console
              </div>
              <h2 style={{ fontSize: 18, margin: '6px 0 2px', color: '#FFF' }}>{selectedPerson.name}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                {selectedPerson.id} · <span className={`badge ${selectedPerson.type === 'staff' ? 'badge-staff' : 'badge-student'}`}>{selectedPerson.type.toUpperCase()}</span>
              </div>

              <div
                style={{
                  background: '#FFF',
                  padding: 12,
                  borderRadius: 8,
                  display: 'inline-block',
                  margin: 'auto'
                }}
              >
                {selectedPerson.qrToken && <QRCodeSVG value={selectedPerson.qrToken} size={150} />}
              </div>

              <div style={{ marginTop: 12, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                TOKEN: {selectedPerson.qrToken}
              </div>

              <div style={{ marginTop: 16, borderTop: '1px solid #26313C', paddingTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>
                {selectedPerson.dept} {selectedPerson.year ? `· ${selectedPerson.year}` : ''}
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => window.print()}>
                Print / Save PDF
              </button>
              <button type="button" onClick={() => setShowBadgeModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
