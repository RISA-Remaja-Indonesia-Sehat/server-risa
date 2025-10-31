const { prisma } = require('../config/db');

const getAllMemoCards = async (req, res) => {
    try {
        const memoCards = await prisma.memo_Card.findMany({
            include: { Mini_Game: { select: { title: true, type: true } } }
        });
        
        res.status(200).json({ 
            success: true, 
            count: memoCards.length,
            data: memoCards 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil memo cards.', 
            error: error.message 
        });
    }
};

const getMemoCardById = async (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID Memo Card tidak valid.' });
    }
    
    try {
        const memoCard = await prisma.memo_Card.findUnique({
            where: { id: id },
            include: { Mini_Game: { select: { title: true, type: true } } }
        });

        if (!memoCard) {
            return res.status(404).json({ success: false, message: 'Memo Card tidak ditemukan.' });
        }
        
        res.status(200).json({ success: true, data: memoCard });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil memo card.', error: error.message });
    }
};

const createMemoCard = async (req, res) => {
    const { mini_game_id, term, definition, duration } = req.body; 

    if (!mini_game_id || !term || !definition || typeof duration !== 'number' || isNaN(mini_game_id)) {
        return res.status(400).json({ success: false, message: 'Data input tidak lengkap atau tipe data duration/mini_game_id salah.' });
    }
    
    try {
        const newMemoCard = await prisma.memo_Card.create({
            data: { 
                mini_game_id: mini_game_id, 
                term: term, 
                definition: definition, 
                duration: duration 
            }
        });
        
        res.status(201).json({ success: true, message: 'Memo Card berhasil dibuat.', data: newMemoCard });

    } catch (error) {
        if (error.code === 'P2002') {
             return res.status(409).json({ success: false, message: 'Memo Card untuk Mini Game ID ini sudah ada.', error: error.message });
        }
        if (error.code === 'P2003') {
             return res.status(400).json({ success: false, message: 'Mini Game ID tidak ditemukan.', error: error.message });
        }

        res.status(500).json({ success: false, message: 'Gagal membuat memo card.', error: error.message });
    }
};

const updateMemoCard = async (req, res) => {
    const id = parseInt(req.params.id);
    const { term, definition, duration } = req.body;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID Memo Card tidak valid.' });
    }
    
    try {
        const updatedMemoCard = await prisma.memo_Card.update({
            where: { id: id },
            data: { term, definition, duration }
        });
        
        res.status(200).json({ success: true, message: 'Memo Card berhasil diperbarui.', data: updatedMemoCard });

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Memo Card yang akan diupdate tidak ditemukan.' });
        }
        
        res.status(500).json({ success: false, message: 'Gagal memperbarui memo card.', error: error.message });
    }
};

const deleteMemoCard = async (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID Memo Card tidak valid.' });
    }
    
    try {
        await prisma.memo_Card.delete({
            where: { id: id }
        });
        
        res.status(204).send();
        
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Memo Card yang akan dihapus tidak ditemukan.' });
        }
        
        res.status(500).json({ success: false, message: 'Gagal menghapus memo card.', error: error.message });
    }
};

module.exports = {
    getAllMemoCards,
    getMemoCardById,
    createMemoCard,
    updateMemoCard,
    deleteMemoCard
};