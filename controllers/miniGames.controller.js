const {prisma} = require('../config/db');

// Get all mini games
const getAllMiniGames = async (req, res) => {
  try {
    const miniGames = await prisma.miniGame.findMany();
    res.status(200).json(miniGames);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mini games' });
  }
};

// Get mini game by ID
const getMiniGameById = async (req, res) => {
  const { gameId } = req.params;
    try {
    const miniGame = await prisma.miniGame.findUnique({
      where: { id: parseInt(gameId) },
    });
    if (!miniGame) {
      return res.status(404).json({ error: 'Mini game not found' });
    }
    res.status(200).json(miniGame);
    } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mini game' });
    }
};

// Create a new mini game
const createMiniGame = async (req, res) => {
  const { title } = req.body;
    try {
    const newMiniGame = await prisma.miniGame.create({
      data: { title },
    });
    res.status(201).json(newMiniGame);
    } catch (error) {
    res.status(500).json({ error: 'Failed to create mini game' });
    }
};

// Update a mini game   
const updateMiniGame = async (req, res) => {
  const { gameId } = req.params;
  const { title } = req.body;
    try {
    const updatedMiniGame = await prisma.miniGame.update({
      where: { id: parseInt(gameId) },
        data: { title },
    });
    res.status(200).json(updatedMiniGame);
    } catch (error) {
    res.status(500).json({ error: 'Failed to update mini game' });
    }
};

// Delete a mini game   
const deleteMiniGame = async (req, res) => {
  const { gameId } = req.params;
    try {
    await prisma.miniGame.delete({
      where: { id: parseInt(gameId) },
    });
    res.status(204).send();
} catch (error) {
    res.status(500).json({ error: 'Failed to delete mini game' });
    }   
};

module.exports = {
  getAllMiniGames,
  getMiniGameById,
  createMiniGame,
  updateMiniGame,
  deleteMiniGame,
};