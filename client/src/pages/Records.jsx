import React, { useState, useEffect } from 'react';
import { getAttendance, clearAttendanceRecords, deleteAttendanceRecord } from '../api';
import { FileText, Download, Trash2, Search, Calendar, Filter } from 'lucide-react';

const Records = ({ showToast }) => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await getAttendance({
        search,
        type: typeFilter,
        date: dateFilter
      });
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      showToast('Error', 'Failed to load attendance records.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [typeFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleExportCsv = () => {
    window.location.href = '/api/attendance/export-csv';
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all attendance records from the database? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await clearAttendanceRecords();
      if (res.success) {
        showToast('Records Cleared', res.message);
        fetchRecords();
      }
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  const handleDeleteOne = async (record) => {
    if (!window.confirm(`Delete record for ${record.personName} on ${record.date}?`)) {
      return;
    }

    try {
      const res = await deleteAttendanceRecord(record._id);
      if (res.success) {
        showToast('Record Deleted', 'Attendance record removed.');
        fetchRecords();
      }
    } catch (err) {
      showToast('Error', err.message, true);
    }
  };

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <FileText size={13} />
            Attendance Database
          </div>
          <h1>Attendance Records</h1>
          <div className="sub">
            Complete verification audit trail stored in MongoDB. Lists every verified check-in with individual credentials used, timestamps, and confidence scores.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button onClick={handleExportCsv} className="btn-secondary">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={handleClearAll} className="btn-danger">
            <Trash2 size={14} /> Clear All Records
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <input
            type="text"
            placeholder="Search by name, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="student">Students Only</option>
            <option value="staff">Staff Only</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <button type="submit" className="btn-secondary">
            <Search size={14} /> Search
          </button>
          {(search || typeFilter || dateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setDateFilter('');
              }}
            >
              Reset
            </button>
          )}
        </form>

        {/* Records Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person Name</th>
                <th>ID</th>
                <th>Type</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time</th>
                <th>Verified Method(s)</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
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
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.methods?.map((m, i) => (
                        <span key={i} className="pill" style={{ fontSize: 10, padding: '2px 7px' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="mono" style={{ color: 'var(--mint)' }}>
                    {((r.verificationScore || 1.0) * 100).toFixed(0)}%
                  </td>
                  <td>
                    <span className="badge badge-ok">{r.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm btn-danger"
                      onClick={() => handleDeleteOne(r)}
                      title="Delete record"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && !loading && (
          <div className="empty">
            <div className="big">▤</div>
            No attendance records match your query.
          </div>
        )}
      </div>
    </div>
  );
};

export default Records;
