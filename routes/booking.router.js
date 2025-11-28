const express = require('express');
const router = express.Router();
const { getBookingDetails, createBooking } = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth');
const fs = require("fs");
const os = require("os");
const path = require("path");
const multer = require('multer');

const uploadDir = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "risa-documents");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create upload directory:", uploadDir, err.message);
}
// Konfigurasi multer: Gunakan memoryStorage untuk Supabase, atau diskStorage sebagai fallback
// (Ini akan diputuskan di controller berdasarkan availability Supabase)
const storage = multer.memoryStorage(); // Default ke memory untuk upload ke Supabase
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Opsional: Filter tipe file (e.g., hanya gambar/PDF)
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  },
});

router.get('/:id', getBookingDetails);
// Accept multipart/form-data with optional file field 'recommendation'
router.post('/', auth, upload.single('recommendation'), createBooking);

module.exports = router;