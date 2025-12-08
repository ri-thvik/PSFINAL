const Driver = require('../models/Driver');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Register as driver (complete registration)
// @route   POST /api/drivers/onboard
// @access  Public
exports.onboardDriver = async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            password,
            vehicleType,
            vehicleNumber,
            vehicleModel,
            vehicleColor,
            documents
        } = req.body;

        // Validate required fields
        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, and password are required'
            });
        }

        if (!vehicleType || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle type and vehicle number are required'
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
                { phone },
                ...(email ? [{ email: email.toLowerCase() }] : [])
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone or email already exists'
            });
        }

        // Check if vehicle number already exists
        const existingDriver = await Driver.findOne({ vehicleNumber: vehicleNumber.toUpperCase().replace(/\s/g, '') });
        if (existingDriver) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle number already registered'
            });
        }

        // Create user account
        const userData = {
            name,
            phone,
            password,
            role: 'driver',
            isVerified: true // Auto-verify for driver registration
        };

        if (email) {
            userData.email = email.toLowerCase();
        }

        const user = await User.create(userData);

        // Create driver profile
        const driver = await Driver.create({
            userId: user._id,
            vehicleType,
            vehicleNumber: vehicleNumber.toUpperCase().replace(/\s/g, ''),
            vehicleModel: vehicleModel || '',
            vehicleColor: vehicleColor || '',
            documents: documents || {},
            location: {
                type: 'Point',
                coordinates: [77.5946, 12.9716], // Default: Bangalore
                lastUpdate: Date.now()
            },
            verificationStatus: 'pending'
        });

        // Populate userId before sending response
        await driver.populate('userId');

        // Generate JWT token
        const token = user.getSignedJwtToken();
        const refreshToken = user.getRefreshToken();

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        const options = {
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        };

        logger.info(`Driver registered: ${user.phone}`);

        res
            .status(201)
            .cookie('token', token, options)
            .json({
                success: true,
                token,
                refreshToken,
                data: {
                    driver,
                    user: {
                        id: user._id,
                        name: user.name,
                        phone: user.phone,
                        email: user.email,
                        role: user.role
                    }
                }
            });
    } catch (err) {
        logger.error(`Onboard driver error: ${err.message}`);

        // Handle duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0];
            if (field === 'vehicleNumber') {
                return res.status(400).json({ success: false, message: 'Vehicle number already registered' });
            } else if (field === 'phone' || field === 'email') {
                return res.status(400).json({ success: false, message: 'User already exists' });
            }
            return res.status(400).json({ success: false, message: 'Duplicate entry error' });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: messages });
        }

        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Register as driver (legacy - requires existing user)
// @route   POST /api/drivers/onboard-existing
// @access  Private
exports.onboardExistingUser = async (req, res) => {
    try {
        const {
            vehicleType,
            vehicleNumber,
            vehicleModel,
            vehicleColor,
            documents
        } = req.body;

        // Validate required fields
        if (!vehicleType || !vehicleNumber) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle type and vehicle number are required'
            });
        }

        // Check if vehicle number already exists
        const existingDriver = await Driver.findOne({ vehicleNumber });
        if (existingDriver) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle number already registered'
            });
        }

        let driver = await Driver.findOne({ userId: req.user.id });
        if (driver) {
            return res.status(400).json({ success: false, message: 'User is already a driver' });
        }

        driver = await Driver.create({
            userId: req.user.id,
            vehicleType,
            vehicleNumber: vehicleNumber.toUpperCase().replace(/\s/g, ''), // Normalize vehicle number
            vehicleModel,
            vehicleColor,
            documents: documents || {},
            // Initialize location with default coordinates (Bangalore)
            location: {
                type: 'Point',
                coordinates: [77.5946, 12.9716], // [lng, lat]
                lastUpdate: Date.now()
            }
        });

        // Update user role
        await User.findByIdAndUpdate(req.user.id, { role: 'driver' });

        // Populate userId before sending response
        await driver.populate('userId');

        res.status(201).json({ success: true, data: driver });
    } catch (err) {
        logger.error(err.message);

        // Handle duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0];
            if (field === 'vehicleNumber') {
                return res.status(400).json({ success: false, message: 'Vehicle number already registered' });
            } else if (field === 'userId') {
                return res.status(400).json({ success: false, message: 'User is already registered as driver' });
            }
            return res.status(400).json({ success: false, message: 'Duplicate entry error' });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: messages });
        }

        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        const { documentType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        // In production, upload to S3/Cloudinary and get URL
        // For now, use local file path
        const fileUrl = `/uploads/${file.filename}`;

        // Update document
        if (driver.documents[documentType]) {
            driver.documents[documentType].url = fileUrl;
            driver.documents[documentType].uploadedAt = new Date();
            driver.documents[documentType].verified = false; // Reset verification on new upload
        }

        // Update verification status
        if (!driver.verificationStatus || driver.verificationStatus === 'pending') {
            driver.verificationStatus = 'under_review';
        }
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentType,
                url: fileUrl,
                status: driver.verificationStatus
            }
        });
    } catch (err) {
        logger.error(`Upload documents error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error uploading document'
        });
    }
};

// @desc    Get driver verification status
// @route   GET /api/drivers/verification
// @access  Private
exports.getVerificationStatus = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                verificationStatus: driver.verificationStatus || 'pending',
                documents: driver.documents,
                verificationNotes: driver.verificationNotes
            }
        });
    } catch (err) {
        logger.error(`Get verification status error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching verification status'
        });
    }
};

// @desc    Get current driver profile
// @route   GET /api/drivers/me
// @access  Private
exports.getDriverProfile = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id }).populate('userId');
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }
        res.status(200).json({ success: true, data: driver });
    } catch (err) {
        logger.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        const { documentType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        // In production, upload to S3/Cloudinary and get URL
        // For now, use local file path
        const fileUrl = `/uploads/${file.filename}`;

        // Update document
        if (driver.documents[documentType]) {
            driver.documents[documentType].url = fileUrl;
            driver.documents[documentType].uploadedAt = new Date();
            driver.documents[documentType].verified = false; // Reset verification on new upload
        }

        // Update verification status
        if (!driver.verificationStatus || driver.verificationStatus === 'pending') {
            driver.verificationStatus = 'under_review';
        }
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentType,
                url: fileUrl,
                status: driver.verificationStatus
            }
        });
    } catch (err) {
        logger.error(`Upload documents error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error uploading document'
        });
    }
};

// @desc    Get driver verification status
// @route   GET /api/drivers/verification
// @access  Private
exports.getVerificationStatus = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                verificationStatus: driver.verificationStatus || 'pending',
                documents: driver.documents,
                verificationNotes: driver.verificationNotes
            }
        });
    } catch (err) {
        logger.error(`Get verification status error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching verification status'
        });
    }
};

// @desc    Update driver status (online/offline)
// @route   PUT /api/drivers/status
// @access  Private
exports.updateStatus = async (req, res) => {
    try {
        const { status, lat, lng } = req.body;

        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        driver.status = status;
        if (lat && lng) {
            driver.location = {
                type: 'Point',
                coordinates: [lng, lat],
                lastUpdate: Date.now()
            };
        }
        await driver.save();

        res.status(200).json({ success: true, data: driver });
    } catch (err) {
        logger.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        const { documentType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        // In production, upload to S3/Cloudinary and get URL
        // For now, use local file path
        const fileUrl = `/uploads/${file.filename}`;

        // Update document
        if (driver.documents[documentType]) {
            driver.documents[documentType].url = fileUrl;
            driver.documents[documentType].uploadedAt = new Date();
            driver.documents[documentType].verified = false; // Reset verification on new upload
        }

        // Update verification status
        if (!driver.verificationStatus || driver.verificationStatus === 'pending') {
            driver.verificationStatus = 'under_review';
        }
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentType,
                url: fileUrl,
                status: driver.verificationStatus
            }
        });
    } catch (err) {
        logger.error(`Upload documents error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error uploading document'
        });
    }
};

// @desc    Get driver verification status
// @route   GET /api/drivers/verification
// @access  Private
exports.getVerificationStatus = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                verificationStatus: driver.verificationStatus || 'pending',
                documents: driver.documents,
                verificationNotes: driver.verificationNotes
            }
        });
    } catch (err) {
        logger.error(`Get verification status error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching verification status'
        });
    }
};

// @desc    Get driver earnings
// @route   GET /api/drivers/earnings
// @access  Private
exports.getEarnings = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        const period = req.query.period || 'today'; // today, week, month, all
        const Trip = require('../models/Trip');

        let startDate;
        const now = new Date();

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = null;
        }

        const query = {
            driverId: driver._id,
            status: 'trip_completed'
        };

        if (startDate) {
            query.completedAt = { $gte: startDate };
        }

        const trips = await Trip.find(query).select('fare completedAt');

        const totalEarnings = trips.reduce((sum, trip) => sum + (trip.fare.amount || 0), 0);
        const totalTrips = trips.length;
        const avgEarningPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0;

        // Calculate daily breakdown for the period
        const dailyBreakdown = {};
        trips.forEach(trip => {
            if (trip.completedAt) {
                const date = new Date(trip.completedAt).toISOString().split('T')[0];
                if (!dailyBreakdown[date]) {
                    dailyBreakdown[date] = { earnings: 0, trips: 0 };
                }
                dailyBreakdown[date].earnings += trip.fare.amount || 0;
                dailyBreakdown[date].trips += 1;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                period,
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                totalTrips,
                avgEarningPerTrip: Math.round(avgEarningPerTrip * 100) / 100,
                dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
                    date,
                    earnings: Math.round(data.earnings * 100) / 100,
                    trips: data.trips
                })),
                lifetimeEarnings: driver.metrics.totalEarnings || 0,
                lifetimeTrips: driver.metrics.totalTrips || 0
            }
        });
    } catch (err) {
        logger.error(`Get earnings error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        const { documentType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        // In production, upload to S3/Cloudinary and get URL
        // For now, use local file path
        const fileUrl = `/uploads/${file.filename}`;

        // Update document
        if (driver.documents[documentType]) {
            driver.documents[documentType].url = fileUrl;
            driver.documents[documentType].uploadedAt = new Date();
            driver.documents[documentType].verified = false; // Reset verification on new upload
        }

        // Update verification status
        if (!driver.verificationStatus || driver.verificationStatus === 'pending') {
            driver.verificationStatus = 'under_review';
        }
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentType,
                url: fileUrl,
                status: driver.verificationStatus
            }
        });
    } catch (err) {
        logger.error(`Upload documents error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error uploading document'
        });
    }
};

// @desc    Get driver verification status
// @route   GET /api/drivers/verification
// @access  Private
exports.getVerificationStatus = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                verificationStatus: driver.verificationStatus || 'pending',
                documents: driver.documents,
                verificationNotes: driver.verificationNotes
            }
        });
    } catch (err) {
        logger.error(`Get verification status error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching verification status'
        });
    }
};

// @desc    Get driver trips
// @route   GET /api/drivers/trips
// @access  Private
exports.getDriverTrips = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;

        const Trip = require('../models/Trip');
        const query = { driverId: driver._id };

        if (status) {
            query.status = status;
        }

        const trips = await Trip.find(query)
            .populate('riderId', 'name phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Trip.countDocuments(query);

        res.status(200).json({
            success: true,
            data: trips,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error(`Get driver trips error: ${err.message}`);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        const { documentType } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        // In production, upload to S3/Cloudinary and get URL
        // For now, use local file path
        const fileUrl = `/uploads/${file.filename}`;

        // Update document
        if (driver.documents[documentType]) {
            driver.documents[documentType].url = fileUrl;
            driver.documents[documentType].uploadedAt = new Date();
            driver.documents[documentType].verified = false; // Reset verification on new upload
        }

        // Update verification status
        if (!driver.verificationStatus || driver.verificationStatus === 'pending') {
            driver.verificationStatus = 'under_review';
        }
        await driver.save();

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentType,
                url: fileUrl,
                status: driver.verificationStatus
            }
        });
    } catch (err) {
        logger.error(`Upload documents error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error uploading document'
        });
    }
};

// @desc    Get driver verification status
// @route   GET /api/drivers/verification
// @access  Private
exports.getVerificationStatus = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                verificationStatus: driver.verificationStatus || 'pending',
                documents: driver.documents,
                verificationNotes: driver.verificationNotes
            }
        });
    } catch (err) {
        logger.error(`Get verification status error: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching verification status'
        });
    }
};
