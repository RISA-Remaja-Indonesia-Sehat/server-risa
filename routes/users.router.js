const express = require('express');
const router = express.Router();
const { createUser, getUserById, login } = require('../controllers/users.controller');

router.post('/login', login);
router.post('/', createUser);

module.exports = router;