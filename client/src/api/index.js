import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// People API
export const getPeople = async (params = {}) => {
  const res = await api.get('/people', { params });
  return res.data;
};

export const getPerson = async (id) => {
  const res = await api.get(`/people/${id}`);
  return res.data;
};

export const createPerson = async (personData) => {
  const res = await api.post('/people', personData);
  return res.data;
};

export const updatePerson = async (id, data) => {
  const res = await api.put(`/people/${id}`, data);
  return res.data;
};

export const enrolFace = async (id, faceDescriptor, facePhoto = '') => {
  const res = await api.post(`/people/${id}/enrol-face`, { faceDescriptor, facePhoto });
  return res.data;
};

export const enrolRfid = async (id, rfid) => {
  const res = await api.post(`/people/${id}/enrol-rfid`, { rfid });
  return res.data;
};

export const enrolFinger = async (id, fingerId) => {
  const res = await api.post(`/people/${id}/enrol-finger`, { fingerId });
  return res.data;
};

export const enrolQr = async (id, qrToken = '') => {
  const res = await api.post(`/people/${id}/enrol-qr`, { qrToken });
  return res.data;
};

export const deletePerson = async (id) => {
  const res = await api.delete(`/people/${id}`);
  return res.data;
};

// Attendance API
export const getAttendance = async (params = {}) => {
  const res = await api.get('/attendance', { params });
  return res.data;
};

export const markAttendance = async (data) => {
  const res = await api.post('/attendance', data);
  return res.data;
};

export const getSummary = async () => {
  const res = await api.get('/attendance/summary');
  return res.data;
};

export const getReports = async () => {
  const res = await api.get('/attendance/reports');
  return res.data;
};

export const clearAttendanceRecords = async () => {
  const res = await api.delete('/attendance');
  return res.data;
};

export const deleteAttendanceRecord = async (id) => {
  const res = await api.delete(`/attendance/${id}`);
  return res.data;
};

// System Config API
export const getConfig = async () => {
  const res = await api.get('/config');
  return res.data;
};

export const updateConfig = async (configData) => {
  const res = await api.put('/config', configData);
  return res.data;
};

// OTP API
export const generateOtp = async (personId) => {
  const res = await api.post('/otp/generate', { personId });
  return res.data;
};

export const verifyOtp = async (personId, code) => {
  const res = await api.post('/otp/verify', { personId, code });
  return res.data;
};

// System Diagnostics
export const getHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export default api;
