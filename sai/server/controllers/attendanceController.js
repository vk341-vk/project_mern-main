import { dataService } from '../services/dataService.js';

export const getAttendance = async (req, res) => {
  try {
    const { personId, date, personType, search } = req.query;
    const records = await dataService.getAttendance({ personId, date, personType, search });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordAttendance = async (req, res) => {
  try {
    const { personId, methods, date, time, status } = req.body;
    if (!personId) {
      return res.status(400).json({ success: false, message: 'Person ID is required to mark attendance.' });
    }

    const record = await dataService.recordAttendance({
      personId,
      methods: Array.isArray(methods) && methods.length ? methods : ['Direct Verification'],
      date,
      time,
      status: status || 'present'
    });

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully for ${record.personName} (${record.personId}).`,
      data: record
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const clearAttendance = async (req, res) => {
  try {
    await dataService.clearAllAttendance();
    res.json({ success: true, message: 'All attendance records cleared successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAttendanceRecord = async (req, res) => {
  try {
    const deleted = await dataService.deleteAttendanceRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }
    res.json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await dataService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportCsv = async (req, res) => {
  try {
    const records = await dataService.getAttendance();
    const rows = [
      ['Name', 'ID', 'Type', 'Department', 'Date', 'Time', 'Methods', 'Status']
    ];

    records.forEach((r) => {
      rows.push([
        `"${String(r.personName || '').replace(/"/g, '""')}"`,
        `"${String(r.personId || '').replace(/"/g, '""')}"`,
        `"${String(r.personType || '').replace(/"/g, '""')}"`,
        `"${String(r.dept || '').replace(/"/g, '""')}"`,
        `"${String(r.date || '').replace(/"/g, '""')}"`,
        `"${String(r.time || '').replace(/"/g, '""')}"`,
        `"${Array.isArray(r.methods) ? r.methods.join(' + ') : String(r.methods || '')}"`,
        `"${String(r.status || 'present').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = rows.map((row) => row.join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=clearpoint_attendance_export.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
