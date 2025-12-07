const express = require('express');
const {
    getTodayStats,
    getDriverAnalytics,
    getPlatformAnalytics
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/today', protect, getTodayStats);
router.get('/driver', protect, getDriverAnalytics);
router.get('/platform', protect, getPlatformAnalytics);

module.exports = router;


