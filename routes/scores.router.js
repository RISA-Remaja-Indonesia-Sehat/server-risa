const express = require('express');
const router = express.Router();
const scoresController = require('../controllers/scores.controller');

router.get('/leaderboard', scoresController.getLeaderboard);
router.get('/', scoresController.getAllScores);
router.get('/:userId', scoresController.getMyScores);
router.post('/', scoresController.submitScore);
router.delete('/:scoreId', scoresController.deleteScore);
router.delete('/', scoresController.deleteAllScores);

module.exports = router;
