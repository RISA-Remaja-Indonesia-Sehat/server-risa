const express = require('express');
const router = express.Router();
const scoresController = require('../controllers/scores.controller');

router.get('/', scoresController.getLeaderboard);
router.get('/:userId', scoresController.getMyScores);
router.post('/', scoresController.submitScore);
router.delete('/:scoreId', scoresController.deleteScore);

module.exports = router;
