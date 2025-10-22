const { prisma } = require('../config/db');

module.exports = {
    createComment: async (req, res) => {
        try {
            const articleId = req.articleId || req.params.id;
            
            if (!articleId) {
                return res.status(400).json({ message: 'Article ID is required' });
            }
            const { comment } = req.body;
            // console.log('req.user:', req.user);
            
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            
            const userId = req.user.userId;
            
            if (!comment) {
                return res.status(400).json({ message: 'Isi Komentar' });
            }
            const newComment = await prisma.comment.create({
                data: {
                    comment,
                    article_id: parseInt(articleId),
                    user_id: userId
                },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            });
            res.status(201).json({
                message: 'Comment created successfully',
                data: newComment
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    getAllComment: async (req, res) => {
        try {
            const articleId = req.articleId || req.params.id;
            
            if (!articleId) {
                return res.status(400).json({ message: 'Article ID is required' });
            }
            
            const parsedArticleId = parseInt(articleId);
            if (isNaN(parsedArticleId)) {
                return res.status(400).json({ message: 'Invalid Article ID' });
            }
            
            const comments = await prisma.comment.findMany({
                where: { article_id: parsedArticleId },
                include: { 
                    user: { select: { id: true, name: true } }
                }
            });
            res.status(200).json({
                message: 'Success',
                data: comments
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};