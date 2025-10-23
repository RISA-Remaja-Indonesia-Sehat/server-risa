const express = require('express');
const router = express.Router();
const { getBookingDetails, createBooking } = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth');

router.get('/:id', getBookingDetails);
router.post('/', auth, createBooking);

module.exports = router;