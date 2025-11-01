const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;

if(!MONGODB_URI) {
  throw new Error ("MONGODB_URI is not defined in environment variables");
}

let cached = global.mongoose;
if(!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectMongoDB = async () => {
  if (cached.conn) {
    console.log("Using existing MongoDB connection");
    return cached.conn;
  }

  if(!cached.promise) {
    console.log("New MongoDB connection ...");
    cached.promised = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    })
    .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promised;
  console.log("mongodb connected");
  return cached.conn;
}

// Prisma client for Supabase (PostgreSQL)
const prisma = new PrismaClient();

// MongoDB connection
// const connectMongoDB = async () => {
//   // Cek jika sudah terkoneksi (readyState === 1 berarti connected)
//   if (mongoose.connection.readyState === 1) {
//     console.log('MongoDB already connected, skipping reconnect');
//     return;  // Return early untuk cache-awareness
//   }

//   try {
//     await mongoose.connect(MONGODB_URI, {
//        maxPoolSize: 10, // Pool koneksi untuk menghindari buffering
//       serverSelectionTimeoutMS: 5000, // Timeout cepat untuk server selection
//       socketTimeoutMS: 45000, // Timeout socket lebih lama
//       bufferCommands: false, // Jangan buffer jika koneksi belum siap
//     });
//     // cachedConnection = conn;
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error);
//      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
//   }
// };

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
