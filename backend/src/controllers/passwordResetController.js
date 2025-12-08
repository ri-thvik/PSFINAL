const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

// @desc    Send password reset OTP
// @route   POST /api/auth/password/reset-otp
// @access  Public
exports.sendPasswordResetOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in session
        req.session.passwordResetOTP = otp;
        req.session.passwordResetEmail = email.toLowerCase();
        req.session.passwordResetExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Send OTP email
        await emailService.sendOTP(email, otp, user.name);

        logger.info(`Password reset OTP sent to ${email}`);

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email',
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    } catch (error) {
        logger.error(`Send password reset OTP error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again.'
        });
    }
};

// @desc    Verify OTP and set new password
// @route   POST /api/auth/password/reset-complete
// @access  Public
exports.resetPasswordComplete = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check session
        if (!req.session.passwordResetOTP || !req.session.passwordResetEmail) {
            return res.status(400).json({
                success: false,
                message: 'No password reset session found. Please request a new OTP.'
            });
        }

        // Verify email matches
        if (req.session.passwordResetEmail !== email.toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'Email does not match reset request'
            });
        }

        // Check expiry
        if (Date.now() > req.session.passwordResetExpiry) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        if (req.session.passwordResetOTP !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Find user and update password
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        await user.save();

        // Clear session
        delete req.session.passwordResetOTP;
        delete req.session.passwordResetEmail;
        delete req.session.passwordResetExpiry;

        logger.info(`Password reset completed for ${email}`);

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        logger.error(`Reset password complete error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.'
        });
    }
};
