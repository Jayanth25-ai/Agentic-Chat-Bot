const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chat-bot';
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not set. Falling back to local MongoDB at mongodb://127.0.0.1:27017/chat-bot');
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.error('   Please verify your MONGODB_URI, network access, and MongoDB service status.');
    process.exit(1);
  }
};

module.exports = connectDB;
