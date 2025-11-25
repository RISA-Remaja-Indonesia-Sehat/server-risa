const express = require('express');
const router = express.Router();
const { generateCrossword, submitCrossword } = require('../controllers/crossword.controller');

router.get('/generate', generateCrossword);
router.post('/submit', submitCrossword);

module.exports = router;
