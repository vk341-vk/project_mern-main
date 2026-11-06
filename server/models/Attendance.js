const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    personId: {
      type: String,
      required: true,
      index: true
    },
    personName: {
      type: String,
      default: ''
    },
    personType: {
      type: String,
      enum: ['student', 'staff'],
      default: 'student',
      index: true
    },
    dept: {
      type: String,
      default: ''
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true
    },
    time: {
      type: String, // Format: HH:MM:SS
      required: true
    },
    methods: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['present', 'late', 'excused', 'absent'],
      default: 'present'
    },
    verificationScore: {
      type: Number,
      default: 1.0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate marks on the same day if configured
AttendanceSchema.index({ personId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
