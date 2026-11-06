import React, { useState, useEffect, useRef } from 'react';
import { getPeople, createPerson, enrolFace, enrolRfid, enrolFinger, enrolQr } from '../api';
import { detectFaceDescriptor, MIN_DETECTION_SCORE } from '../utils/faceApi';
import { isWebSerialSupported, connectSerialDevice, readSerialLine } from '../utils/webSerial';
import { QRCodeSVG } from 'qrcode.react';
import { UserPlus, Camera, CreditCard, Fingerprint, QrCode, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

const RegisterPerson = ({ showToast, isFaceReady, onPeopleChanged }) => {
  // Registration form state
  const [regType, setRegType] = useState('student');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [dept, setDept] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // People list for enrolment
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [activeEnrolTab, setActiveEnrolTab] = useState(null); // 'face' | 'rfid' | 'finger' | 'qr' | null

  // Camera stream state
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturingFace, setCapturingFace] = useState(false);

  // Manual input states
  const [manualInput, setManualInput] = useState('');

  const loadPeople = async () => {
    try {
      const res = await getPeople();
      if (res.success) {
        setPeople(res.data);
        if (!selectedPersonId && res.data.length > 0) {
          setSelectedPersonId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching people:', err);
    }
  };

  useEffect(() => {
    loadPeople();
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!name.trim() || !id.trim()) {
      showToast('Validation Error', 'Name and ID are required.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await createPerson({
        id: id.trim(),
        name: name.trim(),
        type: regType,
        dept: dept.trim() || 'General',
        year: year.trim(),
        email: email.trim()
      });

      if (res.success) {
        showToast('Registered!', `${name} (${id}) added as ${regType}.`);
        setName('');
        setId('');
        setDept('');
        setYear('');
        setEmail('');
        await loadPeople();
        setSelectedPersonId(res.data.id);
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast('Registration Failed', msg, true);
    } finally {
      setSubmitting(false);
    }
  };

  const currentPerson = people.find((p) => p.id === selectedPersonId);

  // --- Face Enrolment ---
  const startFaceCamera = async () => {
    stopCamera();
    setActiveEnrolTab('face');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error:', err);
      showToast('Camera Error', 'Could not access webcam. You can use manual face enrolment.', true);
      setCameraActive(false);
    }
  };

  const handleCaptureFace = async () => {
    if (!currentPerson) return;
    setCapturingFace(true);

    try {
      if (videoRef.current && isFaceReady) {
        const detection = await detectFaceDescriptor(videoRef.current);
        if (!detection || detection.detection.score < MIN_DETECTION_SCORE) {
          showToast('Low Face Confidence', 'Face was not detected clearly. Ensure direct lighting and face the camera.', true);
          setCapturingFace(false);
          return;
        }

        const descriptorArray = Array.from(detection.descriptor);
        const res = await enrolFace(currentPerson.id, descriptorArray);
        if (res.success) {
          showToast('Face Enrolled', `Biometric face descriptor saved for ${currentPerson.name}.`);
          stopCamera();
          setActiveEnrolTab(null);
          loadPeople();
          if (onPeopleChanged) onPeopleChanged();
        }
      } else {
        // Fallback simulation
        const res = await enrolFace(currentPerson.id, 'SIMULATED');
        if (res.success) {
          showToast('Face Enrolled (Simulated)', `Placeholder face enrolled for ${currentPerson.name}.`);
          stopCamera();
          setActiveEnrolTab(null);
          loadPeople();
          if (onPeopleChanged) onPeopleChanged();
        }
      }
    } catch (err) {
      console.error('Error enrolling face:', err);
      showToast('Enrolment Error', 'Failed to process face biometrics.', true);
    } finally {
      setCapturingFace(false);
    }
  };

  const handleManualFaceEnrol = async () => {
    if (!currentPerson) return;
    try {
      const res = await enrolFace(currentPerson.id, 'SIMULATED');
      if (res.success) {
        showToast('Face Enrolled (Manual)', `Saved placeholder descriptor for ${currentPerson.name}.`);
        stopCamera();
        setActiveEnrolTab(null);
        loadPeople();
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  // --- RFID Enrolment ---
  const handleConnectRfidSerial = async () => {
    if (!currentPerson) return;
    try {
      showToast('Connecting Arduino', 'Please select Arduino serial port in the browser popup...');
      const port = await connectSerialDevice(9600);
      showToast('Port Open', 'Tap the RFID card against the RC522 sensor now...');
      const code = await readSerialLine(port, 15000);

      const res = await enrolRfid(currentPerson.id, code);
      if (res.success) {
        showToast('RFID Enrolled', `Card UID [${code}] assigned to ${currentPerson.name}.`);
        loadPeople();
        setActiveEnrolTab(null);
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      showToast('Serial Read Failed', err.message, true);
    }
  };

  const handleSaveManualRfid = async () => {
    if (!currentPerson || !manualInput.trim()) return;
    try {
      const res = await enrolRfid(currentPerson.id, manualInput.trim());
      if (res.success) {
        showToast('RFID Saved', `UID [${manualInput.trim()}] assigned to ${currentPerson.name}.`);
        setManualInput('');
        setActiveEnrolTab(null);
        loadPeople();
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      showToast('RFID Error', err.response?.data?.message || err.message, true);
    }
  };

  // --- Fingerprint Enrolment ---
  const handleConnectFingerSerial = async () => {
    if (!currentPerson) return;
    try {
      showToast('Connecting Arduino', 'Select Arduino serial port in the popup...');
      const port = await connectSerialDevice(9600);
      showToast('Sensor Ready', 'Place finger on the optical R307 sensor now...');
      const code = await readSerialLine(port, 15000);

      const res = await enrolFinger(currentPerson.id, code);
      if (res.success) {
        showToast('Fingerprint Enrolled', `Fingerprint ID [${code}] assigned to ${currentPerson.name}.`);
        loadPeople();
        setActiveEnrolTab(null);
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      showToast('Serial Error', err.message, true);
    }
  };

  const handleSaveManualFinger = async () => {
    if (!currentPerson || !manualInput.trim()) return;
    try {
      const res = await enrolFinger(currentPerson.id, manualInput.trim());
      if (res.success) {
        showToast('Fingerprint Saved', `ID [${manualInput.trim()}] assigned to ${currentPerson.name}.`);
        setManualInput('');
        setActiveEnrolTab(null);
        loadPeople();
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      showToast('Fingerprint Error', err.response?.data?.message || err.message, true);
    }
  };

  // --- QR Code Enrolment ---
  const handleGenerateQr = async () => {
    if (!currentPerson) return;
    try {
      const res = await enrolQr(currentPerson.id);
      if (res.success) {
        showToast('QR Generated', `Token [${res.qrToken}] generated for ${currentPerson.name}.`);
        loadPeople();
        setActiveEnrolTab('qr');
        if (onPeopleChanged) onPeopleChanged();
      }
    } catch (err) {
      showToast('QR Error', err.response?.data?.message || err.message, true);
    }
  };

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Enrollment Pipeline</div>
          <h1>Register a Person</h1>
          <div className="sub">
            Capture identity once — as a student or a staff member — then enroll biometrics and credentials directly into MongoDB.
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Registration Form */}
        <div className="card">
          <h3>
            <UserPlus size={16} />
            Person Details
          </h3>

          <form onSubmit={handleAddPerson}>
            <label>Person Type</label>
            <div className="seg">
              <button
                type="button"
                className={regType === 'student' ? 'on' : ''}
                onClick={() => setRegType('student')}
              >
                Student
              </button>
              <button
                type="button"
                className={regType === 'staff' ? 'on staff-on' : ''}
                onClick={() => setRegType('staff')}
              >
                Staff
              </button>
            </div>

            <label>Full Name</label>
            <input
              type="text"
              placeholder={regType === 'student' ? 'e.g. Ananya Rao' : 'e.g. Dr. Srinivas Iyer'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label>{regType === 'student' ? 'Student ID / Roll Number' : 'Staff ID / Employee Number'}</label>
            <input
              type="text"
              placeholder={regType === 'student' ? 'e.g. CS21B045' : 'e.g. EMP-1042'}
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />

            <label>Department</label>
            <input
              type="text"
              placeholder="e.g. Computer Science & Engineering"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            />

            <label>{regType === 'student' ? 'Year of Study' : 'Designation / Role'}</label>
            <input
              type="text"
              placeholder={regType === 'student' ? 'e.g. 3rd Year' : 'e.g. Associate Professor'}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />

            <label>Email (for OTP Verification)</label>
            <input
              type="email"
              placeholder="e.g. ananya@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="btn-row">
              <button type="submit" className="btn-primary" disabled={submitting}>
                <CheckCircle size={15} />
                {submitting ? 'Saving...' : 'Add Record'}
              </button>
            </div>
          </form>

          <div className="flow-note">
            <b>Unified Pipeline:</b> Students and staff share identical biometric enrolment options. Biometrics attach to the unique ID in MongoDB.
          </div>
        </div>

        {/* Biometrics & Credentials Enrolment */}
        <div className="card">
          <h3>
            <Sparkles size={16} />
            Enrol Biometrics & Credentials
          </h3>

          <label>Select Enrolled Person</label>
          <select
            value={selectedPersonId}
            onChange={(e) => {
              setSelectedPersonId(e.target.value);
              stopCamera();
              setActiveEnrolTab(null);
            }}
          >
            {people.length === 0 ? (
              <option value="">— Add a person first —</option>
            ) : (
              people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.id} ({p.type})
                </option>
              ))
            )}
          </select>

          {currentPerson && (
            <div className="pill-row">
              <span className="pill">Type: <b>{currentPerson.type}</b></span>
              <span className={`pill ${currentPerson.faceDescriptor ? 'badge-ok' : ''}`}>
                Face: {currentPerson.faceDescriptor ? '✓ Enrolled' : 'Not set'}
              </span>
              <span className={`pill ${currentPerson.rfid ? 'badge-ok' : ''}`}>
                RFID: {currentPerson.rfid || 'Not set'}
              </span>
              <span className={`pill ${currentPerson.fingerId ? 'badge-ok' : ''}`}>
                Fingerprint: {currentPerson.fingerId || 'Not set'}
              </span>
              <span className={`pill ${currentPerson.qrToken ? 'badge-ok' : ''}`}>
                QR: {currentPerson.qrToken ? '✓ Active' : 'Not generated'}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={startFaceCamera}
              className={activeEnrolTab === 'face' ? 'btn-primary' : ''}
              disabled={!currentPerson}
            >
              <Camera size={14} /> Enrol Face
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setActiveEnrolTab('rfid');
                setManualInput(currentPerson?.rfid || '');
              }}
              className={activeEnrolTab === 'rfid' ? 'btn-primary' : ''}
              disabled={!currentPerson}
            >
              <CreditCard size={14} /> Enrol RFID
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setActiveEnrolTab('finger');
                setManualInput(currentPerson?.fingerId || '');
              }}
              className={activeEnrolTab === 'finger' ? 'btn-primary' : ''}
              disabled={!currentPerson}
            >
              <Fingerprint size={14} /> Enrol Fingerprint
            </button>
            <button
              type="button"
              onClick={handleGenerateQr}
              className={activeEnrolTab === 'qr' ? 'btn-primary' : ''}
              disabled={!currentPerson}
            >
              <QrCode size={14} /> Generate QR
            </button>
          </div>

          {/* Dynamic Enrolment Sub-Area */}
          <div style={{ marginTop: 18 }}>
            {/* FACE TAB */}
            {activeEnrolTab === 'face' && (
              <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={15} color="var(--mint)" />
                  Webcam Face Capture for {currentPerson?.name}
                </div>

                {cameraActive ? (
                  <div>
                    <div className="cam-wrap">
                      <video ref={videoRef} autoPlay muted playsInline style={{ maxHeight: 220, objectFit: 'cover' }} />
                    </div>
                    <div className="hint" style={{ marginTop: 8 }}>
                      Position face within camera view in good lighting. Captures high-dimensional embeddings.
                    </div>
                    <div className="btn-row">
                      <button className="btn-primary" onClick={handleCaptureFace} disabled={capturingFace}>
                        {capturingFace ? 'Processing Face...' : 'Capture Face Reference'}
                      </button>
                      <button className="btn-secondary" onClick={handleManualFaceEnrol}>
                        Enrol Without Camera (Simulated)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flow-note">Camera not started or permission denied.</div>
                    <div className="btn-row">
                      <button className="btn-primary" onClick={handleManualFaceEnrol}>
                        Mark Face Enrolled (Simulated)
                      </button>
                      <button onClick={startFaceCamera}>Retry Camera</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RFID TAB */}
            {activeEnrolTab === 'rfid' && (
              <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={15} color="var(--mint)" />
                  RFID Card Tap Enrolment
                </div>
                <div className="hint">
                  Connect Arduino RC522 reader over Web Serial, or enter the card UID manually from your serial monitor.
                </div>

                {isWebSerialSupported() && (
                  <div style={{ marginBottom: 12 }}>
                    <button className="btn-secondary" onClick={handleConnectRfidSerial} style={{ width: '100%' }}>
                      Connect Arduino & Tap Card
                    </button>
                  </div>
                )}

                <label>Card UID Code</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. E4:92:A1:0F or CARD-0082"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                  />
                  <button className="btn-primary" onClick={handleSaveManualRfid} style={{ flexShrink: 0 }}>
                    Save RFID
                  </button>
                </div>
              </div>
            )}

            {/* FINGERPRINT TAB */}
            {activeEnrolTab === 'finger' && (
              <div className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Fingerprint size={15} color="var(--mint)" />
                  Fingerprint Sensor Enrolment
                </div>
                <div className="hint">
                  Place finger on the optical R307/AS608 sensor or assign an enrolled biometric template ID manually.
                </div>

                {isWebSerialSupported() && (
                  <div style={{ marginBottom: 12 }}>
                    <button className="btn-secondary" onClick={handleConnectFingerSerial} style={{ width: '100%' }}>
                      Connect Arduino & Read Sensor
                    </button>
                  </div>
                )}

                <label>Fingerprint Template / ID</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. FP-101 or 0xFA39B1"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                  />
                  <button className="btn-primary" onClick={handleSaveManualFinger} style={{ flexShrink: 0 }}>
                    Save Fingerprint
                  </button>
                </div>
              </div>
            )}

            {/* QR TAB */}
            {activeEnrolTab === 'qr' && currentPerson?.qrToken && (
              <div className="card" style={{ background: 'var(--surface-2)', padding: 14, textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Attendance QR Badge for {currentPerson.name}
                </div>
                <div className="qr-box" style={{ maxWidth: 200, margin: '10px auto' }}>
                  <QRCodeSVG value={currentPerson.qrToken} size={160} level="H" includeMargin={true} />
                </div>
                <div className="mono" style={{ color: 'var(--mint)', fontSize: 13, marginTop: 8 }}>
                  {currentPerson.qrToken}
                </div>
                <div className="hint" style={{ marginTop: 4 }}>
                  Scan with webcam during attendance check-in or enter this token manually.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPerson;
