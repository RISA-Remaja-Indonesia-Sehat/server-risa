const express = require('express');
const { prisma } = require('../config/db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

// Upload directory (fallback)
const uploadDir = process.env.UPLOAD_DIR || path.join(os.tmpdir(), 'risa-documents');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  // Do not crash the process; log and continue. File uploads may fail if
  // directory cannot be created, but other endpoints remain available.
  console.warn('Could not create upload directory:', uploadDir, err.message);
}

// Supabase client setup (optional)
// Expected env vars:
// - SUPABASE_URL (eg. https://xyz.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (service role key) or SUPABASE_ANON_KEY for less-privileged
// - SUPABASE_BUCKET (optional, default: 'risa-documents')
const SUPABASE_URL = process.env.SUPABASE_API_URL || (process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http') ? process.env.SUPABASE_URL : null);
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || null;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'risa-documents';
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase storage client initialized.');
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
    supabase = null;
  }
} else {
  console.warn('Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing). Using local temp dir fallback.');
}

// Choose storage: use memoryStorage when Supabase is available so we can upload
// directly from memory to Supabase without writing to disk. Otherwise use disk
// storage to the temp dir as a fallback.
let upload;
if (supabase) {
  const storage = multer.memoryStorage();
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB
} else {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
      cb(null, safeName);
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB
}

const router = express.Router();

// POST: Save vaccine intake data
router.post('/intake', auth, async (req, res) => {
  try {
    const { full_name, age, gender, previous_doses, parent_email, parent_phone, parental_consent } = req.body;
    const userId = req.user.userId;

    if (parseInt(age) < 9) {
      return res.status(400).json({ success: false, error: 'Age must be at least 9 years old' });
    }

    const savings = await prisma.vaccine_Savings.upsert({
      where: { user_id: userId },
      update: {
        full_name,
        age: parseInt(age),
        gender,
        previous_doses: parseInt(previous_doses),
        parent_email,
        parent_phone,
        parental_consent,
      },
      create: {
        user_id: userId,
        full_name,
        age: parseInt(age),
        gender,
        previous_doses: parseInt(previous_doses),
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
router.post('/consent', auth, upload.single('recommendation'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const existing = await prisma.vaccine_Savings.findUnique({ where: { user_id: userId } });

    let recommendationUrl = existing?.doctor_recommendation_url ?? null;
    if (req.file) {
      // If Supabase is configured we uploaded to it directly (memoryStorage),
      // and set recommendationUrl to the public URL. If Supabase isn't
      // configured, the file was stored in the temp dir and we can't provide
      // a stable public URL from a serverless environment.
      if (supabase && req.file.buffer) {
        try {
          const filename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_')}`;
          const uploadPath = filename;
          const { data: uploadData, error: uploadErr } = await supabase.storage.from(SUPABASE_BUCKET).upload(uploadPath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
          });
          if (uploadErr) {
            console.error('Supabase upload error:', uploadErr.message || uploadErr);
            // Keep recommendationUrl as null and continue; we don't want to crash
          } else {
            const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(uploadPath);
            recommendationUrl = urlData?.publicUrl ?? null;
          }
        } catch (err) {
          console.error('Error uploading to Supabase:', err.message || err);
        }
      } else {
        // Disk storage fallback (file saved to uploadDir). Log path and leave URL null.
        console.warn('Uploaded file saved to local tmp path (not publicly available):', req.file.path || req.file.filename);
        recommendationUrl = null;
      }
    }

    const savings = await prisma.vaccine_Savings.upsert({
      where: { user_id: userId },
      update: {
        consent_acknowledged: true,
        doctor_recommendation_url: recommendationUrl,
      },
      create: {
        user_id: userId,
        full_name: existing?.full_name ?? 'Null',
        age: existing?.age ?? 0,
        gender: existing?.gender ?? '',
        parent_email: existing?.parent_email ?? '',
        parent_phone: existing?.parent_phone ?? '',
        consent_acknowledged: true,
        doctor_recommendation_url: recommendationUrl,
      },
    });

    res.json({ success: true, recommendationUrl });
  } catch (error) {
    console.error('Error updating consent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Bank setup completion
router.post('/bank-setup', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const existing = await prisma.vaccine_Savings.findUnique({ where: { user_id: userId } });

    await prisma.vaccine_Savings.upsert({
      where: { user_id: userId },
      update: {
        bank_account_status: 'ready',
        profile_status: 'approved',
      },
      create: {
        user_id: userId,
        full_name: existing?.full_name ?? 'Null',
        age: existing?.age ?? 0,
        gender: existing?.gender ?? '',
        parent_email: existing?.parent_email ?? '',
        parent_phone: existing?.parent_phone ?? '',
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

    const existing = await prisma.vaccine_Savings.findUnique({ where: { user_id: userId } });

    const savings = await prisma.vaccine_Savings.upsert({
      where: { user_id: userId },
      update: {
        vaccine_type,
        vaccine_price,
        daily_savings_target,
        estimated_days,
      },
      create: {
        user_id: userId,
        full_name: existing?.full_name ?? 'Null',
        age: existing?.age ?? 0,
        gender: existing?.gender ?? '',
        parent_email: existing?.parent_email ?? '',
        parent_phone: existing?.parent_phone ?? '',
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
        vaccinePrice: savings.vaccine_price,
        dailySavingsTarget: savings.daily_savings_target,
        progress: (savings.total_saved / savings.vaccine_price) * 100,
        deposits: savings.deposits,
        fullName: savings.full_name,
        age: savings.age,
        gender: savings.gender,
        parentPhone: savings.parent_phone,
        vaccineType: savings.vaccine_type,
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
      full_name: savings.full_name,
      age: savings.age,
      gender: savings.gender,
      vaccine_type: savings.vaccine_type,
      parent_phone: savings.parent_phone, 
      dose1: dose1,
      dose2: dose2,
    });
  } catch (error) {
    console.error('Error scheduling vaccination:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Check if user has vaccine savings
router.get('/check-status', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const savings = await prisma.vaccine_Savings.findUnique({
      where: { user_id: userId },
    });

    // Determine completeness of the savings flow.
    // Steps: 1) Intake (exists) 2) Consent acknowledged 3) Bank setup/profile approved 4) Target configured
    let isComplete = false;
    let nextStep = 1;

    if (!savings) {
      isComplete = false;
      nextStep = 1;
    } else {
      const consentOk = !!savings.consent_acknowledged;
      const bankOk = savings.bank_account_status === 'ready' || savings.profile_status === 'approved';
      const targetOk = !!savings.vaccine_price && !!savings.daily_savings_target && savings.vaccine_price > 0 && savings.daily_savings_target > 0;

      if (!consentOk) {
        nextStep = 2;
      } else if (!bankOk) {
        nextStep = 3;
      } else if (!targetOk) {
        nextStep = 4;
      } else {
        nextStep = 4;
      }

      isComplete = consentOk && bankOk && targetOk;
    }

    res.json({
      success: true,
      hasVaccineSavings: !!savings,
      isComplete,
      nextStep,
      status: savings?.profile_status || null,
    });
  } catch (error) {
    console.error('Error checking vaccine savings status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
