require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { testPrismaConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://risa-v2.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploaded documents (doctor recommendations, tickets, etc.)
app.use('/documents', express.static(path.join(__dirname, 'public', 'documents')));

// Initialize database connections
const initializeDatabases = async () => {
  try {
    await testPrismaConnection();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

const Allrouter = require('./routes/index');
app.use(Allrouter);

app.listen(PORT, async () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
  await initializeDatabases();
});