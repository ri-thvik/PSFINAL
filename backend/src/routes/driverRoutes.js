const express = require('express');
const {
    onboardDriver,
    onboardExistingUser,
    getDriverProfile,
    updateStatus,
    getEarnings,
    getDriverTrips,
    uploadDocuments,
    getVerificationStatus
} = require('../controllers/driverController');
const { protect } = require('../middleware/auth');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

const router = express.Router();

router.post('/onboard', onboardDriver); // Public route for complete driver registration
router.post('/onboard-existing', protect, onboardExistingUser); // For existing users to become drivers
router.get('/me', protect, getDriverProfile);
router.put('/status', protect, updateStatus);
router.get('/earnings', protect, getEarnings);
router.get('/trips', protect, getDriverTrips);
router.post('/documents', protect, uploadSingle('file'), handleUploadError, uploadDocuments);
router.get('/verification', protect, getVerificationStatus);

module.exports = router;
