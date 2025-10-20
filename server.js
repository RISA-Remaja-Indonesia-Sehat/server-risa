require('dotenv').config();

const express = require('express');
const { prisma, connectMongoDB, testPrismaConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT;

const cors = require('cors');
app.use(cors());
app.use(express.json());

// Initialize database connections
const initializeDatabases = async () => {
  await connectMongoDB();
  await testPrismaConnection();
};

const Allrouter = require('./routes/index');
app.use(Allrouter);

app.listen(PORT, async () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
  await initializeDatabases();
});