import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Download, Trash2, Search, Filter } from 'lucide-react';

export default function Records({ showToast }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getAttendance({
        search,
        personType: typeFilter,
        date: dateFilter
      });
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      showToast('Error', 'Failed to load attendance logs', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [search, typeFilter, dateFilter]);

  const handleClearRecords = async () => {
    if (!window.confirm('Clear all attendance records from the database? This cannot be undone.')) {
      return;
    }

    try {
      const res = await api.clearAttendance();
      showToast('Database Updated', res.message);
      await loadRecords();
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  const handleDeleteRecord = async (id, personName) => {
    if (!window.confirm(`Delete attendance record for ${personName}?`)) return;
    try {
      await api.deleteAttendanceRecord(id);
      showToast('Record Deleted', `Attendance log for ${personName} removed.`);
      await loadRecords();
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/attendance/export/csv';
  };

  return (
    <div className="page" id="page-records">
      <div className="page-head">
        <div>
          <div className="eyebrow">Attendance Log & Audit Trail</div>
          <h1>Records</h1>
          <div className="sub">
            Verified check-in events persisted in MongoDB with person metadata, multi-factor channels used, and timestamps.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button type="button" onClick={handleExportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button type="button" className="btn-danger" onClick={handleClearRecords}>
            <Trash2 size={14} /> Clear all records
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by candidate name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All person types</option>
            <option value="student">Students only</option>
            <option value="staff">Staff only</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>ID</th>
                <th>Type</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time</th>
                <th>Method(s) Verified</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const recordId = r._id || r.id || `${r.personId}_${r.date}`;
                return (
                  <tr key={recordId}>
                    <td className="strong">{r.personName}</td>
                    <td className="mono">{r.personId}</td>
                    <td>
                      <span className={`badge ${r.personType === 'staff' ? 'badge-staff' : 'badge-student'}`}>
                        {r.personType}
                      </span>
                    </td>
                    <td>{r.dept || '—'}</td>
                    <td>{r.date}</td>
                    <td className="mono">{r.time}</td>
                    <td>{Array.isArray(r.methods) ? r.methods.join(' + ') : r.methods}</td>
                    <td>
                      <span className="badge badge-ok">{r.status || 'present'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        title="Delete this record"
                        onClick={() => handleDeleteRecord(recordId, r.personName)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {records.length === 0 && !loading && (
          <div className="empty">
            <div className="big">▤</div>
            No attendance records match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
