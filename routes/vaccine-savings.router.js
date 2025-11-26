const express = require('express');
const { prisma } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST: Save vaccine intake data
router.post('/intake', auth, async (req, res) => {
  try {
    const { full_name, age, gender, previous_doses, parent_email, parent_phone, parental_consent } = req.body;
    const userId = req.user.userId;

    if (age < 9) {
      return res.status(400).json({ success: false, error: 'Age must be at least 9 years old' });
    }

    const savings = await prisma.vaccine_Savings.upsert({
      where: { user_id: userId },
      update: {
        full_name,
        age,
        gender,
        previous_doses,
        parent_email,
        parent_phone,
        parental_consent,
      },
      create: {
        user_id: userId,
        full_name,
        age,
        gender,
        previous_doses,
        parent_email,
        parent_phone,
        parental_consent,
      },
    });

    res.json({ success: true, savingsId: savings.id });
  } catch (error) {
    console.error('Error saving intake:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Update consent
router.post('/consent', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const savings = await prisma.vaccine_Savings.update({
      where: { user_id: userId },
      data: { consent_acknowledged: true },
    });

    res.json({ success: true, recommendationUrl: '/documents/doctor-recommendation.png' });
  } catch (error) {
    console.error('Error updating consent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Bank setup completion
router.post('/bank-setup', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.vaccine_Savings.update({
      where: { user_id: userId },
      data: {
        bank_account_status: 'ready',
        profile_status: 'approved',
      },
    });

    res.json({ success: true, message: 'Bank setup completed' });
  } catch (error) {
    console.error('Error updating bank setup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Setup savings target
router.post('/setup-target', auth, async (req, res) => {
  try {
    const { vaccine_type, vaccine_price, daily_savings_target } = req.body;
    const userId = req.user.userId;

    if (daily_savings_target < 10000) {
      return res.status(400).json({ success: false, error: 'Daily savings must be at least 10000' });
    }

    const estimated_days = Math.ceil(vaccine_price / daily_savings_target);

    if (estimated_days > 365) {
      return res.status(400).json({ success: false, error: 'Savings duration cannot exceed 365 days' });
    }

    const savings = await prisma.vaccine_Savings.update({
      where: { user_id: userId },
      data: {
        vaccine_type,
        vaccine_price,
        daily_savings_target,
        estimated_days,
      },
    });

    res.json({ success: true, estimatedDays: estimated_days });
  } catch (error) {
    console.error('Error setting up target:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Add deposit
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    const savings = await prisma.vaccine_Savings.findUnique({
      where: { user_id: userId },
    });

    if (!savings) {
      return res.status(404).json({ success: false, error: 'Savings record not found' });
    }

    await prisma.vaccine_Deposit.create({
      data: {
        vaccine_savings_id: savings.id,
        amount,
      },
    });

    const updatedSavings = await prisma.vaccine_Savings.update({
      where: { user_id: userId },
      data: {
        total_saved: savings.total_saved + amount,
        last_deposit_date: new Date(),
      },
    });

    res.json({
      success: true,
      totalSaved: updatedSavings.total_saved,
      progress: (updatedSavings.total_saved / updatedSavings.vaccine_price) * 100,
    });
  } catch (error) {
    console.error('Error adding deposit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const savings = await prisma.vaccine_Savings.findUnique({
      where: { user_id: userId },
      include: { deposits: true },
    });

    if (!savings) {
      return res.status(404).json({ success: false, error: 'Savings record not found' });
    }

    res.json({
      success: true,
      data: {
        totalSaved: savings.total_saved,
        target: savings.vaccine_price,
        progress: (savings.total_saved / savings.vaccine_price) * 100,
        deposits: savings.deposits,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Schedule vaccination
router.post('/schedule', auth, async (req, res) => {
  try {
    const { dose1_date } = req.body;
    const userId = req.user.userId;

    const dose1 = new Date(dose1_date);
    const dose2 = new Date(dose1);
    dose2.setMonth(dose2.getMonth() + 2);

    // Shift to previous day if weekend
    while (dose2.getDay() === 0 || dose2.getDay() === 6) {
      dose2.setDate(dose2.getDate() - 1);
    }

    const savings = await prisma.vaccine_Savings.update({
      where: { user_id: userId },
      data: {
        vaccine_status: 'scheduled',
        dose1_date: dose1,
        dose2_date: dose2,
      },
    });

    res.json({
      success: true,
      ticketUrl: '/documents/vaccination-ticket.pdf',
      dose1: dose1,
      dose2: dose2,
    });
  } catch (error) {
    console.error('Error scheduling vaccination:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
