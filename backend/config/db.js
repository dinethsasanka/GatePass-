const mongoose = require('mongoose');
const connectDB = async () => {
  const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in backend/.env');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    if (isDevelopment) {
      console.warn('Running without MongoDB in development mode. Database-backed routes may fail until MongoDB is reachable.');
      return false;
    }

    process.exit(1);
  }
};
module.exports = connectDB;