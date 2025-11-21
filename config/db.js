const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  testPrismaConnection
};
