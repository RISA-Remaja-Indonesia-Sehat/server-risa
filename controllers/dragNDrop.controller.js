const { prisma } = require('../config/db');

const isValidMythFact = (value) => {
    return value === 'MYTH' || value === 'FACT';
};

const getAllDragNDropItems = async (req, res) => {
    try {
        const items = await prisma.drag_Drop.findMany({
            include: { Mini_Game: { select: { title: true, type: true } } }
        });
        
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil item drag and drop.', error: error.message });
    }  
};

const getDragNDropItemById = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID item tidak valid.' });
    }

    try {
        const item = await prisma.drag_Drop.findUnique({ 
            where: { id: id },
            include: { Mini_Game: { select: { title: true, type: true } } }
        });
        
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item tidak ditemukan.' });
        }
        res.status(200).json({ success: true, data: item });
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil item drag and drop.', error: error.message });
    }
};

const createDragNDropItem = async (req, res) => {
    const { mini_game_id, text, explanation, correct } = req.body;
    
    if (!mini_game_id || !text || !explanation || !correct || isNaN(mini_game_id)) {
        return res.status(400).json({ success: false, message: 'Data input (mini_game_id, text, explanation, correct) tidak lengkap.' });
    }
    if (!isValidMythFact(correct)) {
        return res.status(400).json({ success: false, message: 'Field "correct" harus berisi MYTH atau FACT.' });
    }

    try {
        const newItem = await prisma.drag_Drop.create({
            data: { mini_game_id, text, explanation, correct }
        });
        
        res.status(201).json({ success: true, message: 'Item Drag & Drop berhasil dibuat.', data: newItem });
        
    } catch (error) {
        if (error.code === 'P2003') {
             return res.status(400).json({ success: false, message: 'Mini Game ID tidak ditemukan di tabel Mini_Games.', error: error.message });
        }
        
        res.status(500).json({ success: false, message: 'Gagal membuat item drag and drop.', error: error.message });
    }
};

const updateDragNDropItem = async (req, res) => {
    const id = parseInt(req.params.id);
    const { text, explanation, correct } = req.body;
    
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID item tidak valid.' });
    }
    
    if (correct && !isValidMythFact(correct)) {
        return res.status(400).json({ success: false, message: 'Field "correct" harus berisi MYTH atau FACT.' });
    }
    
    try {
        const updatedItem = await prisma.drag_Drop.update({
            where: { id: id },
            data: { text, explanation, correct }
        });
        
        res.status(200).json({ success: true, message: 'Item berhasil diperbarui.', data: updatedItem });
        
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Item tidak ditemukan.' });
        }
        
        res.status(500).json({ success: false, message: 'Gagal memperbarui item drag and drop.', error: error.message });
    }  
};

const deleteDragNDropItem = async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID item tidak valid.' });
    }
    
    try {
        await prisma.drag_Drop.delete({ where: { id: id } });
        
        res.status(204).send();
        
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Item tidak ditemukan.' });
        }
        
        res.status(500).json({ success: false, message: 'Gagal menghapus item drag and drop.', error: error.message });
    }
};

const deleteAllDragNDropItems = async (req, res) => {
    try {
        const deletedItems = await prisma.drag_Drop.deleteMany({}); 
        res.status(200).json({ success: true, message: `${deletedItems.count} item drag and drop berhasil dihapus.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus semua item drag and drop.', error: error.message });
    }
};

module.exports = {
    getAllDragNDropItems,
    getDragNDropItemById,
    createDragNDropItem,
    updateDragNDropItem,
    deleteDragNDropItem,
    deleteAllDragNDropItems
};