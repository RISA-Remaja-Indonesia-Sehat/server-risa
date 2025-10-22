const express = require('express');
const router = express.Router();
const usersRouter = require('./users.router');
const arrticleRouter = require('./articles.route');
const commentRouter = require('./comment.router');
const labsRouter = require('./labs.router');

// Handle article ID parameter
router.param('id', (req, res, next, id) => {
  req.articleId = id;
  next();
});

router.use('/api/users', usersRouter);
router.use('/api/article/:id/comment', commentRouter);
router.use('/api/article', arrticleRouter);
router.use('/api/labs', labsRouter);

module.exports = router;