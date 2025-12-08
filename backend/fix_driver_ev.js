require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Driver = require('./src/models/Driver');

const fixDriver = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const phone = '8897176145';
        const user = await User.findOne({ phone });

        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        console.log(`Found user: ${user.name} (${user._id})`);

        const result = await Driver.updateOne(
            { userId: user._id },
            { $set: { vehicleCategory: 'electric' } }
        );

        console.log('Update result:', result);
        console.log('Fixed driver vehicle category to electric');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixDriver();
