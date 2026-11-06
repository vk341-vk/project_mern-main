const API_BASE = '/api';

async function handleResponse(res) {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }
  return json;
}

export const api = {
  // People
  async getPeople(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/people${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },

  async getPerson(id) {
    const res = await fetch(`${API_BASE}/people/${encodeURIComponent(id)}`);
    return handleResponse(res);
  },

  async createPerson(personData) {
    const res = await fetch(`${API_BASE}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personData)
    });
    return handleResponse(res);
  },

  async updatePerson(id, updateData) {
    const res = await fetch(`${API_BASE}/people/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  async deletePerson(id) {
    const res = await fetch(`${API_BASE}/people/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  async enrolCredential(id, kind, value) {
    const res = await fetch(`${API_BASE}/people/${encodeURIComponent(id)}/enrol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, value })
    });
    return handleResponse(res);
  },

  // Attendance
  async getAttendance(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/attendance${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },

  async recordAttendance(data) {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async clearAttendance() {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  async deleteAttendanceRecord(id) {
    const res = await fetch(`${API_BASE}/attendance/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/attendance/stats/dashboard`);
    return handleResponse(res);
  },

  // Reports
  async getReports() {
    const res = await fetch(`${API_BASE}/reports`);
    return handleResponse(res);
  },

  // Config
  async getConfig() {
    const res = await fetch(`${API_BASE}/config`);
    return handleResponse(res);
  },

  async updateConfig(config) {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return handleResponse(res);
  },

  // OTP
  async sendOtp(personId) {
    const res = await fetch(`${API_BASE}/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId })
    });
    return handleResponse(res);
  },

  async verifyOtp(personId, code) {
    const res = await fetch(`${API_BASE}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, code })
    });
    return handleResponse(res);
  },

  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  }
};
