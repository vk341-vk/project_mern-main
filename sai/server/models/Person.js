import mongoose from 'mongoose';

const personSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['student', 'staff'],
      default: 'student',
      required: true
    },
    dept: {
      type: String,
      trim: true,
      default: ''
    },
    year: {
      type: String, // Year for student, Designation for staff
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    faceDescriptor: {
      type: mongoose.Schema.Types.Mixed, // Array of 128 numbers (float descriptor) or string 'SIMULATED' or null
      default: null
    },
    rfid: {
      type: String, // RFID card UID, e.g. "A1:B2:C3:D4"
      trim: true,
      default: null
    },
    fingerId: {
      type: String, // Fingerprint sensor slot ID, e.g. "FP-101"
      trim: true,
      default: null
    },
    qrToken: {
      type: String, // Generated token, e.g. "CLPT-CS21B045-A9B1C2"
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Person || mongoose.model('Person', personSchema);
