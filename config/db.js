const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');

// Prisma client for Supabase (PostgreSQL)
const prisma = new PrismaClient();

// MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
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
