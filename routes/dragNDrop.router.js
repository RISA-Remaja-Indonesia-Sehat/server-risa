const express = require('express');
const router = express.Router();

const DragNDropController = require('../controllers/dragNDrop.controller');

router.get('/', DragNDropController.getAllDragNDropItems);
router.get('/:id', DragNDropController.getDragNDropItemById);
router.post('/', DragNDropController.createDragNDropItem);
router.put('/:id', DragNDropController.updateDragNDropItem);
router.delete('/:id', DragNDropController.deleteDragNDropItem);
router.delete('/', DragNDropController.deleteAllDragNDropItems);

module.exports = router;