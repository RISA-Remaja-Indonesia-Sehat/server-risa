const express = require('express');
const router = express.Router();
const usersRouter = require('./users.router');
const arrticleRouter = require('./articles.router');
const commentRouter = require('./comment.router');
const labsRouter = require('./labs.router');
const vaccineRouter = require('./vaccine.router');
const bookingRouter = require('./booking.router');
const rewardRouter = require('./reward.router');
const sikluskuRouter = require('./siklusku.routes');
const missionRouter = require('./missions.router');
const miniGamesRouter = require('./miniGames.router');
const scoresRouter = require('./scores.router');
const memoCardRouter = require('./memoCard.router');


// Handle article ID parameter
router.param('id', (req, res, next, id) => {
  req.articleId = id;
  next();
});

router.use('/api/mini-games', miniGamesRouter);
router.use('/api/users', usersRouter);
router.use('/api/article/:id/comment', commentRouter);
router.use('/api/article', arrticleRouter);
router.use('/api/labs', labsRouter);
router.use('/api/vaccine', vaccineRouter);
router.use('/api/booking', bookingRouter);
router.use('/api/reward', rewardRouter);
router.use('/api/siklusku', sikluskuRouter);
router.use('/api/missions', missionRouter);
router.use('/api/scores', scoresRouter);
router.use('/api/memo-cards', memoCardRouter);


module.exports = router;