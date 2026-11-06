const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');
const Person = require('../models/Person');

// @route   POST /api/otp/generate
// @desc    Generate a 6-digit OTP for a person
router.post('/generate', async (req, res) => {
  try {
    const { personId } = req.body;

    if (!personId) {
      return res.status(400).json({ success: false, message: 'personId is required' });
    }

    const person = await Person.findOne({ id: personId });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate prior pending OTPs for this person
    await Otp.deleteMany({ personId });

    const newOtp = new Otp({
      personId,
      code,
      email: person.email,
      expiresAt
    });

    await newOtp.save();

    console.log(`[OTP Engine] Generated OTP for ${person.name} (${personId}): ${code} -> ${person.email || 'No email'}`);

    res.json({
      success: true,
      message: `OTP sent to ${person.email || person.id}`,
      destination: person.email || person.id,
      code, // Returned for simulated console delivery / testing
      expiresInSeconds: 600
    });
  } catch (error) {
    console.error('Error generating OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/otp/verify
// @desc    Verify a 6-digit OTP
router.post('/verify', async (req, res) => {
  try {
    const { personId, code } = req.body;

    if (!personId || !code) {
      return res.status(400).json({ success: false, message: 'personId and code are required' });
    }

    const record = await Otp.findOne({
      personId,
      code: code.trim(),
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    // Mark as verified or delete
    await Otp.deleteOne({ _id: record._id });

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
