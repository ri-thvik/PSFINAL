const otpGenerator = require('otp-generator');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// In-memory fallback for development or when Redis is down
const memoryStore = new Map();

// Generate OTP
const generateOTP = () => {
    return otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });
};

// Store OTP in Redis with TTL (5 minutes)
const storeOTP = async (phone, otp) => {
    try {
        const key = `otp:${phone}`;
        const ttl = 300; // 5 minutes

        let storedInRedis = false;

        if (redis) {
            try {
                await redis.setex(key, ttl, otp);
                logger.info(`OTP stored in Redis for ${phone}`);
                storedInRedis = true;
            } catch (redisErr) {
                logger.warn('Redis error, falling back to memory:', redisErr.message);
            }
        }

        if (!storedInRedis) {
            // Memory fallback
            memoryStore.set(key, {
                otp,
                expires: Date.now() + (ttl * 1000)
            });
            logger.info(`OTP stored in memory for ${phone}`);

            // Clean up memory store
            setTimeout(() => memoryStore.delete(key), ttl * 1000);
        }

        return true;
    } catch (error) {
        logger.error(`Error storing OTP: ${error.message}`);
        return false;
    }
};

// Verify OTP
const verifyOTP = async (phone, otp) => {
    try {
        const key = `otp:${phone}`;
        let storedOTP = null;

        // Try Redis first
        if (redis) {
            try {
                storedOTP = await redis.get(key);
            } catch (redisErr) {
                logger.warn('Redis read error:', redisErr.message);
            }
        }

        // Try memory if not in Redis
        if (!storedOTP) {
            const memoryData = memoryStore.get(key);
            if (memoryData && memoryData.expires > Date.now()) {
                storedOTP = memoryData.otp;
            }
        }

        if (storedOTP && storedOTP === otp) {
            // Delete OTP after successful verification
            if (redis) {
                try { await redis.del(key); } catch (e) { }
            }
            memoryStore.delete(key);

            logger.info(`OTP verified for ${phone}`);
            return true;
        }

        return false;
    } catch (error) {
        logger.error(`Error verifying OTP: ${error.message}`);
        return false;
    }
};

// Send OTP via Email (using nodemailer)
const sendOTPEmail = async (email, otp) => {
    try {
        const emailService = require('./emailService');
        await emailService.sendOTPEmail(email, otp);
        return true;
    } catch (error) {
        logger.error(`Error sending OTP email: ${error.message}`);
        // Consider this non-fatal if OTP is returned in API for dev
        return false;
    }
};

// Send OTP (placeholder for SMS service)
const sendOTPSMS = async (phone, otp) => {
    try {
        // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        logger.info(`OTP for ${phone}: ${otp}`);
        // In production, integrate with actual SMS service
        return true;
    } catch (error) {
        logger.error(`Error sending OTP SMS: ${error.message}`);
        return false;
    }
};

module.exports = {
    generateOTP,
    storeOTP,
    verifyOTP,
    sendOTPEmail,
    sendOTPSMS
};

