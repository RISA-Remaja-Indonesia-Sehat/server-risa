const express = require('express');
const router = express.Router();
const usersRouter = require('./users.router');
const arrticleRouter = require('./articles.route');

router.use('/api/users', usersRouter);
router.use('/api/article', arrticleRouter);

module.exports = router;