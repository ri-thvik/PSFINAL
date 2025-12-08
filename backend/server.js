require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const connectDB = require('./src/config/database');
const redis = require('./src/config/redis');
const logger = require('./src/utils/logger');
const authRoutes = require('./src/routes/authRoutes');

// Initialize App
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

// Socket.io Connection
require('./src/socket/socketHandler')(io);

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for OTP storage
app.use(session({
    secret: process.env.SESSION_SECRET || 'rapidride_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 10 * 60 * 1000 // 10 minutes
    }
}));

// Apply general rate limiting
const { apiLimiter } = require('./src/middleware/rateLimiter');
app.use('/api/', apiLimiter);

// Database Connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', require('./src/routes/driverRoutes'));
app.use('/api/trips', require('./src/routes/tripRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/ratings', require('./src/routes/ratingRoutes'));
app.use('/api/promos', require('./src/routes/promoRoutes'));
app.use('/api/support', require('./src/routes/supportRoutes'));
app.use('/api/referrals', require('./src/routes/referralRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
