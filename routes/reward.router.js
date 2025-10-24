const express = require('express');
const router = express.Router();
const { getAllRewards, createExchangeHistory, getUserExchangeHistory } = require('../controllers/reward.controller');
const { auth } = require('../middleware/auth');

router.get('/', getAllRewards);                    
router.post('/history', auth, createExchangeHistory);
router.get('/history', auth, getUserExchangeHistory);

module.exports = router;