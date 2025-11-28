const express = require('express');
const router = express.Router();
const { getBookingDetails, createBooking } = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth');
const multer = require('multer');

// Konfigurasi multer (tetap memoryStorage untuk Supabase)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
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