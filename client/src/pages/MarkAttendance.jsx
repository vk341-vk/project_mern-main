import React, { useState, useEffect, useRef } from 'react';
import { getConfig, getPeople, markAttendance, generateOtp, verifyOtp } from '../api';
import { detectFaceDescriptor, findBestFaceMatch, MIN_DETECTION_SCORE } from '../utils/faceApi';
import { isWebSerialSupported, connectSerialDevice, readSerialLine } from '../utils/webSerial';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  RefreshCw,
  Camera,
  CreditCard,
  Fingerprint,
  QrCode,
  KeyRound,
  Check,
  X,
  Play,
  RotateCcw,
  Sparkles,
  UserCheck
} from 'lucide-react';

const STEP_DEFINITIONS = [
  { key: 'face', label: 'Face recognition', desc: 'Webcam match against enrolled biometric descriptor', icon: Camera },
  { key: 'rfid', label: 'RFID tap', desc: 'Arduino RC522 card UID or simulated tap', icon: CreditCard },
  { key: 'finger', label: 'Fingerprint', desc: 'Arduino R307 sensor ID or simulated scan', icon: Fingerprint },
  { key: 'qr', label: 'QR scan', desc: 'Camera decodes person QR credential', icon: QrCode },
  { key: 'otp', label: 'OTP verification', desc: '6-digit time-sensitive challenge code', icon: KeyRound }
];

const MarkAttendance = ({ showToast, isFaceReady, isOnline, setActivePage }) => {
  const [config, setConfig] = useState(null);
  const [people, setPeople] = useState([]);
  const [activeSteps, setActiveSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepStatuses, setStepStatuses] = useState({}); // { [stepKey]: 'pending' | 'active' | 'done' | 'fail' }
  const [identifiedPerson, setIdentifiedPerson] = useState(null);
  const [finalSuccess, setFinalSuccess] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Video and stream references
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // OTP state
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [simulatedOtpSent, setSimulatedOtpSent] = useState(null);

  // Manual inputs for taps/tokens
  const [manualCode, setManualCode] = useState('');

  // Scanning loop ref for QR
  const qrScanningRef = useRef(false);

  // Load configuration and enrolled people
  const loadData = async () => {
    try {
      const [cfgRes, pplRes] = await Promise.all([getConfig(), getPeople()]);
      if (cfgRes.success) {
        setConfig(cfgRes.data);
        const steps = STEP_DEFINITIONS.filter((s) => cfgRes.data[s.key]);
        setActiveSteps(steps);
      }
      if (pplRes.success) {
        setPeople(pplRes.data);
      }
    } catch (err) {
      console.error('Error loading config/people:', err);
      showToast('Error', 'Failed to load verification setup from database.', true);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    qrScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start verification pipeline
  const handleStartVerification = () => {
    if (activeSteps.length === 0) {
      showToast('No Layers Enabled', 'Please enable at least one verification method in System Config.', true);
      return;
    }
    if (people.length === 0) {
      showToast('No Enrolled People', 'Please register students or staff before verifying attendance.', true);
      return;
    }

    resetVerification();
    setCurrentStepIndex(0);
    const initialStatuses = {};
    activeSteps.forEach((s) => {
      initialStatuses[s.key] = 'pending';
    });
    initialStatuses[activeSteps[0].key] = 'active';
    setStepStatuses(initialStatuses);
  };

  const resetVerification = () => {
    stopCamera();
    setCurrentStepIndex(-1);
    setIdentifiedPerson(null);
    setFinalSuccess(null);
    setStepStatuses({});
    setOtpCodeInput('');
    setSimulatedOtpSent(null);
    setManualCode('');
    setIsProcessing(false);
  };

  // Run next step or finalize
  const advanceStep = (passedPerson) => {
    stopCamera();
    const currentStep = activeSteps[currentStepIndex];
    const resolvedPerson = passedPerson || identifiedPerson;

    if (resolvedPerson && !identifiedPerson) {
      setIdentifiedPerson(resolvedPerson);
    }

    setStepStatuses((prev) => ({ ...prev, [currentStep.key]: 'done' }));

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < activeSteps.length) {
      setCurrentStepIndex(nextIndex);
      setStepStatuses((prev) => ({ ...prev, [activeSteps[nextIndex].key]: 'active' }));
      setManualCode('');
    } else {
      // Completed all steps!
      finalizeAttendance(resolvedPerson);
    }
  };

  const markStepFailed = (msg) => {
    const currentStep = activeSteps[currentStepIndex];
    setStepStatuses((prev) => ({ ...prev, [currentStep.key]: 'fail' }));
    showToast('Verification Failed', msg, true);
  };

  // Finalize attendance in MongoDB backend
  const finalizeAttendance = async (person) => {
    if (!person) {
      showToast('Identification Error', 'Could not determine person identity.', true);
      resetVerification();
      return;
    }

    try {
      setIsProcessing(true);
      const methods = activeSteps.map((s) => s.label);
      const res = await markAttendance({
        personId: person.id,
        methods,
        verificationScore: 0.98
      });

      if (res.success) {
        setFinalSuccess({
          person,
          record: res.data,
          time: res.data.time,
          date: res.data.date
        });

        // Trigger confetti celebration
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // Ignored
        }

        showToast('Attendance Marked!', `${person.name} recorded present at ${res.data.time}.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast('Attendance Record Note', msg, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize camera for face or QR when step changes
  useEffect(() => {
    if (currentStepIndex >= 0 && currentStepIndex < activeSteps.length) {
      const step = activeSteps[currentStepIndex];
      if (step.key === 'face') {
        startFaceStream();
      } else if (step.key === 'qr') {
        startQrStream();
      } else if (step.key === 'otp') {
        triggerOtpGeneration();
      }
    }
  }, [currentStepIndex]);

  // --- Step 1: FACE ---
  const startFaceStream = async () => {
    stopCamera();
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
      console.warn('Face camera access error:', err);
      setCameraActive(false);
    }
  };

  const handleScanFace = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);

    try {
      if (isFaceReady) {
        const detection = await detectFaceDescriptor(videoRef.current);
        if (!detection || detection.detection.score < MIN_DETECTION_SCORE) {
          markStepFailed('Face not detected clearly. Look straight at the camera in good lighting.');
          setIsProcessing(false);
          return;
        }

        // Compare against people in database
        const { match, distance } = findBestFaceMatch(detection.descriptor, people);
        if (match) {
          showToast('Face Verified', `Match found: ${match.name} (confidence ${(1 - distance).toFixed(2)})`);
          advanceStep(match);
        } else {
          markStepFailed('No matching face descriptor found in database.');
        }
      } else {
        // Fallback simulation: pick first enrolled or let user choose
        const candidate = identifiedPerson || people[0];
        showToast('Face Verified (Simulated)', `Match confirmed for ${candidate.name}.`);
        advanceStep(candidate);
      }
    } catch (err) {
      console.error('Face verification error:', err);
      markStepFailed('Error processing face frame: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Step 2: RFID ---
  const handleRfidSerial = async () => {
    try {
      showToast('Arduino RFID', 'Select Arduino serial port in the popup...');
      const port = await connectSerialDevice(9600);
      showToast('Port Open', 'Tap the RFID card now...');
      const code = await readSerialLine(port, 15000);
      resolveRfidTap(code);
    } catch (err) {
      markStepFailed('RFID serial read failed: ' + err.message);
    }
  };

  const resolveRfidTap = (code) => {
    if (!code || !code.trim()) {
      markStepFailed('No RFID code received.');
      return;
    }
    const clean = code.trim();
    // Look up match
    const match = people.find((p) => p.rfid === clean);
    if (match) {
      if (identifiedPerson && identifiedPerson.id !== match.id) {
        markStepFailed(`Card belongs to ${match.name}, not ${identifiedPerson.name}.`);
      } else {
        showToast('RFID Confirmed', `Card UID [${clean}] verified for ${match.name}.`);
        advanceStep(match);
      }
    } else {
      markStepFailed(`Unrecognized RFID card UID [${clean}].`);
    }
  };

  // --- Step 3: FINGERPRINT ---
  const handleFingerSerial = async () => {
    try {
      showToast('Fingerprint Sensor', 'Select Arduino serial port...');
      const port = await connectSerialDevice(9600);
      showToast('Sensor Ready', 'Place finger on the optical sensor...');
      const code = await readSerialLine(port, 15000);
      resolveFingerTap(code);
    } catch (err) {
      markStepFailed('Fingerprint read failed: ' + err.message);
    }
  };

  const resolveFingerTap = (code) => {
    if (!code || !code.trim()) {
      markStepFailed('No fingerprint data received.');
      return;
    }
    const clean = code.trim();
    const match = people.find((p) => p.fingerId === clean);
    if (match) {
      if (identifiedPerson && identifiedPerson.id !== match.id) {
        markStepFailed(`Fingerprint matches ${match.name}, not ${identifiedPerson.name}.`);
      } else {
        showToast('Fingerprint Verified', `ID [${clean}] verified for ${match.name}.`);
        advanceStep(match);
      }
    } else {
      markStepFailed(`Fingerprint ID [${clean}] not found in database.`);
    }
  };

  // --- Step 4: QR SCAN ---
  const startQrStream = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' }
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        qrScanningRef.current = true;
        requestAnimationFrame(scanQrFrame);
      }
    } catch (err) {
      console.warn('QR camera error:', err);
      setCameraActive(false);
    }
  };

  const scanQrFrame = () => {
    if (!qrScanningRef.current || !videoRef.current || !window.jsQR) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        qrScanningRef.current = false;
        resolveQrToken(code.data);
        return;
      }
    }

    if (qrScanningRef.current) {
      requestAnimationFrame(scanQrFrame);
    }
  };

  const resolveQrToken = (token) => {
    if (!token || !token.trim()) {
      markStepFailed('No QR token decoded.');
      return;
    }
    const clean = token.trim();
    const match = people.find((p) => p.qrToken === clean);
    if (match) {
      if (identifiedPerson && identifiedPerson.id !== match.id) {
        markStepFailed(`QR token belongs to ${match.name}, not ${identifiedPerson.name}.`);
      } else {
        showToast('QR Verified', `Token decoded for ${match.name}.`);
        advanceStep(match);
      }
    } else {
      markStepFailed(`QR token [${clean}] not recognized.`);
    }
  };

  // --- Step 5: OTP ---
  const triggerOtpGeneration = async () => {
    const targetPerson = identifiedPerson || people[0];
    if (!targetPerson) return;

    try {
      const res = await generateOtp(targetPerson.id);
      if (res.success) {
        setSimulatedOtpSent(res.code);
        showToast('OTP Generated', `Passcode sent to ${res.destination}.`);
      }
    } catch (err) {
      showToast('OTP Error', err.message, true);
    }
  };

  const handleVerifyOtp = async () => {
    const targetPerson = identifiedPerson || people[0];
    if (!targetPerson || !otpCodeInput.trim()) {
      markStepFailed('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await verifyOtp(targetPerson.id, otpCodeInput.trim());
      if (res.success) {
        showToast('OTP Verified', 'Passcode matches.');
        advanceStep(targetPerson);
      }
    } catch (err) {
      markStepFailed(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStep = activeSteps[currentStepIndex];

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <CheckCircle2 size={13} />
            Live Verification Pipeline
          </div>
          <h1>Mark Attendance</h1>
          <div className="sub">
            Enforces your configured multi-factor stack in sequence. Marks attendance only after every required verification layer is cleared.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button onClick={loadData}>
            <RefreshCw size={14} /> Refresh Config
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Left Column: Stack Pipeline */}
        <div className="card">
          <h3>
            <Sparkles size={16} />
            Verification Stack
          </h3>
          <div className="hint">
            Configured sequence:{' '}
            <b style={{ color: 'var(--text)' }}>
              {activeSteps.length > 0 ? activeSteps.map((s) => s.label).join(' → ') : 'No layers enabled'}
            </b>
          </div>

          {/* Steps List */}
          <div className="stack">
            {activeSteps.map((step, idx) => {
              const Icon = step.icon;
              const status = stepStatuses[step.key] || 'pending';
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.key} className={`stack-step ${status} ${isCurrent ? 'active' : ''}`}>
                  <div className="idx">{idx + 1}</div>
                  <div className="info" style={{ flex: 1 }}>
                    <div className="t" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={14} />
                      {step.label}
                    </div>
                    <div className="d">{step.desc}</div>
                  </div>
                  <div className="stat-ic">
                    {status === 'done' && <Check size={18} color="var(--mint)" />}
                    {status === 'fail' && <X size={18} color="var(--red)" />}
                    {status === 'active' && <span style={{ color: 'var(--mint)', animation: 'pulse 1s infinite' }}>●</span>}
                    {status === 'pending' && <span style={{ color: 'var(--text-faint)' }}>○</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline Controls */}
          <div className="btn-row" style={{ marginTop: 20 }}>
            {currentStepIndex === -1 ? (
              <button className="btn-primary" onClick={handleStartVerification}>
                <Play size={15} />
                Start Verification
              </button>
            ) : (
              <button className="btn-secondary" onClick={resetVerification}>
                <RotateCcw size={15} />
                Reset Pipeline
              </button>
            )}

            {identifiedPerson && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-ok">
                  Identified: {identifiedPerson.name} ({identifiedPerson.id})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Verification Channel */}
        <div className="card">
          <h3>
            <UserCheck size={16} />
            Active Verification Channel
          </h3>

          {/* When pipeline is completed */}
          {finalSuccess && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--mint-dim)', border: '2px solid var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={32} color="var(--mint)" />
              </div>
              <h2 style={{ fontFamily: 'var(--display)', color: '#FFFFFF', fontSize: 22 }}>
                Attendance Recorded!
              </h2>
              <p style={{ color: 'var(--text-dim)', marginTop: 6, fontSize: 13.5 }}>
                <b>{finalSuccess.person.name}</b> ({finalSuccess.person.id}) has been marked present in MongoDB.
              </p>
              <div className="pill-row" style={{ justifyContent: 'center', marginTop: 14 }}>
                <span className="pill">Time: {finalSuccess.time}</span>
                <span className="pill">Date: {finalSuccess.date}</span>
                <span className="pill">Type: {finalSuccess.person.type}</span>
              </div>
              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 22 }}>
                <button className="btn-primary" onClick={handleStartVerification}>
                  Verify Next Person
                </button>
                <button onClick={() => setActivePage('records')}>
                  View Records Log
                </button>
              </div>
            </div>
          )}

          {/* Idle state */}
          {!finalSuccess && currentStepIndex === -1 && (
            <div className="empty">
              <div className="big">◎</div>
              Press "Start Verification" to initiate the multi-factor attendance sequence.
            </div>
          )}

          {/* Live Step: FACE */}
          {!finalSuccess && currentStep?.key === 'face' && (
            <div>
              <div className="cam-wrap">
                <video ref={videoRef} autoPlay muted playsInline style={{ maxHeight: 260, objectFit: 'cover' }} />
              </div>
              <div className="hint" style={{ marginTop: 8 }}>
                Face the camera directly in good lighting. System rejects low-confidence/glare frames.
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleScanFace} disabled={isProcessing}>
                  {isProcessing ? 'Analyzing Biometrics...' : 'Scan & Verify Face'}
                </button>
                <button
                  onClick={() => {
                    // Manual select fallback
                    const target = identifiedPerson || people[0];
                    if (target) {
                      showToast('Manual Identity Confirmed', `Identified as ${target.name}.`);
                      advanceStep(target);
                    }
                  }}
                >
                  Camera Issue? Identify Manually
                </button>
              </div>
            </div>
          )}

          {/* Live Step: RFID */}
          {!finalSuccess && currentStep?.key === 'rfid' && (
            <div>
              <div className="flow-note" style={{ marginTop: 0, marginBottom: 16 }}>
                Waiting for RFID card tap from Arduino RC522 or manual input.
                {identifiedPerson && (
                  <div>Expected Card Holder: <b>{identifiedPerson.name} ({identifiedPerson.id})</b></div>
                )}
              </div>

              {isWebSerialSupported() && (
                <div style={{ marginBottom: 12 }}>
                  <button className="btn-secondary" onClick={handleRfidSerial} style={{ width: '100%' }}>
                    Connect Arduino & Tap Card
                  </button>
                </div>
              )}

              <label>Enter Card UID manually (e.g. from serial monitor)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. E4:92:A1:0F or CS21B045"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
                <button className="btn-primary" onClick={() => resolveRfidTap(manualCode)}>
                  Submit Tap
                </button>
              </div>

              {/* Quick simulation buttons for enrolled people */}
              <div style={{ marginTop: 14 }}>
                <div className="hint" style={{ marginBottom: 6 }}>Quick simulation taps for enrolled people:</div>
                <div className="pill-row">
                  {people.filter((p) => p.rfid).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn-sm"
                      onClick={() => resolveRfidTap(p.rfid)}
                    >
                      Tap {p.name}'s Card ({p.rfid})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Step: FINGERPRINT */}
          {!finalSuccess && currentStep?.key === 'finger' && (
            <div>
              <div className="flow-note" style={{ marginTop: 0, marginBottom: 16 }}>
                Waiting for fingerprint reading from optical R307/AS608 sensor.
              </div>

              {isWebSerialSupported() && (
                <div style={{ marginBottom: 12 }}>
                  <button className="btn-secondary" onClick={handleFingerSerial} style={{ width: '100%' }}>
                    Connect Arduino & Read Fingerprint
                  </button>
                </div>
              )}

              <label>Enter Fingerprint ID manually</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. FP-101"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
                <button className="btn-primary" onClick={() => resolveFingerTap(manualCode)}>
                  Verify Scan
                </button>
              </div>

              {/* Quick simulation buttons */}
              <div style={{ marginTop: 14 }}>
                <div className="hint" style={{ marginBottom: 6 }}>Quick simulation for enrolled templates:</div>
                <div className="pill-row">
                  {people.filter((p) => p.fingerId).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn-sm"
                      onClick={() => resolveFingerTap(p.fingerId)}
                    >
                      Scan {p.name} ({p.fingerId})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Step: QR */}
          {!finalSuccess && currentStep?.key === 'qr' && (
            <div>
              <div className="cam-wrap">
                <video ref={videoRef} autoPlay muted playsInline style={{ maxHeight: 220, objectFit: 'cover' }} />
              </div>
              <div className="hint" style={{ marginTop: 8 }}>
                Hold the attendance QR code badge up to the camera, or enter the token manually below.
              </div>

              <label>Enter QR Token manually</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. CLPT-CS21B045-8K92L1"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
                <button className="btn-primary" onClick={() => resolveQrToken(manualCode)}>
                  Verify Token
                </button>
              </div>

              {/* Quick simulation tokens */}
              <div style={{ marginTop: 14 }}>
                <div className="hint" style={{ marginBottom: 6 }}>Quick simulation tokens:</div>
                <div className="pill-row">
                  {people.filter((p) => p.qrToken).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn-sm"
                      onClick={() => resolveQrToken(p.qrToken)}
                    >
                      {p.name} ({p.qrToken.slice(0, 16)}...)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Step: OTP */}
          {!finalSuccess && currentStep?.key === 'otp' && (
            <div>
              <div className="flow-note" style={{ marginTop: 0, marginBottom: 14 }}>
                A 6-digit challenge passcode was generated for{' '}
                <b>{identifiedPerson?.name || 'the person'}</b> ({identifiedPerson?.email || identifiedPerson?.id}).
                {simulatedOtpSent && (
                  <div style={{ marginTop: 8 }}>
                    Code: <span className="mono" style={{ color: 'var(--mint)', fontSize: 18, fontWeight: 700 }}>{simulatedOtpSent}</span>
                  </div>
                )}
              </div>

              <label>Enter 6-Digit Verification Code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. 582194"
                  maxLength={6}
                  value={otpCodeInput}
                  onChange={(e) => setOtpCodeInput(e.target.value)}
                />
                <button className="btn-primary" onClick={handleVerifyOtp} disabled={isProcessing}>
                  {isProcessing ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>

              {simulatedOtpSent && (
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn-sm"
                    onClick={() => setOtpCodeInput(simulatedOtpSent)}
                  >
                    Auto-Fill Received Code ({simulatedOtpSent})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;
