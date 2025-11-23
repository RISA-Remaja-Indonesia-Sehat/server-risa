const express = require('express');
const router = express.Router();
const { 
  getUserProgress, 
  getChapterProgress, 
  saveProgress, 
} = require('../controllers/pubertyQuest.controller');
const { auth } = require('../middleware/auth');

// Get all user progress
router.get('/progress', auth, getUserProgress);

// Get specific chapter progress
router.get('/progress/:chapter', auth, getChapterProgress);

// Save progress
router.post('/progress', auth, saveProgress);

module.exports = router;