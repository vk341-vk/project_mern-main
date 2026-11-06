import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    personId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    personName: {
      type: String,
      required: true
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
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    time: {
      type: String, // HH:MM:SS
      required: true
    },
    methods: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['present', 'late', 'absent'],
      default: 'present'
    },
    verificationScore: {
      type: Number,
      default: 0.95
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate attendance on the same date for the same person
attendanceSchema.index({ personId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
