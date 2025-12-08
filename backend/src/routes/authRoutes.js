const express = require('express');
const {
    sendOTP,
    verifyOTP,
    register,
    login,
    getMe,
    updateProfile,
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress
} = require('../controllers/authController');
const {
    sendSignupOTP,
    verifySignupOTP,
    resendSignupOTP,
    loginWithPassword
} = require('../controllers/authControllerNew');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { phoneValidation, emailValidation, nameValidation, otpValidation, loginValidation, handleValidationErrors } = require('../middleware/validator');

const router = express.Router();

// Public routes - Legacy OTP-based auth
router.post('/send-otp', otpLimiter, [phoneValidation, emailValidation, handleValidationErrors], sendOTP);
router.post('/verify-otp', [phoneValidation, otpValidation, handleValidationErrors], verifyOTP);
router.post('/register', authLimiter, [phoneValidation, nameValidation, emailValidation, handleValidationErrors], register);
router.post('/login', authLimiter, loginValidation, login);

// New routes - Password-based auth with OTP signup verification
router.post('/signup/send-otp', otpLimiter, sendSignupOTP);
router.post('/signup/verify-complete', verifySignupOTP);  // No rate limiter for verification
router.post('/signup/resend-otp', otpLimiter, resendSignupOTP);
router.post('/login/password', authLimiter, loginWithPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, [nameValidation, emailValidation, handleValidationErrors], updateProfile);
router.post('/addresses', protect, addAddress);
router.get('/addresses', protect, getAddresses);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

module.exports = router;
