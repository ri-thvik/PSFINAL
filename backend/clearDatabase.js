// Database Cleanup Script
// Run this to remove all test data and start fresh
// Usage: node clearDatabase.js

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Driver = require('./src/models/Driver');
const Trip = require('./src/models/Trip');
require('dotenv').config();

async function clearDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Count documents before deletion
        const userCount = await User.countDocuments();
        const driverCount = await Driver.countDocuments();
        const tripCount = await Trip.countDocuments();

        console.log('📊 Current Database Stats:');
        console.log(`   Users: ${userCount}`);
        console.log(`   Drivers: ${driverCount}`);
        console.log(`   Trips: ${tripCount}\n`);

        if (userCount === 0 && driverCount === 0 && tripCount === 0) {
            console.log('✨ Database is already clean!');
            process.exit(0);
        }

        console.log('🗑️  Clearing database...');

        // Delete all documents
        await User.deleteMany({});
        await Driver.deleteMany({});
        await Trip.deleteMany({});

        console.log('✅ Deleted all users');
        console.log('✅ Deleted all drivers');
        console.log('✅ Deleted all trips\n');

        console.log('✨ Database cleared successfully!');
        console.log('🎉 System is now fresh and ready for new registrations\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
