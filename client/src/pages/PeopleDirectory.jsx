import React, { useState, useEffect } from 'react';
import { getPeople, deletePerson } from '../api';
import Modal from '../components/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Search, Trash2, QrCode, Plus, Check, Minus } from 'lucide-react';

const PeopleDirectory = ({ showToast, setActivePage }) => {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedQrPerson, setSelectedQrPerson] = useState(null);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const res = await getPeople({ search, type: typeFilter });
      if (res.success) {
        setPeople(res.data);
      }
    } catch (err) {
      showToast('Error', 'Failed to load people directory.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPeople();
  };

  const handleDelete = async (person) => {
    if (!window.confirm(`Are you sure you want to delete ${person.name} (${person.id}) and all associated attendance history?`)) {
      return;
    }

    try {
      const res = await deletePerson(person.id);
      if (res.success) {
        showToast('Deleted', `${person.name} deleted.`);
        fetchPeople();
      }
    } catch (err) {
      showToast('Error', err.response?.data?.message || err.message, true);
    }
  };

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Users size={13} />
            Identity Directory
          </div>
          <h1>People Directory</h1>
          <div className="sub">
            All registered students and staff stored in MongoDB with their biometric and credential enrollment status.
          </div>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button className="btn-primary" onClick={() => setActivePage('register')}>
            <Plus size={15} />
            Register New Person
          </button>
        </div>
      </div>

      <div className="card">
        {/* Search & Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <input
            type="text"
            placeholder="Search by name, roll number, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="student">Students Only</option>
            <option value="staff">Staff Only</option>
          </select>
          <button type="submit" className="btn-secondary">
            <Search size={14} /> Search
          </button>
        </form>

        {/* Directory Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID / Roll No</th>
                <th>Type</th>
                <th>Department</th>
                <th>Year / Role</th>
                <th>Face</th>
                <th>RFID</th>
                <th>Fingerprint</th>
                <th>QR Badge</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td className="strong">{p.name}</td>
                  <td className="mono">{p.id}</td>
                  <td>
                    <span className={`badge ${p.type === 'staff' ? 'badge-staff' : 'badge-student'}`}>
                      {p.type}
                    </span>
                  </td>
                  <td>{p.dept || '—'}</td>
                  <td>{p.year || '—'}</td>
                  <td>
                    {p.faceDescriptor ? (
                      <span className="badge badge-ok">✓ Active</span>
                    ) : (
                      <span className="badge badge-off">—</span>
                    )}
                  </td>
                  <td className="mono">
                    {p.rfid ? (
                      <span className="badge badge-ok">{p.rfid}</span>
                    ) : (
                      <span className="badge badge-off">—</span>
                    )}
                  </td>
                  <td className="mono">
                    {p.fingerId ? (
                      <span className="badge badge-ok">{p.fingerId}</span>
                    ) : (
                      <span className="badge badge-off">—</span>
                    )}
                  </td>
                  <td>
                    {p.qrToken ? (
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        onClick={() => setSelectedQrPerson(p)}
                      >
                        <QrCode size={13} /> View QR
                      </button>
                    ) : (
                      <span className="badge badge-off">Not set</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm btn-danger"
                      onClick={() => handleDelete(p)}
                      title="Delete person and attendance logs"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {people.length === 0 && !loading && (
          <div className="empty">
            <div className="big">◧</div>
            No enrolled people match your search criteria.
          </div>
        )}
      </div>

      {/* QR Badge Modal */}
      <Modal
        isOpen={!!selectedQrPerson}
        onClose={() => setSelectedQrPerson(null)}
        title="Attendance QR Badge"
      >
        {selectedQrPerson && (
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: 18, color: '#FFFFFF', marginBottom: 4 }}>
              {selectedQrPerson.name}
            </h4>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>
              {selectedQrPerson.id} · {selectedQrPerson.type} ({selectedQrPerson.dept})
            </div>

            <div className="qr-box" style={{ maxWidth: 220, margin: '0 auto' }}>
              <QRCodeSVG
                value={selectedQrPerson.qrToken || ''}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="mono" style={{ color: 'var(--mint)', marginTop: 12, fontSize: 14, fontWeight: 600 }}>
              {selectedQrPerson.qrToken}
            </div>

            <div className="hint" style={{ marginTop: 8 }}>
              Print or show this badge on a mobile device to scan at the Clearpoint terminal.
            </div>

            <div className="btn-row" style={{ justifyContent: 'center', marginTop: 18 }}>
              <button className="btn-primary" onClick={() => window.print()}>
                Print Badge
              </button>
              <button onClick={() => setSelectedQrPerson(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PeopleDirectory;
