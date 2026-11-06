const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
  {
    personId: {
      type: String,
      required: true,
      index: true
    },
    code: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ''
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically clears expired records
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Otp', OtpSchema);
