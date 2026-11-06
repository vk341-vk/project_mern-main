const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Person = require('../models/Person');

// @route   GET /api/attendance
// @desc    Get attendance records with filtering
router.get('/', async (req, res) => {
  try {
    const { date, type, search, startDate, endDate, limit = 200 } = req.query;
    let query = {};

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (type && ['student', 'staff'].includes(type)) {
      query.personType = type;
    }

    if (search) {
      query.$or = [
        { personName: { $regex: search, $options: 'i' } },
        { personId: { $regex: search, $options: 'i' } },
        { dept: { $regex: search, $options: 'i' } }
      ];
    }

    const records = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/attendance
// @desc    Mark attendance for a person
router.post('/', async (req, res) => {
  try {
    const { personId, methods = [], verificationScore = 1.0, date: reqDate, time: reqTime, status = 'present' } = req.body;

    if (!personId) {
      return res.status(400).json({ success: false, message: 'personId is required' });
    }

    const person = await Person.findOne({ id: personId });
    if (!person) {
      return res.status(404).json({ success: false, message: `Person with ID ${personId} is not enrolled.` });
    }

    const now = new Date();
    const date = reqDate || now.toISOString().slice(0, 10);
    const time = reqTime || now.toTimeString().slice(0, 8);

    // Check if attendance already marked for today
    const existing = await Attendance.findOne({ personId, date });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `${person.name} (${person.id}) has already been marked present for ${date} at ${existing.time}.`,
        record: existing
      });
    }

    const attendance = new Attendance({
      personId: person.id,
      personName: person.name,
      personType: person.type,
      dept: person.dept,
      date,
      time,
      methods: Array.isArray(methods) && methods.length ? methods : ['Manual Verification'],
      status,
      verificationScore
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      data: attendance,
      message: `Attendance marked for ${person.name} at ${time}.`
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/attendance/summary
// @desc    Get dashboard metrics (counts, attendance rate, recent activity)
router.get('/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [totalStudents, totalStaff, presentTodayRecords, recentActivity] = await Promise.all([
      Person.countDocuments({ type: 'student' }),
      Person.countDocuments({ type: 'staff' }),
      Attendance.find({ date: today }),
      Attendance.find().sort({ createdAt: -1 }).limit(8)
    ]);

    const totalEnrolled = totalStudents + totalStaff;
    const uniquePresentToday = new Set(presentTodayRecords.map(r => r.personId)).size;
    const attendanceRate = totalEnrolled > 0 ? Math.round((uniquePresentToday / totalEnrolled) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        totalStaff,
        totalEnrolled,
        presentToday: uniquePresentToday,
        attendanceRate,
        today,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/attendance/reports
// @desc    Get analytics and attendance percentage report for all people
router.get('/reports', async (req, res) => {
  try {
    const people = await Person.find().sort({ name: 1 });
    const allDates = await Attendance.distinct('date');
    const totalWorkingDays = allDates.length;

    const reports = await Promise.all(
      people.map(async (person) => {
        const daysPresent = await Attendance.countDocuments({ personId: person.id });
        const pct = totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 100) : 0;

        return {
          person: {
            id: person.id,
            name: person.name,
            type: person.type,
            dept: person.dept,
            year: person.year,
            email: person.email,
            credentials: {
              face: !!person.faceDescriptor,
              rfid: !!person.rfid,
              finger: !!person.fingerId,
              qr: !!person.qrToken
            }
          },
          daysPresent,
          totalWorkingDays,
          pct
        };
      })
    );

    // Grouping by department
    const deptStats = {};
    reports.forEach(r => {
      const d = r.person.dept || 'General';
      if (!deptStats[d]) deptStats[d] = { dept: d, totalPeople: 0, totalPresentCount: 0, avgPct: 0 };
      deptStats[d].totalPeople += 1;
      deptStats[d].totalPresentCount += r.daysPresent;
    });

    Object.keys(deptStats).forEach(d => {
      const totalPossible = deptStats[d].totalPeople * (totalWorkingDays || 1);
      deptStats[d].avgPct = totalPossible > 0 ? Math.round((deptStats[d].totalPresentCount / totalPossible) * 100) : 0;
    });

    res.json({
      success: true,
      totalWorkingDays,
      distinctDatesCount: totalWorkingDays,
      reports,
      departmentStats: Object.values(deptStats)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/attendance/export-csv
// @desc    Export attendance records as CSV
router.get('/export-csv', async (req, res) => {
  try {
    const records = await Attendance.find().sort({ date: -1, time: -1 });

    const headers = ['Name', 'ID', 'Type', 'Department', 'Date', 'Time', 'Methods', 'Status', 'Verification Score'];
    const rows = records.map(r => [
      `"${r.personName.replace(/"/g, '""')}"`,
      `"${r.personId}"`,
      `"${r.personType}"`,
      `"${(r.dept || '').replace(/"/g, '""')}"`,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${(r.methods || []).join(' + ').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.verificationScore || 1.0
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clearpoint_attendance_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/attendance
// @desc    Clear all attendance records
router.delete('/', async (req, res) => {
  try {
    const result = await Attendance.deleteMany({});
    res.json({ success: true, message: `All ${result.deletedCount} attendance records have been cleared.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete a single attendance record by _id
router.delete('/:id', async (req, res) => {
  try {
    const result = await Attendance.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    res.json({ success: true, message: 'Attendance record deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
