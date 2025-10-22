const express = require('express');
const router = express.Router();
const { getAllArticle, getArticleById, createArticle, updateArticle, deleteArticle } = require('../controllers/articles.controllerr');

router.get('/', getAllArticle)
router.get('/:id', getArticleById)
router.post('/', createArticle)
router.put('/:id', updateArticle)
router.delete('/:id', deleteArticle)

module.exports = router;