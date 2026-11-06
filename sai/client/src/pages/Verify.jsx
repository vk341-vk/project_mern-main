import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { faceService } from '../utils/faceApi';
import { serialService } from '../utils/serial';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { CheckCircle2, Play, RotateCcw, Camera, CreditCard, Fingerprint, QrCode, KeyRound, Sparkles } from 'lucide-react';

export default function Verify({ showToast, faceReady, serialSupported, netOnline }) {
  const [config, setConfig] = useState(null);
  const [people, setPeople] = useState([]);
  const [verifySteps, setVerifySteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [identifiedPersonId, setIdentifiedPersonId] = useState(null);
  const [stepStatuses, setStepStatuses] = useState({}); // key -> 'active' | 'done' | 'fail'

  // Input states for active channels
  const [manualCode, setManualCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPreview, setOtpPreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanningQrRef = useRef(false);

  // Load config and people on mount
  const loadData = async () => {
    try {
      const [cfgRes, pplRes] = await Promise.all([api.getConfig(), api.getPeople()]);
      if (cfgRes.success) {
        setConfig(cfgRes.data);
        setupSteps(cfgRes.data);
      }
      if (pplRes.success) {
        setPeople(pplRes.data);
      }
    } catch (e) {
      showToast('Error', 'Failed to load configuration or people', true);
    }
  };

  const setupSteps = (cfg) => {
    const allLayers = [
      { key: 'face', label: 'Face recognition', desc: 'Neural descriptor match via webcam', icon: Camera },
      { key: 'rfid', label: 'RFID card tap', desc: 'RC522 reader or manual card UID', icon: CreditCard },
      { key: 'finger', label: 'Fingerprint', desc: 'R307/AS608 optical sensor ID', icon: Fingerprint },
      { key: 'qr', label: 'QR code scan', desc: 'Camera decode of person token', icon: QrCode },
      { key: 'otp', label: 'OTP (Second factor)', desc: 'One-time passcode confirmation', icon: KeyRound }
    ];

    const enabled = allLayers.filter((l) => cfg[l.key]);
    setVerifySteps(enabled);
  };

  useEffect(() => {
    loadData();
    return () => stopAllCameras();
  }, []);

  const stopAllCameras = () => {
    scanningQrRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleReset = () => {
    stopAllCameras();
    setCurrentStepIndex(-1);
    setIdentifiedPersonId(null);
    setStepStatuses({});
    setManualCode('');
    setOtpCode('');
    setOtpPreview(null);
    setIsProcessing(false);
  };

  const handleStartVerify = () => {
    if (!verifySteps.length) {
      showToast('No Layers Enabled', 'Please enable at least one verification method in System Config.', true);
      return;
    }
    if (!people.length) {
      showToast('No People Registered', 'Please register students or staff members first.', true);
      return;
    }

    handleReset();
    setCurrentStepIndex(0);
    startStep(0, null);
  };

  const markStep = (key, status) => {
    setStepStatuses((prev) => ({ ...prev, [key]: status }));
  };

  const passStep = (stepKey, personId) => {
    markStep(stepKey, 'done');
    const newPersonId = personId || identifiedPersonId;
    if (newPersonId) setIdentifiedPersonId(newPersonId);

    const nextIdx = currentStepIndex + 1;
    if (nextIdx < verifySteps.length) {
      setCurrentStepIndex(nextIdx);
      setTimeout(() => startStep(nextIdx, newPersonId), 400);
    } else {
      setTimeout(() => finalizeAttendance(newPersonId), 500);
    }
  };

  const failStep = (stepKey, errorMsg) => {
    markStep(stepKey, 'fail');
    setIsProcessing(false);
    showToast('Verification Failed', errorMsg, true);
  };

  // Step Dispatcher
  const startStep = async (stepIdx, currentPersonId) => {
    const step = verifySteps[stepIdx];
    if (!step) return;
    markStep(step.key, 'active');
    setManualCode('');
    setIsProcessing(false);

    if (step.key === 'face') {
      await startFaceCapture();
    } else if (step.key === 'qr') {
      await startQrScanner();
    } else if (step.key === 'otp') {
      await initiateOtp(currentPersonId);
    }
  };

  // ========== 1. FACE STEP ==========
  const startFaceCapture = async () => {
    stopAllCameras();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (e) {
      showToast('Camera Unavailable', 'Webcam not reachable. You can verify via manual identification.', true);
      setCameraActive(false);
    }
  };

  const handleScanFace = async () => {
    setIsProcessing(true);
    const step = verifySteps[currentStepIndex];

    try {
      if (faceService.isReady() && videoRef.current) {
        const det = await faceService.detectDescriptor(videoRef.current, config.minDetectionScore || 0.72);
        if (!det.detected) {
          failStep(step.key, det.message || 'Face not detected clearly. Check lighting and look straight at camera.');
          return;
        }

        const match = faceService.matchFace(det.descriptor, people, config.faceMatchThreshold || 0.5);
        if (match) {
          stopAllCameras();
          showToast('Face Matched', `Verified as ${match.person.name} (${match.confidence}% confidence).`);
          passStep(step.key, match.person.id);
        } else {
          failStep(step.key, 'Face did not match any enrolled person closely enough.');
        }
      } else {
        // Fallback demo identification
        showToast('Face Engine Note', 'Neural model unavailable. Please confirm identity below.');
        setIsProcessing(false);
      }
    } catch (err) {
      failStep(step.key, err.message);
    }
  };

  const handleManualIdentify = (id) => {
    const step = verifySteps[currentStepIndex];
    stopAllCameras();
    passStep(step.key, id);
  };

  // ========== 2. RFID & FINGERPRINT STEP ==========
  const handleLiveSerialRead = async (stepKey) => {
    setIsProcessing(true);
    try {
      if (!serialService.isConnected()) {
        await serialService.requestAndConnect(9600);
      }
      showToast('Arduino Connected', `Waiting for read from ${stepKey === 'rfid' ? 'RC522' : 'R307'}...`);
      const code = await serialService.readNextLine(15000);
      verifyCodeAgainstDatabase(code, stepKey);
    } catch (err) {
      failStep(stepKey, err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyCodeAgainstDatabase = (code, stepKey) => {
    if (!code || !code.trim()) {
      failStep(stepKey, 'No code received from sensor.');
      return;
    }

    const cleanCode = code.trim();
    const field = stepKey === 'rfid' ? 'rfid' : 'fingerId';

    // Find person matching code
    const matched = people.find(
      (p) => p[field] === cleanCode && (!identifiedPersonId || p.id === identifiedPersonId)
    );

    if (matched) {
      showToast('Sensor Verified', `${stepKey.toUpperCase()} matched for ${matched.name}.`);
      passStep(stepKey, matched.id);
    } else {
      failStep(stepKey, `Code '${cleanCode}' did not match ${identifiedPersonId ? 'the identified person' : 'any enrolled record'}.`);
    }
  };

  // ========== 3. QR CODE STEP ==========
  const startQrScanner = async () => {
    stopAllCameras();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      scanningQrRef.current = true;
      requestAnimationFrame(scanQrFrame);
    } catch (e) {
      setCameraActive(false);
      showToast('Camera Unavailable', 'Webcam not reachable. You may enter the token manually.', true);
    }
  };

  const scanQrFrame = () => {
    if (!scanningQrRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);

      if (code && code.data) {
        scanningQrRef.current = false;
        stopAllCameras();
        handleResolveQr(code.data);
        return;
      }
    }
    requestAnimationFrame(scanQrFrame);
  };

  const handleResolveQr = (token) => {
    const step = verifySteps[currentStepIndex];
    if (!token || !token.trim()) {
      failStep(step.key, 'Empty QR token entered.');
      return;
    }

    const matched = people.find(
      (p) => p.qrToken === token.trim() && (!identifiedPersonId || p.id === identifiedPersonId)
    );

    if (matched) {
      showToast('QR Verified', `Valid QR credential for ${matched.name}.`);
      passStep(step.key, matched.id);
    } else {
      failStep(step.key, 'QR token was not recognized or did not match the current person.');
    }
  };

  // ========== 4. OTP STEP ==========
  const initiateOtp = async (personId) => {
    const person = people.find((p) => p.id === personId);
    if (!person) {
      failStep('otp', 'No identity confirmed prior to OTP layer.');
      return;
    }

    try {
      const res = await api.sendOtp(person.id);
      if (res.success) {
        setOtpPreview(res.data);
        showToast('OTP Dispatched', `Code sent to ${res.data.email}`);
      }
    } catch (err) {
      failStep('otp', `Failed to send OTP: ${err.message}`);
    }
  };

  const handleVerifyOtp = async () => {
    if (!identifiedPersonId || !otpCode.trim()) {
      showToast('Incomplete Code', 'Please enter the 6-digit OTP code.', true);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.verifyOtp(identifiedPersonId, otpCode.trim());
      if (res.success) {
        showToast('OTP Confirmed', 'Second-factor authentication cleared.');
        passStep('otp', identifiedPersonId);
      }
    } catch (err) {
      failStep('otp', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== FINALIZE ATTENDANCE IN MONGODB ==========
  const finalizeAttendance = async (personId) => {
    stopAllCameras();
    const person = people.find((p) => p.id === personId);
    if (!person) {
      showToast('Error', 'Could not locate person record for logging attendance.', true);
      handleReset();
      return;
    }

    try {
      const methodsUsed = verifySteps.map((s) => s.label);
      const res = await api.recordAttendance({
        personId: person.id,
        methods: methodsUsed
      });

      // Confetti celebration!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast('Attendance Marked!', `${person.name} (${person.id}) successfully recorded present.`);
      setTimeout(() => handleReset(), 3000);
    } catch (err) {
      showToast('Attendance Log Error', err.message, true);
    }
  };

  const currentStep = currentStepIndex >= 0 ? verifySteps[currentStepIndex] : null;
  const currentPerson = people.find((p) => p.id === identifiedPersonId) || null;

  return (
    <div className="page" id="page-verify">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} /> Live Verification Engine
          </div>
          <h1>Mark Attendance</h1>
          <div className="sub">
            Runs enabled authentication layers sequentially and only records attendance once every required factor clears in MongoDB.
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Verification Stack Card */}
        <div className="card">
          <h3>Verification stack</h3>
          <div className="hint">
            Active pipeline:{' '}
            <b style={{ color: 'var(--text)' }}>
              {verifySteps.length ? verifySteps.map((s) => s.label).join(' → ') : 'None configured'}
            </b>
          </div>

          <div className="stack">
            {verifySteps.map((step, idx) => {
              const status = stepStatuses[step.key] || '';
              return (
                <div key={step.key} className={`stack-step ${status}`}>
                  <div className="idx">{idx + 1}</div>
                  <div className="info">
                    <div className="t">{step.label}</div>
                    <div className="d">{step.desc}</div>
                  </div>
                  <div className="stat-ic">
                    {status === 'active' && '…'}
                    {status === 'done' && '✓'}
                    {status === 'fail' && '✕'}
                    {!status && '○'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="btn-row">
            <button
              type="button"
              className="btn-primary"
              onClick={handleStartVerify}
              disabled={currentStepIndex >= 0 && currentStepIndex < verifySteps.length}
            >
              <Play size={14} /> Start verification
            </button>
            <button type="button" onClick={handleReset}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {currentPerson && (
            <div className="flow-note" style={{ marginTop: 18 }}>
              Identified Candidate: <b>{currentPerson.name}</b> ({currentPerson.id} — {currentPerson.type})
            </div>
          )}
        </div>

        {/* Active Channel Card */}
        <div className="card">
          <h3>Active channel</h3>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

          {currentStepIndex === -1 ? (
            <div className="empty">
              <div className="big">◎</div>
              Press "Start verification" to initiate attendance pipeline.
            </div>
          ) : currentStep ? (
            <div>
              {/* FACE CHANNEL VIEW */}
              {currentStep.key === 'face' && (
                <div>
                  <div className="cam-wrap" style={{ minHeight: 240 }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ display: cameraActive ? 'block' : 'none' }} />
                    {!cameraActive && (
                      <div className="empty" style={{ padding: 40 }}>
                        <Camera size={36} />
                        <div>Camera off or unavailable. Select person manually below:</div>
                      </div>
                    )}
                  </div>
                  <div className="hint" style={{ marginTop: 10 }}>
                    Face detection confidence threshold: {Math.round((config?.minDetectionScore || 0.72) * 100)}%.
                  </div>
                  <div className="btn-row">
                    {cameraActive && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleScanFace}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 size={14} /> {isProcessing ? 'Verifying...' : 'Scan & Match Face'}
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <label>Or identify person directly (test fallback):</label>
                    <select
                      value={identifiedPersonId || ''}
                      onChange={(e) => handleManualIdentify(e.target.value)}
                    >
                      <option value="">— Choose enrolled person —</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.id} ({p.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* RFID CHANNEL VIEW */}
              {currentStep.key === 'rfid' && (
                <div>
                  <div className="hint">Waiting for RC522 RFID card tap...</div>
                  {serialSupported && (
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleLiveSerialRead('rfid')}
                        disabled={isProcessing}
                      >
                        Read Live from Arduino
                      </button>
                    </div>
                  )}

                  <label>Or enter RFID UID manually / pick candidate:</label>
                  <input
                    type="text"
                    placeholder="e.g. A1:B2:C3:D4"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  />
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => verifyCodeAgainstDatabase(manualCode, 'rfid')}
                    >
                      Submit UID
                    </button>
                    {people.map(
                      (p) =>
                        p.rfid && (
                          <button
                            key={p.id}
                            type="button"
                            className="btn-sm"
                            onClick={() => verifyCodeAgainstDatabase(p.rfid, 'rfid')}
                          >
                            Tap {p.name}'s Card ({p.rfid})
                          </button>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* FINGERPRINT CHANNEL VIEW */}
              {currentStep.key === 'finger' && (
                <div>
                  <div className="hint">Waiting for R307/AS608 optical fingerprint scan...</div>
                  {serialSupported && (
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleLiveSerialRead('finger')}
                        disabled={isProcessing}
                      >
                        Read Live from Arduino
                      </button>
                    </div>
                  )}

                  <label>Or enter Fingerprint ID manually / pick candidate:</label>
                  <input
                    type="text"
                    placeholder="e.g. FP-101"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  />
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => verifyCodeAgainstDatabase(manualCode, 'finger')}
                    >
                      Submit Fingerprint ID
                    </button>
                    {people.map(
                      (p) =>
                        p.fingerId && (
                          <button
                            key={p.id}
                            type="button"
                            className="btn-sm"
                            onClick={() => verifyCodeAgainstDatabase(p.fingerId, 'finger')}
                          >
                            Scan {p.name}'s Finger ({p.fingerId})
                          </button>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* QR CODE CHANNEL VIEW */}
              {currentStep.key === 'qr' && (
                <div>
                  <div className="cam-wrap" style={{ minHeight: 220 }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ display: cameraActive ? 'block' : 'none' }} />
                    {!cameraActive && (
                      <div className="empty" style={{ padding: 40 }}>
                        <QrCode size={36} />
                        <div>Camera off. You can enter the token below.</div>
                      </div>
                    )}
                  </div>
                  <div className="hint" style={{ marginTop: 10 }}>
                    Hold person's generated QR code in front of the lens.
                  </div>

                  <label>Or enter token code:</label>
                  <input
                    type="text"
                    placeholder="e.g. CLPT-CS21B045-A9B1C2"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.trim())}
                  />
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleResolveQr(manualCode)}
                    >
                      Submit Token
                    </button>
                    {people.map(
                      (p) =>
                        p.qrToken && (
                          <button
                            key={p.id}
                            type="button"
                            className="btn-sm"
                            onClick={() => handleResolveQr(p.qrToken)}
                          >
                            Scan {p.name}'s QR
                          </button>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* OTP CHANNEL VIEW */}
              {currentStep.key === 'otp' && (
                <div>
                  {otpPreview && (
                    <div className="flow-note" style={{ marginBottom: 12 }}>
                      One-time code dispatched to <b>{otpPreview.email}</b>:
                      <div
                        className="mono"
                        style={{ color: 'var(--mint)', fontSize: 22, fontWeight: 700, marginTop: 4 }}
                      >
                        {otpPreview.code}
                      </div>
                      {otpPreview.previewUrl && (
                        <div style={{ marginTop: 6 }}>
                          <a
                            href={otpPreview.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--amber)', textDecoration: 'underline' }}
                          >
                            View rendered email preview
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <label>Enter 6-digit confirmation code</label>
                  <input
                    type="text"
                    placeholder="e.g. 583921"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                  />
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleVerifyOtp}
                      disabled={isProcessing}
                    >
                      Verify Code
                    </button>
                    {otpPreview?.code && (
                      <button type="button" onClick={() => setOtpCode(otpPreview.code)}>
                        Auto-fill Test Code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty">
              <div className="big" style={{ color: 'var(--mint)' }}>
                ✓
              </div>
              All multi-factor checks cleared! Logging attendance...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
