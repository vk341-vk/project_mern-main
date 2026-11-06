const express = require('express');
const router = express.Router();
const Config = require('../models/Config');

// @route   GET /api/config
// @desc    Get current system config (creates default if none exists)
router.get('/', async (req, res) => {
  try {
    let config = await Config.findOne({ key: 'system_config' });
    if (!config) {
      config = await Config.create({
        key: 'system_config',
        face: true,
        rfid: false,
        finger: false,
        qr: false,
        otp: false,
        institutionName: 'Clearpoint Multi-Factor Attendance',
        lateThreshold: '09:30:00'
      });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/config
// @desc    Update system configuration
router.put('/', async (req, res) => {
  try {
    const { face, rfid, finger, qr, otp, institutionName, lateThreshold, allowManualFallback } = req.body;

    let config = await Config.findOne({ key: 'system_config' });
    if (!config) {
      config = new Config({ key: 'system_config' });
    }

    if (face !== undefined) config.face = !!face;
    if (rfid !== undefined) config.rfid = !!rfid;
    if (finger !== undefined) config.finger = !!finger;
    if (qr !== undefined) config.qr = !!qr;
    if (otp !== undefined) config.otp = !!otp;
    if (institutionName !== undefined) config.institutionName = institutionName;
    if (lateThreshold !== undefined) config.lateThreshold = lateThreshold;
    if (allowManualFallback !== undefined) config.allowManualFallback = !!allowManualFallback;

    await config.save();
    res.json({ success: true, data: config, message: 'System configuration updated successfully.' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
