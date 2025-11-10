const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Import functions directly
const dailyNotesController = require('../controllers/dailyNotes.controller');

// Routes
router.get('/', auth, dailyNotesController.getDailyNotes);
router.get('/:date', auth, dailyNotesController.getDailyNoteByDate);
router.post('/', auth, dailyNotesController.createOrUpdateDailyNote);
router.delete('/:date', auth, dailyNotesController.deleteDailyNote);

module.exports = router;