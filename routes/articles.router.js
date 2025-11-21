const express = require('express');
const router = express.Router();
const { getAllArticle, getArticleById, createArticle, updateArticle, deleteArticle, searchArticles } = require('../controllers/articles.controller');

router.get('/', getAllArticle)
router.get('/search', searchArticles);
router.get('/:id', getArticleById)
router.post('/', createArticle)
router.put('/:id', updateArticle)
router.delete('/:id', deleteArticle)

module.exports = router;