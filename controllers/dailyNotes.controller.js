const { prisma } = require('../config/db');

const getDailyNotes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notes = await prisma.daily_Note.findMany({
      where: { user_id: userId },
      orderBy: { date: 'desc' }
    });
    res.json(notes);
  } catch (error) {
    console.error('Error in getDailyNotes:', error);
    res.status(500).json({ error: 'Gagal mengambil catatan harian' });
  }
};

const getDailyNoteByDate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const targetDate = new Date(date + 'T00:00:00.000Z');
    
    const note = await prisma.daily_Note.findFirst({
      where: { user_id: userId, date: targetDate }
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Catatan tidak ditemukan' });
    }
    res.json(note);
  } catch (error) {
    console.error('Error in getDailyNoteByDate:', error);
    res.status(500).json({ error: 'Gagal mengambil catatan harian' });
  }
};

const createOrUpdateDailyNote = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const userId = req.user.userId;
    const { date, isPeriod, flowLevel, gejala, mood, levelEnergy, cerita } = req.body;
    
    if (!date || typeof isPeriod !== 'boolean' || !mood || !levelEnergy) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const existingNote = await prisma.daily_Note.findFirst({
      where: { user_id: userId, date: targetDate }
    });
    
    const noteData = {
      user_id: userId,
      date: targetDate,
      isPeriod,
      flowLevel: isPeriod ? flowLevel : null,
      gejala: JSON.stringify(Array.isArray(gejala) ? gejala : []),
      mood,
      levelEnergy,
      cerita: cerita || ''
    };
    
    let note;
    if (existingNote) {
      note = await prisma.daily_Note.update({
        where: { id: existingNote.id },
        data: noteData
      });
    } else {
      note = await prisma.daily_Note.create({ data: noteData });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error in createOrUpdateDailyNote:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Catatan untuk tanggal ini sudah ada' });
    }
    res.status(500).json({ error: 'Gagal menyimpan catatan harian' });
  }
};

const updateDailyNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const { isPeriod, flowLevel, gejala, mood, levelEnergy, cerita } = req.body;
    
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const existingNote = await prisma.daily_Note.findFirst({
      where: { user_id: userId, date: targetDate }
    });
    
    if (!existingNote) {
      return res.status(404).json({ error: 'Catatan tidak ditemukan' });
    }
    
    const note = await prisma.daily_Note.update({
      where: { id: existingNote.id },
      data: {
        isPeriod,
        flowLevel: isPeriod ? flowLevel : null,
        gejala: gejala || '[]',
        mood,
        levelEnergy,
        cerita: cerita || ''
      }
    });
    
    res.json(note);
  } catch (error) {
    console.error('Error in updateDailyNote:', error);
    res.status(500).json({ error: 'Gagal mengupdate catatan harian' });
  }
};

const deleteDailyNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const targetDate = new Date(date + 'T00:00:00.000Z');
    
    const note = await prisma.daily_Note.findFirst({
      where: { user_id: userId, date: targetDate }
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Catatan tidak ditemukan' });
    }
    
    await prisma.daily_Note.delete({ where: { id: note.id } });
    res.json({ message: 'Catatan berhasil dihapus' });
  } catch (error) {
    console.error('Error in deleteDailyNote:', error);
    res.status(500).json({ error: 'Gagal menghapus catatan harian' });
  }
};

module.exports = {
  getDailyNotes,
  getDailyNoteByDate,
  createOrUpdateDailyNote,
  updateDailyNote,
  deleteDailyNote
};