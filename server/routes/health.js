const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbState = mongoose.connection.readyState;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStateMap[dbState] || 'unknown',
      connected: dbState === 1,
      host: mongoose.connection.host || '127.0.0.1',
      name: mongoose.connection.name || 'clearpoint_attendance'
    },
    system: {
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform
    }
  });
});

module.exports = router;
