const express = require('express');
const router = express.Router();

const GameFeedbackController = require('../controllers/gameFeedback.controller');

router.get('/', GameFeedbackController.getAllGameFeedback);
router.post('/', GameFeedbackController.submitGameFeedback);
router.delete('/:id', GameFeedbackController.deleteGameFeedback);
router.delete('/', GameFeedbackController.deleteAllGameFeedback);

module.exports = router;