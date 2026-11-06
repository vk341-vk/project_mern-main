import mongoose from 'mongoose';

const configSchema = new mongoose.Schema(
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
    minDetectionScore: {
      type: Number,
      default: 0.72
    },
    faceMatchThreshold: {
      type: Number,
      default: 0.5
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Config || mongoose.model('Config', configSchema);
