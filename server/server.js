require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Route imports
const peopleRoutes = require('./routes/people');
const attendanceRoutes = require('./routes/attendance');
const configRoutes = require('./routes/config');
const otpRoutes = require('./routes/otp');
const healthRoutes = require('./routes/health');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// Mount API routes
app.use('/api/people', peopleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/config', configRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Clearpoint Multi-Factor Attendance API',
    version: '1.0.0',
    status: 'online',
    docs: {
      people: '/api/people',
      attendance: '/api/attendance',
      config: '/api/config',
      otp: '/api/otp',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Clearpoint API Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
