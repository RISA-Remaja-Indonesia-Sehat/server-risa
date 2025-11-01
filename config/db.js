const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');

// Prisma client for Supabase (PostgreSQL)
const prisma = new PrismaClient();

// MongoDB connection
const connectMongoDB = async () => {
  // Cek jika sudah terkoneksi (readyState === 1 berarti connected)
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected, skipping reconnect');
    return;  // Return early untuk cache-awareness
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
       maxPoolSize: 10, // Pool koneksi untuk menghindari buffering
      serverSelectionTimeoutMS: 5000, // Timeout cepat untuk server selection
      socketTimeoutMS: 45000, // Timeout socket lebih lama
      bufferCommands: false, // Jangan buffer jika koneksi belum siap
    });
    // cachedConnection = conn;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
     throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
};

// Prisma connection test
const testPrismaConnection = async () => {
  try {
    await prisma.$connect();
    console.log('Supabase (Prisma) connected successfully');
  } catch (error) {
    console.error('Supabase connection error:', error);
    process.exit(1);
  }
};

module.exports = {
  prisma,
  connectMongoDB,
  testPrismaConnection,
  mongoose
};
