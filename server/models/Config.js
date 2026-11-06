const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'system_config',
      unique: true
    },
    face: {
      type: Boolean,
      default: true
    },
    rfid: {
      type: Boolean,
      default: false
    },
    finger: {
      type: Boolean,
      default: false
    },
    qr: {
      type: Boolean,
      default: false
    },
    otp: {
      type: Boolean,
      default: false
    },
    institutionName: {
      type: String,
      default: 'Clearpoint Multi-Factor Attendance'
    },
    lateThreshold: {
      type: String,
      default: '09:30:00'
    },
    allowManualFallback: {
      type: Boolean,
      default: true
    },
    minFaceDetectionScore: {
      type: Number,
      default: 0.72
    },
    faceMatchThreshold: {
      type: Number,
      default: 0.50
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Config', ConfigSchema);
