import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB, getDbStatus } from './config/db.js';
import peopleRoutes from './routes/people.js';
import attendanceRoutes from './routes/attendance.js';
import reportsRoutes from './routes/reports.js';
import configRoutes from './routes/config.js';
import otpRoutes from './routes/otp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database connection (with graceful offline fallback)
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health / Status endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({
    status: 'online',
    appName: 'Clearpoint Multi-Factor Attendance System',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// API Routes
app.use('/api/people', peopleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/otp', otpRoutes);

// Serve built React client if available
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Clearpoint Server Error]', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Clearpoint Attendance MERN Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

export { app, server };
export default app;
