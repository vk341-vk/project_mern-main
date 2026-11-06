import React, { useState, useEffect } from 'react';
import { getReports } from '../api';
import { BarChart3, TrendingUp, Building2, UserCheck, RefreshCw } from 'lucide-react';

const Reports = ({ showToast }) => {
  const [reportData, setReportData] = useState({
    totalWorkingDays: 0,
    reports: [],
    departmentStats: []
  });
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getReports();
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      showToast('Error', 'Failed to generate attendance reports.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const overallAvg =
    reportData.reports.length > 0
      ? Math.round(
          reportData.reports.reduce((acc, curr) => acc + curr.pct, 0) / reportData.reports.length
        )
      : 0;

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <BarChart3 size={13} />
            Analytics & Reports
          </div>
          <h1>Attendance Analytics</h1>
          <div className="sub">
            Cumulative attendance statistics across all recorded calendar sessions for students and staff.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button onClick={fetchReports} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Analytics
          </button>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card stat">
          <div className="num">{reportData.totalWorkingDays}</div>
          <div className="lbl">Total Working Days Recorded</div>
        </div>
        <div className="card stat violet">
          <div className="num">{reportData.reports.length}</div>
          <div className="lbl">Total Enrolled Population</div>
        </div>
        <div className="card stat accent">
          <div className="num">{overallAvg}%</div>
          <div className="lbl">Average Institutional Rate</div>
        </div>
      </div>

      {/* Department breakdown */}
      {reportData.departmentStats?.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>
            <Building2 size={16} />
            Departmental Attendance Breakdown
          </h3>
          <div className="hint">
            Aggregated attendance averages across academic and administrative departments.
          </div>

          <div className="grid grid-3" style={{ marginTop: 12 }}>
            {reportData.departmentStats.map((d) => (
              <div key={d.dept} className="card" style={{ background: 'var(--surface-2)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{d.dept}</div>
                  <span className={`badge ${d.avgPct >= 75 ? 'badge-ok' : d.avgPct >= 50 ? 'badge-pending' : 'badge-fail'}`}>
                    {d.avgPct}%
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>
                  {d.totalPeople} enrolled · {d.totalPresentCount} attendances logged
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${d.avgPct}%`,
                      background: d.avgPct >= 75 ? 'var(--mint)' : d.avgPct >= 50 ? 'var(--amber)' : 'var(--red)',
                      borderRadius: 3,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Person Detailed Report */}
      <div className="card">
        <h3>
          <UserCheck size={16} />
          Individual Attendance Records
        </h3>
        <div className="hint">
          Detailed percentage calculation based on {reportData.totalWorkingDays} distinct calendar session(s).
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person Name</th>
                <th>ID</th>
                <th>Type</th>
                <th>Department</th>
                <th>Enrolled Biometrics</th>
                <th>Days Present</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {reportData.reports.map(({ person, daysPresent, totalWorkingDays, pct }) => (
                <tr key={person.id}>
                  <td className="strong">{person.name}</td>
                  <td className="mono">{person.id}</td>
                  <td>
                    <span className={`badge ${person.type === 'staff' ? 'badge-staff' : 'badge-student'}`}>
                      {person.type}
                    </span>
                  </td>
                  <td>{person.dept || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {person.credentials.face && <span className="badge badge-ok" style={{ fontSize: 9.5 }}>Face</span>}
                      {person.credentials.rfid && <span className="badge badge-ok" style={{ fontSize: 9.5 }}>RFID</span>}
                      {person.credentials.finger && <span className="badge badge-ok" style={{ fontSize: 9.5 }}>Finger</span>}
                      {person.credentials.qr && <span className="badge badge-ok" style={{ fontSize: 9.5 }}>QR</span>}
                    </div>
                  </td>
                  <td className="mono">
                    {daysPresent} / {totalWorkingDays}
                  </td>
                  <td>
                    <span className={`badge ${pct >= 75 ? 'badge-ok' : pct >= 50 ? 'badge-pending' : 'badge-fail'}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reportData.reports.length === 0 && !loading && (
          <div className="empty">
            <div className="big">◧</div>
            Enrol people and mark attendance to generate analytics.
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
