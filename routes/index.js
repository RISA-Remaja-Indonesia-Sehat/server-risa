const express = require('express');
const router = express.Router();
const usersRouter = require('./users.router');

router.use('/api/users', usersRouter);

module.exports = router;