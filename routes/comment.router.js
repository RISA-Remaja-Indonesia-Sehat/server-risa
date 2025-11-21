const express = require('express');
const router = express.Router();
const { createComment, getAllComment } = require('../controllers/comment.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, createComment);
router.get('/', getAllComment);

module.exports = router;