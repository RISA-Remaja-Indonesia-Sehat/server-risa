const { prisma } = require('../config/db');

const getAllMiniGames = async (req, res) => {
    try {
        const miniGames = await prisma.mini_Games.findMany({
            orderBy: { id: 'asc' }
        });
        
        res.status(200).json({
            success: true,
            count: miniGames.length,
            data: miniGames
        });

    } catch (error) {
        console.error("Error fetching mini games:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data mini games.', 
            error: error.message 
        });
    }
};

const getMiniGameById = async (req, res) => {
    const gameId = parseInt(req.params.gameId); 

    if (isNaN(gameId)) {
        return res.status(400).json({ success: false, message: 'ID game tidak valid.' });
    }

    try {
        const miniGame = await prisma.mini_Games.findUnique({
            where: { id: gameId },
        });

        if (!miniGame) {
            return res.status(404).json({ success: false, message: 'Mini game tidak ditemukan.' });
        }
        
        res.status(200).json({ success: true, data: miniGame });

    } catch (error) {
        console.error("Error fetching mini game by ID:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data mini game.',
            error: error.message
        });
    }
};

const createMiniGame = async (req, res) => {
    const { title, type } = req.body;
    
    if (!title || !type) {
        return res.status(400).json({ success: false, message: 'Field title dan type wajib diisi.' });
    }
    
    try {
        const newMiniGame = await prisma.mini_Games.create({
            data: { title: title, type: type },
        });
        
        res.status(201).json({ success: true, message: 'Mini game berhasil dibuat.', data: newMiniGame });

    } catch (error) {
        console.error("Error creating mini game:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal membuat mini game baru.',
            error: error.message
        });
    }
};

const updateMiniGame = async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const { title, type } = req.body; 

    if (isNaN(gameId) || (!title && !type)) {
        return res.status(400).json({ success: false, message: 'ID game tidak valid atau data update kosong.' });
    }

    try {
        const updatedMiniGame = await prisma.mini_Games.update({
            where: { id: gameId }, 
            data: { title, type },
        });
        
        res.status(200).json({ success: true, message: 'Mini game berhasil diupdate.', data: updatedMiniGame });

    } catch (error) {
        if (error.code === 'P2025') {
             return res.status(404).json({ success: false, message: 'Mini game yang akan diupdate tidak ditemukan.' });
        }
        
        console.error("Error updating mini game:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengupdate mini game.',
            error: error.message
        });
    }
};

const deleteMiniGame = async (req, res) => {
    const gameId = parseInt(req.params.gameId);

    if (isNaN(gameId)) {
        return res.status(400).json({ success: false, message: 'ID game tidak valid.' });
    }

    try {
        await prisma.mini_Games.delete({
            where: { id: gameId },
        });
        
        res.status(204).send();

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Mini game yang akan dihapus tidak ditemukan.' });
        }
        
        console.error("Error deleting mini game:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus mini game.',
            error: error.message
        });
    }
};

module.exports = {
    getAllMiniGames,
    getMiniGameById,
    createMiniGame,
    updateMiniGame,
    deleteMiniGame,
};