const express = require('express');
const { prisma } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET: Check if user has vaccine savings record
router.get('/check-status', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const savings = await prisma.vaccine_Savings.findUnique({
      where: { user_id: userId },
    });

    res.json({
      success: true,
      hasVaccineSavings: !!savings,
      status: savings?.profile_status || null,
    });
  } catch (error) {
    console.error('Error checking vaccine savings status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
