const express = require('express');
const { getFTUEProgress, markDialogComplete, isDialogCompleted } = require('../controllers/ftue.controller.js');
const { auth } = require('../middleware/auth.js');

const router = express.Router();

router.get('/progress', auth, getFTUEProgress);
router.post('/mark-complete', auth, markDialogComplete);
router.get('/is-completed', auth, isDialogCompleted);

module.exports = router;
