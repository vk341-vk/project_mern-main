import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart3, RefreshCw, Download, AlertTriangle, Search } from 'lucide-react';

export default function Reports({ showToast }) {
  const [reportData, setReportData] = useState({
    totalSessions: 0,
    reports: []
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports();
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      showToast('Error', 'Failed to calculate attendance analytics', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  let reports = reportData.reports || [];
  if (typeFilter) {
    reports = reports.filter((r) => r.type === typeFilter);
  }
  if (search.trim()) {
    const s = search.toLowerCase();
    reports = reports.filter(
      (r) => r.name.toLowerCase().includes(s) || r.id.toLowerCase().includes(s)
    );
  }
  if (atRiskOnly) {
    reports = reports.filter((r) => r.percentage < 75);
  }

  const allReports = reportData.reports || [];
  const averagePct = allReports.length
    ? Math.round(allReports.reduce((acc, r) => acc + r.percentage, 0) / allReports.length)
    : 0;
  const atRiskCount = allReports.filter((r) => r.percentage < 75).length;

  const handleExportCsv = () => {
    const rows = [
      ['Name', 'ID', 'Type', 'Department', 'Academic Year/Designation', 'Days Present', 'Total Sessions', 'Attendance %']
    ];
    reports.forEach((r) => {
      rows.push([
        `"${String(r.name).replace(/"/g, '""')}"`,
        `"${String(r.id).replace(/"/g, '""')}"`,
        `"${String(r.type).replace(/"/g, '""')}"`,
        `"${String(r.dept).replace(/"/g, '""')}"`,
        `"${String(r.year).replace(/"/g, '""')}"`,
        r.daysPresent,
        r.totalSessions || reportData.totalSessions || 0,
        `${r.percentage}%`
      ]);
    });

    const csvContent = rows.map((e) => e.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clearpoint_compliance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page" id="page-reports">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <BarChart3 size={14} /> Analytics & Compliance Engine
          </div>
          <h1>Attendance Reports</h1>
          <div className="sub">
            Calculated attendance rates across institutional sessions for enrolled students and faculty members.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button type="button" onClick={handleExportCsv} disabled={!reports.length}>
            <Download size={14} /> Export Report CSV
          </button>
          <button type="button" onClick={loadReports} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="num">{reportData.totalSessions}</div>
          <div className="lbl">Distinct Session Dates</div>
        </div>
        <div className="card stat violet">
          <div className="num">{allReports.length}</div>
          <div className="lbl">Total Monitored Persons</div>
        </div>
        <div className="card stat accent">
          <div className="num">{averagePct}%</div>
          <div className="lbl">Cohort Average Attendance</div>
        </div>
        <div className="card stat amber">
          <div className="num" style={{ color: atRiskCount > 0 ? 'var(--red)' : 'var(--mint)' }}>
            {atRiskCount}
          </div>
          <div className="lbl">Candidates Below 75% Threshold</div>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search candidate name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All person types</option>
            <option value="student">Students only</option>
            <option value="staff">Staff only</option>
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={atRiskOnly}
              onChange={(e) => setAtRiskOnly(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span style={{ color: 'var(--amber)', fontSize: 12.5, fontWeight: 500 }}>
              Show At-Risk Only (&lt; 75%)
            </span>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>ID</th>
                <th>Type</th>
                <th>Department</th>
                <th>Academic Year / Designation</th>
                <th>Sessions Present</th>
                <th>Attendance %</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                let badgeClass = 'badge-fail';
                let statusLabel = 'Critical Shortage';
                if (r.percentage >= 75) {
                  badgeClass = 'badge-ok';
                  statusLabel = 'Compliant';
                } else if (r.percentage >= 50) {
                  badgeClass = 'badge-pending';
                  statusLabel = 'Warning';
                }

                return (
                  <tr key={r.id}>
                    <td className="strong">{r.name}</td>
                    <td className="mono">{r.id}</td>
                    <td>
                      <span className={`badge ${r.type === 'staff' ? 'badge-staff' : 'badge-student'}`}>
                        {r.type}
                      </span>
                    </td>
                    <td>{r.dept || '—'}</td>
                    <td>{r.year || '—'}</td>
                    <td className="mono">
                      {r.daysPresent} / {r.totalSessions || reportData.totalSessions || 0}
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>{r.percentage}%</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontFamily: 'var(--mono)',
                          color: r.percentage >= 75 ? 'var(--mint)' : r.percentage >= 50 ? 'var(--amber)' : 'var(--red)'
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {reports.length === 0 && !loading && (
          <div className="empty">
            <div className="big">◧</div>
            No candidate records match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
