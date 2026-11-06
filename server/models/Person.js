const mongoose = require('mongoose');

const PersonSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Person ID / Roll number / Employee ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['student', 'staff'],
      default: 'student',
      index: true
    },
    dept: {
      type: String,
      default: 'General'
    },
    year: {
      type: String, // e.g. "3rd Year" or "Lab Assistant" / "Professor"
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    faceDescriptor: {
      type: mongoose.Schema.Types.Mixed, // Array of 128 numbers or 'SIMULATED' or null
      default: null
    },
    facePhoto: {
      type: String, // Optional base64 or URL preview
      default: ''
    },
    rfid: {
      type: String,
      trim: true,
      default: null,
      sparse: true
    },
    fingerId: {
      type: String,
      trim: true,
      default: null,
      sparse: true
    },
    qrToken: {
      type: String,
      trim: true,
      default: null,
      sparse: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Person', PersonSchema);
