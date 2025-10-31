const { prisma } = require('../config/db');

const getAllGameFeedback = async (req, res) => {
    try {
        const feedbacks = await prisma.game_Feedback.findMany({
            include: { Score: { select: { id: true, user_id: true, game_id: true } } }
        });
        res.status(200).json({ success: true, count: feedbacks.length, data: feedbacks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil feedback game.', error: error.message });
    }
};

const submitGameFeedback = async (req, res) => {
    const { score_id, error_details, generated_tags } = req.body;
    
    if (!score_id || !error_details) {
        return res.status(400).json({ success: false, message: 'Data input tidak lengkap. score_id dan error_details wajib diisi.' });
    }
    if (isNaN(parseInt(score_id))) {
        return res.status(400).json({ success: false, message: 'score_id harus berupa angka yang valid.' });
    }

    try {
        const newFeedback = await prisma.game_Feedback.create({
            data: { 
                score_id: parseInt(score_id),
                error_details, 
                generated_tags: generated_tags || []
            }
        });
        res.status(201).json({ success: true, message: 'Feedback berhasil dikirim.', data: newFeedback });
    }
    catch (error) {
        if (error.code === 'P2002') {
             return res.status(409).json({ success: false, message: 'Feedback untuk skor ini (score_id) sudah pernah dikirim.', error: error.message });
        }
        if (error.code === 'P2003') {
             return res.status(400).json({ success: false, message: 'ID Skor (score_id) tidak ditemukan di tabel Scores.', error: error.message });
        }
        
        res.status(500).json({ success: false, message: 'Gagal mengirim feedback game.', error: error.message });
    }
};

const deleteGameFeedback = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedFeedback = await prisma.game_Feedback.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ success: true, message: 'Feedback berhasil dihapus.', data: deletedFeedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus feedback game.', error: error.message });
    }
};

const deleteAllGameFeedback = async (req, res) => {
    try {
        const deletedFeedbacks = await prisma.game_Feedback.deleteMany({});
        res.status(200).json({ success: true, message: 'Semua feedback berhasil dihapus.', count: deletedFeedbacks.count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus semua feedback game.', error: error.message });
    }
};




module.exports = {
    getAllGameFeedback,
    submitGameFeedback,
    deleteGameFeedback,
    deleteAllGameFeedback
};