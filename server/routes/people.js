const express = require('express');
const router = express.Router();
const Person = require('../models/Person');
const Attendance = require('../models/Attendance');

// @route   GET /api/people
// @desc    Get all enrolled people (with optional type and search filter)
router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = {};

    if (type && ['student', 'staff'].includes(type)) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { dept: { $regex: search, $options: 'i' } }
      ];
    }

    const people = await Person.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: people.length, data: people });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/people/:id
// @desc    Get person by ID
router.get('/:id', async (req, res) => {
  try {
    const person = await Person.findOne({ id: req.params.id });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    res.json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/people
// @desc    Register a new person (student or staff)
router.post('/', async (req, res) => {
  try {
    const { id, name, type, dept, year, email } = req.body;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'ID and Name are required.' });
    }

    const existing = await Person.findOne({ id: id.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: `A person with ID ${id} already exists.` });
    }

    const person = new Person({
      id: id.trim(),
      name: name.trim(),
      type: type === 'staff' ? 'staff' : 'student',
      dept: dept ? dept.trim() : 'General',
      year: year ? year.trim() : '',
      email: email ? email.trim() : ''
    });

    await person.save();
    res.status(201).json({ success: true, data: person, message: `${person.name} registered successfully.` });
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/people/:id
// @desc    Update person details
router.put('/:id', async (req, res) => {
  try {
    const person = await Person.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found.' });
    }
    res.json({ success: true, data: person, message: 'Person details updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/people/:id/enrol-face
// @desc    Enrol face descriptor (128 floats array or 'SIMULATED') and photo preview
router.post('/:id/enrol-face', async (req, res) => {
  try {
    const { faceDescriptor, facePhoto } = req.body;
    if (!faceDescriptor) {
      return res.status(400).json({ success: false, message: 'Face descriptor is required.' });
    }

    const person = await Person.findOne({ id: req.params.id });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found.' });
    }

    person.faceDescriptor = faceDescriptor;
    if (facePhoto) person.facePhoto = facePhoto;
    await person.save();

    res.json({
      success: true,
      data: person,
      message: `Face enrolled successfully for ${person.name}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/people/:id/enrol-rfid
// @desc    Enrol RFID UID
router.post('/:id/enrol-rfid', async (req, res) => {
  try {
    const { rfid } = req.body;
    if (!rfid) {
      return res.status(400).json({ success: false, message: 'RFID UID is required.' });
    }

    const trimmed = rfid.trim();
    // Check if duplicate for another person
    const duplicate = await Person.findOne({ rfid: trimmed, id: { $ne: req.params.id } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: `This RFID card is already assigned to ${duplicate.name} (${duplicate.id}).` });
    }

    const person = await Person.findOne({ id: req.params.id });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found.' });
    }

    person.rfid = trimmed;
    await person.save();

    res.json({ success: true, data: person, message: `RFID UID assigned to ${person.name}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/people/:id/enrol-finger
// @desc    Enrol Fingerprint ID
router.post('/:id/enrol-finger', async (req, res) => {
  try {
    const { fingerId } = req.body;
    if (!fingerId) {
      return res.status(400).json({ success: false, message: 'Fingerprint ID is required.' });
    }

    const trimmed = fingerId.trim();
    const duplicate = await Person.findOne({ fingerId: trimmed, id: { $ne: req.params.id } });
    if (duplicate) {
      return res.status(409).json({ success: false, message: `This Fingerprint ID is already assigned to ${duplicate.name} (${duplicate.id}).` });
    }

    const person = await Person.findOne({ id: req.params.id });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found.' });
    }

    person.fingerId = trimmed;
    await person.save();

    res.json({ success: true, data: person, message: `Fingerprint ID assigned to ${person.name}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/people/:id/enrol-qr
// @desc    Generate or assign a QR token
router.post('/:id/enrol-qr', async (req, res) => {
  try {
    const person = await Person.findOne({ id: req.params.id });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found.' });
    }

    const customToken = req.body.qrToken;
    const token = customToken ? customToken.trim() : `CLPT-${person.id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    person.qrToken = token;
    await person.save();

    res.json({ success: true, data: person, qrToken: token, message: `QR token generated for ${person.name}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/people/:id
// @desc    Delete person record and optionally their attendance history
router.delete('/:id', async (req, res) => {
  try {
    const person = await Person.findOneAndDelete({ id: req.params.id });
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found.' });
    }
    // Also remove their attendance
    await Attendance.deleteMany({ personId: req.params.id });
    res.json({ success: true, message: `Person ${person.name} (${person.id}) and all associated records deleted.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
