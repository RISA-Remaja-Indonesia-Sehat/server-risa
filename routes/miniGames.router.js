const express = require('express');
const router = express.Router();
const miniGamesController = require('../controllers/miniGames.controller');

router.get('/', miniGamesController.getAllMiniGames);
router.get('/:gameId', miniGamesController.getMiniGameById);
router.post('/', miniGamesController.createMiniGame);
router.put('/:gameId', miniGamesController.updateMiniGame);
router.delete('/:gameId', miniGamesController.deleteMiniGame);

module.exports = router;