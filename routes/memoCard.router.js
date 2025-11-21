const express = require('express');
const router = express.Router();

const memoCardController = require('../controllers/memoCard.controller');

router.get('/', memoCardController.getAllMemoCards);
router.get('/:id', memoCardController.getMemoCardById);
router.post('/', memoCardController.createMemoCard);
router.put('/:id', memoCardController.updateMemoCard);
router.delete('/:id', memoCardController.deleteMemoCard);

module.exports = router;