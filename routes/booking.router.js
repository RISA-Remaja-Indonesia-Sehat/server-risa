const express = require('express');
const router = express.Router();
const { getBookingDetails, createBooking } = require('../controllers/booking.controller');

router.get('/:id', getBookingDetails);
router.post('/', createBooking);

module.exports = router;