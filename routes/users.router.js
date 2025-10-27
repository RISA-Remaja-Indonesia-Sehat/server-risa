const express = require('express');
const router = express.Router();
const { createUser, updateStickers, login, getUserById } = require('../controllers/users.controller');
const { auth } = require('../middleware/auth');

router.post('/login', login);
router.post('/', createUser);
router.put('/:id', auth, updateStickers);
router.get('/:id', auth, getUserById);

module.exports = router;