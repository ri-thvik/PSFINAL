const User = require('../models/User');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');
const crypto = require('crypto');

// @desc    Send OTP for Signup
// @route   POST /api/auth/signup/send-otp
// @access  Public
exports.sendSignupOTP = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and passwords are required'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                ...(phone ? [{ phone }] : [])
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or phone already exists'
            });
        }

        // Generate OTP
        const otp = otpService.generateOTP();

        // Store signup data in session
        req.session.signupData = {
            name,
            email: email.toLowerCase(),
            phone: phone || null,
            password,
            otp,
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        };

        // Send OTP via email
        await otpService.sendOTPEmail(email, otp);

        logger.info(`Signup OTP sent to ${email}`);

        // In development, return OTP for testing
        if (process.env.NODE_ENV === 'development') {
            return res.status(200).json({
                success: true,
                message: 'OTP sent to your email',
                otp: otp // Only in development
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email'
        });
    } catch (err) {
        logger.error(`Send signup OTP error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error sending OTP'
        });
    }
};

// @desc    Verify OTP and Complete Signup
// @route   POST /api/auth/signup/verify-complete
// @access  Public
exports.verifySignupOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Check session for signup data
        if (!req.session.signupData) {
            return res.status(400).json({
                success: false,
                message: 'No signup session found. Please start signup again.'
            });
        }

        const signupData = req.session.signupData;

        // Verify email matches
        if (signupData.email !== email.toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'Email mismatch'
            });
        }

        // Check OTP expiration
        if (Date.now() > signupData.expiresAt) {
            req.session.signupData = null;
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        if (signupData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Create user
        const userData = {
            name: signupData.name,
            email: signupData.email,
            password: signupData.password,
            isVerified: true,
            role: 'rider'
        };

        if (signupData.phone) {
            userData.phone = signupData.phone;
        }

        const user = await User.create(userData);

        // Clear session data
        req.session.signupData = null;

        // Send welcome email
        try {
            const emailService = require('../services/emailService');
            await emailService.sendWelcomeEmail(user.email, user.name);
        } catch (emailErr) {
            logger.warn(`Failed to send welcome email: ${emailErr.message}`);
        }

        logger.info(`User registered successfully: ${user.email}`);

        sendTokenResponse(user, 201, res);
    } catch (err) {
        logger.error(`Verify signup OTP error: ${err.message}`);

        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error completing signup'
        });
    }
};

// @desc    Resend Signup OTP
// @route   POST /api/auth/signup/resend-otp
// @access  Public
exports.resendSignupOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check session for signup data
        if (!req.session.signupData || req.session.signupData.email !== email.toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'No active signup session found'
            });
        }

        // Generate new OTP
        const otp = otpService.generateOTP();

        // Update session
        req.session.signupData.otp = otp;
        req.session.signupData.expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

        // Send OTP via email
        await otpService.sendOTPEmail(email, otp);

        logger.info(`Signup OTP resent to ${email}`);

        // In development, return OTP for testing
        if (process.env.NODE_ENV === 'development') {
            return res.status(200).json({
                success: true,
                message: 'OTP resent to your email',
                otp: otp // Only in development
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP resent to your email'
        });
    } catch (err) {
        logger.error(`Resend signup OTP error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error resending OTP'
        });
    }
};

// @desc    Login with Password (Email or Phone)
// @route   POST /api/auth/login/password
// @access  Public
exports.loginWithPassword = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if ((!email && !phone) || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/Phone and password are required'
            });
        }

        // Find user by email or phone
        const query = {};
        if (email) {
            query.email = email.toLowerCase();
        } else if (phone) {
            query.phone = phone;
        }

        const user = await User.findOne(query).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        logger.info(`User logged in: ${user.email || user.phone}`);

        sendTokenResponse(user, 200, res);
    } catch (err) {
        logger.error(`Login with password error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
};

// Helper to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    const refreshToken = user.getRefreshToken();

    // Save refresh token to DB
    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true
    };

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
};
