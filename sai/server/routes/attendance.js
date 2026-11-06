import express from 'express';
import {
  getAttendance,
  recordAttendance,
  clearAttendance,
  deleteAttendanceRecord,
  getDashboardStats,
  exportCsv
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/', getAttendance);
router.post('/', recordAttendance);
router.delete('/', clearAttendance);
router.delete('/:id', deleteAttendanceRecord);
router.get('/stats/dashboard', getDashboardStats);
router.get('/export/csv', exportCsv);

export default router;
