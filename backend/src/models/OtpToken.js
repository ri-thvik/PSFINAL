const mongoose = require('mongoose');

const OtpTokenSchema = new mongoose.Schema({
    email: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    verificationType: { type: String, enum: ['signup', 'login'], required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false }
}, { timestamps: false });

// TTL on expiry
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// One active OTP per email/type
OtpTokenSchema.index({ email: 1, verificationType: 1 }, { unique: true });

module.exports = mongoose.model('OtpToken', OtpTokenSchema);

